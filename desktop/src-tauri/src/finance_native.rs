//! Local ledger sessions. Only summaries and bounded display pages cross IPC.
use crate::{
    editor::{EditorStore, Session},
    finance::{parse_date_to_iso, CategoryRule, MappingConfig},
    tabular::{Cell, Dataset},
};
use serde::{Deserialize, Serialize};
use std::{
    collections::{BTreeMap, HashMap},
    fs::File,
};

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Input {
    pub path: String,
    pub native_id: Option<String>,
}

fn csv_reader(path: &str) -> Result<csv::Reader<File>, String> {
    csv::ReaderBuilder::new()
        .has_headers(false)
        .flexible(true)
        .from_path(path)
        .map_err(|e| format!("{path}: {e}"))
}
fn header(path: &str) -> Result<(Vec<String>, csv::Position), String> {
    let mut reader = csv_reader(path)?;
    let keywords = [
        "date",
        "amount",
        "description",
        "payee",
        "credit",
        "debit",
        "balance",
        "category",
        "type",
        "post",
    ];
    let mut best = None;
    let mut score = 0;
    for record in reader.records().take(30) {
        let record = record.map_err(|e| format!("{path}: CSV header error: {e}"))?;
        if record.as_slice().len() > 1_048_576 {
            return Err(format!("{path}: Header candidate is too large"));
        }
        let lower = record.iter().collect::<Vec<_>>().join(",").to_lowercase();
        let current = keywords.iter().filter(|k| lower.contains(**k)).count();
        if best.is_none() || current > score {
            score = current;
            best = Some((
                record.iter().map(str::to_owned).collect(),
                record.position().unwrap().clone(),
            ));
        }
    }
    best.ok_or_else(|| format!("{path}: File is empty"))
}
fn columns(store: &EditorStore, input: &Input) -> Result<Vec<String>, String> {
    if let Some(id) = &input.native_id {
        Ok(store.get(id)?.base.columns.clone())
    } else {
        header(&input.path).map(|h| h.0)
    }
}
#[tauri::command]
pub async fn finance_headers(
    editor: tauri::State<'_, EditorStore>,
    inputs: Vec<Input>,
) -> Result<Vec<String>, String> {
    let store = editor.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        columns(&store, inputs.first().ok_or("No files selected")?)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[derive(Default, Serialize)]
pub struct Report {
    pub native_id: String,
    pub row_count: usize,
    pub warnings: Vec<String>,
    pub total_inflow: f64,
    pub total_outflow: f64,
    pub net_cashflow: f64,
    pub subscriptions: Vec<(String, f64, String)>,
    pub timeline_labels: Vec<String>,
    pub timeline_inflow: Vec<f64>,
    pub timeline_outflow: Vec<f64>,
    pub category_totals: BTreeMap<String, f64>,
}
fn amount(raw: &str) -> Result<f64, String> {
    let cleaned = raw.replace(['$', ',', '"'], "");
    let s = cleaned.trim();
    if s.is_empty() {
        return Ok(0.0);
    }
    let n = if s.starts_with('(') && s.ends_with(')') {
        -s[1..s.len() - 1]
            .parse::<f64>()
            .map_err(|_| "Invalid amount")?
    } else {
        s.parse::<f64>().map_err(|_| "Invalid amount")?
    };
    if n.is_finite() {
        Ok(n)
    } else {
        Err("Non-finite amount".into())
    }
}
fn indices(names: &[String], mapping: &MappingConfig) -> Result<[Option<usize>; 4], String> {
    let lookup = |s: &str| names.iter().position(|h| h == s);
    let result = [
        lookup(&mapping.date_col),
        lookup(&mapping.desc_col),
        mapping.cat_col.as_deref().and_then(lookup),
        lookup(&mapping.amt_col),
    ];
    if result[0].is_none() || result[1].is_none() || result[3].is_none() {
        Err("Required mapped date, description or amount column is missing".into())
    } else {
        Ok(result)
    }
}
fn build(
    store: &EditorStore,
    inputs: Vec<Input>,
    mapping: MappingConfig,
    rules: Vec<CategoryRule>,
) -> Result<Report, String> {
    if inputs.is_empty() {
        return Err("No files selected".into());
    }
    let rules = rules
        .into_iter()
        .map(|r| (r.keyword.to_lowercase(), r.category))
        .collect::<Vec<_>>();
    let mut rows = Vec::new();
    let mut invalid_dates = 0usize;
    let mut blank_amounts = 0usize;
    let mut skipped = 0usize;
    for input in &inputs {
        let names = columns(store, input)?;
        let ix = indices(&names, &mapping).map_err(|e| format!("{}: {e}", input.path))?;
        let mut push = |values: Vec<String>, row: usize| -> Result<(), String> {
            let val = |c: usize| {
                ix[c]
                    .and_then(|i| values.get(i))
                    .map(String::as_str)
                    .unwrap_or("")
            };
            let raw = val(0);
            let date = parse_date_to_iso(raw);
            let desc = val(1);
            let a=amount(val(3)).map_err(|e|format!("{}: record {row}: {e}. Correct the mapped amount or source value before analyzing.",input.path))?;
            if a == 0.0 && desc.is_empty() {
                skipped += 1;
                return Ok(());
            }
            if val(3).trim().is_empty() {
                blank_amounts += 1;
            }
            if chrono::NaiveDate::parse_from_str(&date, "%Y-%m-%d").is_err() {
                invalid_dates += 1;
            }
            let mut category = if val(2).is_empty() {
                "Uncategorized".to_owned()
            } else {
                val(2).to_owned()
            };
            let lower = desc.to_lowercase();
            for (keyword, name) in &rules {
                if lower.contains(keyword) {
                    category = name.clone();
                    break;
                }
            }
            rows.push(vec![
                Cell::Date(date),
                Cell::Text(desc.into()),
                Cell::Text(category),
                Cell::Number(a),
            ]);
            Ok(())
        };
        if let Some(id) = &input.native_id {
            let session = store.get(id)?;
            for r in 0..session.len() {
                push(
                    (0..session.base.columns.len())
                        .map(|c| session.cell(r, c).text())
                        .collect(),
                    r + 2,
                )?;
            }
        } else {
            let (_, position) = header(&input.path)?;
            let mut reader = csv_reader(&input.path)?;
            reader.seek(position).map_err(|e| e.to_string())?;
            let mut records = reader.records();
            records.next().transpose().map_err(|e| e.to_string())?;
            for (r, record) in records.enumerate() {
                let record =
                    record.map_err(|e| format!("{}: CSV record error: {e}", input.path))?;
                if record.len() != names.len() {
                    return Err(format!(
                        "{}: record {} has {} fields; expected {}. Analysis was not replaced.",
                        input.path,
                        r + 2,
                        record.len(),
                        names.len()
                    ));
                }
                push(record.iter().map(str::to_owned).collect(), r + 2)?;
            }
        }
    }
    rows.sort_by(|a, b| match (&a[0], &b[0]) {
        (Cell::Date(a), Cell::Date(b)) => a.cmp(b),
        _ => std::cmp::Ordering::Equal,
    });
    let mut report = Report::default();
    let mut months = BTreeMap::<String, (f64, f64)>::new();
    let mut recurring = HashMap::<String, (String, f64, usize)>::new();
    for row in &rows {
        let Cell::Number(a) = row[3] else {
            unreachable!()
        };
        let date = row[0].text();
        let desc = row[1].text();
        let cat = row[2].text();
        let month = if chrono::NaiveDate::parse_from_str(&date, "%Y-%m-%d").is_ok() {
            date.chars().take(7).collect()
        } else {
            "Unknown date".into()
        };
        let entry = months.entry(month).or_default();
        if a > 0.0 {
            report.total_inflow += a;
            entry.0 += a;
        } else {
            report.total_outflow += a.abs();
            entry.1 += a.abs();
            *report.category_totals.entry(cat).or_default() += a.abs();
        }
        report.net_cashflow += a;
        if a < 0.0 {
            let key = format!("{a:.2}|{desc}");
            let entry = recurring.entry(key).or_insert((desc, a.abs(), 0));
            entry.2 += 1;
        }
    }
    if ![
        report.total_inflow,
        report.total_outflow,
        report.net_cashflow,
    ]
    .iter()
    .all(|n| n.is_finite())
        || months
            .values()
            .any(|(a, b)| !a.is_finite() || !b.is_finite())
        || report.category_totals.values().any(|n| !n.is_finite())
    {
        return Err(
            "Financial totals exceed the supported numeric range. Analysis was not replaced."
                .into(),
        );
    }
    report.subscriptions = recurring
        .into_values()
        .filter(|r| r.2 >= 2)
        .map(|r| (r.0, r.1, format!("{}x Detected", r.2)))
        .collect();
    report
        .subscriptions
        .sort_by(|a, b| b.1.total_cmp(&a.1).then(a.0.cmp(&b.0)));
    report.subscriptions.truncate(15);
    for (month, (inflow, outflow)) in months {
        report.timeline_labels.push(month);
        report.timeline_inflow.push(inflow);
        report.timeline_outflow.push(outflow);
    }
    for (count,description) in [(invalid_dates,"transactions have unrecognized dates; their amounts remain included under Unknown date"),(blank_amounts,"transactions have blank amounts, treated as zero"),(skipped,"empty description / zero amount records were omitted")] {if count>0{report.warnings.push(format!("{count} {description}."));}}
    report.row_count = rows.len();
    let data = Dataset {
        columns: vec![
            "Date".into(),
            "Description".into(),
            "Category".into(),
            "Amount".into(),
        ],
        rows,
        source: "Analyzed transactions".into(),
        sheet: None,
        warnings: report.warnings.clone(),
    };
    report.native_id = store.insert(Session::new(data))?;
    Ok(report)
}
#[tauri::command]
pub async fn open_finance_ledger(
    editor: tauri::State<'_, EditorStore>,
    inputs: Vec<Input>,
    mapping: MappingConfig,
    rules: Vec<CategoryRule>,
    budget_categories: Vec<String>,
) -> Result<Report, String> {
    let store = editor.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let mut report = build(&store, inputs, mapping, rules)?;
        let requested = budget_categories
            .into_iter()
            .collect::<std::collections::HashSet<_>>();
        report
            .category_totals
            .retain(|category, _| requested.contains(category));
        for recurring in &mut report.subscriptions {
            if recurring.0.chars().count() > 512 {
                recurring.0 = format!("{}…", recurring.0.chars().take(512).collect::<String>());
            }
        }
        Ok(report)
    })
    .await
    .map_err(|e| e.to_string())?
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LedgerPage {
    rows: Vec<Vec<Cell>>,
    offset: usize,
    row_count: usize,
    truncated: bool,
}
fn preview(cell: &Cell) -> (Cell, bool) {
    match cell {
        Cell::Text(s) | Cell::Date(s) if s.chars().count() > 512 => {
            let clipped = format!("{}…", s.chars().take(512).collect::<String>());
            (Cell::Text(clipped), true)
        }
        _ => (cell.clone(), false),
    }
}
fn page(session: &Session, query: &str, offset: usize, limit: usize) -> Result<LedgerPage, String> {
    if limit == 0 || limit > 100 {
        return Err("Ledger page size must be 1–100".into());
    }
    let q = query.to_lowercase();
    if q.is_empty() {
        if offset > session.len() {
            return Err("Ledger page offset is outside the dataset".into());
        }
        let mut truncated = false;
        let rows = (offset..offset.saturating_add(limit).min(session.len()))
            .map(|r| {
                (0..4)
                    .map(|c| {
                        let (v, t) = preview(session.cell(r, c));
                        truncated |= t;
                        v
                    })
                    .collect()
            })
            .collect();
        return Ok(LedgerPage {
            rows,
            offset,
            row_count: session.len(),
            truncated,
        });
    }
    let mut count = 0;
    let mut rows = Vec::new();
    let mut truncated = false;
    for r in 0..session.len() {
        if !q.is_empty()
            && !session.cell(r, 1).text().to_lowercase().contains(&q)
            && !session.cell(r, 2).text().to_lowercase().contains(&q)
        {
            continue;
        }
        if count >= offset && rows.len() < limit {
            rows.push(
                (0..4)
                    .map(|c| {
                        let (v, t) = preview(session.cell(r, c));
                        truncated |= t;
                        v
                    })
                    .collect(),
            );
        }
        count += 1;
    }
    if offset > count {
        return Err("Ledger page offset is outside the search results".into());
    }
    Ok(LedgerPage {
        rows,
        offset,
        row_count: count,
        truncated,
    })
}
#[tauri::command]
pub async fn read_finance_page(
    editor: tauri::State<'_, EditorStore>,
    id: String,
    query: String,
    offset: usize,
    limit: usize,
) -> Result<LedgerPage, String> {
    let session = editor.get(&id)?;
    if session.base.columns != ["Date", "Description", "Category", "Amount"] {
        return Err("Not a financial ledger".into());
    }
    tauri::async_runtime::spawn_blocking(move || page(&session, &query, offset, limit))
        .await
        .map_err(|e| e.to_string())?
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    #[ignore = "Writes a million financial records for the native ledger stress test"]
    fn million_row_financial_ledger() {
        let dir = std::env::temp_dir().join(uuid::Uuid::new_v4().to_string());
        std::fs::create_dir(&dir).unwrap();
        let path = dir.join("million-financial.csv");
        let mut writer = csv::Writer::from_path(&path).unwrap();
        writer
            .write_record(["Date", "Description", "Amount", "Category"])
            .unwrap();
        for i in 0..1_000_000 {
            writer
                .write_record([
                    format!("2026-{:02}-{:02}", i % 12 + 1, i % 28 + 1),
                    format!("group-{}", i % 10000),
                    if i % 10 == 0 {
                        "1000".into()
                    } else {
                        "-100".into()
                    },
                    format!("Category {}", i % 20),
                ])
                .unwrap();
        }
        writer.flush().unwrap();
        let store = EditorStore::default();
        let started = std::time::Instant::now();
        let report = build(
            &store,
            vec![Input {
                path: path.to_string_lossy().into_owned(),
                native_id: None,
            }],
            mapping(),
            vec![],
        )
        .unwrap();
        let parse_ms = started.elapsed().as_millis();
        assert_eq!(report.row_count, 1_000_000);
        assert_eq!(report.total_inflow, 100_000_000.0);
        assert_eq!(report.total_outflow, 90_000_000.0);
        assert_eq!(report.net_cashflow, 10_000_000.0);
        let session = store.get(&report.native_id).unwrap();
        let started = std::time::Instant::now();
        let last = page(&session, "", 999900, 100).unwrap();
        let page_ms = started.elapsed().as_millis();
        assert_eq!(last.rows.len(), 100);
        let started = std::time::Instant::now();
        let filtered = page(&session, "group-9999", 0, 100).unwrap();
        let search_ms = started.elapsed().as_millis();
        assert_eq!(filtered.row_count, 100);
        assert_eq!(filtered.rows.len(), 100);
        assert!(serde_json::to_vec(&report).unwrap().len() < 32768);
        assert!(serde_json::to_vec(&last).unwrap().len() < 131072);
        println!("FINANCE_BENCH rows=1000000 parse_and_analyze_ms={parse_ms} last_page_ms={page_ms} search_ms={search_ms} summary_bytes={} page_bytes={}",serde_json::to_vec(&report).unwrap().len(),serde_json::to_vec(&last).unwrap().len());
    }
    fn mapping() -> MappingConfig {
        MappingConfig {
            date_col: "Date".into(),
            desc_col: "Description".into(),
            amt_col: "Amount".into(),
            cat_col: Some("Category".into()),
        }
    }
    fn input(store: &EditorStore) -> Input {
        let id = store
            .insert(Session::new(Dataset {
                columns: vec![
                    "Date".into(),
                    "Description".into(),
                    "Amount".into(),
                    "Category".into(),
                ],
                rows: vec![
                    vec![
                        Cell::Text("10/08/2026".into()),
                        Cell::Text("Salary".into()),
                        Cell::Text("$1,000.00".into()),
                        Cell::Null,
                    ],
                    vec![
                        Cell::Text("2026-10-09".into()),
                        Cell::Text("STREAM".into()),
                        Cell::Text("(25.50)".into()),
                        Cell::Text("Other".into()),
                    ],
                    vec![
                        Cell::Text("2026-11-09".into()),
                        Cell::Text("STREAM".into()),
                        Cell::Number(-25.5),
                        Cell::Text("Other".into()),
                    ],
                ],
                source: String::new(),
                sheet: None,
                warnings: vec![],
            }))
            .unwrap();
        Input {
            path: "fixture".into(),
            native_id: Some(id),
        }
    }
    #[test]
    fn totals_rules_pages_and_atomic_failure() {
        let store = EditorStore::default();
        let input = input(&store);
        let report = build(
            &store,
            vec![input.clone()],
            mapping(),
            vec![CategoryRule {
                keyword: "stream".into(),
                category: "Media".into(),
            }],
        )
        .unwrap();
        assert_eq!(report.total_inflow, 1000.0);
        assert_eq!(report.total_outflow, 51.0);
        assert_eq!(report.net_cashflow, 949.0);
        assert_eq!(report.category_totals["Media"], 51.0);
        assert_eq!(
            report.subscriptions,
            vec![("STREAM".into(), 25.5, "2x Detected".into())]
        );
        let session = store.get(&report.native_id).unwrap();
        let p = page(&session, "media", 1, 1).unwrap();
        assert_eq!(p.row_count, 2);
        assert_eq!(p.rows.len(), 1);
        assert!(page(&session, "", 0, 101).is_err());
        assert!(build(
            &store,
            vec![
                input,
                Input {
                    path: "missing-file.csv".into(),
                    native_id: None
                }
            ],
            mapping(),
            vec![]
        )
        .is_err());
        assert_eq!(store.get(&report.native_id).unwrap().len(), 3);
        let output =
            std::env::temp_dir().join(format!("finance-export-{}.csv", uuid::Uuid::new_v4()));
        crate::editor::write_csv(&session, &output, b',').unwrap();
        let mut exported = csv::Reader::from_path(output).unwrap();
        let rows = exported.records().collect::<Result<Vec<_>, _>>().unwrap();
        assert_eq!(rows.len(), 3);
        assert_eq!(&rows[0][1], "Salary");
        assert_eq!(&rows[1][2], "Media");
        assert_eq!(
            rows.iter()
                .map(|r| r[3].parse::<f64>().unwrap())
                .sum::<f64>(),
            949.0
        );
        assert!(amount("NaN").is_err());
        assert!(amount("bad").is_err());
    }
    #[test]
    fn streamed_preamble_quotes_and_invalid_values() {
        let dir = std::env::temp_dir().join(uuid::Uuid::new_v4().to_string());
        std::fs::create_dir(&dir).unwrap();
        let path = dir.join("statement.csv");
        std::fs::write(&path,"Bank statement\nDate,Description,Amount,Category\n2026-10-08,\"Quoted, payee\",-12.50,Food\nunknown,\"Multi\nline\",5,Other\n").unwrap();
        let store = EditorStore::default();
        let report = build(
            &store,
            vec![Input {
                path: path.to_string_lossy().into_owned(),
                native_id: None,
            }],
            mapping(),
            vec![],
        )
        .unwrap();
        assert_eq!(report.row_count, 2);
        assert_eq!(report.net_cashflow, -7.5);
        assert_eq!(report.warnings.len(), 1);
        assert!(report.timeline_labels.contains(&"Unknown date".into()));
        assert_eq!(
            store.get(&report.native_id).unwrap().cell(0, 1).text(),
            "Quoted, payee"
        );
    }
    #[test]
    fn long_unicode_preview_keeps_full_value() {
        let store = EditorStore::default();
        let mut data = store
            .get(&input(&store).native_id.unwrap())
            .unwrap()
            .base
            .as_ref()
            .clone();
        data.rows[0][1] = Cell::Text("界".repeat(10000));
        let report = build(
            &store,
            vec![Input {
                path: "unicode".into(),
                native_id: Some(store.insert(Session::new(data)).unwrap()),
            }],
            mapping(),
            vec![],
        )
        .unwrap();
        let session = store.get(&report.native_id).unwrap();
        assert_eq!(session.cell(0, 1).text().chars().count(), 10000);
        let p = page(&session, "", 0, 100).unwrap();
        assert!(p.truncated);
        assert_eq!(p.rows[0][1].text().chars().count(), 513);
    }
}
