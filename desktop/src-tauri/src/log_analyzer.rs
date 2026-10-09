use std::collections::HashMap;
use serde::Serialize;
use std::fs::File;
use std::io::{BufRead, BufReader};
use regex::Regex;
use flate2::read::MultiGzDecoder;
use serde_json::Value;
#[cfg(test)]
#[path = "log_tests.rs"]
mod tests;

#[derive(Default, Debug, Serialize)]
pub struct LogReport {
    pub mode: String,
    pub total_lines: usize,
    pub total_errors: usize,
    pub matched_lines: usize,
    pub skipped_lines: usize,
    
    // Threat stuff
    pub brute_force_ips: Vec<(String, usize)>,
    pub scanner_ips: Vec<(String, usize)>,
    pub timeline_labels: Vec<String>,
    pub timeline_traffic: Vec<usize>,
    pub timeline_errors: Vec<usize>,
    
    // Aggregates
    pub top_ips: Vec<(String, usize)>,
    pub top_404s: Vec<(String, usize)>,
    pub top_500s: Vec<(String, usize)>,
}

#[tauri::command]
pub async fn parse_logs(files: Vec<String>, custom_regex: Option<String>) -> Result<LogReport, String> {
    tauri::async_runtime::spawn_blocking(move || parse_logs_sync(files, custom_regex)).await.map_err(|e| e.to_string())?
}

fn time_buckets(timestamp: &str) -> Option<(String, String)> {
    let dt = chrono::DateTime::parse_from_rfc3339(timestamp).or_else(|_| chrono::DateTime::parse_from_str(timestamp, "%d/%b/%Y:%H:%M:%S %z")).ok()?.with_timezone(&chrono::Utc);
    Some((dt.format("%Y-%m-%d %H:00 UTC").to_string(), dt.format("%Y-%m-%d %H:%M UTC").to_string()))
}

fn parse_logs_sync(files: Vec<String>, custom_regex: Option<String>) -> Result<LogReport, String> {
    let mut report = LogReport::default();
    let mut saw_web = false;
    let mut saw_json = false;
    report.mode = "web".to_string(); 
    
    let mut web_regex = Regex::new(r#"^([\d\.:a-fA-F]+)\s+\S+\s+\S+\s+\[(.*?)\]\s+"(\S+)\s+(\S+).*?"\s+(\d{3})"#).unwrap();
    
    if let Some(r) = custom_regex {
        if !r.trim().is_empty() {
            let compiled = Regex::new(&r).map_err(|e| format!("Invalid custom regex: {e}"))?;
            if compiled.captures_len() != 6 { return Err("Custom regex must have five capture groups: IP, timestamp, method, path, status.".into()); }
            web_regex = compiled;
        }
    }
    
    let mut ip_counts: HashMap<String, usize> = HashMap::new();
    let mut path_404s: HashMap<String, usize> = HashMap::new();
    let mut path_500s: HashMap<String, usize> = HashMap::new();
    let mut time_traffic: HashMap<String, usize> = HashMap::new();
    let mut time_errors: HashMap<String, usize> = HashMap::new();
    
    // Brute Force State
    let mut brute_force_bursts: HashMap<String, usize> = HashMap::new();
    
    // Scanners
    let scanner_paths = vec!["/wp-admin", "/.env", "/phpmyadmin", "/config.php", "/.git"];
    let mut scanner_ips: HashMap<String, usize> = HashMap::new();

    for file_path in files {
        let file = File::open(&file_path).map_err(|e| e.to_string())?;
        
        let reader: Box<dyn BufRead> = if file_path.to_ascii_lowercase().ends_with(".gz") {
            Box::new(BufReader::new(MultiGzDecoder::new(file)))
        } else {
            Box::new(BufReader::new(file))
        };
        
        for line_res in reader.lines() {
            let line = match line_res {
                Ok(l) => l,
                Err(e) => return Err(format!("Unable to read {file_path}: {e}")),
            };
            report.total_lines += 1;
            
            let mut ip = String::new();
            let mut timestamp = String::new();
            let mut status = String::new();
            let mut url = String::new();
            let mut matched = false;
            
            // JSON Try
            if line.trim().starts_with('{') {
                if let Ok(json_val) = serde_json::from_str::<Value>(&line) {
                    saw_json = true;
                    ip = json_val.get("ip").or_else(|| json_val.get("client_ip")).or_else(|| json_val.get("remote_ip")).and_then(|v| v.as_str()).unwrap_or("").to_string();
                    url = json_val.get("url").or_else(|| json_val.get("path")).or_else(|| json_val.get("request_uri")).and_then(|v| v.as_str()).unwrap_or("").to_string();
                    status = json_val.get("status").or_else(|| json_val.get("status_code")).and_then(|v| {
                        if v.is_number() { Some(v.to_string()) } else { v.as_str().map(|s| s.to_string()) }
                    }).unwrap_or_default();
                    matched = !ip.is_empty() && status.parse::<u16>().map(|s| (100..=599).contains(&s)).unwrap_or(false);
                    timestamp = json_val.get("timestamp").or_else(|| json_val.get("time")).or_else(|| json_val.get("@timestamp")).and_then(|v| v.as_str()).unwrap_or("").to_string();
                }
            }
            
            // Regex Fallback
            if !matched {
                if let Some(caps) = web_regex.captures(&line) {
                    saw_web = true;
                    matched = true;
                    ip = caps.get(1).map_or("", |m| m.as_str()).to_string();
                    timestamp = caps.get(2).map_or("", |m| m.as_str()).to_string();
                    url = caps.get(4).map_or("", |m| m.as_str()).to_string();
                    status = caps.get(5).map_or("", |m| m.as_str()).to_string();
                }
            }
            
            if matched && !ip.is_empty() && status.parse::<u16>().map(|s| (100..=599).contains(&s)).unwrap_or(false) {
                report.matched_lines += 1;
                let buckets = time_buckets(&timestamp);
                let time_bucket = buckets.as_ref().map(|b| b.0.clone()).unwrap_or_else(|| "Unknown".into());
                *time_traffic.entry(time_bucket.clone()).or_insert(0) += 1;
                *ip_counts.entry(ip.clone()).or_insert(0) += 1;
                
                if status.starts_with('4') || status.starts_with('5') {
                    report.total_errors += 1;
                    *time_errors.entry(time_bucket.clone()).or_insert(0) += 1;
                }
                
                if status == "401" || status == "403" {
                    let minute_bucket = buckets.map(|b| b.1).unwrap_or_default();
                    if !minute_bucket.is_empty() {
                        let burst_key = format!("{}|{}", ip, minute_bucket);
                        *brute_force_bursts.entry(burst_key).or_insert(0) += 1;
                    }
                }
                
                if status == "404" {
                    *path_404s.entry(url.clone()).or_insert(0) += 1;
                    for sp in &scanner_paths {
                        if url.contains(sp) {
                            *scanner_ips.entry(ip.clone()).or_insert(0) += 1;
                            break;
                        }
                    }
                } else if status.starts_with('5') {
                    *path_500s.entry(url.clone()).or_insert(0) += 1;
                }
            } else {
                report.skipped_lines += 1;
            }
        }
    }
    report.mode = match (saw_web, saw_json) { (true,true) => "mixed", (false,true) => "json", _ => "web" }.into();
    
    let mut sorted_ips: Vec<_> = ip_counts.into_iter().collect();
    sorted_ips.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
    report.top_ips = sorted_ips.into_iter().take(20).collect();
    
    let mut sorted_404s: Vec<_> = path_404s.into_iter().collect();
    sorted_404s.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
    report.top_404s = sorted_404s.into_iter().take(20).collect();
    
    let mut sorted_500s: Vec<_> = path_500s.into_iter().collect();
    sorted_500s.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
    report.top_500s = sorted_500s.into_iter().take(20).collect();
    
    let mut flagged_brute_force: HashMap<String, usize> = HashMap::new();
    for (key, count) in brute_force_bursts {
        if count >= 10 {
            let ip = key.split('|').next().unwrap_or("").to_string();
            *flagged_brute_force.entry(ip).or_insert(0) += count;
        }
    }
    
    let mut sorted_brute: Vec<_> = flagged_brute_force.into_iter().collect();
    sorted_brute.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
    report.brute_force_ips = sorted_brute.into_iter().take(20).collect();
    
    let mut sorted_scanners: Vec<_> = scanner_ips.into_iter().collect();
    sorted_scanners.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
    report.scanner_ips = sorted_scanners.into_iter().take(20).collect();
    
    let mut sorted_time: Vec<_> = time_traffic.keys().cloned().collect();
    sorted_time.sort();
    
    for bucket in sorted_time {
        report.timeline_labels.push(bucket.clone());
        report.timeline_traffic.push(*time_traffic.get(&bucket).unwrap_or(&0));
        report.timeline_errors.push(*time_errors.get(&bucket).unwrap_or(&0));
    }
    
    Ok(report)
}
