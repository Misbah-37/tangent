const path=require('node:path');
module.exports=async page=>{
 await page.addInitScript({path:path.resolve(__dirname,'../src/sql-results.js')});
 await page.addInitScript(()=>{
  window.__sqlArrowFixture=async(command,args,options)=>{
   if(command==='read_editor_arrow'){
    const arrow=await import('/vendor/apache-arrow/Arrow.js'),d=window.__tabular[args.id],rows=d.rows.slice(args.offset,args.offset+args.limit),vectors=Object.create(null);
    d.columns.forEach((name,c)=>{const kind=args.kinds[c];vectors[name]=arrow.vectorFromArray(rows.map(row=>row[c].kind==='null'?null:kind==='text'?String(row[c].value):row[c].value),kind==='number'?new arrow.Float64():kind==='boolean'?new arrow.Bool():new arrow.Utf8());});
    const bytes=arrow.tableToIPC(new arrow.Table(vectors).select(d.columns));return ['__sql_arrow_response',{bytes:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)}];
   }
   if(command!=='append_sql_arrow')return [command,args];
   const arrow=await import('/vendor/apache-arrow/Arrow.js');const table=arrow.tableFromIPC(args);
   window.__rawSqlTransfers=(window.__rawSqlTransfers||0)+1;
   window.__rawSqlMaxBytes=Math.max(window.__rawSqlMaxBytes||0,args.byteLength);
   const rows=[];
   for(const batch of table.batches){const vectors=batch.schema.fields.map((_f,c)=>batch.getChildAt(c));for(let r=0;r<batch.numRows;r++)rows.push(batch.schema.fields.map((field,c)=>window.TangentSqlResults.cell(vectors[c].get(r),field.type,vectors[c],r)));}
   if(window.__saveSqlArrowFixture&&window.__rawSqlTransfers===1)await window.__saveSqlArrowFixture(Array.from(args),table.schema.fields.map(f=>f.name));
   return ['append_sql_result',{id:options.headers['x-sql-id'],offset:Number(options.headers['x-sql-offset']),rows}];
  };
 });
};
