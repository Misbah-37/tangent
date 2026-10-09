//! Insights computation stays with the native dataset; only chart summaries cross IPC.
use crate::editor::{EditorStore, Session};
use crate::tabular::Cell;
use crate::tabular::TabularSnapshot;
use chrono::{Datelike, Duration, Local, NaiveDate, TimeZone, Utc};
use regex::Regex;
use serde::Deserialize;
use serde_json::{json, Value};
use std::borrow::Cow;
use std::collections::{HashMap, HashSet};
use std::sync::OnceLock;

fn cell_text(cell: &Cell) -> Cow<'_, str> {
    match cell {
        Cell::Text(s) | Cell::Date(s) => Cow::Borrowed(s),
        Cell::Boolean(true) => Cow::Borrowed("true"),
        Cell::Boolean(false) => Cow::Borrowed("false"),
        Cell::Null => Cow::Borrowed(""),
        Cell::Number(n) => Cow::Owned(n.to_string()),
    }
}

fn numeric(s: &str) -> Option<f64> {
    static RE: OnceLock<Regex> = OnceLock::new();
    if !RE
        .get_or_init(|| Regex::new(r"^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$").unwrap())
        .is_match(s)
    {
        return None;
    }
    s.parse::<f64>().ok().filter(|n| n.is_finite())
}
fn date(s: &str) -> Option<f64> {
    // Match the web profiler's allowed token shapes; date-only ISO uses UTC.
    static RE: OnceLock<Regex> = OnceLock::new();
    if !RE
        .get_or_init(|| {
            Regex::new(
                r"^(\d{4}-\d{1,2}-\d{1,2}([T ]\d{1,2}:\d{2}(:\d{2})?)?|\d{1,2}/\d{1,2}/\d{2,4})$",
            )
            .unwrap()
        })
        .is_match(s)
    {
        return None;
    }
    let (date_part, time_part) = s
        .split_once(['T', ' '])
        .map_or((s, None), |(d, t)| (d, Some(t)));
    if s.contains('T') && (date_part.len() != 10 || time_part?.split(':').next()?.len() != 2) {
        return None;
    }
    let slash = date_part.contains('/');
    let parts = date_part
        .split(if slash { '/' } else { '-' })
        .map(|p| p.parse::<u32>().ok())
        .collect::<Option<Vec<_>>>()?;
    if parts.len() != 3 {
        return None;
    }
    let (mut year, month, day) = if slash {
        (parts[2] as i32, parts[0], parts[1])
    } else {
        (parts[0] as i32, parts[1], parts[2])
    };
    if slash && year < 100 {
        year += if year < 50 { 2000 } else { 1900 };
    }
    if !(1..=31).contains(&day) {
        return None;
    }
    // Date.parse normalizes an otherwise valid February/30-day-month token.
    let d = NaiveDate::from_ymd_opt(year, month, 1)?
        .checked_add_signed(Duration::days((day - 1) as i64))?;
    if !slash && time_part.is_none() && date_part.len() == 10 {
        return Some(d.and_hms_opt(0, 0, 0)?.and_utc().timestamp_millis() as f64);
    }
    let mut dt = d.and_hms_opt(0, 0, 0)?;
    if let Some(time) = time_part {
        let parts = time
            .split(':')
            .map(|p| p.parse::<u32>().ok())
            .collect::<Option<Vec<_>>>()?;
        let hour = *parts.first()?;
        let minute = *parts.get(1)?;
        let second = parts.get(2).copied().unwrap_or(0);
        if hour == 24 && minute == 0 && second == 0 {
            dt = dt.checked_add_signed(Duration::days(1))?
        } else {
            dt = d.and_hms_opt(hour, minute, second)?
        }
    }
    Local
        .from_local_datetime(&dt)
        .earliest()
        .map(|v| v.timestamp_millis() as f64)
}
fn rounded(n: f64, d: i32) -> String {
    let m = 10f64.powi(d);
    ((n * m + 0.5).floor() / m).to_string()
}
fn compact(n: f64) -> String {
    for (v, label) in [(1e9, "B"), (1e6, "M"), (1e3, "k")] {
        if n.abs() >= v {
            return format!("{}{label}", rounded(n / v, 1));
        }
    }
    rounded(n, 2)
}
fn date_label(t: f64, range: f64) -> String {
    let d = Utc.timestamp_millis_opt(t as i64).single().unwrap();
    if range > 3.0 * 365.0 * 86400000.0 {
        d.year().to_string()
    } else if range > 60.0 * 86400000.0 {
        format!("{}/{}", d.month(), d.year())
    } else {
        format!("{}/{}", d.month(), d.day())
    }
}
fn histogram(values: &[f64], count: usize, dates: bool) -> (Vec<String>, Vec<usize>) {
    let min = values[0];
    let max = values[values.len() - 1];
    let range = max - min;
    let size = if range == 0.0 {
        1.0
    } else {
        range / count as f64
    };
    let mut dist = vec![0; count];
    for n in values {
        let i = (((n - min) / size).floor() as usize).min(count - 1);
        dist[i] += 1;
    }
    let labels = (0..count)
        .map(|i| {
            if dates {
                date_label(min + i as f64 * size, range)
            } else {
                format!(
                    "{}–{}",
                    compact(min + i as f64 * size),
                    compact(min + (i + 1) as f64 * size)
                )
            }
        })
        .collect();
    (labels, dist)
}
fn profile(session: &Session, column: usize) -> Value {
    let total = session.len();
    let mut missing = 0;
    let mut counts: HashMap<String, (usize, usize)> = HashMap::new();
    let mut nums = Vec::new();
    let mut times = Vec::new();
    // Counts use native strings; no row objects or second full dataset in the renderer.
    for r in 0..total {
        let s = cell_text(session.cell(r, column));
        let s = s.trim();
        if s.is_empty() {
            missing += 1;
            continue;
        }
        if let Some(n) = numeric(s) {
            nums.push(n)
        } else if let Some(t) = date(s) {
            times.push(t)
        }
    }
    let valued = total - missing;
    let kind = if valued > 0 && nums.len() as f64 / valued as f64 > 0.8 {
        "numeric"
    } else if valued > 0 && times.len() as f64 / valued as f64 > 0.8 {
        "date"
    } else {
        "categorical"
    };
    let mut out = json!({"type":kind,"total":total,"missing":missing,"valued":valued});
    if kind == "categorical" {
        for r in 0..total {
            let text = cell_text(session.cell(r, column));
            let s = text.trim();
            if !s.is_empty() {
                let entry = counts.entry(s.into()).or_insert((0, r));
                entry.0 += 1;
            }
        }
        let distinct = counts.len();
        let lower = counts
            .keys()
            .map(|s| s.to_lowercase())
            .collect::<HashSet<_>>()
            .len();
        let mut entries = counts.into_iter().collect::<Vec<_>>();
        let index_key = |s: &str| {
            s.parse::<u32>()
                .ok()
                .filter(|n| *n < u32::MAX && n.to_string() == s)
        };
        let compare_entries = |a: &(String, (usize, usize)), b: &(String, (usize, usize))| {
            b.1 .0
                .cmp(&a.1 .0)
                .then_with(|| match (index_key(&a.0), index_key(&b.0)) {
                    (Some(a), Some(b)) => a.cmp(&b),
                    (Some(_), None) => std::cmp::Ordering::Less,
                    (None, Some(_)) => std::cmp::Ordering::Greater,
                    _ => a.1 .1.cmp(&b.1 .1),
                })
        };
        if entries.len() > 200 {
            entries.select_nth_unstable_by(199, compare_entries);
            entries.truncate(200);
        }
        entries.sort_by(compare_entries);
        let mut labels = entries
            .iter()
            .take(5)
            .map(|e| e.0.clone())
            .collect::<Vec<_>>();
        let mut dist = entries.iter().take(5).map(|e| e.1 .0).collect::<Vec<_>>();
        if distinct > 5 {
            labels.push(format!("Other ({})", distinct - 5));
            dist.push(valued - dist.iter().sum::<usize>())
        }
        out["distinctCount"] = json!(distinct);
        out["caseInsensitiveDistinct"] = json!(lower);
        out["caseVariants"] = json!(lower < distinct);
        out["uniqueRatio"] = json!(if valued == 0 {
            0.0
        } else {
            distinct as f64 / valued as f64
        });
        out["labels"] = json!(labels);
        out["dist"] = json!(dist);
        out["fullLabels"] = json!(entries.iter().take(200).map(|e| &e.0).collect::<Vec<_>>());
        out["fullDist"] = json!(entries.iter().take(200).map(|e| e.1 .0).collect::<Vec<_>>());
        out["fullCount"] = json!(distinct);
    } else {
        let values = if kind == "numeric" {
            &mut nums
        } else {
            &mut times
        };
        values.sort_by(f64::total_cmp);
        let n = values.len();
        let min = values[0];
        let max = values[n - 1];
        out["min"] = json!(min);
        out["max"] = json!(max);
        out["nonConforming"] = json!(valued - n);
        let mut distinct = Vec::new();
        let mut frequencies = Vec::new();
        for v in values.iter() {
            if distinct.last() == Some(v) {
                *frequencies.last_mut().unwrap() += 1
            } else {
                distinct.push(*v);
                frequencies.push(1usize)
            }
        }
        if kind == "numeric" {
            let mean = values.iter().sum::<f64>() / n as f64;
            let median = if n % 2 == 1 {
                values[n / 2]
            } else {
                (values[n / 2 - 1] + values[n / 2]) / 2.0
            };
            let quantile = |p: f64| {
                values
                    .get(if n % 2 == 1 {
                        (n as f64 * p).floor() as usize
                    } else {
                        (n as f64 * p).round() as usize
                    })
                    .copied()
            };
            let q1 = quantile(0.25);
            let q3 = quantile(0.75);
            let outliers = if let (Some(a), Some(b)) = (q1, q3) {
                values
                    .iter()
                    .filter(|v| **v < a - 1.5 * (b - a) || **v > b + 1.5 * (b - a))
                    .count()
            } else {
                0
            };
            out["mean"] = json!(mean);
            out["median"] = json!(median);
            out["stdev"] =
                json!((values.iter().map(|v| (v - mean).powi(2)).sum::<f64>() / n as f64).sqrt());
            if let Some(q) = q1 {
                out["p25"] = json!(q)
            }
            out["p75"] = json!(q3.unwrap_or(0.0));
            out["p90"] = json!(values[(n as f64 * 0.9).floor() as usize]);
            out["outliers"] = json!(outliers);
            out["distinctCount"] = json!(distinct.len());
            out["uniqueRatio"] = json!(distinct.len() as f64 / valued as f64);
        }
        if kind == "numeric" && distinct.len() <= 20 {
            let labels = distinct.iter().map(|v| rounded(*v, 2)).collect::<Vec<_>>();
            out["mode"] = json!("discrete");
            out["labels"] = json!(labels);
            out["fullLabels"] = json!(labels);
            out["dist"] = json!(frequencies);
            out["fullDist"] = json!(frequencies)
        } else {
            if kind == "numeric" {
                out["mode"] = json!("continuous")
            }
            let bins = (1.0 + 3.322 * (n as f64).log10()).round().clamp(8.0, 20.0) as usize;
            let (labels, dist) = histogram(values, bins, kind == "date");
            let (full_labels, full_dist) = histogram(values, (bins * 2).min(40), kind == "date");
            out["labels"] = json!(labels);
            out["dist"] = json!(dist);
            out["fullLabels"] = json!(full_labels);
            out["fullDist"] = json!(full_dist);
        }
    }
    out
}
#[tauri::command]
pub async fn profile_insights(
    editor: tauri::State<'_, EditorStore>,
    id: String,
) -> Result<Value, String> {
    let session = editor.get(&id)?;
    tauri::async_runtime::spawn_blocking(move || {
        let mut stats = serde_json::Map::new();
        for (c, name) in session.base.columns.iter().enumerate() {
            stats.insert(name.clone(), profile(&session, c));
        }
        json!({"headers":session.base.columns,"rowCount":session.len(),"stats":stats})
    })
    .await
    .map_err(|e| e.to_string())
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Filter {
    query: Option<String>,
    column: Option<String>,
    value: Option<String>,
    date_bin: Option<String>,
}
fn bin(s: &str, mode: &str) -> String {
    if s.is_empty() {
        return "Unknown".into();
    }
    if mode != "none" {
        if let Some(t) = date(s) {
            if let Some(d) = Local.timestamp_millis_opt(t as i64).single() {
                return match mode {
                    "year" => d.year().to_string(),
                    "quarter" => format!("{}-Q{}", d.year(), (d.month() + 2) / 3),
                    _ => format!("{}-{:02}", d.year(), d.month()),
                };
            }
        }
    }
    s.into()
}
#[tauri::command]
pub async fn filter_insights(
    editor: tauri::State<'_, EditorStore>,
    id: String,
    filter: Filter,
) -> Result<TabularSnapshot, String> {
    let store = editor.inner().clone();
    let session = store.get(&id)?;
    tauri::async_runtime::spawn_blocking(move || {
        let query = filter.query.unwrap_or_default().trim().to_lowercase();
        let parts = query.split(':').collect::<Vec<_>>();
        let column = filter
            .column
            .as_ref()
            .map(|name| {
                session
                    .base
                    .columns
                    .iter()
                    .position(|s| s == name)
                    .ok_or("Unknown filter column")
            })
            .transpose()?;
        let mut rows = Vec::new();
        for r in 0..session.len() {
            let matches = if let Some(c) = column {
                bin(
                    session.cell(r, c).text().trim(),
                    filter.date_bin.as_deref().unwrap_or("none"),
                ) == filter.value.as_deref().unwrap_or("")
            } else if query.is_empty() {
                true
            } else {
                session.base.columns.iter().enumerate().any(|(c, name)| {
                    let text = session.cell(r, c).text().to_lowercase();
                    if parts.len() > 1 {
                        name.to_lowercase() == parts[0].trim() && text.contains(parts[1].trim())
                    } else {
                        text.contains(&query)
                    }
                })
            };
            if matches {
                rows.push(r)
            }
        }
        store.view(&id, rows)
    })
    .await
    .map_err(|e| e.to_string())?
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Chart {
    x: String,
    y: String,
    group: String,
    agg: String,
    date_bin: String,
}
#[derive(Default)]
struct Group {
    sum: f64,
    count: usize,
    rows: usize,
    min: f64,
    max: f64,
    values: Vec<f64>,
    distinct: HashSet<String>,
}
fn prefix_number(s: &str) -> Option<f64> {
    static RE: OnceLock<Regex> = OnceLock::new();
    let m = RE
        .get_or_init(|| Regex::new(r"^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?").unwrap())
        .find(s.trim())?;
    s.trim()[m.range()].parse().ok()
}
#[tauri::command]
pub async fn compare_insights(
    editor: tauri::State<'_, EditorStore>,
    id: String,
    columns: Vec<String>,
) -> Result<Value, String> {
    let session = editor.get(&id)?;
    tauri::async_runtime::spawn_blocking(move || {
        let mut sums = serde_json::Map::new();
        let mut counts = serde_json::Map::new();
        for name in columns {
            if let Some(c) = session.base.columns.iter().position(|n| n == &name) {
                let mut sum = 0.0;
                let mut count = 0;
                for r in 0..session.len() {
                    if let Some(n) = prefix_number(&session.cell(r, c).text()) {
                        if n.is_finite() {
                            sum += n;
                            count += 1;
                        }
                    }
                }
                sums.insert(name.clone(), json!(sum));
                counts.insert(name, json!(count));
            }
        }
        json!({"sums":sums,"counts":counts})
    })
    .await
    .map_err(|e| e.to_string())
}
#[tauri::command]
pub async fn aggregate_insights(
    editor: tauri::State<'_, EditorStore>,
    id: String,
    chart: Chart,
) -> Result<Value, String> {
    let session = editor.get(&id)?;
    tauri::async_runtime::spawn_blocking(move || aggregate_native(&session, chart))
        .await
        .map_err(|e| e.to_string())?
}
fn aggregate_native(session: &Session, chart: Chart) -> Result<Value, String> {
    let column = |name: &str| {
        session
            .base
            .columns
            .iter()
            .position(|n| n == name)
            .ok_or_else(|| format!("Unknown chart column: {name}"))
    };
    let x = column(&chart.x)?;
    let y = column(&chart.y)?;
    let group = if chart.group.is_empty() {
        None
    } else {
        Some(column(&chart.group)?)
    };
    let mut groups: HashMap<String, HashMap<String, Group>> = HashMap::new();
    let mut order = Vec::new();
    let mut series = HashSet::new();
    let mut skipped = 0;
    for r in 0..session.len() {
        let label = bin(session.cell(r, x).text().trim(), &chart.date_bin);
        let name = group.map_or("Total".into(), |c| {
            bin(session.cell(r, c).text().trim(), "none")
        });
        series.insert(name.clone());
        if !groups.contains_key(&label) {
            order.push(label.clone())
        }
        let g = groups.entry(label).or_default().entry(name).or_default();
        g.rows += 1;
        let cell = session.cell(r, y);
        let value = cell_text(cell);
        if !value.trim().is_empty() {
            if chart.agg == "distinct" {
                g.distinct
                    .insert(serde_json::to_string(cell).map_err(|e| e.to_string())?);
            }
            if let Some(n) = prefix_number(&value) {
                if g.count == 0 {
                    g.min = n;
                    g.max = n;
                }
                g.count += 1;
                g.sum += n;
                g.min = g.min.min(n);
                g.max = g.max.max(n);
                if chart.agg == "median" {
                    g.values.push(n)
                }
            } else {
                skipped += 1
            }
        }
    }
    let mut output: HashMap<String, HashMap<String, f64>> = HashMap::new();
    for (label, entries) in groups {
        let mut vals = HashMap::new();
        for (name, mut g) in entries {
            let value = match chart.agg.as_str() {
                "count" => g.rows as f64,
                "distinct" => g.distinct.len() as f64,
                "avg" => {
                    if g.count == 0 {
                        0.0
                    } else {
                        g.sum / g.count as f64
                    }
                }
                "min" => g.min,
                "max" => g.max,
                "median" => {
                    g.values.sort_by(f64::total_cmp);
                    let n = g.values.len();
                    if n == 0 {
                        0.0
                    } else if n % 2 == 1 {
                        g.values[n / 2]
                    } else {
                        (g.values[n / 2 - 1] + g.values[n / 2]) / 2.0
                    }
                }
                _ => g.sum,
            };
            vals.insert(name, value);
        }
        output.insert(label, vals);
    }
    let total = order.len();
    if total > 50 {
        // Compute each magnitude once. Original row order breaks equal-score
        // ties exactly as the previous stable full sort did.
        let mut ranked = order
            .into_iter()
            .enumerate()
            .map(|(index, label)| {
                let score = output[&label].values().map(|v| v.abs()).sum::<f64>();
                (label, score, index)
            })
            .collect::<Vec<_>>();
        let compare = |a: &(String, f64, usize), b: &(String, f64, usize)| {
            b.1.total_cmp(&a.1).then(a.2.cmp(&b.2))
        };
        ranked.select_nth_unstable_by(49, compare);
        ranked.truncate(50);
        ranked.sort_by(compare);
        order = ranked.into_iter().map(|(label, _, _)| label).collect();
    }
    if order.len().saturating_mul(series.len()) > 32768 {
        return Err(
            "This chart has too many grouped series. Choose a column with fewer distinct values."
                .into(),
        );
    }
    output.retain(|label, _| order.contains(label));
    let mut series = series.into_iter().collect::<Vec<_>>();
    series.sort();
    Ok(
        json!({"order":order,"groups":output,"seriesNames":series,"skipped":skipped,"totalGroups":total}),
    )
}
#[cfg(test)]
mod tests {
    use super::*;
    fn compare(actual: &Value, expected: &Value, path: &str) {
        match expected {
            Value::Number(n) => {
                let a = actual
                    .as_f64()
                    .unwrap_or_else(|| panic!("{path}: missing number {actual}"));
                let e = n.as_f64().unwrap();
                assert!(
                    (a - e).abs() <= 1e-9 * e.abs().max(1.0),
                    "{path}: {a} != {e}"
                );
            }
            Value::Object(map) => {
                for (key, value) in map {
                    compare(&actual[key], value, &format!("{path}.{key}"));
                }
            }
            Value::Array(values) => {
                assert_eq!(actual.as_array().unwrap().len(), values.len(), "{path}");
                for (i, value) in values.iter().enumerate() {
                    compare(&actual[i], value, &format!("{path}[{i}]"));
                }
            }
            _ => assert_eq!(actual, expected, "{path}"),
        }
    }
    #[test]
    fn profiles_match_existing_worker() {
        let fixtures: Vec<Value> = serde_json::from_str(include_str!(
            "../../scripts/fixtures/insights-profiles.json"
        ))
        .unwrap();
        for fixture in fixtures {
            let data = serde_json::from_value(fixture["dataset"].clone()).unwrap();
            let actual = profile(&Session::new(data), 0);
            compare(
                &actual,
                &fixture["expected"],
                fixture["name"].as_str().unwrap(),
            );
        }
    }
    #[test]
    fn grouped_aggregates_and_typed_distinct() {
        let data=serde_json::from_value(json!({"columns":["x","y","series"],"rows":[
            [{"kind":"text","value":"A"},{"kind":"number","value":0},{"kind":"text","value":"one"}],
            [{"kind":"text","value":"A"},{"kind":"text","value":"0"},{"kind":"text","value":"one"}],
            [{"kind":"text","value":"A"},{"kind":"text","value":"12x"},{"kind":"text","value":"one"}],
            [{"kind":"text","value":"A"},{"kind":"null"},{"kind":"text","value":"one"}],
            [{"kind":"null"},{"kind":"text","value":"bad"},{"kind":"text","value":"two"}]
        ]})).unwrap();
        let session = Session::new(data);
        for (agg, expected) in [
            ("sum", 12.0),
            ("avg", 4.0),
            ("count", 4.0),
            ("distinct", 3.0),
            ("min", 0.0),
            ("max", 12.0),
            ("median", 0.0),
        ] {
            let chart = Chart {
                x: "x".into(),
                y: "y".into(),
                group: "series".into(),
                agg: agg.into(),
                date_bin: "none".into(),
            };
            let out = aggregate_native(&session, chart).unwrap();
            assert_eq!(out["groups"]["A"]["one"], json!(expected), "{agg}");
            assert_eq!(out["skipped"], 1);
            assert_eq!(out["order"], json!(["A", "Unknown"]));
        }
    }
    #[test]
    #[ignore = "Creates a million native rows for the optimized Insights benchmark"]
    fn million_row_profile_and_chart() {
        use crate::tabular::{Cell, Dataset};
        let data = Dataset {
            columns: vec!["customer".into(), "amount".into()],
            rows: (0..1_000_000)
                .map(|i| {
                    vec![
                        Cell::Text(format!("customer-{i:08}")),
                        Cell::Number((i % 100) as f64),
                    ]
                })
                .collect(),
            source: String::new(),
            sheet: None,
            warnings: vec![],
        };
        let session = Session::new(data);
        let started = std::time::Instant::now();
        let stats = profile(&session, 0);
        let profile_ms = started.elapsed().as_millis();
        assert_eq!(stats["distinctCount"], 1_000_000);
        assert_eq!(stats["fullLabels"].as_array().unwrap().len(), 200);
        let started = std::time::Instant::now();
        let chart = aggregate_native(
            &session,
            Chart {
                x: "customer".into(),
                y: "amount".into(),
                group: String::new(),
                agg: "sum".into(),
                date_bin: "none".into(),
            },
        )
        .unwrap();
        let chart_ms = started.elapsed().as_millis();
        assert_eq!(chart["totalGroups"], 1_000_000);
        assert_eq!(chart["order"].as_array().unwrap().len(), 50);
        println!("INSIGHTS_BENCH rows=1000000 distinct=1000000 profile_ms={profile_ms} chart_ms={chart_ms} profile_bytes={} chart_bytes={}",serde_json::to_vec(&stats).unwrap().len(),serde_json::to_vec(&chart).unwrap().len());
    }
    #[test]
    fn token_and_date_rules() {
        assert_eq!(numeric("00123"), Some(123.0));
        assert_eq!(numeric("12x"), None);
        assert_eq!(numeric("1e999"), None);
        assert_eq!(prefix_number(" 12x"), Some(12.0));
        assert!(date("2026-10-08").is_some());
        assert!(date("10/08/2026").is_some());
        assert!(date("hello").is_none());
        assert_eq!(rounded(-1.005, 2), "-1");
    }
}
