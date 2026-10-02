use serde::{Deserialize, Serialize};
use scraper::{Html, Selector};
use reqwest::Client;

#[derive(Serialize)]
pub struct ExtractedTable {
    pub index: usize,
    pub headers: Vec<String>,
    pub rows: Vec<Vec<String>>,
}

#[derive(Deserialize)]
pub struct FieldDef {
    pub name: String,
    pub selector: String,
    pub extract_type: String, // "text" or "attribute"
    pub attribute_name: Option<String>,
}

#[tauri::command]
pub async fn fetch_live_url(url: String) -> Result<String, String> {
    let client = Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| e.to_string())?;
        
    let response = client.get(&url)
        .send()
        .await
        .map_err(|e| e.to_string())?;
        
    let text = response.text().await.map_err(|e| e.to_string())?;
    Ok(text)
}

#[tauri::command]
pub fn extract_structured(html: String, parent_selector: String, fields: Vec<FieldDef>) -> Result<Vec<Vec<String>>, String> {
    let document = Html::parse_document(&html);
    let parent_sel = Selector::parse(&parent_selector).map_err(|_| format!("Invalid parent CSS selector: {}", parent_selector))?;
    
    let mut parsed_fields = Vec::new();
    for f in &fields {
        let sel = Selector::parse(&f.selector).map_err(|_| format!("Invalid CSS selector for field '{}': {}", f.name, f.selector))?;
        parsed_fields.push((f, sel));
    }
    
    let mut results = Vec::new();
    
    // Header row
    let headers: Vec<String> = fields.iter().map(|f| f.name.clone()).collect();
    results.push(headers);
    
    for parent_node in document.select(&parent_sel) {
        let mut row_data = Vec::new();
        for (field_def, child_sel) in &parsed_fields {
            let mut extracted_val = String::new();
            
            // Just grab the first match within the parent
            if let Some(child_node) = parent_node.select(child_sel).next() {
                if field_def.extract_type == "attribute" {
                    if let Some(attr_name) = &field_def.attribute_name {
                        if let Some(attr_val) = child_node.value().attr(attr_name) {
                            extracted_val = attr_val.to_string();
                        }
                    }
                } else {
                    let text: Vec<_> = child_node.text().collect();
                    extracted_val = text.join(" ").split_whitespace().collect::<Vec<_>>().join(" ");
                }
            }
            row_data.push(extracted_val);
        }
        results.push(row_data);
    }
    
    Ok(results)
}

#[tauri::command]
pub fn extract_tables(html: String) -> Result<Vec<ExtractedTable>, String> {
    let document = Html::parse_document(&html);
    let table_sel = Selector::parse("table").unwrap();
    let row_sel = Selector::parse("tr").unwrap();
    let cell_sel = Selector::parse("th, td").unwrap();
    
    let mut extracted = Vec::new();
    
    for (t_idx, table_node) in document.select(&table_sel).enumerate() {
        let mut grid: Vec<Vec<String>> = Vec::new();
        
        for (r_idx, row_node) in table_node.select(&row_sel).enumerate() {
            // Ensure grid has this row
            if grid.len() <= r_idx {
                grid.resize(r_idx + 1, Vec::new());
            }
            
            let mut current_col = 0;
            
            for cell_node in row_node.select(&cell_sel) {
                // Find the next available column in the current row
                while current_col < grid[r_idx].len() && grid[r_idx][current_col] != "\x00" {
                    current_col += 1;
                }
                
                let text: Vec<_> = cell_node.text().collect();
                let clean_text = text.join(" ").split_whitespace().collect::<Vec<_>>().join(" ");
                
                let colspan: usize = cell_node.value().attr("colspan").unwrap_or("1").parse().unwrap_or(1);
                let rowspan: usize = cell_node.value().attr("rowspan").unwrap_or("1").parse().unwrap_or(1);
                
                for r in 0..rowspan {
                    let target_r = r_idx + r;
                    if grid.len() <= target_r {
                        grid.resize(target_r + 1, Vec::new());
                    }
                    
                    for c in 0..colspan {
                        let target_c = current_col + c;
                        
                        // Fill with placeholder if needed
                        if grid[target_r].len() <= target_c {
                            grid[target_r].resize(target_c + 1, "\x00".to_string());
                        }
                        
                        grid[target_r][target_c] = clean_text.clone();
                    }
                }
                current_col += colspan;
            }
        }
        
        // Clean up the \x00 placeholders just in case
        for row in &mut grid {
            for cell in row {
                if cell == "\x00" {
                    *cell = String::new();
                }
            }
        }
        
        if grid.len() > 0 {
            // Separate header and rows for preview purposes
            let headers = if grid.len() > 0 { grid[0].clone() } else { Vec::new() };
            extracted.push(ExtractedTable {
                index: t_idx,
                headers,
                rows: grid,
            });
        }
    }
    
    Ok(extracted)
}
