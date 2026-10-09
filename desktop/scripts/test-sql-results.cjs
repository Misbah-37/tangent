'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Babar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../src');
(async()=>{
 const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.js':'text/javascript','.wasm':'application/wasm','.css':'text/css','.html':'text/html'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1366,height:900}});const errors=[];page.on('pageerror',e=>{errors.push(e.stack);console.error(e.stack)});page.on('dialog',d=>d.dismiss());
  await require('./sql-arrow-fixture.cjs')(page);
  await page.exposeFunction('__saveSqlArrowFixture',(bytes,columns)=>{const directory=path.resolve(__dirname,'../testing/artifacts/sql-arrow');fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(path.join(directory,'precision.arrow'),Buffer.from(bytes));fs.writeFileSync(path.join(directory,'columns.json'),JSON.stringify(columns));});
  await page.addInitScript(()=>{
   window.sqlErrors=[];window.sqlCalls=[];window.pending=new Map();window.results=new Map();window.sqlStats={maxRows:0,maxCells:0,maxBytes:0,sum:0};let next=0;
   window.TangentShell={reportToolError:(_id,e)=>window.sqlErrors.push(e.stack||e.message)};
   window.__TAURI__={core:{invoke:async(command,args={},options)=>{
    [command,args]=await window.__sqlArrowFixture(command,args,options);
    if(command==='__sql_arrow_response')return args.bytes;
    window.sqlCalls.push({command,id:args.id,limit:args.limit});
    if(command==='begin_sql_result'){const id='stage-'+(++next);window.pending.set(id,{columns:args.columns,rows:[],count:0,million:args.columns[0]==='million_id',sum:0});return id;}
    if(command==='append_sql_result'){
     const d=window.pending.get(args.id);if(args.offset!==d.count)throw Error('Out of sequence');
     window.sqlStats.maxRows=Math.max(window.sqlStats.maxRows,args.rows.length);window.sqlStats.maxCells=Math.max(window.sqlStats.maxCells,args.rows.length*d.columns.length);window.sqlStats.maxBytes=Math.max(window.sqlStats.maxBytes,new TextEncoder().encode(JSON.stringify(args.rows)).length);
     if(d.million){for(const row of args.rows){if(String(row[0].value)!==String(d.count))throw Error('Row order changed');d.sum+=d.count;d.count++;}}else{d.rows.push(...args.rows);d.count+=args.rows.length;}return null;
    }
    if(command==='finish_sql_result'){const d=window.pending.get(args.id);if(d.count!==args.expected)throw Error('Incomplete');window.pending.delete(args.id);window.results.set(args.id,d);return {tabularId:args.id,columns:d.columns,rowCount:d.count,native:true};}
    if(command==='abort_sql_result'){window.pending.delete(args.id);return null;}
    if(command==='release_editor_dataset'){window.results.delete(args.id);return null;}
    if(command==='read_sql_page'){
     if(window.delaySqlPages&&args.offset===100)await new Promise(r=>setTimeout(r,400));
     const d=window.results.get(args.id);if(!d)throw Error('Missing session');
     const rows=d.million?Array.from({length:Math.min(args.limit,d.count-args.offset)},(_,i)=>[{kind:'text',value:String(args.offset+i)},{kind:'number',value:(args.offset+i)*2}]):d.rows.slice(args.offset,args.offset+args.limit);
     return {rows,rowCount:d.count,truncated:false};
    }
    if(command==='export_editor_dataset'){window.exportedCount=window.results.get(args.id).count;return 'sql.csv';}
    throw Error('Unexpected '+command);
   }}};
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/sql-studio.html');await page.evaluate(()=>Promise.all([window.launchpadEngineReady,window.launchpadEditorReady]));
  async function query(sql){await page.evaluate(sql=>window.sqlEditorInstance.setValue(sql),sql);await page.locator('#btnRun').click();await page.waitForFunction(()=>document.getElementById('btnRun').style.display==='flex',{},{timeout:180000});if(!sql.includes('nonexistent')&&(await page.locator('#resultsCount').textContent()).includes('failed'))throw Error((await page.evaluate(()=>window.sqlErrors)).join('\n'));}
  await query("SELECT 9007199254740993::BIGINT AS exact_id, 1234567890.123456::DECIMAL(20,6) AS amount, TIMESTAMP '2026-10-09 12:34:56.123456' AS stamp, NULL AS blank, '<img src=x onerror=window.injected=1>' AS note");
  const initialErrors=await page.evaluate(()=>window.sqlErrors);if(initialErrors.length)throw Error(initialErrors.join('\n'));
  assert.equal(await page.locator('#resultsTable img').count(),0);const cells=await page.locator('#resultsTable tbody td').allTextContents();assert.equal(cells[0],'9007199254740993');assert.equal(cells[1],'1234567890.123456');assert.equal(cells[2],'2026-10-09T12:34:56.123456Z');assert.equal(cells[3],'null');
  const preserved=await page.evaluate(()=>window.tangentCurrentResult());await query('SELECT missing_column FROM nonexistent');assert.equal((await page.evaluate(()=>window.tangentCurrentResult())).nativeId,preserved.nativeId);assert.match(await page.locator('#resultsCount').textContent(),/failed/);
  await query('CREATE TABLE side_effect AS SELECT 1 AS value; INSERT INTO side_effect VALUES (2); SELECT * FROM side_effect ORDER BY value;');assert.deepEqual(await page.locator('#resultsTable tbody td').allTextContents(),['1','2']);await page.locator('#btnExport').click();await page.locator('#tabular-accept').click();await page.waitForFunction(()=>window.exportedCount===2);
  await query('SELECT COUNT(*) AS count FROM side_effect');assert.equal(await page.locator('#resultsTable tbody td').textContent(),'2');
  await query("SELECT 'Ω; -- text' AS label; SELECT -1.2500::DECIMAL(12,4) AS same, 2 AS same, TIMESTAMP '1969-12-31 23:59:59.999999' AS stamp; -- trailing comment");assert.deepEqual(await page.locator('#resultsTable tbody td').allTextContents(),['-1.2500','2','1969-12-31T23:59:59.999999Z']);
  const beforePeek=await page.evaluate(()=>window.sqlEditorInstance.getValue());await page.evaluate(()=>window.peekTable('side_effect'));assert.equal(await page.evaluate(()=>window.sqlEditorInstance.getValue()),beforePeek);assert.deepEqual(await page.locator('#resultsTable tbody td').allTextContents(),['1','2']);
  await query('SELECT i AS million_id, i*2 AS doubled FROM range(1000000) t(i)');assert.match(await page.locator('#resultsCount').textContent(),/1,000,000 rows/);assert.equal(await page.locator('#resultsTable tbody tr').count(),100);
  const million=await page.evaluate(async()=>{const out=await window.tangentCurrentResult();const d=window.results.get(out.nativeId);return {out,count:d.count,sum:d.sum};});assert.equal(million.count,1000000);assert.equal(million.sum,499999500000);assert.equal(million.out.dataset,undefined);assert.equal(million.out.text,undefined);
  const measured=await page.evaluate(()=>window.TangentTransferDiagnostics.last.entries);for(const label of ['Query: execution to stream header','Query: worker fetch and Arrow decode','Query: result encoding and size checks','Query: result IPC and native storage','Query: first page IPC and rendering'])assert.ok(measured.some(entry=>entry.stage===label&&Number.isFinite(entry.milliseconds)&&entry.milliseconds>=0),label);assert.ok(measured.some(entry=>entry.stage.startsWith('Result batches: ')));
  await page.locator('#btnNextPage').click();await page.locator('#pageIndicator').filter({hasText:'Page 2'}).waitFor();assert.equal(await page.locator('#resultsTable tbody td').first().textContent(),'100');
  await page.locator('#btnPrevPage').click();await page.locator('#pageIndicator').filter({hasText:'Page 1 of'}).waitFor();await page.evaluate(()=>window.delaySqlPages=true);await page.locator('#btnNextPage').click();await page.locator('#btnNextPage').click();await page.locator('#pageIndicator').filter({hasText:'Page 3 of'}).waitFor();await page.waitForTimeout(500);assert.equal(await page.locator('#resultsTable tbody td').first().textContent(),'200');await page.evaluate(()=>window.delaySqlPages=false);
  await page.locator('#btnVisualize').click();await page.locator('#chartPreviewNote').filter({hasText:'first 1,000 of 1,000,000'}).waitFor();await page.locator('#btnCloseChart').click();
  await page.locator('#btnExport').click();await page.locator('#tabular-accept').click();await page.waitForFunction(()=>window.exportedCount===1000000);
  await page.evaluate(()=>{window.sqlEditorInstance.setValue('SELECT i AS cancelled_id FROM range(100000000) t(i)');document.getElementById('btnRun').click();});await page.waitForFunction(()=>document.getElementById('btnCancel').style.display==='block');await page.locator('#btnCancel').click();await page.waitForFunction(()=>document.getElementById('btnRun').style.display==='flex',{},{timeout:60000});assert.equal((await page.evaluate(()=>window.tangentCurrentResult())).nativeId,million.out.nativeId);assert.equal(await page.evaluate(()=>window.pending.size),0);
  await query('SELECT COUNT(*) AS count FROM side_effect');assert.equal(await page.locator('#resultsTable tbody td').textContent(),'2');
  await query('SELECT 1 AS empty WHERE false');assert.match(await page.locator('#resultsCount').textContent(),/0 rows/);assert.equal(await page.locator('#btnExport').isVisible(),false);
  const stats=await page.evaluate(()=>window.sqlStats);assert.ok(stats.maxRows<=16384);assert.ok(stats.maxCells<=131072);assert.ok(stats.maxBytes<=4*1024*1024);assert.ok(await page.evaluate(()=>window.__rawSqlTransfers>0));assert.ok(await page.evaluate(()=>window.__rawSqlMaxBytes<=4*1024*1024));assert.deepEqual(errors,[]);console.log('PASS: real offline DuckDB binary streaming, million-row ordering/count, bounded IPC/DOM/chart, exact BigInt/decimal/timestamp, safe text, full native export/provider, atomic failure, multi-statement execution once, cancellation and recovery.',stats);
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
