use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{BufRead, BufReader};
use chrono::NaiveDate;

#[derive(Deserialize, Serialize, Clone)]
pub struct MappingConfig {
    pub date_col: String,
    pub desc_col: String,
    pub amt_col: String,
    pub cat_col: Option<String>,
}

#[derive(Deserialize, Serialize, Clone)]
pub struct CategoryRule {
    pub keyword: String,
    pub category: String,
}

#[derive(Default, Serialize, Clone)]
pub struct Transaction {
    pub id: usize,
    pub date: String,
    pub raw_date: String,
    pub desc: String,
    pub amount: f64,
    pub category: String,
}

#[derive(Default, Serialize)]
pub struct FinanceReport {
    pub total_inflow: f64,
    pub total_outflow: f64,
    pub net_cashflow: f64,
    pub transactions: Vec<Transaction>,
    pub subscriptions: Vec<(String, f64, String)>, // Desc, Amount, Interval
    pub timeline_labels: Vec<String>,
    pub timeline_inflow: Vec<f64>,
    pub timeline_outflow: Vec<f64>,
    pub category_totals: HashMap<String, f64>,
}

#[derive(Serialize)]
pub struct HeadersResponse {
    pub headers: Vec<String>,
}

#[tauri::command]
pub async fn extract_financial_headers(files: Vec<String>) -> Result<HeadersResponse, String> {
    if files.is_empty() { return Err("No files provided".to_string()); }
    
    let (headers, _) = find_csv_header_and_read(&files[0])?;
    Ok(HeadersResponse { headers })
}

fn find_csv_header_and_read(file_path: &str) -> Result<(Vec<String>, Vec<Vec<String>>), String> {
    let file = File::open(file_path).map_err(|e| e.to_string())?;
    let reader = BufReader::new(file);
    
    let mut raw_lines = Vec::new();
    for line in reader.lines() {
        if let Ok(l) = line {
            raw_lines.push(l);
        }
    }
    
    if raw_lines.is_empty() { return Err("File is empty".to_string()); }
    
    let keywords = ["date", "amount", "description", "payee", "credit", "debit", "balance", "category", "type", "post"];
    let mut best_index = 0;
    let mut best_score = 0;
    
    for (i, line) in raw_lines.iter().enumerate().take(30) {
        let lower = line.to_lowercase();
        let mut score = 0;
        for kw in keywords.iter() {
            if lower.contains(kw) {
                score += 1;
            }
        }
        if score > best_score {
            best_score = score;
            best_index = i;
        }
    }
    
    let joined = raw_lines[best_index..].join("\n");
    let mut rdr = csv::ReaderBuilder::new().has_headers(true).from_reader(joined.as_bytes());
    
    let headers = match rdr.headers() {
        Ok(h) => h.iter().map(|s| s.to_string()).collect::<Vec<_>>(),
        Err(e) => return Err(format!("CSV parse error: {}", e)),
    };
    
    let mut rows = Vec::new();
    for record in rdr.records() {
        if let Ok(rec) = record {
            rows.push(rec.iter().map(|s| s.to_string()).collect::<Vec<_>>());
        }
    }
    
    Ok((headers, rows))
}

fn parse_amount(raw: &str) -> f64 {
    let cleaned = raw.replace('$', "").replace(',', "").replace('\"', "").trim().to_string();
    // Handle (100.00) format for negatives
    if cleaned.starts_with('(') && cleaned.ends_with(')') {
        let inner = &cleaned[1..cleaned.len()-1];
        if let Ok(v) = inner.parse::<f64>() {
            return -v;
        }
    }
    cleaned.parse::<f64>().unwrap_or(0.0)
}

fn parse_date_to_iso(raw: &str) -> String {
    let c = raw.trim();
    if let Ok(d) = NaiveDate::parse_from_str(c, "%m/%d/%Y") { return d.format("%Y-%m-%d").to_string(); }
    if let Ok(d) = NaiveDate::parse_from_str(c, "%Y-%m-%d") { return d.format("%Y-%m-%d").to_string(); }
    if let Ok(d) = NaiveDate::parse_from_str(c, "%d/%m/%Y") { return d.format("%Y-%m-%d").to_string(); }
    if let Ok(d) = chrono::NaiveDateTime::parse_from_str(c, "%Y-%m-%dT%H:%M:%S%.f") { return d.date().to_string(); }
    if let Ok(d) = chrono::DateTime::parse_from_rfc3339(c) { return d.date_naive().to_string(); }
    c.to_string() // Fallback
}

#[cfg(test)]
mod date_import_tests {
    use super::parse_date_to_iso;

    #[test]
    fn preserves_statement_dates_from_excel_and_delimited_files() {
        for input in ["10/08/2026", "2026-10-08", "2026-10-08T00:00:00", "2026-10-08T00:00:00.125", "2026-10-08T00:00:00+05:30"] {
            assert_eq!(parse_date_to_iso(input), "2026-10-08");
        }
        assert_eq!(parse_date_to_iso("unknown"), "unknown");
    }
}

#[tauri::command]
pub async fn parse_financial_statements(
    files: Vec<String>, 
    mapping: MappingConfig, 
    rules: Vec<CategoryRule>
) -> Result<FinanceReport, String> {
    let mut all_tx = Vec::new();
    let mut id_counter = 0;
    
    for file in files {
        if let Ok((headers, rows)) = find_csv_header_and_read(&file) {
            let date_idx = headers.iter().position(|h| h == &mapping.date_col);
            let desc_idx = headers.iter().position(|h| h == &mapping.desc_col);
            let amt_idx = headers.iter().position(|h| h == &mapping.amt_col);
            let cat_idx = if let Some(c) = &mapping.cat_col { headers.iter().position(|h| h == c) } else { None };
            
            if date_idx.is_none() || desc_idx.is_none() || amt_idx.is_none() {
                continue; // Skip if missing critical mapped columns in this file
            }
            
            for row in rows {
                let r_date = row.get(date_idx.unwrap()).unwrap_or(&"".to_string()).to_string();
                let r_desc = row.get(desc_idx.unwrap()).unwrap_or(&"".to_string()).to_string();
                let r_amt = row.get(amt_idx.unwrap()).unwrap_or(&"0".to_string()).to_string();
                let mut r_cat = if let Some(idx) = cat_idx { row.get(idx).unwrap_or(&"".to_string()).to_string() } else { "Uncategorized".to_string() };
                
                if r_cat.is_empty() { r_cat = "Uncategorized".to_string(); }
                
                // Apply Rules (Overrides)
                let desc_lower = r_desc.to_lowercase();
                for rule in &rules {
                    if desc_lower.contains(&rule.keyword.to_lowercase()) {
                        r_cat = rule.category.clone();
                        break;
                    }
                }
                
                let amt = parse_amount(&r_amt);
                if amt == 0.0 && r_desc.is_empty() { continue; } // Skip completely empty garbage rows
                
                id_counter += 1;
                all_tx.push(Transaction {
                    id: id_counter,
                    date: parse_date_to_iso(&r_date),
                    raw_date: r_date,
                    desc: r_desc,
                    amount: amt,
                    category: r_cat,
                });
            }
        }
    }
    
    // Sort chronological
    all_tx.sort_by(|a, b| a.date.cmp(&b.date));
    
    let mut report = FinanceReport::default();
    report.transactions = all_tx.clone();
    
    let mut time_map_in: HashMap<String, f64> = HashMap::new();
    let mut time_map_out: HashMap<String, f64> = HashMap::new();
    
    // Subscription tracking heuristcs: exact amount matching over different dates
    let mut amt_desc_map: HashMap<String, Vec<Transaction>> = HashMap::new();
    
    for tx in &all_tx {
        if tx.amount > 0.0 {
            report.total_inflow += tx.amount;
            *time_map_in.entry(tx.date.clone()).or_insert(0.0) += tx.amount;
        } else {
            report.total_outflow += tx.amount.abs();
            *time_map_out.entry(tx.date.clone()).or_insert(0.0) += tx.amount.abs();
            *report.category_totals.entry(tx.category.clone()).or_insert(0.0) += tx.amount.abs();
        }
        report.net_cashflow += tx.amount;
        
        if tx.amount < 0.0 {
            let key = format!("{:.2}|{}", tx.amount, tx.desc);
            amt_desc_map.entry(key).or_insert_with(Vec::new).push(tx.clone());
        }
    }
    
    // Detect subscriptions (at least 2 occurrences, similar descriptions/amounts)
    for (_, txs) in amt_desc_map {
        if txs.len() >= 2 {
            // Rough interval check
            report.subscriptions.push((txs[0].desc.clone(), txs[0].amount.abs(), format!("{}x Detected", txs.len())));
        }
    }
    
    let mut sorted_dates: Vec<_> = time_map_in.keys().chain(time_map_out.keys()).collect::<std::collections::HashSet<_>>().into_iter().cloned().collect();
    sorted_dates.sort();
    
    // Accumulators for cumulative cashflow timeline, or just daily spikes?
    // User wants "Requests over time" style but for money: Daily Inflow / Outflow.
    let mut current_month = String::new();
    let mut monthly_inflow: HashMap<String, f64> = HashMap::new();
    let mut monthly_outflow: HashMap<String, f64> = HashMap::new();
    
    for d in sorted_dates {
        let m = if d.len() >= 7 { d[..7].to_string() } else { d.clone() };
        *monthly_inflow.entry(m.clone()).or_insert(0.0) += *time_map_in.get(&d).unwrap_or(&0.0);
        *monthly_outflow.entry(m.clone()).or_insert(0.0) += *time_map_out.get(&d).unwrap_or(&0.0);
    }
    
    let mut final_months: Vec<_> = monthly_inflow.keys().chain(monthly_outflow.keys()).collect::<std::collections::HashSet<_>>().into_iter().cloned().collect();
    final_months.sort();
    
    for m in final_months {
        report.timeline_labels.push(m.clone());
        report.timeline_inflow.push(*monthly_inflow.get(&m).unwrap_or(&0.0));
        report.timeline_outflow.push(*monthly_outflow.get(&m).unwrap_or(&0.0));
    }
    
    // Sort subscriptions by amount
    report.subscriptions.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    report.subscriptions.truncate(15);
    
    Ok(report)
}
