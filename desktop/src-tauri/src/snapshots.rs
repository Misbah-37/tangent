use serde::Serialize;
use std::{fs, path::PathBuf};

pub struct SnapshotStore { pub(crate) directory: PathBuf }
impl Default for SnapshotStore {
    fn default() -> Self { Self { directory: std::env::temp_dir().join(format!("tangent-session-{}", uuid::Uuid::new_v4())) } }
}
impl SnapshotStore {
    pub fn cleanup(&self) { let _ = fs::remove_dir_all(&self.directory); }
}
impl Drop for SnapshotStore {
    fn drop(&mut self) { let _ = fs::remove_dir_all(&self.directory); }
}
#[derive(Serialize)]
pub struct Snapshot { pub id: String, pub path: String, pub bytes: u64 }
fn create(directory: PathBuf, text: Option<String>, source_path: Option<String>, ext: String) -> Result<Snapshot, String> {
    if !["csv", "json", "parquet", "html", "htm", "log", "txt", "gz"].contains(&ext.as_str()) { return Err("Unsupported snapshot format".into()); }
    if text.is_some() == source_path.is_some() { return Err("Supply exactly one snapshot source".into()); }
    fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let path = directory.join(format!("{}.{}", id, ext));
    let bytes = if let Some(text) = text { fs::write(&path, text.as_bytes()).map_err(|e| e.to_string())?; text.len() as u64 }
        else { fs::copy(source_path.unwrap(), &path).map_err(|e| e.to_string())? };
    Ok(Snapshot { id, path: path.to_string_lossy().into_owned(), bytes })
}
#[tauri::command]
pub async fn create_dataset_snapshot(store: tauri::State<'_, SnapshotStore>, text: Option<String>, source_path: Option<String>, ext: String) -> Result<Snapshot, String> {
    let directory = store.directory.clone();
    tauri::async_runtime::spawn_blocking(move || create(directory, text, source_path, ext)).await.map_err(|e| e.to_string())?
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn independent_snapshots_and_validation() {
        let store = SnapshotStore::default();
        assert!(create(store.directory.clone(), Some("x".into()), None, "../csv".into()).is_err());
        assert!(create(store.directory.clone(), None, None, "csv".into()).is_err());
        let first = create(store.directory.clone(), Some("name,value\nAda,0\n".into()), None, "csv".into()).unwrap();
        let second = create(store.directory.clone(), None, Some(first.path.clone()), "csv".into()).unwrap();
        fs::write(&first.path, "changed").unwrap();
        assert_eq!(fs::read_to_string(&second.path).unwrap(), "name,value\nAda,0\n");
        assert_ne!(first.id, second.id);
    }
}
