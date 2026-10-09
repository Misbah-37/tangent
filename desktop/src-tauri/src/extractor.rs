use serde::{Deserialize, Serialize};
use scraper::{Html, Selector};
use reqwest::Client;

#[derive(Debug, Serialize)]
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
        .map_err(|e| e.to_string())?
        .error_for_status().map_err(|e| e.to_string())?;
        
    let text = response.text().await.map_err(|e| e.to_string())?;
    Ok(text)
}

#[tauri::command]
pub async fn extract_structured(html: String, parent_selector: String, fields: Vec<FieldDef>) -> Result<Vec<Vec<String>>, String> {
    tauri::async_runtime::spawn_blocking(move || extract_structured_sync(html, parent_selector, fields)).await.map_err(|e| e.to_string())?
}
fn extract_structured_sync(html: String, parent_selector: String, fields: Vec<FieldDef>) -> Result<Vec<Vec<String>>, String> {
    if fields.is_empty() { return Err("Add at least one extraction field.".into()); }
    for field in &fields {
        if field.extract_type != "text" && field.extract_type != "attribute" { return Err("Unknown extraction type.".into()); }
        if field.extract_type == "attribute" && field.attribute_name.as_deref().unwrap_or("").trim().is_empty() { return Err("Attribute fields need an attribute name.".into()); }
    }
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
                    extracted_val = text.join("").split_whitespace().collect::<Vec<_>>().join(" ");
                }
            }
            row_data.push(extracted_val);
        }
        results.push(row_data);
    }
    
    Ok(results)
}

#[tauri::command]
pub async fn extract_tables(html: String) -> Result<Vec<ExtractedTable>, String> {
    tauri::async_runtime::spawn_blocking(move || extract_tables_sync(html)).await.map_err(|e| e.to_string())?
}
fn extract_tables_sync(html: String) -> Result<Vec<ExtractedTable>, String> {
    let document = Html::parse_document(&html);
    let table_sel = Selector::parse("table").unwrap();
    let row_sel = Selector::parse("tr").unwrap();
    let cell_sel = Selector::parse("th, td").unwrap();
    let mut extracted = Vec::new();
    for (index, table) in document.select(&table_sel).enumerate() {
        let rows:Vec<_> = table.select(&row_sel).filter(|row| row.ancestors().filter_map(scraper::ElementRef::wrap).find(|e|e.value().name()=="table").map(|e|e.id())==Some(table.id())).collect();
        if rows.is_empty(){continue;}
        let mut grid = vec![Vec::<Option<String>>::new(); rows.len()];
        let header = rows[0].select(&cell_sel).filter(|cell|cell.ancestors().filter_map(scraper::ElementRef::wrap).find(|e|e.value().name()=="tr").map(|e|e.id())==Some(rows[0].id())).all(|cell|cell.value().name()=="th");
        for (r, row) in rows.iter().enumerate() {
            let mut col=0;
            for cell in row.select(&cell_sel).filter(|cell|cell.ancestors().filter_map(scraper::ElementRef::wrap).find(|e|e.value().name()=="tr").map(|e|e.id())==Some(row.id())) {
                let width=cell.value().attr("colspan").and_then(|v|v.parse::<usize>().ok()).unwrap_or(1).max(1);
                if width>1000{return Err("Table colspan exceeds 1,000 columns.".into());}
                let span=cell.value().attr("rowspan").and_then(|v|v.parse::<usize>().ok()).unwrap_or(1);
                let height=if span==0{rows.len()-r}else{span.min(rows.len()-r)};
                while col<grid[r].len() && grid[r][col].is_some(){col+=1;}
                if col+width>1000{return Err("Table exceeds 1,000 columns.".into());}
                let text=cell.text().collect::<String>().split_whitespace().collect::<Vec<_>>().join(" ");
                for rr in r..r+height {
                    let length=grid[rr].len().max(col+width);grid[rr].resize(length,None);
                    for cc in col..col+width {
                        if grid[rr][cc].is_some(){return Err("Overlapping table spans cannot be flattened reliably.".into());}
                        grid[rr][cc]=Some(text.clone());
                    }
                }
                col+=width;
            }
        }
        let width=grid.iter().map(Vec::len).max().unwrap_or(0);if width==0{continue;}
        let mut data:Vec<Vec<String>>=grid.into_iter().map(|mut row|{row.resize(width,None);row.into_iter().map(|v|v.unwrap_or_default()).collect()}).collect();
        if !header{data.insert(0,(1..=width).map(|n|format!("Column {n}")).collect());}
        extracted.push(ExtractedTable{index,headers:data[0].clone(),rows:data});
    }
    Ok(extracted)
}
#[cfg(test)]
#[path="extractor_tests.rs"]
mod tests;
