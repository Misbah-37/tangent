use super::*;
use std::io::Write;
fn fixture(name:&str, text:&str)->String {
 let dir=std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../testing/artifacts/logs");std::fs::create_dir_all(&dir).unwrap();let p=dir.join(name);std::fs::write(&p,text).unwrap();p.to_string_lossy().into()
}
#[test] fn known_web_json_and_time_buckets(){
 let mut lines=String::new();for _ in 0..10 {lines.push_str("127.0.0.1 - - [09/Oct/2026:10:01:00 +0000] \"GET /login HTTP/1.1\" 401 12\n");}
 lines.push_str("127.0.0.2 - - [09/Oct/2026:11:00:00 +0000] \"GET /.env HTTP/1.1\" 404 12\n");
 lines.push_str("{\"ip\":\"127.0.0.3\",\"timestamp\":\"2026-10-09T12:00:00+01:00\",\"path\":\"/api\",\"status\":500}\n");
 lines.push_str("noise\n{}\n");let r=parse_logs_sync(vec![fixture("known.log",&lines)],None).unwrap();
 assert_eq!((r.total_lines,r.matched_lines,r.skipped_lines,r.total_errors),(14,12,2,12));assert_eq!(r.mode,"mixed");assert_eq!(r.timeline_labels,vec!["2026-10-09 10:00 UTC","2026-10-09 11:00 UTC"]);assert_eq!(r.timeline_traffic,vec![10,2]);assert_eq!(r.brute_force_ips,vec![("127.0.0.1".into(),10)]);assert_eq!(r.scanner_ips,vec![("127.0.0.2".into(),1)]);
}
#[test] fn unicode_timestamps_and_invalid_regex_are_safe(){
 let path=fixture("unicode.jsonl","{\"ip\":\"::1\",\"timestamp\":\"ééééééééé\",\"status\":403}\n");let r=parse_logs_sync(vec![path.clone()],None).unwrap();assert_eq!(r.timeline_labels,vec!["Unknown"]);assert!(r.brute_force_ips.is_empty());
 assert!(parse_logs_sync(vec![path.clone()],Some("[".into())).unwrap_err().contains("Invalid custom regex"));assert!(parse_logs_sync(vec![path],Some("(.*)".into())).unwrap_err().contains("five capture"));
}
#[test] fn concatenated_gzip_and_corrupt_input(){
 let line="127.0.0.1 - - [09/Oct/2026:10:00:00 +0000] \"GET / HTTP/1.1\" 200 1\n";let p=fixture("members.LOG.GZ","");let mut bytes=Vec::new();for _ in 0..2 {let mut w=flate2::write::GzEncoder::new(Vec::new(),flate2::Compression::default());w.write_all(line.as_bytes()).unwrap();bytes.extend(w.finish().unwrap());}std::fs::write(&p,bytes).unwrap();assert_eq!(parse_logs_sync(vec![p],None).unwrap().matched_lines,2);
 let p=fixture("corrupt.gz","not gzip");assert!(parse_logs_sync(vec![p],None).is_err());
}
#[test] fn million_lines_keep_exact_counts(){
 let p=fixture("million.log","");let mut w=std::io::BufWriter::new(std::fs::File::create(&p).unwrap());for i in 0..1_000_000 {let(status,path)=match i%4{0=>(200,"/"),1=>(404,"/.env"),2=>(500,"/api"),_=>(401,"/login")};writeln!(w,"127.0.0.1 - - [09/Oct/2026:10:00:00 +0000] \"GET {path} HTTP/1.1\" {status} 1").unwrap();}w.flush().unwrap();let r=parse_logs_sync(vec![p],None).unwrap();assert_eq!((r.total_lines,r.matched_lines,r.skipped_lines,r.total_errors),(1_000_000,1_000_000,0,750_000));assert_eq!(r.top_ips[0].1,1_000_000);assert_eq!(r.scanner_ips[0].1,250_000);assert_eq!(r.brute_force_ips[0].1,250_000);assert_eq!(r.timeline_traffic,vec![1_000_000]);
}
