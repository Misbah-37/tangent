//! Local, value-only tabular interchange. Immutable JSON keeps cell types;
//! a CSV projection lets existing streaming analysis engines keep working.
use calamine::{open_workbook_auto, Data, Reader};
use serde::{Deserialize, Serialize};
use std::{collections::HashSet, fs, path::Path};
use crate::snapshots::SnapshotStore;

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(tag = "kind", content = "value", rename_all = "lowercase")]
pub enum Cell { Text(String), Number(f64), Boolean(bool), Date(String), Null }
impl Cell {
    fn text(&self) -> String {
        match self { Self::Text(s) | Self::Date(s) => s.clone(), Self::Number(n) => n.to_string(), Self::Boolean(b) => b.to_string(), Self::Null => String::new() }
    }
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Dataset {
    pub columns: Vec<String>, pub rows: Vec<Vec<Cell>>,
    #[serde(default)] pub source: String,
    #[serde(default)] pub sheet: Option<String>,
    #[serde(default)] pub warnings: Vec<String>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Preview { sheets: Vec<String>, selected_sheet: Option<String>, columns: Vec<String>, rows: Vec<Vec<Cell>>, warnings: Vec<String> }
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TabularSnapshot { pub id: String, pub tabular_id: String, pub path: String, pub bytes: u64, pub columns: Vec<String>, pub row_count: usize, pub source: String, pub sheet: Option<String>, pub warnings: Vec<String> }

fn extension(path: &str) -> String { Path::new(path).extension().unwrap_or_default().to_string_lossy().to_lowercase() }
fn cell(value: &Data) -> Result<Cell, String> {
    Ok(match value {
        Data::String(s) => Cell::Text(s.clone()),
        Data::Int(n) if n.unsigned_abs() > 9_007_199_254_740_991 => Cell::Text(n.to_string()),
        Data::Int(n) => Cell::Number(*n as f64),
        Data::Float(n) if n.is_finite() => Cell::Number(*n),
        Data::Bool(b) => Cell::Boolean(*b),
        Data::DateTime(d) => {
            if d.is_duration() { Cell::Text(d.to_string()) }
            else { Cell::Date(d.as_datetime().ok_or("Invalid Excel date")?.format("%Y-%m-%dT%H:%M:%S%.f").to_string()) }
        },
        Data::DateTimeIso(s) => Cell::Date(s.clone()),
        Data::DurationIso(s) => Cell::Text(s.clone()),
        Data::Empty => Cell::Null,
        Data::Error(e) => return Err(format!("Workbook contains an Excel error ({e}). Resolve it in the workbook before importing.")),
        _ => return Err("Workbook contains a non-finite number".into()),
    })
}
fn from_records(mut records: Vec<Vec<Cell>>, header: bool, source: String, sheet: Option<String>) -> Result<Dataset, String> {
    if records.is_empty() { return Err("This sheet or file contains no data".into()); }
    let width = records.iter().map(Vec::len).max().unwrap_or(0);
    if width == 0 { return Err("No columns found".into()); }
    let mut warnings = Vec::new();
    let names = if header { records.remove(0).iter().map(Cell::text).collect::<Vec<_>>() } else { Vec::new() };
    let mut used = HashSet::new(); let mut columns = Vec::new();
    for i in 0..width {
        let raw = names.get(i).filter(|s| !s.trim().is_empty()).cloned().unwrap_or_else(|| format!("Column {}", i + 1));
        let mut name = raw.clone(); let mut suffix = 2;
        while !used.insert(name.clone()) { name = format!("{raw} ({suffix})"); suffix += 1; }
        if header && names.get(i) != Some(&name) { warnings.push(format!("Header {} is named \"{}\" in the imported dataset.", i + 1, name)); }
        columns.push(name);
    }
    for row in &mut records { row.resize(width, Cell::Null); }
    if sheet.is_some() { warnings.push("Values only: formulas use saved results; formulas, formatting, merged-cell structure, and other sheets are not retained. Tangent does not calculate Excel formulas. Saved formula results may be stale or missing; recalculate and save your workbook before importing.".into()); }
    Ok(Dataset { columns, rows: records, source, sheet, warnings })
}
fn read_delimited(text: &[u8], delimiter: u8, header: bool, source: String, limit: Option<usize>) -> Result<Dataset, String> {
    let mut reader = csv::ReaderBuilder::new().has_headers(false).flexible(true).delimiter(delimiter).from_reader(text);
    let records = reader.records().take(limit.unwrap_or(usize::MAX)).map(|r| r.map(|r| r.iter().map(|s| Cell::Text(s.to_string())).collect()).map_err(|e| e.to_string())).collect::<Result<Vec<_>, _>>()?;
    from_records(records, header, source, None)
}
fn read_file(path: &str, sheet: Option<String>, header: bool, limit: Option<usize>) -> Result<(Dataset, Vec<String>), String> {
    match extension(path).as_str() {
        "csv" | "tsv" => {
            let file = fs::File::open(path).map_err(|e| e.to_string())?;
            let mut reader = csv::ReaderBuilder::new().has_headers(false).flexible(true).delimiter(if extension(path) == "tsv" { b'\t' } else { b',' }).from_reader(file);
            let records = reader.records().take(limit.unwrap_or(usize::MAX)).map(|r| r.map(|r| r.iter().map(|s| Cell::Text(s.to_string())).collect()).map_err(|e| e.to_string())).collect::<Result<Vec<_>, _>>()?;
            Ok((from_records(records, header, path.into(), None)?, vec![]))
        },
        "xlsx" => {
            let mut workbook = open_workbook_auto(path).map_err(|e| format!("Cannot read workbook: {e}"))?;
            let sheets = workbook.sheet_names().to_vec();
            let selected = sheet.or_else(|| sheets.first().cloned()).ok_or("Workbook has no sheets")?;
            if !sheets.contains(&selected) { return Err("The selected sheet no longer exists".into()); }
            let range = workbook.worksheet_range(&selected).map_err(|e| e.to_string())?;
            let records = range.rows().take(limit.unwrap_or(usize::MAX)).map(|r| r.iter().map(cell).collect::<Result<Vec<_>, _>>()).collect::<Result<Vec<_>, _>>()?;
            Ok((from_records(records, header, path.into(), Some(selected))?, sheets))
        },
        _ => Err("Use a CSV, TSV, or XLSX file".into()),
    }
}
fn validate(dataset: &Dataset) -> Result<(), String> {
    if dataset.columns.is_empty() { return Err("Dataset has no columns".into()); }
    if dataset.rows.iter().any(|row| row.len() != dataset.columns.len()) { return Err("Dataset rows do not match its columns".into()); }
    if dataset.rows.iter().flatten().any(|c| matches!(c, Cell::Number(n) if !n.is_finite())) { return Err("Dataset has a non-finite number".into()); }
    Ok(())
}
fn write_delimited(dataset: &Dataset, path: &Path, delimiter: u8) -> Result<(), String> {
    let mut writer = csv::WriterBuilder::new().delimiter(delimiter).from_path(path).map_err(|e| e.to_string())?;
    writer.write_record(&dataset.columns).map_err(|e| e.to_string())?;
    for row in &dataset.rows { writer.write_record(row.iter().map(Cell::text)).map_err(|e| e.to_string())?; }
    writer.flush().map_err(|e| e.to_string())
}
fn snapshot(directory: &Path, dataset: Dataset) -> Result<TabularSnapshot, String> {
    validate(&dataset)?;
    fs::create_dir_all(directory).map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let path = directory.join(format!("{id}.csv"));
    fs::write(directory.join(format!("{id}.tabular.json")), serde_json::to_vec(&dataset).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    write_delimited(&dataset, &path, b',')?;
    Ok(TabularSnapshot { tabular_id: id.clone(), id, bytes: fs::metadata(&path).map_err(|e| e.to_string())?.len(), path: path.to_string_lossy().into_owned(), columns: dataset.columns, row_count: dataset.rows.len(), source: dataset.source, sheet: dataset.sheet, warnings: dataset.warnings })
}
fn read_snapshot(directory: &Path, id: &str) -> Result<Dataset, String> {
    uuid::Uuid::parse_str(id).map_err(|_| "Invalid dataset reference")?;
    let bytes = fs::read(directory.join(format!("{id}.tabular.json"))).map_err(|e| e.to_string())?;
    serde_json::from_slice(&bytes).map_err(|e| e.to_string())
}
fn write_xlsx(dataset: &Dataset, path: &Path) -> Result<(), String> {
    if dataset.rows.len() > 1_048_575 || dataset.columns.len() > 16_384 { return Err("This dataset exceeds Excel's row or column limit. Export CSV or TSV instead.".into()); }
    let mut workbook = rust_xlsxwriter::Workbook::new();
    let worksheet = workbook.add_worksheet();
    worksheet.set_name("Data").map_err(|e| e.to_string())?;
    for (c, name) in dataset.columns.iter().enumerate() { worksheet.write_string(0, c as u16, name).map_err(|e| e.to_string())?; }
    for (r, row) in dataset.rows.iter().enumerate() {
        for (c, cell) in row.iter().enumerate() {
            match cell {
                Cell::Text(s) | Cell::Date(s) => { worksheet.write_string((r + 1) as u32, c as u16, s).map_err(|e| e.to_string())?; },
                Cell::Number(n) => { worksheet.write_number((r + 1) as u32, c as u16, *n).map_err(|e| e.to_string())?; },
                Cell::Boolean(b) => { worksheet.write_boolean((r + 1) as u32, c as u16, *b).map_err(|e| e.to_string())?; },
                Cell::Null => {},
            }
        }
    }
    workbook.save(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn stage_tabular_file(store: tauri::State<'_, SnapshotStore>, name: String, bytes: Vec<u8>) -> Result<String, String> {
    let directory = store.directory.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let ext = extension(&name);
        if !["csv", "tsv", "xlsx"].contains(&ext.as_str()) { return Err("Unsupported file format".into()); }
        fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
        let path = directory.join(format!("import-{}.{}", uuid::Uuid::new_v4(), ext));
        fs::write(&path, bytes).map_err(|e| e.to_string())?;
        Ok(path.to_string_lossy().into_owned())
    }).await.map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn preview_tabular_import(path: String, sheet: Option<String>, first_row_header: bool) -> Result<Preview, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let sheets = if extension(&path) == "xlsx" { open_workbook_auto(&path).map_err(|e| e.to_string())?.sheet_names().to_vec() } else { vec![] };
        let selected = sheet.or_else(|| sheets.first().cloned());
        let (data, _) = match read_file(&path, selected.clone(), first_row_header, Some(21)) {
            Ok(result) => result,
            Err(error) if error == "This sheet or file contains no data" => return Ok(Preview { sheets, selected_sheet: selected, columns:vec![], rows:vec![], warnings:vec!["This sheet is empty. Choose another worksheet.".into()] }),
            Err(error) => return Err(error),
        };
        Ok(Preview { sheets, selected_sheet: data.sheet, columns: data.columns, rows: data.rows, warnings: data.warnings })
    }).await.map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn import_tabular_file(store: tauri::State<'_, SnapshotStore>, path: String, sheet: Option<String>, first_row_header: bool) -> Result<TabularSnapshot, String> {
    let directory = store.directory.clone();
    tauri::async_runtime::spawn_blocking(move || snapshot(&directory, read_file(&path, sheet, first_row_header, None)?.0)).await.map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn read_tabular_dataset(store: tauri::State<'_, SnapshotStore>, id: String) -> Result<Dataset, String> {
    let directory = store.directory.clone();
    tauri::async_runtime::spawn_blocking(move || read_snapshot(&directory, &id)).await.map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn create_tabular_snapshot(store: tauri::State<'_, SnapshotStore>, dataset: Option<Dataset>, text: Option<String>, source_path: Option<String>) -> Result<TabularSnapshot, String> {
    let directory = store.directory.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let count = dataset.is_some() as u8 + text.is_some() as u8 + source_path.is_some() as u8;
        if count != 1 { return Err("Supply exactly one dataset source".into()); }
        let data = if let Some(d) = dataset { d } else if let Some(t) = text { read_delimited(t.as_bytes(), b',', true, String::new(), None)? } else { read_file(&source_path.unwrap(), None, true, None)?.0 };
        snapshot(&directory, data)
    }).await.map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn export_tabular_result(dataset: Option<Dataset>, text: Option<String>, source_path: Option<String>, format: String, default_name: String) -> Result<Option<String>, String> {
    if !["csv", "tsv", "xlsx"].contains(&format.as_str()) { return Err("Unsupported export format".into()); }
    let count = dataset.is_some() as u8 + text.is_some() as u8 + source_path.is_some() as u8;
    if count != 1 { return Err("Supply exactly one export source".into()); }
    tauri::async_runtime::spawn_blocking(move || {
        let data = if let Some(d) = dataset { d } else if let Some(t) = text { read_delimited(t.as_bytes(), b',', true, String::new(), None)? } else { read_file(&source_path.unwrap(), None, true, None)?.0 };
        validate(&data)?;
        // All text is written as text, including strings beginning with '='.
        // Workbook export never executes/recreates formulas or remote links.
        let stem = Path::new(&default_name).file_stem().unwrap_or_default().to_string_lossy();
        let selected = rfd::FileDialog::new().set_file_name(format!("{stem}.{format}")).add_filter(format.to_uppercase(), &[format.as_str()]).save_file();
        let Some(mut path) = selected else { return Ok(None); };
        path.set_extension(&format);
        match format.as_str() { "xlsx" => write_xlsx(&data, &path)?, "tsv" => write_delimited(&data, &path, b'\t')?, _ => write_delimited(&data, &path, b',')? }
        Ok(Some(path.to_string_lossy().into_owned()))
    }).await.map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn delimited_preserves_identifiers_quotes_and_ragged_rows() {
        let data = read_delimited(b"id\tnote\tflag\r\n00123\t\"a\tb\"\tfalse\r\n0\t\"line1\nline2\"\r\n", b'\t', true, String::new(), None).unwrap();
        assert_eq!(data.rows[0][0], Cell::Text("00123".into()));
        assert_eq!(data.rows[0][1], Cell::Text("a\tb".into()));
        assert_eq!(data.rows[1][2], Cell::Null);
        assert_eq!(data.rows[1][1], Cell::Text("line1\nline2".into()));
    }
    #[test]
    fn workbook_types_sheets_and_immutable_snapshots() {
        let store = SnapshotStore::default(); fs::create_dir_all(&store.directory).unwrap();
        let input = store.directory.join("test.xlsx");
        let mut book = rust_xlsxwriter::Workbook::new();
        book.add_worksheet().set_name("Cover").unwrap().write_string(0, 0, "Cover").unwrap();
        let ws = book.add_worksheet(); ws.set_name("Records").unwrap();
        for (i, name) in ["id", "amount", "enabled", "note"].iter().enumerate() { ws.write_string(0, i as u16, *name).unwrap(); }
        ws.write_string(1, 0, "00123").unwrap(); ws.write_number(1, 1, 0.0).unwrap(); ws.write_boolean(1, 2, false).unwrap(); ws.write_string(1, 3, "=SUM(A1:A2)").unwrap();
        book.save(&input).unwrap();
        let (data, sheets) = read_file(input.to_str().unwrap(), Some("Records".into()), true, None).unwrap();
        assert_eq!(sheets, vec!["Cover", "Records"]);
        assert_eq!(data.rows[0], vec![Cell::Text("00123".into()), Cell::Number(0.0), Cell::Boolean(false), Cell::Text("=SUM(A1:A2)".into())]);
        let first = snapshot(&store.directory, data.clone()).unwrap();
        let mut changed = data.clone(); changed.rows[0][0] = Cell::Text("changed".into()); snapshot(&store.directory, changed).unwrap();
        assert_eq!(read_snapshot(&store.directory, &first.id).unwrap().rows, data.rows);
        let out = store.directory.join("export.xlsx"); write_xlsx(&data, &out).unwrap();
        assert_eq!(read_file(out.to_str().unwrap(), None, true, None).unwrap().0.rows, data.rows);
        assert!(read_snapshot(&store.directory, "../outside").is_err());
    }
    #[test]
    fn headers_and_headerless_import_are_explicit() {
        let data = read_delimited(b"name,name,\nx,y,z\n", b',', true, String::new(), None).unwrap();
        assert_eq!(data.columns, vec!["name", "name (2)", "Column 3"]);
        assert_eq!(data.warnings.len(), 2);
        let no_header = read_delimited(b"001,0\n002,1\n", b',', false, String::new(), None).unwrap();
        assert_eq!(no_header.rows.len(), 2);
        assert_eq!(no_header.rows[0][0], Cell::Text("001".into()));
    }
}
