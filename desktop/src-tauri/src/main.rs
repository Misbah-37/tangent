// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde_json::json;
use tauri::Manager;
use serde::Deserialize;
mod correlation;
mod log_analyzer;
mod finance;
mod finance_native;
mod extractor;
mod snapshots;
mod tabular;
mod editor;
mod insights;
use regex::Regex;
use futures::TryStreamExt;


fn get_preview_from_csv(path: &std::path::Path) -> Result<(Vec<String>, Vec<Vec<String>>), String> {
    let mut reader = csv::ReaderBuilder::new().flexible(true).from_path(path).map_err(|e| e.to_string())?;
    let headers = reader.headers().map_err(|e| e.to_string())?.iter().map(|s| s.to_string()).collect::<Vec<String>>();
    
    let mut preview = Vec::new();
    for (i, result) in reader.records().enumerate() {
        if i >= 50 { break; }
        if let Ok(record) = result {
            preview.push(record.iter().map(|s| s.to_string()).collect());
        }
    }
    Ok((headers, preview))
}







#[tauri::command]
async fn pick_multiple_csv_files() -> Result<Vec<String>, String> {
    match rfd::FileDialog::new().add_filter("Tabular Data", &["csv", "tsv", "xlsx"]).pick_files() {
        Some(paths) => Ok(paths.into_iter().map(|p| p.display().to_string()).collect()),
        None => Err("Cancelled".to_string()),
    }
}

#[tauri::command]
async fn pick_multiple_log_files() -> Result<Vec<String>, String> {
    match rfd::FileDialog::new().add_filter("Log Files", &["log", "txt", "gz", "json"]).pick_files() {
        Some(paths) => Ok(paths.into_iter().map(|p| p.display().to_string()).collect()),
        None => Err("Cancelled".to_string()),
    }
}

#[tauri::command]
fn close_window(window: tauri::Window) { window.close().unwrap(); }

#[tauri::command]
fn minimize_window(window: tauri::Window) { window.minimize().unwrap(); }

#[tauri::command]
fn maximize_window(window: tauri::Window) {
    if window.is_maximized().unwrap_or(false) { window.unmaximize().unwrap(); } 
    else { window.maximize().unwrap(); }
}


#[tauri::command]
async fn compute_correlation_matrix(options: correlation::CorrelateOptions) -> Result<correlation::CorrelationResult, String> {
    correlation::compute_matrix(options)
}

#[tauri::command]
async fn get_scatter_data(options: correlation::CorrelateOptions, col_x: String, col_y: String) -> Result<Vec<(f64, f64)>, String> {
    // We will parse the CSV and extract only the two columns
    let path = std::path::Path::new(&options.file_path);
    let mut reader = csv::ReaderBuilder::new()
        .flexible(true)
        .from_path(path)
        .map_err(|e| e.to_string())?;
        
    let headers: Vec<String> = reader.headers().map_err(|e| e.to_string())?.iter().map(|s| s.to_string()).collect();
    
    let x_idx = headers.iter().position(|h| h == &col_x).ok_or("col_x not found")?;
    let y_idx = headers.iter().position(|h| h == &col_y).ok_or("col_y not found")?;
    
    let mut points = Vec::new();
    for result in reader.records() {
        if let Ok(record) = result {
            if let (Some(x_str), Some(y_str)) = (record.get(x_idx), record.get(y_idx)) {
                let x_clean = x_str.trim().replace("$", "").replace("%", "").replace(",", "");
                let y_clean = y_str.trim().replace("$", "").replace("%", "").replace(",", "");
                if let (Ok(x_val), Ok(y_val)) = (x_clean.parse::<f64>(), y_clean.parse::<f64>()) {
                    points.push((x_val, y_val));
                }
            }
        }
    }
    
    Ok(points)
}

#[tauri::command]
async fn export_matrix_csv(matrix: correlation::CorrelationResult, dest_path: String) -> Result<(), String> {
    let mut wtr = csv::Writer::from_path(dest_path).map_err(|e| e.to_string())?;
    
    // Write headers: "" (empty top-left), col1, col2, ...
    let mut headers = vec!["".to_string()];
    for c in &matrix.columns {
        headers.push(c.clone());
    }
    wtr.write_record(&headers).map_err(|e| e.to_string())?;
    
    // Write rows
    for (i, row_col) in matrix.columns.iter().enumerate() {
        let mut row_data = vec![row_col.clone()];
        for (j, _) in matrix.columns.iter().enumerate() {
            if i == j {
                row_data.push("1.000".to_string());
            } else {
                row_data.push(format!("{:.4}", matrix.matrix[i][j].r));
            }
        }
        wtr.write_record(&row_data).map_err(|e| e.to_string())?;
    }
    
    wtr.flush().map_err(|e| e.to_string())?;
    Ok(())
}


#[tauri::command]
async fn pick_export_path() -> Result<String, String> {
    match rfd::FileDialog::new().add_filter("CSV Matrix", &["csv"]).set_file_name("correlation_matrix.csv").save_file() {
        Some(path) => Ok(path.to_string_lossy().to_string()),
        None => Err("Cancelled".into()),
    }
}

#[tauri::command]
async fn get_csv_headers(file_path: String) -> Result<Vec<String>, String> {
    let path = std::path::Path::new(&file_path);
    let mut reader = csv::ReaderBuilder::new().flexible(true).from_path(path).map_err(|e| e.to_string())?;
    Ok(reader.headers().map_err(|e| e.to_string())?.iter().map(|s| s.to_string()).collect())
}

#[tauri::command]
async fn pick_csv_file() -> Result<String, String> {
    match rfd::FileDialog::new().add_filter("Tabular Data", &["csv", "tsv", "xlsx"]).pick_file() {
        Some(path) => Ok(path.to_string_lossy().to_string()),
        None => Err("No file selected".into()),
    }
}

#[tauri::command]
async fn save_recipe_native(recipe_str: String) -> Result<String, String> {
    match rfd::FileDialog::new()
        .set_file_name("pipeline.tangent")
        .add_filter("Tangent Recipe", &["tangent", "json"])
        .save_file() {
            Some(path) => {
                std::fs::write(&path, recipe_str).map_err(|e| e.to_string())?;
                Ok(path.file_name().unwrap().to_string_lossy().to_string())
            },
            None => Err("Cancelled".into()),
    }
}

#[tauri::command]
async fn load_recipe_native() -> Result<String, String> {
    match rfd::FileDialog::new()
        .add_filter("Tangent Recipe", &["tangent", "json"])
        .pick_file() {
            Some(path) => {
                std::fs::read_to_string(&path).map_err(|e| e.to_string())
            },
            None => Err("Cancelled".into()),
    }
}

#[tauri::command]
async fn save_export_as(temp_path: String) -> Result<String, String> {
    let path = std::path::Path::new(&temp_path);
    let stem = path.file_stem().unwrap_or(std::ffi::OsStr::new("data")).to_string_lossy().replace("_temp", "");
    
    match rfd::FileDialog::new()
        .set_file_name(&stem)
        .add_filter("CSV Data", &["csv"])
        .save_file() {
            Some(dest_path) => {
                std::fs::copy(&temp_path, &dest_path).map_err(|e| e.to_string())?;
                Ok(dest_path.to_string_lossy().to_string())
            },
            None => Err("Cancelled".into()),
    }
}

// NATIVE DATA PROFILER & ENGINE
#[tauri::command]
async fn process_massive_csv(file_path: String) -> Result<String, String> {
    let file_path = std::path::PathBuf::from(file_path);
    
    let file_metadata = std::fs::metadata(&file_path).map_err(|e| e.to_string())?;
    let file_size_mb = file_metadata.len() as f64 / 1_048_576.0;

    let mut reader = csv::ReaderBuilder::new()
        .has_headers(true)
        .from_path(&file_path)
        .map_err(|e| e.to_string())?;

    let headers = reader.headers().map_err(|e| e.to_string())?.clone();
    let num_cols = headers.len();
    
    let mut row_count = 0;
    let mut null_counts = vec![0; num_cols];
    let mut pii_flags = vec![false; num_cols]; // Detect emails/sensitive data
    
    let mut preview_data = Vec::new();

    for result in reader.records() {
        let record = result.map_err(|e| e.to_string())?;
        
        for (i, field) in record.iter().enumerate() {
            if i >= num_cols { continue; }
            let trimmed = field.trim();
            
            // 1. Missing Value Detection
            if trimmed.is_empty() || trimmed == "NaN" || trimmed.eq_ignore_ascii_case("null") || trimmed == "N/A" || trimmed == "-" {
                null_counts[i] += 1;
            }
            
            // 2. Pro Feature: PII / Sensitive Data Detection (Heuristic on first 1000 rows)
            if row_count < 1000 && !trimmed.is_empty() {
                // Basic Email detection
                if trimmed.contains('@') && trimmed.contains('.') && !trimmed.contains(' ') {
                    pii_flags[i] = true;
                }
            }
        }
        
        if row_count < 500 {
            preview_data.push(record.iter().map(|s| s.to_string()).collect::<Vec<String>>());
        }
        row_count += 1;
    }

    let response = json!({
        "path": file_path.to_string_lossy(),
        "file_size_mb": format!("{:.2}", file_size_mb),
        "columns": headers.iter().collect::<Vec<&str>>(),
        "total_rows": row_count,
        "null_counts": null_counts,
        "pii_flags": pii_flags,
        "preview": preview_data
    });

    Ok(response.to_string())
}

use std::collections::HashSet;
use ahash::AHasher;
use strsim::jaro_winkler;
use std::hash::{Hash, Hasher};

#[derive(serde::Deserialize, serde::Serialize, Debug, Clone)]
struct ImputationRule {
    col: String,
    method: String,
    custom_val: String,
}



fn format_date_rust(val: &str, target_format: &str, re_ymd: &Regex, re_mdy: &Regex, re_num: &Regex) -> String {
    let lower = val.trim().to_lowercase().replace("st", "").replace("nd", "").replace("rd", "").replace("th", "").replace(",", "");
    let mut y = None;
    let mut m = None;
    let mut d = None;
    
    if let Some(caps) = re_ymd.captures(&lower) {
        y = Some(caps[1].to_string());
        m = Some(caps[2].parse::<u32>().unwrap_or(1));
        d = Some(caps[3].parse::<u32>().unwrap_or(1));
    } else if let Some(caps) = re_mdy.captures(&lower) {
        let p1 = caps[1].parse::<u32>().unwrap_or(1);
        let p2 = caps[2].parse::<u32>().unwrap_or(1);
        y = Some(caps[3].to_string());
        if p1 > 12 { d = Some(p1); m = Some(p2); }
        else if p2 > 12 { m = Some(p1); d = Some(p2); }
        else { m = Some(p1); d = Some(p2); }
    } else {
        let months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
        let mut found_m = 0;
        for (i, month) in months.iter().enumerate() {
            if lower.contains(month) { found_m = i as u32 + 1; break; }
        }
        if found_m > 0 {
            let nums: Vec<u32> = re_num.find_iter(&lower).filter_map(|x| x.as_str().parse::<u32>().ok()).collect();
            let mut found_y = 0;
            let mut found_d = 0;
            for n in nums {
                if n > 1000 { found_y = n; }
                else if n <= 31 { found_d = n; }
            }
            if found_y > 0 && found_d > 0 {
                y = Some(found_y.to_string());
                m = Some(found_m);
                d = Some(found_d);
            }
        }
    }
    
    if let (Some(yy), Some(mm), Some(dd)) = (y, m, d) {
        let mm_str = format!("{:02}", mm);
        let dd_str = format!("{:02}", dd);
        if target_format == "ISO" { return format!("{}-{}-{}", yy, mm_str, dd_str); }
        else if target_format == "US" { return format!("{}/{}/{}", mm_str, dd_str, yy); }
        else if target_format == "EU" { return format!("{}/{}/{}", dd_str, mm_str, yy); }
    }
    val.to_string()
}

fn clean_numeric(val: &str) -> String {
    let mut str_val = val.trim().to_lowercase();
    let word_to_num = [
        ("zero", "0"), ("one hundred", "100"), ("hundred", "100"), ("one", "1"), ("two", "2"), ("three", "3"), ("four", "4"),
        ("five", "5"), ("six", "6"), ("seven", "7"), ("eight", "8"), ("nine", "9"),
        ("ten", "10"), ("eleven", "11"), ("twelve", "12"), ("thirteen", "13"),
        ("fourteen", "14"), ("fifteen", "15"), ("sixteen", "16"), ("seventeen", "17"),
        ("eighteen", "18"), ("nineteen", "19"), ("twenty", "20")
    ];
    
    for (w, n) in word_to_num.iter() {
        str_val = str_val.replace(w, *n);
    }
    
    if str_val.ends_with('k') {
        str_val = format!("{}000", &str_val[0..str_val.len()-1]);
    } else if str_val.ends_with('m') {
        str_val = format!("{}000000", &str_val[0..str_val.len()-1]);
    }
    
    let clean: String = str_val.chars().filter(|c| c.is_ascii_digit() || *c == '.' || *c == '-').collect();
    if clean.is_empty() || clean == "-" || clean == "." { val.to_string() } else { clean }
}

#[derive(Deserialize, Debug)]
struct Recipe {
    sanitize_headers: bool,
    drop_empty: bool,
    strip_ctrl: bool,
    trim_all: bool,
    date_format: String,
    imputation_rules: Vec<ImputationRule>,
    
    dedupe: bool,
    dedupe_mode: String,
    dedupe_cols: Vec<String>,
    drop_missing_cols: Vec<String>,
    date_cols: Vec<String>,
    number_cols: Vec<String>,
    absolute_nums: bool,
    phone_cols: Vec<String>,
    #[serde(default)]
    strip_phone_ext: bool,
    title_cols: Vec<String>,
}

fn process_csv_file(file_path: &std::path::Path, out_path: &std::path::Path, recipe: &Recipe) -> Result<(usize, usize, usize), String> {
    
let mut reader = csv::ReaderBuilder::new().has_headers(true).from_path(file_path).map_err(|e| e.to_string())?;
    let orig_headers: Vec<String> = reader.headers().map_err(|e| e.to_string())?.iter().map(|s| s.to_string()).collect();
    let num_cols = orig_headers.len();
    
    // Map column names to indexes for imputation rules
    let mut impute_targets: std::collections::HashMap<usize, ImputationRule> = std::collections::HashMap::new();
    for (i, h) in orig_headers.iter().enumerate() {
        if let Some(rule) = recipe.imputation_rules.iter().find(|r| &r.col == h) {
            impute_targets.insert(i, rule.clone());
        }
    }
    
    // --- PASS 1: STATISTICAL PROFILING ---
    let mut col_sums: Vec<f64> = vec![0.0; num_cols];
    let mut col_counts: Vec<usize> = vec![0; num_cols];
    let mut col_arrays: Vec<Vec<f64>> = vec![Vec::new(); num_cols];
    let mut col_freqs: Vec<std::collections::HashMap<String, usize>> = vec![std::collections::HashMap::new(); num_cols];
    
    let mut needs_pass_one = false;
    for (_, rule) in impute_targets.iter() {
        if rule.method == "mean" || rule.method == "median" || rule.method == "mode" {
            needs_pass_one = true;
            break;
        }
    }
    
    if needs_pass_one {
        let mut pass1_reader = csv::ReaderBuilder::new().has_headers(true).from_path(file_path).map_err(|e| e.to_string())?;
        for result in pass1_reader.records() {
            if let Ok(record) = result {
                for (i, field) in record.iter().enumerate() {
                    let is_empty = field.is_empty() || field == "NaN" || field.eq_ignore_ascii_case("null") || field == "N/A";
                    if !is_empty {
                        if let Some(rule) = impute_targets.get(&i) {
                            if rule.method == "mean" || rule.method == "median" {
                                if let Ok(val) = field.trim().parse::<f64>() {
                                    col_sums[i] += val;
                                    col_counts[i] += 1;
                                    if rule.method == "median" {
                                        col_arrays[i].push(val);
                                    }
                                }
                            } else if rule.method == "mode" {
                                *col_freqs[i].entry(field.trim().to_string()).or_insert(0) += 1;
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Finalize statistics
    let mut final_imputes: Vec<String> = vec![String::new(); num_cols];
    for (i, rule) in impute_targets.iter() {
        if rule.method == "mean" {
            if col_counts[*i] > 0 {
                final_imputes[*i] = format!("{:.2}", col_sums[*i] / (col_counts[*i] as f64));
            }
        } else if rule.method == "median" {
            if !col_arrays[*i].is_empty() {
                col_arrays[*i].sort_unstable_by(|a, b| a.partial_cmp(b).unwrap());
                let mid = col_arrays[*i].len() / 2;
                final_imputes[*i] = col_arrays[*i][mid].to_string();
            }
        } else if rule.method == "mode" {
            if let Some((most_freq, _)) = col_freqs[*i].iter().max_by_key(|&(_, count)| count) {
                final_imputes[*i] = most_freq.clone();
            }
        } else if rule.method == "custom" {
            final_imputes[*i] = rule.custom_val.clone();
        }
    }
    
    // --- PASS 2: EXECUTION & DEDUPLICATION ---
    let mut out_headers = csv::StringRecord::new();
    for h in orig_headers.iter() {
        if recipe.sanitize_headers {
            let mut sanitized = h.trim().replace(" ", "_").to_lowercase();
            sanitized.retain(|c| c.is_alphanumeric() || c == '_');
            out_headers.push_field(&sanitized);
        } else {
            out_headers.push_field(h);
        }
    }
    
    let mut writer = csv::WriterBuilder::new().from_path(&out_path).map_err(|e| e.to_string())?;
    writer.write_record(&out_headers).map_err(|e| e.to_string())?;
    
    let mut rows_written = 0;
    let mut rows_dropped = 0;
    let mut duplicates_dropped = 0;
    
    let ctrl_regex = Regex::new(r"[\x00-\x1F\x7F]").unwrap();
    let date_ymd = Regex::new(r"^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})").unwrap();
    let date_mdy = Regex::new(r"^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})").unwrap();
    let date_num = Regex::new(r"\d+").unwrap();

    
    let mut seen_hashes: HashSet<u64> = HashSet::new();
    let mut seen_fuzzy_keys: Vec<String> = Vec::new();
    
    for result in reader.records() {
        let record = result.map_err(|e| e.to_string())?;
        let mut out_record = Vec::new();
        let mut has_empty = false;
        let mut missing_critical = false;
        
        if recipe.dedupe {
            if recipe.dedupe_mode == "fuzzy" && !recipe.dedupe_cols.is_empty() {
                let mut combined_key = String::new();
                for (i, field) in record.iter().enumerate() {
                    if recipe.dedupe_cols.contains(&orig_headers[i]) {
                        combined_key.push_str(field);
                        combined_key.push('|');
                    }
                }
                
                let mut is_duplicate = false;
                for seen in seen_fuzzy_keys.iter() {
                    if jaro_winkler(&combined_key, seen) > 0.88 {
                        is_duplicate = true;
                        break;
                    }
                }
                
                if is_duplicate {
                    duplicates_dropped += 1;
                    continue;
                } else {
                    seen_fuzzy_keys.push(combined_key);
                }
            } else {
                let mut hasher = AHasher::default();
                if recipe.dedupe_cols.is_empty() {
                    for field in record.iter() { field.hash(&mut hasher); }
                } else {
                    for (i, field) in record.iter().enumerate() {
                        if recipe.dedupe_cols.contains(&orig_headers[i]) {
                            field.hash(&mut hasher);
                        }
                    }
                }
                let hash_val = hasher.finish();
                if !seen_hashes.insert(hash_val) {
                    duplicates_dropped += 1;
                    continue;
                }
            }
        }
        
        for (i, field) in record.iter().enumerate() {
            let mut processed = field.to_string();
            let orig_h = &orig_headers[i];
            
            if recipe.strip_ctrl { processed = ctrl_regex.replace_all(&processed, "").to_string(); }
            if recipe.trim_all { processed = processed.trim().to_string(); }
            
            let test_val = processed.trim();
                let mut cell_is_empty = test_val.is_empty() || test_val == "NaN" || test_val.eq_ignore_ascii_case("null") || test_val == "N/A" || test_val == "-";
                
                if cell_is_empty {
                    if impute_targets.contains_key(&i) {
                        processed = final_imputes[i].clone();
                        cell_is_empty = false;
                    }
                }
                
                if cell_is_empty {
                    has_empty = true;
                    if recipe.drop_missing_cols.contains(orig_h) {
                        missing_critical = true;
                    }
                } else {
                if recipe.number_cols.contains(orig_h) {
                    processed = clean_numeric(&processed);
                    if recipe.absolute_nums { processed = processed.replace("-", ""); }
                }
                if recipe.phone_cols.contains(orig_h) {
                    let mut digits: String = processed.chars().filter(|c| c.is_ascii_digit()).collect();
                    if digits.len() >= 11 && digits.starts_with('1') { digits = digits[1..].to_string(); }
                    if digits.len() >= 10 {
                        let core = &digits[0..10];
                        let ext = &digits[10..];
                        processed = format!("({}) {}-{}", &core[0..3], &core[3..6], &core[6..10]);
                        if !recipe.strip_phone_ext && !ext.is_empty() {
                            processed = format!("{} ext {}", processed, ext);
                        }
                    }
                }
                if recipe.title_cols.contains(orig_h) {
                    processed = processed.split_whitespace().map(|w| {
                        let mut c = w.chars();
                        match c.next() {
                            None => String::new(),
                            Some(f) => f.to_uppercase().collect::<String>() + c.as_str()
                        }
                    }).collect::<Vec<_>>().join(" ");
                }
                if recipe.date_cols.contains(orig_h) { processed = format_date_rust(&processed, &recipe.date_format, &date_ymd, &date_mdy, &date_num); }
            }
            out_record.push(processed);
        }
        
        if missing_critical {
            rows_dropped += 1;
            continue;
        }
        
        if recipe.drop_empty && has_empty {
            rows_dropped += 1;
            continue;
        }
        
        writer.write_record(&out_record).map_err(|e| e.to_string())?;
        rows_written += 1;
    }
    
    writer.flush().map_err(|e| e.to_string())?;
    

    Ok((rows_written, rows_dropped, duplicates_dropped))
}




async fn process_db_table(uri: &str, table_name: &str, out_path: &std::path::Path, recipe: &Recipe) -> Result<(usize, usize, usize), String> {
    let pool = AnyPoolOptions::new()
        .max_connections(2)
        .connect(uri)
        .await
        .map_err(|e| format!("DB Connect Error: {}", e))?;
        
    let row_res = sqlx::query(&format!("SELECT * FROM {} LIMIT 1", table_name))
        .fetch_optional(&pool)
        .await
        .map_err(|e| format!("Query Error: {}", e))?;
        
    let mut orig_headers = Vec::new();
    if let Some(r) = &row_res {
        for col in r.columns() {
            orig_headers.push(col.name().to_string());
        }
    } else {
        return Err("Table is empty".into());
    }
    let num_cols = orig_headers.len();
    
    let mut impute_targets = std::collections::HashMap::new();
    for (i, h) in orig_headers.iter().enumerate() {
        if let Some(rule) = recipe.imputation_rules.iter().find(|r| &r.col == h) {
            impute_targets.insert(i, rule.clone());
        }
    }
    
    let mut col_sums: Vec<f64> = vec![0.0; num_cols];
    let mut col_counts: Vec<usize> = vec![0; num_cols];
    let mut col_arrays: Vec<Vec<f64>> = vec![Vec::new(); num_cols];
    let mut col_freqs: Vec<std::collections::HashMap<String, usize>> = vec![std::collections::HashMap::new(); num_cols];
    
    let mut needs_pass_one = false;
    for (_, rule) in impute_targets.iter() {
        if rule.method != "custom" { needs_pass_one = true; break; }
    }
    
    if needs_pass_one {
        let q_str = format!("SELECT * FROM {}", table_name);
        let mut p1_rows = sqlx::query(&q_str).fetch(&pool);
        while let Some(db_row) = p1_rows.try_next().await.map_err(|e| e.to_string())? {
            for (i, rule) in impute_targets.iter() {
                let val = match db_row.try_get::<String, _>(*i) {
                    Ok(s) => s,
                    Err(_) => match db_row.try_get::<i64, _>(*i) {
                        Ok(v) => v.to_string(),
                        Err(_) => match db_row.try_get::<f64, _>(*i) {
                            Ok(v) => v.to_string(),
                            Err(_) => match db_row.try_get::<bool, _>(*i) {
                                Ok(v) => v.to_string(),
                                Err(_) => "null".to_string()
                            }
                        }
                    }
                };
                let field = val.trim();
                let is_empty = field.is_empty() || field == "NaN" || field.eq_ignore_ascii_case("null") || field == "N/A";
                if !is_empty {
                    if rule.method == "mean" || rule.method == "median" {
                        if let Ok(num) = field.parse::<f64>() {
                            col_sums[*i] += num;
                            col_counts[*i] += 1;
                            if rule.method == "median" {
                                col_arrays[*i].push(num);
                            }
                        }
                    } else if rule.method == "mode" {
                        *col_freqs[*i].entry(field.to_string()).or_insert(0) += 1;
                    }
                }
            }
        }
    }
    
    let mut final_imputes: Vec<String> = vec![String::new(); num_cols];
    for (i, rule) in impute_targets.iter() {
        if rule.method == "mean" {
            if col_counts[*i] > 0 {
                final_imputes[*i] = format!("{:.2}", col_sums[*i] / (col_counts[*i] as f64));
            }
        } else if rule.method == "median" {
            if !col_arrays[*i].is_empty() {
                col_arrays[*i].sort_unstable_by(|a, b| a.partial_cmp(b).unwrap());
                let mid = col_arrays[*i].len() / 2;
                final_imputes[*i] = col_arrays[*i][mid].to_string();
            }
        } else if rule.method == "mode" {
            if let Some((most_freq, _)) = col_freqs[*i].iter().max_by_key(|&(_, count)| count) {
                final_imputes[*i] = most_freq.clone();
            }
        } else if rule.method == "custom" {
            final_imputes[*i] = rule.custom_val.clone();
        }
    }
    
    let mut out_headers = csv::StringRecord::new();
    for h in orig_headers.iter() {
        if recipe.sanitize_headers {
            let mut sanitized = h.trim().replace(" ", "_").to_lowercase();
            sanitized.retain(|c| c.is_alphanumeric() || c == '_');
            out_headers.push_field(&sanitized);
        } else {
            out_headers.push_field(h);
        }
    }
    
    let mut writer = csv::WriterBuilder::new().from_path(&out_path).map_err(|e| e.to_string())?;
    writer.write_record(&out_headers).map_err(|e| e.to_string())?;
    
    let mut rows_written = 0;
    let mut rows_dropped = 0;
    let mut duplicates_dropped = 0;
    
    let ctrl_regex = Regex::new(r"[\x00-\x1F\x7F]").unwrap();
    let date_ymd = Regex::new(r"^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})").unwrap();
    let date_mdy = Regex::new(r"^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})").unwrap();
    let date_num = Regex::new(r"\d+").unwrap();

    
    let mut seen_hashes = std::collections::HashSet::new();
    let mut seen_fuzzy_keys: Vec<String> = Vec::new();
    
    let query_str = format!("SELECT * FROM {}", table_name);
    let mut rows = sqlx::query(&query_str).fetch(&pool);
    while let Some(db_row) = rows.try_next().await.map_err(|e| e.to_string())? {
        let mut out_record = Vec::new();
        let mut has_empty = false;
        let mut missing_critical = false;
        
        let mut record_vec = Vec::with_capacity(num_cols);
        for i in 0..num_cols {
            let val = match db_row.try_get::<String, _>(i) {
                Ok(s) => s,
                Err(_) => {
                    match db_row.try_get::<i64, _>(i) {
                        Ok(v) => v.to_string(),
                        Err(_) => match db_row.try_get::<f64, _>(i) {
                            Ok(v) => v.to_string(),
                            Err(_) => match db_row.try_get::<bool, _>(i) {
                                Ok(v) => v.to_string(),
                                Err(_) => "null".to_string()
                            }
                        }
                    }
                }
            };
            record_vec.push(val);
        }
        
        if recipe.dedupe {
            if recipe.dedupe_mode == "fuzzy" && !recipe.dedupe_cols.is_empty() {
                let mut combined_key = String::new();
                for (i, field) in record_vec.iter().enumerate() {
                    if recipe.dedupe_cols.contains(&orig_headers[i]) {
                        combined_key.push_str(field);
                        combined_key.push('|');
                    }
                }
                
                let mut is_duplicate = false;
                for seen in seen_fuzzy_keys.iter() {
                    if jaro_winkler(&combined_key, seen) > 0.88 {
                        is_duplicate = true;
                        break;
                    }
                }
                
                if is_duplicate {
                    duplicates_dropped += 1;
                    continue;
                } else {
                    seen_fuzzy_keys.push(combined_key);
                }
            } else {
                use std::hash::{Hash, Hasher};
                use ahash::AHasher;
                let mut hasher = AHasher::default();
                if recipe.dedupe_cols.is_empty() {
                    for field in record_vec.iter() { field.hash(&mut hasher); }
                } else {
                    for (i, field) in record_vec.iter().enumerate() {
                        if recipe.dedupe_cols.contains(&orig_headers[i]) {
                            field.hash(&mut hasher);
                        }
                    }
                }
                let hash_val = hasher.finish();
                if !seen_hashes.insert(hash_val) {
                    duplicates_dropped += 1;
                    continue;
                }
            }
        }
        
        for (i, field) in record_vec.iter().enumerate() {
            let mut processed = field.clone();
            let orig_h = &orig_headers[i];
            
            if recipe.strip_ctrl { processed = ctrl_regex.replace_all(&processed, "").to_string(); }
            if recipe.trim_all { processed = processed.trim().to_string(); }
            
            let test_val = processed.trim();
                let mut cell_is_empty = test_val.is_empty() || test_val == "NaN" || test_val.eq_ignore_ascii_case("null") || test_val == "N/A" || test_val == "-";
                
                if cell_is_empty {
                    if impute_targets.contains_key(&i) {
                        processed = final_imputes[i].clone();
                        cell_is_empty = false;
                    }
                }
                
                if cell_is_empty {
                    has_empty = true;
                    if recipe.drop_missing_cols.contains(orig_h) {
                        missing_critical = true;
                    }
                } else {
                if recipe.number_cols.contains(orig_h) {
                    processed = clean_numeric(&processed);
                    if recipe.absolute_nums { processed = processed.replace("-", ""); }
                }
                if recipe.phone_cols.contains(orig_h) {
                    let mut digits: String = processed.chars().filter(|c| c.is_ascii_digit()).collect();
                    if digits.len() >= 11 && digits.starts_with('1') { digits = digits[1..].to_string(); }
                    if digits.len() >= 10 {
                        let core = &digits[0..10];
                        let ext = &digits[10..];
                        processed = format!("({}) {}-{}", &core[0..3], &core[3..6], &core[6..10]);
                        if !recipe.strip_phone_ext && !ext.is_empty() {
                            processed = format!("{} ext {}", processed, ext);
                        }
                    }
                }
                if recipe.title_cols.contains(orig_h) {
                    processed = processed.split_whitespace().map(|w| {
                        let mut c = w.chars();
                        match c.next() {
                            None => String::new(),
                            Some(f) => f.to_uppercase().collect::<String>() + c.as_str()
                        }
                    }).collect::<Vec<_>>().join(" ");
                }
                if recipe.date_cols.contains(orig_h) { processed = format_date_rust(&processed, &recipe.date_format, &date_ymd, &date_mdy, &date_num); }
            }
            out_record.push(processed);
        }
        
        if missing_critical {
            rows_dropped += 1;
            continue;
        }
        
        if recipe.drop_empty && has_empty {
            rows_dropped += 1;
            continue;
        }
        
        writer.write_record(&out_record).map_err(|e| e.to_string())?;
        rows_written += 1;
    }
    
    writer.flush().map_err(|e| e.to_string())?;
    
    pool.close().await;
    
    Ok((rows_written, rows_dropped, duplicates_dropped))
}


#[tauri::command]
async fn execute_recipe(file_path: String, recipe_str: String) -> Result<String, String> {
    let recipe: Recipe = serde_json::from_str(&recipe_str).map_err(|e| e.to_string())?;
    
    if file_path.starts_with("db://") {
        let parts: Vec<&str> = file_path.trim_start_matches("db://").split('|').collect();
        if parts.len() != 2 { return Err("Invalid DB URI format".into()); }
        let out_path = std::env::temp_dir().join(format!("{}_cleaned_temp.csv", parts[1]));
        let (rows_written, rows_dropped, duplicates_dropped) = process_db_table(parts[0], parts[1], &out_path, &recipe).await?;
        let (mut final_headers, mut final_preview) = (Vec::new(), Vec::new());
        if let Ok((h, p)) = get_preview_from_csv(&out_path) { final_headers = h; final_preview = p; }
        let response = json!({
            "temp_path": out_path.to_string_lossy(),
            "msg": format!("Database Pipeline successful!\n{} rows written.\n{} invalid rows dropped.\n{} duplicates removed.", rows_written, rows_dropped, duplicates_dropped),
            "final_headers": final_headers,
            "final_preview": final_preview
        });
        return Ok(response.to_string());
    }
    
    let path = std::path::Path::new(&file_path);
    let stem = path.file_stem().unwrap_or(std::ffi::OsStr::new("data")).to_string_lossy();
    let ext = path.extension().unwrap_or(std::ffi::OsStr::new("csv")).to_string_lossy();
    
    let out_path = std::env::temp_dir().join(format!("{}_cleaned_temp.{}", stem, ext));
    
    let (rows_written, rows_dropped, duplicates_dropped) = process_csv_file(path, &out_path, &recipe)?;
    
    let (mut final_headers, mut final_preview) = (Vec::new(), Vec::new());
    if let Ok((h, p)) = get_preview_from_csv(&out_path) { final_headers = h; final_preview = p; }
    let response = json!({
        "temp_path": out_path.to_string_lossy(),
        "msg": format!("Pipeline successful!\n{} rows written.\n{} invalid rows dropped.\n{} duplicates removed.", rows_written, rows_dropped, duplicates_dropped),
        "final_headers": final_headers,
        "final_preview": final_preview
    });
    
    Ok(response.to_string())
}


#[tauri::command]
async fn pick_directory() -> Result<Option<String>, String> {
    if let Some(folder_path) = rfd::AsyncFileDialog::new()
        .set_title("Select Folder for Batch Processing")
        .pick_folder()
        .await
    {
        Ok(Some(folder_path.path().display().to_string()))
    } else {
        Ok(None)
    }
}







#[tauri::command]
async fn execute_recipe_bulk(folder_path: String, recipe_str: String) -> Result<String, String> {
    let recipe: Recipe = serde_json::from_str(&recipe_str).map_err(|e| e.to_string())?;
    let in_dir = std::path::Path::new(&folder_path);
    if !in_dir.is_dir() { return Err("Selected path is not a directory".into()); }
    
    let out_dir = in_dir.join("Tangent_Cleaned");
    std::fs::create_dir_all(&out_dir).map_err(|e| e.to_string())?;
    
    let mut files = Vec::new();
    for entry in std::fs::read_dir(in_dir).map_err(|e| e.to_string())? {
        if let Ok(entry) = entry {
            let path = entry.path();
            if path.is_file() && path.extension().and_then(|e| e.to_str()) == Some("csv") {
                files.push(path);
            }
        }
    }
    
    let total_files = files.len();
    if total_files == 0 { return Err("No CSV files found in the selected folder".into()); }
    
    let mut total_written = 0;
    let mut total_dropped = 0;
    let mut total_dups = 0;
    
    // Standard sequential processing to avoid Rayon setup overhead for now.
    // Rust is so fast that sequentially streaming 50 CSVs will still take seconds.
    for path in files {
        let file_name = path.file_name().unwrap();
        let out_path = out_dir.join(file_name);
        
        match process_csv_file(&path, &out_path, &recipe) {
            Ok((w, d, dup)) => {
                total_written += w;
                total_dropped += d;
                total_dups += dup;
            },
            Err(e) => {
                println!("Error processing {:?}: {}", path, e);
            }
        }
    }
    
    let response = json!({
        "out_dir": out_dir.to_string_lossy(),
        "total_files": total_files,
        "msg": format!("Batch complete! Processed {} files.\n{} rows written.\n{} invalid rows dropped.\n{} duplicates removed.\nSaved to: {}", total_files, total_written, total_dropped, total_dups, out_dir.display())
    });
    
    Ok(response.to_string())
}


use sqlx::any::AnyPoolOptions;
use sqlx::{Column, Row};

#[tauri::command]
async fn connect_db(uri: String) -> Result<String, String> {
    sqlx::any::install_default_drivers();
    
    let pool = AnyPoolOptions::new()
        .max_connections(5)
        .connect(&uri)
        .await
        .map_err(|e| format!("Failed to connect: {}", e))?;
        
    let mut table_names = Vec::new();
    
    // Abstract query to get tables depending on the DB type
    // AnyPool gives us an AnyConnection. We can query the scheme.
    // For Postgres/MySQL: information_schema.tables
    // For SQLite: sqlite_master
    
    let query = if uri.starts_with("postgres") || uri.starts_with("mysql") {
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' OR table_schema = DATABASE()"
    } else if uri.starts_with("sqlite") {
        "SELECT name AS table_name FROM sqlite_master WHERE type='table'"
    } else {
        return Err("Unsupported database type. Use postgres://, mysql://, or sqlite://".into());
    };
    
    let rows = sqlx::query(query)
        .fetch_all(&pool)
        .await
        .map_err(|e| format!("Failed to fetch tables: {}", e))?;
        
    for row in rows {
        let name: String = row.try_get(0).unwrap_or_else(|_| "Unknown".to_string());
        table_names.push(name);
    }
    
    // Close pool explicitly or let it drop
    pool.close().await;
    
    let response = serde_json::json!({
        "tables": table_names,
        "msg": format!("Successfully connected! Found {} tables.", table_names.len())
    });
    
    Ok(response.to_string())
}


use std::sync::Arc;
use tokio::sync::Mutex;
use tokio_cron_scheduler::{JobScheduler, Job};

struct SchedulerState {
    sched: Arc<Mutex<Option<JobScheduler>>>,
}

#[tauri::command]
async fn schedule_batch_job(
    state: tauri::State<'_, SchedulerState>,
    cron_expr: String, 
    folder_path: String, 
    recipe_str: String
) -> Result<String, String> {
    
    let mut sched_guard = state.sched.lock().await;
    
    // Initialize if not already running
    if sched_guard.is_none() {
        let sched = JobScheduler::new().await.map_err(|e| format!("Failed to init scheduler: {}", e))?;
        sched.start().await.map_err(|e| format!("Failed to start scheduler: {}", e))?;
        *sched_guard = Some(sched);
    }
    
    let sched = sched_guard.as_mut().unwrap();
    
    // We clone these for the closure
    let folder_clone = folder_path.clone();
    let recipe_clone = recipe_str.clone();
    
    let job = Job::new_async(&cron_expr, move |_uuid, _l| {
        let f_path = folder_clone.clone();
        let r_str = recipe_clone.clone();
        Box::pin(async move {
            println!("CRON TRIGGERED: Running batch job on {}", f_path);
            // We call our execute_recipe_bulk function logic here
            // But execute_recipe_bulk is a Tauri command. 
            // We can just call it directly since it returns a Result
            match execute_recipe_bulk(f_path.clone(), r_str.clone()).await {
                Ok(res) => println!("CRON SUCCESS: {}", res),
                Err(e) => println!("CRON ERROR: {}", e),
            }
        })
    }).map_err(|e| format!("Invalid Cron Expression: {}", e))?;
    
    sched.add(job).await.map_err(|e| format!("Failed to add job: {}", e))?;
    
    let response = serde_json::json!({
        "msg": format!("Successfully scheduled job for {} with schedule: {}", folder_path, cron_expr)
    });
    
    Ok(response.to_string())
}


#[tauri::command]
async fn preview_db_table(uri: String, table_name: String) -> Result<String, String> {
    let pool = AnyPoolOptions::new()
        .max_connections(2)
        .connect(&uri)
        .await
        .map_err(|e| format!("DB Connect Error: {}", e))?;
        
    let row_res = sqlx::query(&format!("SELECT * FROM {} LIMIT 1", table_name))
        .fetch_optional(&pool)
        .await
        .map_err(|e| format!("Query Error: {}", e))?;
        
    let mut headers = Vec::new();
    if let Some(r) = &row_res {
        for col in r.columns() {
            headers.push(col.name().to_string());
        }
    } else {
        let response = serde_json::json!({
            "path": format!("db://{}|{}", uri, table_name),
            "file_size_mb": "0.0",
            "columns": headers,
            "total_rows": 0,
            "null_counts": Vec::<usize>::new(),
            "pii_flags": Vec::<bool>::new(),
            "preview": Vec::<Vec<String>>::new()
        });
        return Ok(response.to_string());
    }
    let num_cols = headers.len();
    
    // Get row count
    let count_res: Result<(i64,), _> = sqlx::query_as(&format!("SELECT COUNT(*) FROM {}", table_name))
        .fetch_one(&pool)
        .await;
    let total_rows = match count_res {
        Ok(c) => c.0 as usize,
        Err(_) => 0,
    };
    
    let rows = sqlx::query(&format!("SELECT * FROM {} LIMIT 500", table_name))
        .fetch_all(&pool)
        .await
        .map_err(|e| e.to_string())?;
        
    let mut null_counts = vec![0; num_cols];
    let mut pii_flags = vec![false; num_cols];
    let mut preview_data = Vec::new();
    
    for (row_idx, row) in rows.iter().enumerate() {
        let mut string_row = Vec::with_capacity(num_cols);
        for i in 0..num_cols {
            let val = match row.try_get::<String, _>(i) {
                Ok(s) => s,
                Err(_) => {
                    match row.try_get::<i64, _>(i) {
                        Ok(v) => v.to_string(),
                        Err(_) => {
                            match row.try_get::<f64, _>(i) {
                                Ok(v) => v.to_string(),
                                Err(_) => {
                                    match row.try_get::<bool, _>(i) {
                                        Ok(v) => v.to_string(),
                                        Err(_) => "null".to_string()
                                    }
                                }
                            }
                        }
                    }
                }
            };
            
            let trimmed = val.trim();
            if trimmed.is_empty() || trimmed == "NaN" || trimmed.eq_ignore_ascii_case("null") || trimmed == "N/A" || trimmed == "-" {
                null_counts[i] += 1;
            }
            if row_idx < 1000 && !trimmed.is_empty() {
                if trimmed.contains('@') && trimmed.contains('.') && !trimmed.contains(' ') {
                    pii_flags[i] = true;
                }
            }
            string_row.push(val);
        }
        preview_data.push(string_row);
    }
    
    pool.close().await;
    
    let response = serde_json::json!({
        "path": format!("db://{}|{}", uri, table_name),
        "file_size_mb": "DB",
        "columns": headers,
        "total_rows": total_rows,
        "null_counts": null_counts,
        "pii_flags": pii_flags,
        "preview": preview_data
    });

    Ok(response.to_string())
}


#[tauri::command]
async fn save_dashboard_native(config: String) -> Result<(), String> {
    if let Some(path) = rfd::FileDialog::new()
        .add_filter("Tangent Dashboard", &["tgt-dash"])
        .save_file() {
        std::fs::write(&path, config).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn load_dashboard_native() -> Result<String, String> {
    if let Some(path) = rfd::FileDialog::new()
        .add_filter("Tangent Dashboard", &["tgt-dash"])
        .pick_file() {
        let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
        return Ok(content);
    }
    Err("Cancelled".to_string())
}

#[tauri::command]
async fn read_file_to_string_native(path: String) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|e| e.to_string())
}


#[tauri::command]
async fn save_image_native(bytes: Vec<u8>, default_name: String) -> Result<String, String> {
    if let Some(path) = rfd::FileDialog::new()
        .set_file_name(&default_name)
        .add_filter("PNG Image", &["png"])
        .save_file() {
        std::fs::write(&path, bytes).map_err(|e| e.to_string())?;
        return Ok(path.display().to_string());
    }
    Err("Cancelled".to_string())
}


#[tauri::command]
async fn save_base64_image_native(base64_data: String, default_name: String) -> Result<String, String> {
    if let Some(path) = rfd::FileDialog::new()
        .set_file_name(&default_name)
        .add_filter("PNG Image", &["png"])
        .save_file() {
        
        let cleaned = base64_data.replace("data:image/png;base64,", "");
        
        use base64::{Engine as _, engine::general_purpose};
        let decoded = general_purpose::STANDARD.decode(&cleaned).map_err(|e| e.to_string())?;
        
        std::fs::write(&path, decoded).map_err(|e| e.to_string())?;
        return Ok(path.display().to_string());
    }
    Err("Cancelled".to_string())
}


#[tauri::command]
async fn save_text_file_native(text: String, default_name: String) -> Result<String, String> {
    if let Some(path) = rfd::FileDialog::new()
        .set_file_name(&default_name)
        .add_filter("Text/Data", &["csv", "json", "txt"])
        .save_file() {
        std::fs::write(&path, text).map_err(|e| e.to_string())?;
        return Ok(path.display().to_string());
    }
    Err("Cancelled".to_string())
}


#[tauri::command]
async fn pick_launchpad_files() -> Result<Vec<String>, String> {
    Ok(rfd::FileDialog::new()
        .add_filter("Tangent Data Files", &["csv", "tsv", "xlsx", "json", "parquet", "log", "txt", "gz", "html", "htm"])
        .pick_files()
        .unwrap_or_default()
        .into_iter()
        .map(|path| path.to_string_lossy().into_owned())
        .collect())
}

#[tauri::command]
async fn read_launchpad_file(path: String) -> Result<Vec<u8>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        std::fs::read(path).map_err(|error| error.to_string())
    }).await.map_err(|error| error.to_string())?
}

fn main() {
    println!("Rebooting asset server: Pro Dashboard...");
    
#[tauri::command]
async fn execute_db_query(uri: String, query: String) -> Result<String, String> {
    sqlx::any::install_default_drivers();
    let pool = sqlx::any::AnyPoolOptions::new()
        .max_connections(5)
        .connect(&uri)
        .await
        .map_err(|e| format!("DB Connect Error: {}", e))?;
        
    let rows = sqlx::query(&query)
        .fetch_all(&pool)
        .await
        .map_err(|e| format!("Query Error: {}", e))?;
        
    let mut results = Vec::new();
    for row in rows {
        let mut map = serde_json::Map::new();
        for col in row.columns() {
            let col_name = col.name();
            let val = match row.try_get::<String, _>(col_name) {
                Ok(s) => serde_json::Value::String(s),
                Err(_) => {
                    match row.try_get::<i64, _>(col_name) {
                        Ok(v) => serde_json::Value::Number(serde_json::Number::from(v)),
                        Err(_) => {
                            match row.try_get::<f64, _>(col_name) {
                                Ok(v) => serde_json::Number::from_f64(v).map(serde_json::Value::Number).unwrap_or(serde_json::Value::Null),
                                Err(_) => {
                                    match row.try_get::<bool, _>(col_name) {
                                        Ok(v) => serde_json::Value::Bool(v),
                                        Err(_) => serde_json::Value::Null
                                    }
                                }
                            }
                        }
                    }
                }
            };
            map.insert(col_name.to_string(), val);
        }
        results.push(serde_json::Value::Object(map));
    }
    
    Ok(serde_json::json!(results).to_string())
}

tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(snapshots::SnapshotStore::default())
        .manage(editor::EditorStore::default())
        .manage(SchedulerState { sched: Arc::new(Mutex::new(None)) })
        .invoke_handler(tauri::generate_handler![
            snapshots::create_dataset_snapshot,
            tabular::stage_tabular_file,
            tabular::preview_tabular_import,
            tabular::import_tabular_file,
            tabular::read_tabular_dataset,
            tabular::create_tabular_snapshot,
            tabular::export_tabular_result,
            editor::import_editor_file,
            editor::open_editor_dataset,
            editor::read_editor_page,
            editor::edit_editor_cell,
            editor::editor_column_kinds,
            editor::release_editor_dataset,
            editor::snapshot_editor_dataset,
            editor::export_editor_dataset,
            insights::profile_insights,
            insights::filter_insights,
            insights::aggregate_insights,
            insights::compare_insights,

            pick_launchpad_files,
            read_launchpad_file,
            extractor::fetch_live_url,
            extractor::extract_structured,
            extractor::extract_tables,
            get_csv_headers,
            pick_export_path,
            get_scatter_data,
            export_matrix_csv,
            compute_correlation_matrix,
            log_analyzer::parse_logs,
            finance::extract_financial_headers,
            finance::parse_financial_statements,
            finance_native::finance_headers,
            finance_native::open_finance_ledger,
            finance_native::read_finance_page,
            pick_multiple_log_files,
            pick_multiple_csv_files,
            read_file_to_string_native,
            save_dashboard_native,
            save_image_native,
            save_base64_image_native,
            load_dashboard_native,
            close_window, 
            minimize_window, 
            maximize_window,
            pick_csv_file,
            process_massive_csv,
            save_recipe_native,
            save_export_as,
            save_text_file_native,
            load_recipe_native,
            execute_recipe, pick_directory, execute_recipe_bulk,
            connect_db,
            preview_db_table,
            schedule_batch_job,
            execute_db_query
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            if matches!(event, tauri::RunEvent::Exit) {
                app.state::<snapshots::SnapshotStore>().cleanup();
            }
        });
}

