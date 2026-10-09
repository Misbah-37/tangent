//! Binary SQL batches, preserving the value-only native editor contract.
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn browser_arrow_preserves_exact_values_and_atomic_staging() {
        let path =
            std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../testing/artifacts/sql-arrow");
        let bytes = std::fs::read(path.join("precision.arrow"))
            .expect("Run test-sql-results.cjs first to generate the real DuckDB Arrow fixture");
        let columns: Vec<String> =
            serde_json::from_slice(&std::fs::read(path.join("columns.json")).unwrap()).unwrap();
        let expected = vec![vec![
            Cell::Text("9007199254740993".into()),
            Cell::Text("1234567890.123456".into()),
            Cell::Date("2026-10-09T12:34:56.123456Z".into()),
            Cell::Null,
            Cell::Text("<img src=x onerror=window.injected=1>".into()),
        ]];
        assert_eq!(decode(&bytes, &columns).unwrap(), expected);
        assert!(decode(&bytes, &["wrong".into()]).is_err());
        assert!(decode(&bytes[..bytes.len() / 2], &columns).is_err());
        let store = SqlResults::default();
        let editor = crate::editor::EditorStore::default();
        let id = store.begin(columns).unwrap();
        assert!(store
            .append_arrow(&id, 0, &bytes[..bytes.len() / 2])
            .is_err());
        assert!(store.append_arrow(&id, 1, &bytes).is_err());
        store.append_arrow(&id, 0, &bytes).unwrap();
        let result = store.finish(&editor, &id, 1).unwrap();
        assert_eq!(editor.get(&result.tabular_id).unwrap().base.rows, expected);
    }
}
use crate::{sql_results::SqlResults, tabular::Cell};
use arrow_array::*;
use arrow_schema::{DataType, TimeUnit};
use std::io::Cursor;
fn value(array: &dyn Array, row: usize) -> Result<Cell, String> {
    if array.is_null(row) {
        return Ok(Cell::Null);
    }
    macro_rules! raw {
        ($t:ty) => {
            array
                .as_any()
                .downcast_ref::<$t>()
                .ok_or("Invalid Arrow array")?
                .value(row)
        };
    }
    macro_rules! number {
        ($t:ty) => {
            Cell::Number(raw!($t) as f64)
        };
    }
    macro_rules! integer {
        ($t:ty) => {
            Cell::Text(raw!($t).to_string())
        };
    }
    Ok(match array.data_type() {
        DataType::Null => Cell::Null,
        DataType::Int8 => number!(Int8Array),
        DataType::Int16 => number!(Int16Array),
        DataType::Int32 => number!(Int32Array),
        DataType::UInt8 => number!(UInt8Array),
        DataType::UInt16 => number!(UInt16Array),
        DataType::UInt32 => number!(UInt32Array),
        DataType::Int64 => integer!(Int64Array),
        DataType::UInt64 => integer!(UInt64Array),
        DataType::Float16 | DataType::Float32 | DataType::Float64 => {
            let n = match array.data_type() {
                DataType::Float16 => raw!(Float16Array).to_f64(),
                DataType::Float32 => raw!(Float32Array) as f64,
                _ => raw!(Float64Array),
            };
            if n.is_finite() {
                Cell::Number(n)
            } else {
                Cell::Text(if n.is_nan() {
                    "NaN".into()
                } else if n.is_sign_negative() {
                    "-Infinity".into()
                } else {
                    "Infinity".into()
                })
            }
        }
        DataType::Boolean => Cell::Boolean(raw!(BooleanArray)),
        DataType::Utf8 => Cell::Text(raw!(StringArray).into()),
        DataType::LargeUtf8 => Cell::Text(raw!(LargeStringArray).into()),
        DataType::Decimal128(_, _) | DataType::Decimal256(_, _) => {
            let options = arrow_cast::display::FormatOptions::default();
            let formatter = arrow_cast::display::ArrayFormatter::try_new(array, &options)
                .map_err(|e| e.to_string())?;
            Cell::Text(formatter.value(row).to_string())
        }
        DataType::Date32 | DataType::Date64 => {
            let millis = if matches!(array.data_type(), DataType::Date32) {
                raw!(Date32Array) as i64 * 86_400_000
            } else {
                raw!(Date64Array)
            };
            Cell::Date(
                chrono::DateTime::from_timestamp_millis(millis)
                    .ok_or("Date is outside the supported ISO range")?
                    .format("%Y-%m-%d")
                    .to_string(),
            )
        }
        DataType::Timestamp(unit, _) => {
            let raw = match unit {
                TimeUnit::Second => raw!(TimestampSecondArray),
                TimeUnit::Millisecond => raw!(TimestampMillisecondArray),
                TimeUnit::Microsecond => raw!(TimestampMicrosecondArray),
                TimeUnit::Nanosecond => raw!(TimestampNanosecondArray),
            } as i128;
            let (factor, precision) = match unit {
                TimeUnit::Second => (1_000_000_000, 0),
                TimeUnit::Millisecond => (1_000_000, 3),
                TimeUnit::Microsecond => (1_000, 6),
                TimeUnit::Nanosecond => (1, 9),
            };
            let ns = raw * factor;
            let date = chrono::DateTime::from_timestamp(
                ns.div_euclid(1_000_000_000)
                    .try_into()
                    .map_err(|_| "Timestamp overflow")?,
                ns.rem_euclid(1_000_000_000) as u32,
            )
            .ok_or("Timestamp is outside the supported ISO range")?;
            let mut text = date.format("%Y-%m-%dT%H:%M:%S").to_string();
            if precision > 0 {
                text.push('.');
                text.push_str(&format!("{:09}", date.timestamp_subsec_nanos())[..precision]);
            }
            text.push('Z');
            Cell::Date(text)
        }
        DataType::Binary | DataType::LargeBinary | DataType::FixedSizeBinary(_) => {
            let bytes = match array.data_type() {
                DataType::Binary => raw!(BinaryArray),
                DataType::LargeBinary => raw!(LargeBinaryArray),
                _ => raw!(FixedSizeBinaryArray),
            };
            use std::fmt::Write;
            let mut hex = String::with_capacity(2 + bytes.len() * 2);
            hex.push_str("0x");
            for byte in bytes {
                write!(&mut hex, "{byte:02x}").unwrap();
            }
            Cell::Text(hex)
        }
        kind => return Err(format!("Unsupported binary SQL type: {kind}")),
    })
}
pub(crate) fn decode(bytes: &[u8], columns: &[String]) -> Result<Vec<Vec<Cell>>, String> {
    if bytes.len() > 4 * 1024 * 1024 {
        return Err("Arrow transfer exceeds 4 MiB".into());
    }
    let reader = arrow_ipc::reader::StreamReader::try_new(Cursor::new(bytes), None)
        .map_err(|e| e.to_string())?;
    if reader
        .schema()
        .fields()
        .iter()
        .map(|f| f.name())
        .ne(columns.iter())
    {
        return Err("Arrow result schema does not match staging columns".into());
    }
    let mut rows = Vec::new();
    for batch in reader {
        let batch = batch.map_err(|e| e.to_string())?;
        if rows.len().saturating_add(batch.num_rows()) > 16384
            || rows
                .len()
                .saturating_add(batch.num_rows())
                .saturating_mul(columns.len())
                > 131072
        {
            return Err("Arrow result exceeds row/cell limit".into());
        }
        for row in 0..batch.num_rows() {
            rows.push(
                batch
                    .columns()
                    .iter()
                    .map(|col| value(col.as_ref(), row))
                    .collect::<Result<Vec<_>, _>>()?,
            );
        }
    }
    Ok(rows)
}
#[tauri::command]
pub async fn append_sql_arrow(
    store: tauri::State<'_, SqlResults>,
    request: tauri::ipc::Request<'_>,
) -> Result<(), String> {
    let header = |name: &str| {
        request
            .headers()
            .get(name)
            .and_then(|v| v.to_str().ok())
            .map(str::to_owned)
            .ok_or("Missing Arrow transfer header".to_string())
    };
    let id = header("x-sql-id")?;
    let offset = header("x-sql-offset")?
        .parse::<usize>()
        .map_err(|_| "Invalid Arrow batch offset")?;
    let bytes = match request.body() {
        tauri::ipc::InvokeBody::Raw(bytes) if bytes.len() <= 4 * 1024 * 1024 => bytes.clone(),
        _ => return Err("Expected bounded raw Arrow bytes".into()),
    };
    let store = store.inner().clone();
    tauri::async_runtime::spawn_blocking(move || store.append_arrow(&id, offset, &bytes))
        .await
        .map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn read_editor_arrow(
    editor: tauri::State<'_, crate::editor::EditorStore>,
    id: String,
    offset: usize,
    limit: usize,
    kinds: Vec<String>,
) -> Result<tauri::ipc::Response, String> {
    let session = editor.get(&id)?;
    tauri::async_runtime::spawn_blocking(move || {
        let columns = &session.base.columns;
        if limit == 0
            || limit > 16384
            || limit.saturating_mul(columns.len()) > 131072
            || kinds.len() != columns.len()
            || offset > session.len()
        {
            return Err("Invalid Arrow import page".into());
        }
        let end = offset.saturating_add(limit).min(session.len());
        let mut fields = Vec::new();
        let mut arrays: Vec<ArrayRef> = Vec::new();
        for (c, kind) in kinds.iter().enumerate() {
            let array: ArrayRef = match kind.as_str() {
                "number" => {
                    let mut builder = arrow_array::builder::Float64Builder::new();
                    for r in offset..end {
                        match session.cell(r, c) {
                            Cell::Null => builder.append_null(),
                            Cell::Number(n) => builder.append_value(*n),
                            _ => return Err("Column type changed during SQL import".into()),
                        }
                    }
                    std::sync::Arc::new(builder.finish())
                }
                "boolean" => {
                    let mut builder = arrow_array::builder::BooleanBuilder::new();
                    for r in offset..end {
                        match session.cell(r, c) {
                            Cell::Null => builder.append_null(),
                            Cell::Boolean(b) => builder.append_value(*b),
                            _ => return Err("Column type changed during SQL import".into()),
                        }
                    }
                    std::sync::Arc::new(builder.finish())
                }
                "text" => {
                    let mut builder = arrow_array::builder::StringBuilder::new();
                    for r in offset..end {
                        match session.cell(r, c) {
                            Cell::Null => builder.append_null(),
                            Cell::Text(s) | Cell::Date(s) => builder.append_value(s),
                            cell => builder.append_value(cell.text()),
                        }
                    }
                    std::sync::Arc::new(builder.finish())
                }
                _ => return Err("Invalid SQL column type".into()),
            };
            fields.push(arrow_schema::Field::new(
                &columns[c],
                array.data_type().clone(),
                true,
            ));
            arrays.push(array);
        }
        let schema = std::sync::Arc::new(arrow_schema::Schema::new(fields));
        let batch = RecordBatch::try_new(schema.clone(), arrays).map_err(|e| e.to_string())?;
        let mut bytes = Vec::new();
        {
            let mut writer = arrow_ipc::writer::StreamWriter::try_new(&mut bytes, &schema)
                .map_err(|e| e.to_string())?;
            writer.write(&batch).map_err(|e| e.to_string())?;
            writer.finish().map_err(|e| e.to_string())?;
        }
        if bytes.len() > 4 * 1024 * 1024 {
            return Err("ARROW_PAGE_TOO_LARGE".into());
        }
        Ok(tauri::ipc::Response::new(bytes))
    })
    .await
    .map_err(|e| e.to_string())?
}
