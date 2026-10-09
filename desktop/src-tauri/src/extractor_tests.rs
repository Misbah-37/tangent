use super::*;
#[test] fn headerless_ragged_and_nested_tables(){
 let tables=extract_tables_sync("<table><tr><td>one</td><td>two</td></tr><tr><td>three</td></tr></table><table><tr><th>Outer</th></tr><tr><td><table><tr><td>Inner</td></tr></table></td></tr></table>".into()).unwrap();
 let mixed=extract_tables_sync("<table><tr><th>row label</th><td>value</td></tr></table>".into()).unwrap();assert_eq!(mixed[0].rows.len(),2);assert_eq!(mixed[0].headers,vec!["Column 1","Column 2"]);
 assert_eq!(tables.len(),3);assert_eq!(tables[0].headers,vec!["Column 1","Column 2"]);assert_eq!(tables[0].rows[1],vec!["one","two"]);assert_eq!(tables[0].rows[2],vec!["three",""]);assert_eq!(tables[1].rows.len(),2);assert_eq!(tables[2].rows.len(),2);
}
#[test] fn spans_and_inline_text(){
 let t=extract_tables_sync("<table><tr><th>A</th><th colspan=2>B</th></tr><tr><td rowspan=2>café</td><td>hel<b>lo</b></td><td>&quot;x,y&quot;</td></tr><tr><td colspan=2>Ω</td></tr></table>".into()).unwrap();
 assert_eq!(t[0].rows[1],vec!["café","hello","\"x,y\""]);assert_eq!(t[0].rows[2],vec!["café","Ω","Ω"]);
 assert!(extract_tables_sync("<table><tr><td colspan=999999999>bad</td></tr></table>".into()).is_err());
}
#[test] fn structured_missing_attributes_and_errors(){
 let fields=vec![FieldDef{name:"Name".into(),selector:"h2".into(),extract_type:"text".into(),attribute_name:None},FieldDef{name:"Link".into(),selector:"a".into(),extract_type:"attribute".into(),attribute_name:Some("href".into())}];
 let r=extract_structured_sync("<article><h2>café <b>Ω</b></h2><a href='a,&quot;b'>link</a></article><article><h2>two</h2></article>".into(),"article".into(),fields).unwrap();assert_eq!(r[1],vec!["café Ω","a,\"b"]);assert_eq!(r[2],vec!["two",""]);
 assert!(extract_structured_sync("".into(),"[".into(),vec![FieldDef{name:"x".into(),selector:"a".into(),extract_type:"text".into(),attribute_name:None}]).is_err());assert!(extract_structured_sync("".into(),"article".into(),vec![]).is_err());
}
#[test] fn large_table_preserves_all_rows(){
 let mut html=String::from("<table><tr><th>ID</th><th>Text</th></tr>");for i in 0..100_000{html.push_str(&format!("<tr><td>{i}</td><td>café &amp; Ω</td></tr>"));}html.push_str("</table>");let dir=std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../testing/artifacts/extractor");std::fs::create_dir_all(&dir).unwrap();std::fs::write(dir.join("large-table.html"),&html).unwrap();let t=extract_tables_sync(html).unwrap();assert_eq!(t[0].rows.len(),100_001);assert_eq!(t[0].rows[1],vec!["0","café & Ω"]);assert_eq!(t[0].rows[100_000],vec!["99999","café & Ω"]);
}
