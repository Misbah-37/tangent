//! Staged SQL results: only completed streams become exportable editor sessions.
use crate::{
    editor::{EditorStore, Session},
    tabular::{Cell, Dataset, TabularSnapshot},
};
use serde::Serialize;
use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};

#[derive(Default, Clone)]
pub struct SqlResults {
    pending: Arc<Mutex<HashMap<String, Dataset>>>,
}
impl SqlResults {
    pub(crate) fn append_arrow(&self, id: &str, offset: usize, bytes: &[u8]) -> Result<(), String> {
        let columns = self
            .pending
            .lock()
            .map_err(|_| "SQL result store unavailable")?
            .get(id)
            .ok_or("SQL result staging session is unavailable")?
            .columns
            .clone();
        let rows = crate::sql_arrow::decode(bytes, &columns)?;
        let mut pending = self
            .pending
            .lock()
            .map_err(|_| "SQL result store unavailable")?;
        let data = pending
            .get_mut(id)
            .ok_or("SQL result staging session is unavailable")?;
        if offset != data.rows.len() {
            return Err("SQL result batch is out of sequence".into());
        }
        data.rows.extend(rows);
        Ok(())
    }
    pub(crate) fn begin(&self, columns: Vec<String>) -> Result<String, String> {
        if columns.is_empty() || columns.len() > 32768 {
            return Err("SQL result must have 1–32768 columns".into());
        }
        let id = uuid::Uuid::new_v4().to_string();
        self.pending
            .lock()
            .map_err(|_| "SQL result store unavailable")?
            .insert(
                id.clone(),
                Dataset {
                    columns,
                    rows: vec![],
                    source: "Current query results".into(),
                    sheet: None,
                    warnings: vec![],
                },
            );
        Ok(id)
    }
    fn append(&self, id: &str, offset: usize, rows: Vec<Vec<Cell>>) -> Result<(), String> {
        let mut pending = self
            .pending
            .lock()
            .map_err(|_| "SQL result store unavailable")?;
        let data = pending
            .get_mut(id)
            .ok_or("SQL result staging session is unavailable")?;
        if offset != data.rows.len() {
            return Err("SQL result batch is out of sequence".into());
        }
        if rows.len() > 2048 || rows.len().saturating_mul(data.columns.len()) > 32768 {
            return Err("SQL result batch exceeds row/cell limit".into());
        }
        let mut bytes = 0usize;
        for row in &rows {
            if row.len() != data.columns.len() {
                return Err("SQL result columns do not match".into());
            }
            for cell in row {
                bytes = bytes.saturating_add(match cell {
                    Cell::Text(s) | Cell::Date(s) => s.len(),
                    _ => 32,
                });
                if matches!(cell,Cell::Number(n) if !n.is_finite()) {
                    return Err("SQL result contains a non-finite numeric cell".into());
                }
            }
        }
        if bytes > 4 * 1024 * 1024 {
            return Err("SQL result batch exceeds 4 MiB. A single oversized row cannot be transferred safely.".into());
        }
        data.rows.extend(rows);
        Ok(())
    }
    fn abort(&self, id: &str) -> Result<(), String> {
        self.pending
            .lock()
            .map_err(|_| "SQL result store unavailable")?
            .remove(id);
        Ok(())
    }
    pub(crate) fn finish(
        &self,
        editor: &EditorStore,
        id: &str,
        expected: usize,
    ) -> Result<TabularSnapshot, String> {
        let mut pending = self
            .pending
            .lock()
            .map_err(|_| "SQL result store unavailable")?;
        let data = pending
            .get(id)
            .ok_or("SQL result staging session is unavailable")?;
        if data.rows.len() != expected {
            return Err("Incomplete SQL result stream".into());
        }
        let session = Session::new(pending.remove(id).unwrap());
        let id = editor.insert(session.clone())?;
        Ok(session.metadata(id, String::new(), 0))
    }
}
#[tauri::command]
pub async fn begin_sql_result(
    store: tauri::State<'_, SqlResults>,
    columns: Vec<String>,
) -> Result<String, String> {
    store.begin(columns)
}
#[tauri::command]
pub async fn append_sql_result(
    store: tauri::State<'_, SqlResults>,
    id: String,
    offset: usize,
    rows: Vec<Vec<Cell>>,
) -> Result<(), String> {
    store.append(&id, offset, rows)
}
#[tauri::command]
pub async fn abort_sql_result(
    store: tauri::State<'_, SqlResults>,
    id: String,
) -> Result<(), String> {
    store.abort(&id)
}
#[tauri::command]
pub async fn finish_sql_result(
    store: tauri::State<'_, SqlResults>,
    editor: tauri::State<'_, EditorStore>,
    id: String,
    expected: usize,
) -> Result<TabularSnapshot, String> {
    store.finish(&editor, &id, expected)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Preview {
    rows: Vec<Vec<Cell>>,
    row_count: usize,
    truncated: bool,
}
#[tauri::command]
pub async fn read_sql_page(
    editor: tauri::State<'_, EditorStore>,
    id: String,
    offset: usize,
    limit: usize,
) -> Result<Preview, String> {
    let session = editor.get(&id)?;
    if limit == 0 || limit > 1000 || limit.saturating_mul(session.base.columns.len()) > 32768 {
        return Err("SQL preview exceeds page limit".into());
    }
    if offset > session.len() {
        return Err("SQL page offset is outside result".into());
    }
    let mut truncated = false;
    let character_limit =
        (131072 / limit.saturating_mul(session.base.columns.len()).max(1)).clamp(1, 512);
    let rows = (offset..offset.saturating_add(limit).min(session.len()))
        .map(|r| {
            (0..session.base.columns.len())
                .map(|c| match session.cell(r, c) {
                    Cell::Text(s) | Cell::Date(s) if s.chars().count() > character_limit => {
                        truncated = true;
                        Cell::Text(format!(
                            "{}…",
                            s.chars().take(character_limit).collect::<String>()
                        ))
                    }
                    cell => cell.clone(),
                })
                .collect()
        })
        .collect();
    Ok(Preview {
        rows,
        row_count: session.len(),
        truncated,
    })
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn staged_results_are_atomic_and_preserve_values() {
        let store = SqlResults::default();
        let editor = EditorStore::default();
        let id = store.begin(vec!["value".into(), "value".into()]).unwrap();
        let rows = vec![
            vec![Cell::Text("9007199254740993".into()), Cell::Null],
            vec![Cell::Text("quoted,\nΩ".into()), Cell::Number(1.25)],
        ];
        assert!(store.append(&id, 1, rows.clone()).is_err());
        assert!(store.append(&id, 0, vec![vec![Cell::Null]]).is_err());
        store.append(&id, 0, rows.clone()).unwrap();
        assert!(store.finish(&editor, &id, 3).is_err());
        let meta = store.finish(&editor, &id, 2).unwrap();
        let session = editor.get(&meta.tabular_id).unwrap();
        assert_eq!(session.base.rows, rows);
        assert!(store.finish(&editor, &id, 2).is_err());
        let aborted = store.begin(vec!["a".into()]).unwrap();
        store.abort(&aborted).unwrap();
        assert!(store.append(&aborted, 0, vec![]).is_err());
    }
}
