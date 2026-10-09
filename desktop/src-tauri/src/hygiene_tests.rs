use super::*;
fn recipe() -> Recipe {
    serde_json::from_value(json!({"sanitize_headers":false,"drop_empty":false,"strip_ctrl":false,"trim_all":false,"date_format":"ISO","imputation_rules":[],"dedupe":false,"dedupe_mode":"exact","dedupe_cols":[],"drop_missing_cols":[],"date_cols":[],"number_cols":[],"absolute_nums":false,"phone_cols":[],"title_cols":[]})).unwrap()
}
fn fixture(name:&str)->std::path::PathBuf {
    let directory=std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../testing/artifacts/hygiene").join(uuid::Uuid::new_v4().to_string());
    std::fs::create_dir_all(&directory).unwrap();directory.join(name)
}
#[test]
fn median_imputation_uses_both_middle_values() {
    let input=fixture("median.csv");std::fs::write(&input,"id,value\n1,2\n2,4\n3,\n").unwrap();
    let output=input.with_file_name("cleaned.csv");let mut r=recipe();
    r.imputation_rules.push(ImputationRule{col:"value".into(),method:"median".into(),custom_val:String::new()});
    assert_eq!(process_csv_file(&input,&output,&r).unwrap(),(3,0,0));
    let rows=csv::Reader::from_path(output).unwrap().records().collect::<Result<Vec<_>,_>>().unwrap();
    assert_eq!(&rows[2][1],"3");
}
#[test]
fn decimal_shorthand_is_scaled_numerically() {
    assert_eq!(clean_numeric("1.5k"),"1500");
    assert_eq!(clean_numeric("2.25m"),"2250000");
    assert_eq!(clean_numeric("9007199254740993k"),"9007199254740993000");
}
#[tokio::test]
async fn same_named_sources_have_independent_cleaned_outputs() {
    let a=fixture("same.csv");let b=fixture("same.csv");
    std::fs::write(&a,"id,value\nA,10\n").unwrap();std::fs::write(&b,"id,value\nB,20\n").unwrap();
    let r=serde_json::to_string(&json!({"sanitize_headers":false,"drop_empty":false,"strip_ctrl":false,"trim_all":false,"date_format":"ISO","imputation_rules":[],"dedupe":false,"dedupe_mode":"exact","dedupe_cols":[],"drop_missing_cols":[],"date_cols":[],"number_cols":[],"absolute_nums":false,"phone_cols":[],"title_cols":[]})).unwrap();
    let one:serde_json::Value=serde_json::from_str(&execute_recipe(a.to_string_lossy().into(),r.clone()).await.unwrap()).unwrap();
    let two:serde_json::Value=serde_json::from_str(&execute_recipe(b.to_string_lossy().into(),r).await.unwrap()).unwrap();
    assert_ne!(one["temp_path"],two["temp_path"]);
    assert!(std::fs::read_to_string(one["temp_path"].as_str().unwrap()).unwrap().contains("A,10"));
}
#[test]
fn million_row_cleaning_preserves_order_and_known_counts() {
    let input=fixture("million.csv");let output=input.with_file_name("cleaned.csv");
    let mut writer=csv::Writer::from_path(&input).unwrap();writer.write_record(["id","name","amount"]).unwrap();
    for i in 0..1_000_000 {writer.write_record([i.to_string(),"  Alice  ".into(),if i%10==0{String::new()}else{"12.5".into()}]).unwrap();}writer.flush().unwrap();
    let mut r=recipe();r.trim_all=true;r.drop_missing_cols=vec!["amount".into()];
    assert_eq!(process_csv_file(&input,&output,&r).unwrap(),(900_000,100_000,0));
    let mut count=0;let mut sum=0_u64;
    for row in csv::Reader::from_path(output).unwrap().records(){let row=row.unwrap();let id:u64=row[0].parse().unwrap();assert_eq!(id,(count/9)*10+(count%9)+1);assert_eq!(&row[1],"Alice");assert_eq!(&row[2],"12.5");sum+=id;count+=1;}
    assert_eq!(count,900_000);assert_eq!(sum,450_000_000_000);
}
