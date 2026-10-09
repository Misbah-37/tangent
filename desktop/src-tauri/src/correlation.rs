use serde::{Deserialize, Serialize};
use std::path::Path;
#[cfg(test)]
mod tests {
 use super::*;
 fn near(a:f64,b:f64){assert!((a-b).abs()<1e-10,"actual {a}, expected {b}");}
 #[test] fn ties_use_average_ranks(){assert_eq!(rank(&[1.,1.,3.,4.]),vec![1.5,1.5,3.,4.]);near(compute_spearman(&[1.,1.,3.,4.],&[1.,2.,3.,4.]),0.9486832980505138);}
 #[test] fn pearson_handles_large_offsets(){near(compute_pearson(&[1e12+1.,1e12+2.,1e12+3.,1e12+4.],&[2.,4.,6.,8.]),1.);}
 #[test] fn small_sample_significance_uses_student_t(){near(calculate_p_value(1.,1.),0.5);near(calculate_p_value(0.,10.),1.);}
 #[test] fn constant_and_missing_pairs_are_undefined(){
  let x=ColType::Numeric(vec![Some(1.),Some(1.),Some(1.)]);let y=ColType::Numeric(vec![Some(1.),Some(2.),Some(3.)]);
  assert!(compute_pair(&x,&y,"pearson").0.is_nan());assert!(compute_pair(&x,&y,"spearman").0.is_nan());
 }
 #[test] fn filtered_million_rows_have_known_correlations(){
  let dir=std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../testing/artifacts/correlation");std::fs::create_dir_all(&dir).unwrap();let path=dir.join("million.csv");
  let mut w=csv::Writer::from_path(&path).unwrap();w.write_record(["x","positive","negative","group"]).unwrap();
  for i in 0..1_000_000_u64{w.write_record([i.to_string(),(i*2).to_string(),(-(i as i64)).to_string(),(i%2).to_string()]).unwrap();}w.flush().unwrap();
  let m=compute_matrix(CorrelateOptions{file_path:path.to_string_lossy().into(),method:"pearson".into(),cluster:false,filters:Some(vec![FilterRule{column:"group".into(),operator:"==".into(),value:"0".into()}])}).unwrap();
  near(m.matrix[0][1].r,1.);near(m.matrix[0][2].r,-1.);assert_eq!(m.matrix[0][1].n,500_000);assert_eq!(m.raw_rows.len(),100);assert!(m.matrix[0][1].is_defined);
 }
 #[test] fn ragged_rows_preserve_pair_alignment(){
  let dir=std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../testing/artifacts/correlation");std::fs::create_dir_all(&dir).unwrap();let path=dir.join("ragged.csv");
  std::fs::write(&path,"x,y\n1,2\n2\n3,6\n4,8\n").unwrap();
  let m=compute_matrix(CorrelateOptions{file_path:path.to_string_lossy().into(),method:"pearson".into(),cluster:false,filters:None}).unwrap();assert_eq!(m.matrix[0][1].n,3);near(m.matrix[0][1].r,1.);
 }
}

#[derive(Serialize, Deserialize, Clone)]
pub struct CorrelationResult {
    pub columns: Vec<String>,
    pub matrix: Vec<Vec<CellData>>,
    pub raw_rows: Vec<Vec<String>>,
    pub all_headers: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct CellData {
    pub is_defined: bool,
    pub r: f64,
    pub p_value: f64,
    pub n: usize,
    pub has_outlier_warning: bool,
}

#[derive(Clone)]
pub enum ColType {
    Numeric(Vec<Option<f64>>),
    Categorical(Vec<Option<String>>),
}

#[derive(Deserialize, Debug, Clone)]
pub struct FilterRule {
    pub column: String,
    pub operator: String,
    pub value: String,
}

#[derive(Deserialize, Debug)]
pub struct CorrelateOptions {
    pub file_path: String,
    pub method: String,
    pub cluster: bool,
    pub filters: Option<Vec<FilterRule>>,
}


pub fn compute_matrix(options: CorrelateOptions) -> Result<CorrelationResult, String> {
    let path = Path::new(&options.file_path);
    let mut reader = csv::ReaderBuilder::new()
        .flexible(true)
        .from_path(path)
        .map_err(|e| e.to_string())?;
        
    let headers: Vec<String> = reader.headers().map_err(|e| e.to_string())?.iter().map(|s| s.to_string()).collect();
    
    // Read all rows into columns, applying filters if any
    let filter_rules = options.filters.unwrap_or_default();
    let mut compiled_filters = Vec::new();
    for f in filter_rules {
        if let Some(idx) = headers.iter().position(|h| h == &f.column) {
            compiled_filters.push((idx, f.operator, f.value));
        }else{return Err(format!("Unknown filter column: {}",f.column));}
    }

    let mut cols: Vec<Vec<String>> = vec![Vec::new(); headers.len()];
    let mut raw_rows: Vec<Vec<String>> = Vec::new();
    for result in reader.records() {
        let record=result.map_err(|e|e.to_string())?;
        {
            let mut pass = true;
            for (idx, op, val) in &compiled_filters {
                {
                    let field=record.get(*idx).unwrap_or("");
                    let field_trim = field.trim();
                    let val_trim = val.trim();
                    
                    // If the filter value is completely empty, we skip evaluating it so it doesn't instantly block everything.
                    if val_trim.is_empty() {
                        continue;
                    }
                    
                    let mut matched = false;
                    // Try numeric comparison first
                    if let (Ok(f_num), Ok(v_num)) = (field_trim.replace(",", "").parse::<f64>(), val_trim.replace(",", "").parse::<f64>()) {
                        matched = match op.as_str() {
                            "==" => (f_num - v_num).abs() < f64::EPSILON,
                            "!=" => (f_num - v_num).abs() > f64::EPSILON,
                            ">" => f_num > v_num,
                            "<" => f_num < v_num,
                            _ => false,
                        };
                    } else {
                        // Fallback to string comparison
                        matched = match op.as_str() {
                            "==" => field_trim == val_trim,
                            "!=" => field_trim != val_trim,
                            ">" => field_trim > val_trim,
                            "<" => field_trim < val_trim,
                            _ => false,
                        };
                    }
                    
                    if !matched {
                        pass = false;
                        break;
                    }
                }
            }
            
            if pass {
                if raw_rows.len() < 100 {
                    let mut row = Vec::with_capacity(record.len());
                    for field in record.iter() {
                        row.push(field.to_string());
                    }
                    raw_rows.push(row);
                }
                for (i,col) in cols.iter_mut().enumerate() {
                    col.push(record.get(i).unwrap_or("").to_string());
                }
            }
        }
    }
    
    // Detect numerical and categorical columns
    let mut final_cols = Vec::new();
    let mut parsed_data: Vec<ColType> = Vec::new();
    
    for (i, col_data) in cols.iter().enumerate() {
        let mut parsed_num = Vec::with_capacity(col_data.len());
        let mut parsed_cat = Vec::with_capacity(col_data.len());
        let mut num_count = 0;
        let mut total = 0;
        let mut unique_vals = std::collections::HashSet::new();
        
        for val in col_data {
            let s = val.trim();
            if s.is_empty() {
                parsed_num.push(None);
                parsed_cat.push(None);
                continue;
            }
            
            parsed_cat.push(Some(s.to_string()));
            unique_vals.insert(s.to_string());
            
            // basic date exclusion
            if ["%Y-%m-%d","%Y/%m/%d","%m/%d/%Y","%d/%m/%Y"].iter().any(|format|chrono::NaiveDate::parse_from_str(s,format).is_ok()) {
                parsed_num.push(None); 
                total += 1; 
                continue; 
            }
            
            let s_clean = s.replace("$", "").replace("%", "").replace(",", "");
            match s_clean.parse::<f64>() {
                Ok(n) if n.is_finite() => {
                    parsed_num.push(Some(n));
                    num_count += 1;
                }
                _ => {
                    parsed_num.push(None);
                }
            }
            total += 1;
        }
        
        if total > 0 && (num_count as f64 / total as f64) >= 0.8 {
            final_cols.push(headers[i].clone());
            parsed_data.push(ColType::Numeric(parsed_num));
        } else if total > 0 && unique_vals.len() >= 2 && unique_vals.len() <= 20 {
            final_cols.push(headers[i].clone());
            parsed_data.push(ColType::Categorical(parsed_cat));
        }
    }
    
    let mut matrix = vec![vec![CellData { is_defined:false, r: 0.0, p_value: 1.0, n: 0, has_outlier_warning: false }; final_cols.len()]; final_cols.len()];
    
    for i in 0..final_cols.len() {
        for j in 0..final_cols.len() {
                        let (r, n, p, out) = compute_pair(&parsed_data[i], &parsed_data[j], &options.method);
            matrix[i][j] = CellData {
                is_defined:r.is_finite(),
                r:if r.is_finite(){r}else{0.0},
                n,
                p_value: p,
                has_outlier_warning: out,
            };
        }
    }
    
    
      if options.cluster && !final_cols.is_empty() {
          let mut visited = vec![false; final_cols.len()];
          let mut order = Vec::with_capacity(final_cols.len());
          
          let mut current = 0;
          visited[0] = true;
          order.push(0);
          
          for _ in 1..final_cols.len() {
              let mut best_dist = std::f64::MAX;
              let mut best_idx = 0;
              
              for (j, &v) in visited.iter().enumerate() {
                  if !v {
                      let dist = 1.0 - matrix[current][j].r.abs();
                      if dist < best_dist {
                          best_dist = dist;
                          best_idx = j;
                      }
                  }
              }
              
              visited[best_idx] = true;
              order.push(best_idx);
              current = best_idx;
          }
          
          let mut new_cols = Vec::with_capacity(final_cols.len());
          let mut new_matrix = vec![vec![CellData { is_defined:false, r: 0.0, p_value: 1.0, n: 0, has_outlier_warning: false }; final_cols.len()]; final_cols.len()];
          
          for i in 0..final_cols.len() {
              new_cols.push(final_cols[order[i]].clone());
              for j in 0..final_cols.len() {
                  new_matrix[i][j] = matrix[order[i]][order[j]].clone();
              }
          }
          
          final_cols = new_cols;
          matrix = new_matrix;
      }
      
      Ok(CorrelationResult {
          columns: final_cols,
          matrix,
          raw_rows,
          all_headers: headers,
      })

}

fn compute_pair(x_col: &ColType, y_col: &ColType, method: &str) -> (f64, usize, f64, bool) {
    match (x_col, y_col) {
        (ColType::Numeric(x), ColType::Numeric(y)) => {
            let mut valid_x = Vec::new();
            let mut valid_y = Vec::new();
            for (vx, vy) in x.iter().zip(y.iter()) {
                if let (Some(val_x), Some(val_y)) = (vx, vy) {
                    valid_x.push(*val_x);
                    valid_y.push(*val_y);
                }
            }
            let n = valid_x.len();
            if n < 3 { return (f64::NAN, n, 1.0, false); }
            
            let r = if method == "spearman" {
                compute_spearman(&valid_x, &valid_y)
            } else {
                compute_pearson(&valid_x, &valid_y)
            };
            
            if !r.is_finite(){return (f64::NAN,n,1.0,false);}
            let p = if r.abs()>=1.0 {0.0}else{
                let t = r * ((n as f64 - 2.0) / (1.0 - r * r)).sqrt();
                calculate_p_value(t.abs(), n as f64 - 2.0)
            };
            
            let mut has_outlier = false;
            if method == "pearson" && n >= 5 {
                let rs = compute_spearman(&valid_x, &valid_y);
                if (r - rs).abs() > 0.35 {
                    has_outlier = true;
                }
            }
            
            (r, n, p, has_outlier)
        },
        (ColType::Categorical(cat_x), ColType::Categorical(cat_y)) => {
            let (v, n) = compute_cramers_v(cat_x, cat_y);
            (v, n, 1.0, false)
        },
        (ColType::Categorical(cat), ColType::Numeric(num)) => {
            let (eta, n) = compute_eta(cat, num);
            (eta, n, 1.0, false)
        },
        (ColType::Numeric(num), ColType::Categorical(cat)) => {
            let (eta, n) = compute_eta(cat, num);
            (eta, n, 1.0, false)
        }
    }
}

fn compute_cramers_v(cat_x: &[Option<String>], cat_y: &[Option<String>]) -> (f64, usize) {
    let mut map_x = std::collections::HashMap::new();
    let mut map_y = std::collections::HashMap::new();
    let mut counts = std::collections::HashMap::new();
    let mut n = 0;
    
    for (x_opt, y_opt) in cat_x.iter().zip(cat_y.iter()) {
        if let (Some(x_val), Some(y_val)) = (x_opt, y_opt) {
            *map_x.entry(x_val.clone()).or_insert(0) += 1;
            *map_y.entry(y_val.clone()).or_insert(0) += 1;
            *counts.entry((x_val.clone(), y_val.clone())).or_insert(0) += 1;
            n += 1;
        }
    }
    
    if n == 0 { return (f64::NAN, 0); }
    let r = map_x.len();
    let c = map_y.len();
    if r < 2 || c < 2 { return (f64::NAN, n); }
    
    let mut chi_square = 0.0;
    for (x_val, x_count) in &map_x {
        for (y_val, y_count) in &map_y {
            let expected = (*x_count as f64 * *y_count as f64) / (n as f64);
            let observed = *counts.get(&(x_val.clone(), y_val.clone())).unwrap_or(&0) as f64;
            if expected > 0.0 {
                chi_square += (observed - expected).powi(2) / expected;
            }
        }
    }
    
    let min_dim = std::cmp::min(r - 1, c - 1) as f64;
    let v = (chi_square / (n as f64 * min_dim)).sqrt();
    (v.min(1.0), n)
}

fn compute_eta(cat: &[Option<String>], num: &[Option<f64>]) -> (f64, usize) {
    let mut groups: std::collections::HashMap<String, Vec<f64>> = std::collections::HashMap::new();
    let mut total_vals = Vec::new();
    let mut n = 0;
    
    for (c_opt, n_opt) in cat.iter().zip(num.iter()) {
        if let (Some(c_val), Some(n_val)) = (c_opt, n_opt) {
            groups.entry(c_val.clone()).or_default().push(*n_val);
            total_vals.push(*n_val);
            n += 1;
        }
    }
    
    if n < 3 || groups.len() < 2 { return (f64::NAN, n); }
    let global_mean = total_vals.iter().sum::<f64>() / n as f64;
    
    let mut ss_total = 0.0;
    for &val in &total_vals { ss_total += (val - global_mean).powi(2); }
    if ss_total == 0.0 { return (f64::NAN, n); }
    
    let mut ss_between = 0.0;
    for group_vals in groups.values() {
        let group_mean = group_vals.iter().sum::<f64>() / group_vals.len() as f64;
        ss_between += group_vals.len() as f64 * (group_mean - global_mean).powi(2);
    }
    
    let eta = (ss_between / ss_total).sqrt();
    (eta.min(1.0), n)
}


fn compute_pearson(x: &[f64], y: &[f64]) -> f64 {
    if x.is_empty()||x.len()!=y.len(){return f64::NAN;}
    let n = x.len() as f64;
    let mx=x.iter().map(|v|v-x[0]).sum::<f64>()/n;
    let my=y.iter().map(|v|v-y[0]).sum::<f64>()/n;
    let (mut cross,mut sx,mut sy)=(0.0,0.0,0.0);
    for (a,b) in x.iter().zip(y){let dx=(a-x[0])-mx;let dy=(b-y[0])-my;cross+=dx*dy;sx+=dx*dx;sy+=dy*dy;}
    let den=sx.sqrt()*sy.sqrt();
    if den==0.0 {f64::NAN}else{(cross/den).clamp(-1.0,1.0)}
}

fn compute_spearman(x: &[f64], y: &[f64]) -> f64 {
    let rx = rank(x);
    let ry = rank(y);
    compute_pearson(&rx, &ry)
}

fn rank(arr: &[f64]) -> Vec<f64> {
    let mut indexed: Vec<(usize, f64)> = arr.iter().copied().enumerate().collect();
    indexed.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal));
    let mut ranks = vec![0.0; arr.len()];
    let mut start=0;
    while start<indexed.len(){
        let mut end=start+1;while end<indexed.len()&&indexed[end].1==indexed[start].1{end+=1;}
        let average=(start+1+end) as f64/2.0;
        for &(i,_) in &indexed[start..end]{ranks[i]=average;}start=end;
    }
    ranks
}

fn calculate_p_value(t: f64, df: f64) -> f64 {
    use statrs::distribution::{ContinuousCDF,StudentsT};
    if t.is_nan()||df<=0.0{return 1.0;}
    StudentsT::new(0.0,1.0,df).map(|d|(2.0*d.sf(t.abs())).clamp(0.0,1.0)).unwrap_or(1.0)
}
