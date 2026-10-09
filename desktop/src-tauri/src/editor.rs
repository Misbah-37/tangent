//! Native editor sessions: shared immutable cells plus independent sparse edits.
use crate::{snapshots::SnapshotStore, tabular::{self, Cell, Dataset, ImportStage, TabularSnapshot}};
use serde::Serialize;
use std::{collections::HashMap, fs, path::Path, sync::{Arc, Mutex}};
use tauri::ipc::Channel;

#[derive(Clone)]
pub(crate) struct Session {
    pub(crate) base: Arc<Dataset>, edits: Arc<HashMap<(usize, usize), Cell>>, writable: bool,
    pub(crate) indices: Option<Arc<Vec<usize>>>,
}
impl Session {
    pub(crate) fn new(data: Dataset) -> Self {Self{base:Arc::new(data),edits:Arc::new(HashMap::new()),writable:true,indices:None}}
    pub(crate) fn len(&self) -> usize { self.indices.as_ref().map_or(self.base.rows.len(), |v| v.len()) }
    fn source_row(&self, row: usize) -> usize { self.indices.as_ref().map_or(row, |v| v[row]) }
    pub(crate) fn cell(&self, row: usize, column: usize) -> &Cell {
        let row = self.source_row(row);
        self.edits.get(&(row,column)).unwrap_or(&self.base.rows[row][column])
    }
    pub(crate) fn metadata(&self, id: String, path: String, bytes: u64) -> TabularSnapshot {
        TabularSnapshot { tabular_id:id.clone(), id, path, bytes, columns:self.base.columns.clone(), row_count:self.len(), source:self.base.source.clone(), sheet:self.base.sheet.clone(), warnings:self.base.warnings.clone(), native:true }
    }
}
#[derive(Default, Clone)]
pub struct EditorStore { sessions: Arc<Mutex<HashMap<String, Session>>> }
impl EditorStore {
    pub(crate) fn get(&self, id: &str) -> Result<Session, String> {
        self.sessions.lock().map_err(|_| "Editor store unavailable")?.get(id).cloned().ok_or_else(|| "This native dataset is no longer available".into())
    }
    pub(crate) fn insert(&self, session: Session) -> Result<String, String> {
        let id = uuid::Uuid::new_v4().to_string();
        self.sessions.lock().map_err(|_| "Editor store unavailable")?.insert(id.clone(), session);
        Ok(id)
    }
    pub(crate) fn view(&self, id: &str, selected: Vec<usize>) -> Result<TabularSnapshot, String> {
        let mut session = self.get(id)?;
        let rows = selected.into_iter().map(|r| if r < session.len() {Ok(session.source_row(r))} else {Err("View row is outside dataset")}).collect::<Result<Vec<_>,_>>()?;
        session.indices = Some(Arc::new(rows));
        session.writable = true; // A workspace-owned view is released with its workspace.
        let id = self.insert(session.clone())?;
        Ok(session.metadata(id,String::new(),0))
    }
    fn edit(&self, id: &str, row: usize, column: usize, value: Cell) -> Result<(), String> {
        if matches!(&value, Cell::Number(n) if !n.is_finite()) { return Err("Non-finite cell value".into()); }
        let mut sessions = self.sessions.lock().map_err(|_| "Editor store unavailable")?;
        let session = sessions.get_mut(id).ok_or("This native dataset is no longer available")?;
        if !session.writable { return Err("Snapshot is immutable. Open it in an editor workspace first.".into()); }
        if row >= session.len() || column >= session.base.columns.len() { return Err("Cell is outside the dataset".into()); }
        let row = session.source_row(row);
        if value == session.base.rows[row][column] { Arc::make_mut(&mut session.edits).remove(&(row,column)); }
        else { Arc::make_mut(&mut session.edits).insert((row,column),value); }
        Ok(())
    }
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Page { offset: usize, rows: Vec<Vec<Cell>>, row_count: usize }
fn page(session: &Session, offset: usize, limit: usize) -> Result<Page, String> {
    if !(1..=2048).contains(&limit) { return Err("Page size must be between 1 and 2048 rows".into()); }
    if session.base.columns.len().saturating_mul(limit)>32768 { return Err("Page size exceeds the 32768-cell transfer limit. Request fewer rows.".into()); }
    if offset > session.len() { return Err("Page offset is outside the dataset".into()); }
    let end = offset.saturating_add(limit).min(session.len());
    Ok(Page { offset, row_count:session.len(), rows:(offset..end).map(|r| (0..session.base.columns.len()).map(|c|session.cell(r,c).clone()).collect()).collect() })
}
pub(crate) fn write_csv(session: &Session, path: &Path, delimiter: u8) -> Result<(), String> {
    let mut writer = csv::WriterBuilder::new().delimiter(delimiter).from_path(path).map_err(|e|e.to_string())?;
    writer.write_record(&session.base.columns).map_err(|e|e.to_string())?;
    for r in 0..session.len() { writer.write_record((0..session.base.columns.len()).map(|c|session.cell(r,c).text())).map_err(|e|e.to_string())?; }
    writer.flush().map_err(|e|e.to_string())
}
fn write_excel(session: &Session, path: &Path) -> Result<(), String> {
    if session.len()>1_048_575 || session.base.columns.len()>16_384 { return Err("This dataset exceeds Excel's row or column limit. Export CSV or TSV instead.".into()); }
    let mut book = rust_xlsxwriter::Workbook::new();
    let sheet = book.add_worksheet();
    sheet.set_name("Data").map_err(|e|e.to_string())?;
    for (c, name) in session.base.columns.iter().enumerate() { sheet.write_string(0,c as u16,name).map_err(|e|e.to_string())?; }
    for r in 0..session.len() { for c in 0..session.base.columns.len() {
        match session.cell(r,c) {
            Cell::Text(s)|Cell::Date(s) => { sheet.write_string((r+1) as u32,c as u16,s).map_err(|e|e.to_string())?; },
            Cell::Number(n) => { sheet.write_number((r+1) as u32,c as u16,*n).map_err(|e|e.to_string())?; },
            Cell::Boolean(b) => { sheet.write_boolean((r+1) as u32,c as u16,*b).map_err(|e|e.to_string())?; },
            Cell::Null => {},
        }
    } }
    book.save(path).map_err(|e|e.to_string())
}
#[tauri::command]
pub async fn import_editor_file(editor: tauri::State<'_, EditorStore>, path: String, sheet: Option<String>, first_row_header: bool, progress: Channel<ImportStage>) -> Result<TabularSnapshot,String> {
    let store = editor.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let data = tabular::measured("File read, parsing and normalization",Some(&progress),||tabular::read_file(&path,sheet,first_row_header,None).map(|r|r.0))?;
        let session = Session {base:Arc::new(data),edits:Arc::new(HashMap::new()),writable:true,indices:None};
        let id = store.insert(session.clone())?;
        Ok(session.metadata(id,path.clone(),fs::metadata(&path).map_err(|e|e.to_string())?.len()))
    }).await.map_err(|e|e.to_string())?
}
#[tauri::command]
pub async fn open_editor_dataset(editor: tauri::State<'_, EditorStore>, store: tauri::State<'_,SnapshotStore>, id: String, native: bool) -> Result<TabularSnapshot,String> {
    let editor = editor.inner().clone(); let directory = store.directory.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let mut session = if native { editor.get(&id)? } else { Session {base:Arc::new(tabular::read_snapshot(&directory,&id)?),edits:Arc::new(HashMap::new()),writable:true,indices:None} };
        session.writable = true;
        let new_id = editor.insert(session.clone())?;
        Ok(session.metadata(new_id,String::new(),0))
    }).await.map_err(|e|e.to_string())?
}
#[tauri::command]
pub async fn read_editor_page(editor: tauri::State<'_,EditorStore>, id: String, offset: usize, limit: usize) -> Result<Page,String> {
    page(&editor.get(&id)?,offset,limit)
}
#[tauri::command]
pub async fn edit_editor_cell(editor: tauri::State<'_,EditorStore>, id: String, row: usize, column: usize, value: Cell) -> Result<(),String> { editor.edit(&id,row,column,value) }
#[tauri::command]
pub async fn editor_column_kinds(editor: tauri::State<'_,EditorStore>, id: String) -> Result<Vec<String>,String> {
    let session = editor.get(&id)?;
    tauri::async_runtime::spawn_blocking(move || {
        let mut flags=vec![0u8;session.base.columns.len()];
        for row in 0..session.len() { for (column,flag) in flags.iter_mut().enumerate() {
            *flag |= match session.cell(row,column) {Cell::Number(_)=>1,Cell::Boolean(_)=>2,Cell::Text(_)|Cell::Date(_)=>4,Cell::Null=>0};
        } }
        Ok(flags.into_iter().map(|flag|match flag {1=>"number",2=>"boolean",_=>"text"}.into()).collect())
    }).await.map_err(|e|e.to_string())?
}
#[tauri::command]
pub async fn release_editor_dataset(editor: tauri::State<'_,EditorStore>, id: String) -> Result<(),String> {
    let mut sessions = editor.sessions.lock().map_err(|_|"Editor store unavailable")?;
    if sessions.get(&id).is_some_and(|s|s.writable) { sessions.remove(&id); }
    Ok(())
}
#[tauri::command]
pub async fn snapshot_editor_dataset(editor: tauri::State<'_,EditorStore>, store: tauri::State<'_,SnapshotStore>, id: String) -> Result<TabularSnapshot,String> {
    let editor = editor.inner().clone(); let directory = store.directory.clone();
    let mut session = editor.get(&id)?; session.writable = false;
    tauri::async_runtime::spawn_blocking(move || {
        fs::create_dir_all(&directory).map_err(|e|e.to_string())?;
        let snapshot_id = uuid::Uuid::new_v4().to_string(); let path=directory.join(format!("{snapshot_id}.csv"));
        write_csv(&session,&path,b',')?;
        let metadata = session.metadata(snapshot_id.clone(),path.to_string_lossy().into_owned(),fs::metadata(&path).map_err(|e|e.to_string())?.len());
        editor.sessions.lock().map_err(|_|"Editor store unavailable")?.insert(snapshot_id,session);
        Ok(metadata)
    }).await.map_err(|e|e.to_string())?
}
#[tauri::command]
pub async fn export_editor_dataset(editor: tauri::State<'_,EditorStore>, id: String, format: String, default_name: String) -> Result<Option<String>,String> {
    if !["csv","tsv","xlsx"].contains(&format.as_str()) { return Err("Unsupported export format".into()); }
    let session = editor.get(&id)?;
    tauri::async_runtime::spawn_blocking(move || {
        let stem=Path::new(&default_name).file_stem().unwrap_or_default().to_string_lossy();
        let selected=rfd::FileDialog::new().set_file_name(format!("{stem}.{format}")).add_filter(format.to_uppercase(),&[format.as_str()]).save_file();
        let Some(mut path)=selected else {return Ok(None)};
        path.set_extension(&format);
        match format.as_str() { "xlsx"=>write_excel(&session,&path)?, "tsv"=>write_csv(&session,&path,b'\t')?, _=>write_csv(&session,&path,b',')? }
        Ok(Some(path.to_string_lossy().into_owned()))
    }).await.map_err(|e|e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    #[ignore = "Generates a million-row CSV for the optimized native benchmark"]
    fn million_row_benchmark() {
        let files=SnapshotStore::default();fs::create_dir_all(&files.directory).unwrap();
        let input=files.directory.join("million.csv");
        {
            let mut writer=csv::Writer::from_path(&input).unwrap();
            writer.write_record((0..12).map(|c|format!("Column {c}"))).unwrap();
            for row in 0..1_000_000 { writer.write_record((0..12).map(|c|if c==0 {format!("{row:08}")}else{format!("sample-{c}")})).unwrap(); }
            writer.flush().unwrap();
        }
        let started=std::time::Instant::now();
        let data=tabular::read_file(input.to_str().unwrap(),None,true,None).unwrap().0;
        let parse_ms=started.elapsed().as_millis();
        let store=EditorStore::default();let id=store.insert(Session{base:Arc::new(data),edits:Arc::new(HashMap::new()),writable:true,indices:None}).unwrap();
        let started=std::time::Instant::now();
        for offset in [0,500_000,999_872] {assert_eq!(page(&store.get(&id).unwrap(),offset,128).unwrap().rows.len(),128);}
        let page_ms=started.elapsed().as_millis();
        store.edit(&id,999_999,1,Cell::Text("edited".into())).unwrap();
        let captured=store.get(&id).unwrap();
        store.edit(&id,999_999,1,Cell::Text("later".into())).unwrap();
        assert_eq!(captured.cell(999_999,1),&Cell::Text("edited".into()));
        let output=files.directory.join("snapshot.csv");let started=std::time::Instant::now();write_csv(&captured,&output,b',').unwrap();let snapshot_ms=started.elapsed().as_millis();
        assert_eq!(captured.base.rows.len(),1_000_000);
        assert_eq!(captured.base.rows[0][0],Cell::Text("00000000".into()));
        assert_eq!(fs::read_dir(&files.directory).unwrap().count(),2);
        println!("NATIVE_BENCH rows=1000000 columns=12 parse_ms={parse_ms} three_pages_ms={page_ms} csv_snapshot_ms={snapshot_ms} input_bytes={} json_snapshots=0",fs::metadata(input).unwrap().len());
    }
    #[test]
    fn bounded_pages_and_independent_edits() {
        let store=EditorStore::default();
        let data=Dataset { columns:vec!["id".into(),"amount".into()],rows:vec![vec![Cell::Text("00123".into()),Cell::Number(0.0)];10_000],source:String::new(),sheet:None,warnings:vec![] };
        let id=store.insert(Session{base:Arc::new(data),edits:Arc::new(HashMap::new()),writable:true,indices:None}).unwrap();
        store.edit(&id,9999,1,Cell::Number(5.0)).unwrap();
        let mut snapshot=store.get(&id).unwrap(); snapshot.writable=false;
        let snapshot_id=store.insert(snapshot).unwrap();
        let mut destination=store.get(&snapshot_id).unwrap(); destination.writable=true;
        let destination_id=store.insert(destination).unwrap();
        assert!(Arc::ptr_eq(&store.get(&id).unwrap().base,&store.get(&destination_id).unwrap().base));
        store.edit(&id,9999,1,Cell::Number(8.0)).unwrap();
        store.edit(&destination_id,0,0,Cell::Text("different".into())).unwrap();
        assert_eq!(page(&store.get(&snapshot_id).unwrap(),9999,1).unwrap().rows[0][1],Cell::Number(5.0));
        assert_eq!(page(&store.get(&id).unwrap(),0,128).unwrap().rows.len(),128);
        assert_eq!(page(&store.get(&id).unwrap(),0,1).unwrap().rows[0][0],Cell::Text("00123".into()));
        assert!(store.edit(&snapshot_id,0,0,Cell::Null).is_err());
        assert!(store.edit(&id,10_000,0,Cell::Null).is_err());
        assert!(page(&store.get(&id).unwrap(),0,2049).is_err());
        assert!(page(&store.get(&id).unwrap(),usize::MAX,1).is_err());
        assert!(page(&store.get(&id).unwrap(),10_000,1).unwrap().rows.is_empty());
        let view=store.view(&id,vec![9999,0]).unwrap();
        assert_eq!(view.row_count,2);
        assert!(Arc::ptr_eq(&store.get(&id).unwrap().base,&store.get(&view.tabular_id).unwrap().base));
        assert_eq!(page(&store.get(&view.tabular_id).unwrap(),0,1).unwrap().rows[0][1],Cell::Number(8.0));
        store.edit(&view.tabular_id,0,1,Cell::Number(42.0)).unwrap();
        assert_eq!(store.get(&id).unwrap().cell(9999,1),&Cell::Number(8.0));
        assert_eq!(store.get(&view.tabular_id).unwrap().cell(0,1),&Cell::Number(42.0));
        let files=SnapshotStore::default();fs::create_dir_all(&files.directory).unwrap();
        let csv=files.directory.join("edited.csv");write_csv(&store.get(&snapshot_id).unwrap(),&csv,b',').unwrap();
        let parsed=tabular::read_file(csv.to_str().unwrap(),None,true,None).unwrap().0;
        assert_eq!(parsed.rows[9999][1],Cell::Text("5".into()));
        let xlsx=files.directory.join("edited.xlsx");write_excel(&store.get(&snapshot_id).unwrap(),&xlsx).unwrap();
        let parsed=tabular::read_file(xlsx.to_str().unwrap(),None,true,None).unwrap().0;
        assert_eq!(parsed.rows[0][0],Cell::Text("00123".into()));assert_eq!(parsed.rows[9999][1],Cell::Number(5.0));
    }
}
