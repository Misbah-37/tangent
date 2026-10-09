'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Babar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../src');
(async()=>{
 const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',path.extname(file)==='.js'?'text/javascript':path.extname(file)==='.css'?'text/css':'text/html');res.end(fs.readFileSync(file));});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1366,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.stack));page.on('dialog',d=>d.dismiss());
  await page.addInitScript(()=>{
   window.calls=[];window.released=[];window.failFinance=false;window.alerts=[];window.alert=m=>window.alerts.push(m);
   const columns=['Date','Description','Amount','Category'];let revision=0;
   window.__TAURI__={core:{Channel:class{},invoke:async(command,args={})=>{
    window.calls.push({command,args:structuredClone({...args,progress:undefined})});
    if(command==='pick_csv_file')return 'statement.csv';
    if(command==='finance_headers')return columns;
    if(command==='open_finance_ledger'){if(window.failFinance)throw Error('Invalid amount in second file');return {native_id:'ledger-'+(++revision),row_count:1000000,total_inflow:1000,total_outflow:100,net_cashflow:900,warnings:['1 unrecognized date; amounts remain included.'],category_totals:{Food:100},subscriptions:[['<img src=x onerror=window.injected=1>',25,'2x Detected']],timeline_labels:['2026-10'],timeline_inflow:[1000],timeline_outflow:[100]};}
    if(command==='read_finance_page'){
     if(args.query==='slow')await new Promise(r=>setTimeout(r,600));
     const count=args.query?2:1000000;
     return {offset:args.offset,rowCount:count,truncated:false,rows:Array.from({length:Math.min(args.limit,count-args.offset)},(_,i)=>[{kind:'date',value:'2026-10-08'},{kind:'text',value:args.query||`<img src=x onerror=window.injected=1> transaction ${args.offset+i}`},{kind:'text',value:'Food'},{kind:'number',value:-10}])};
    }
    if(command==='release_editor_dataset'){window.released.push(args.id);return null;}
    if(command==='open_editor_dataset')return {tabularId:'forked-input',columns,rowCount:1000000,native:true};
    if(command==='export_editor_dataset')return 'export.csv';
    throw Error('Unexpected command: '+command);
   }}};
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/finance-dashboard.html');await page.addScriptTag({path:path.join(root,'transfer-diagnostics.js')});await page.locator('#btnPickSingle').click();await page.locator('#mappingBox').waitFor();await page.locator('#btnAnalyze').click();await page.locator('#ledgerRange').filter({hasText:'1,000,000'}).waitFor();assert.equal(await page.locator('#tblLedger tr').count(),100);assert.equal(await page.locator('#tblLedger img,#tblSubs img').count(),0);assert.equal(await page.evaluate(()=>window.injected),undefined);assert.equal(await page.evaluate(()=>window.TangentTransferDiagnostics.last.result),'Analysis complete');
  await page.locator('#ledgerNext').click();await page.locator('#ledgerRange').filter({hasText:'101–200'}).waitFor();await page.locator('#txtSearch').fill('Food');await page.locator('#ledgerRange').filter({hasText:'of 2 matching'}).waitFor();assert.equal(await page.locator('#tblLedger tr').count(),2);assert.equal(await page.locator('#valNet').textContent(),'$900.00');const output=await page.evaluate(()=>window.tangentCurrentResult());assert.deepEqual(output,{nativeId:'ledger-1',ext:'csv',label:'Analyzed transactions (all rows)'});
  await page.locator('#txtSearch').fill('slow');await page.waitForFunction(()=>window.calls.some(c=>c.command==='read_finance_page'&&c.args.query==='slow'));await page.locator('#txtSearch').fill('new');await page.locator('#tblLedger tr').first().filter({hasText:'new'}).waitFor();await page.waitForTimeout(700);assert.match(await page.locator('#tblLedger tr').first().textContent(),/new/);
  await page.locator('#btnExport').click();await page.locator('#tabular-accept').click();await page.waitForFunction(()=>window.calls.some(c=>c.command==='export_editor_dataset'));const exported=await page.evaluate(()=>window.calls.find(c=>c.command==='export_editor_dataset'));assert.equal(exported.args.id,'ledger-1');
  await page.evaluate(()=>window.failFinance=true);await page.locator('#btnToggleBudgets').click();await page.locator('#btnApplyBudgets').click();await page.waitForFunction(()=>window.alerts.some(a=>a.includes('Invalid amount')));assert.equal((await page.evaluate(()=>window.tangentCurrentResult())).nativeId,'ledger-1');assert.equal(await page.evaluate(()=>window.released.includes('ledger-1')),false);
  await page.evaluate(()=>window.failFinance=false);await page.locator('#btnToggleBudgets').click();await page.locator('#btnApplyBudgets').click();await page.waitForFunction(()=>window.released.includes('ledger-1'));assert.equal((await page.evaluate(()=>window.tangentCurrentResult())).nativeId,'ledger-2');
  await page.locator('#btnReset').click();await page.waitForFunction(()=>window.released.includes('ledger-2'));
  await page.evaluate(async()=>{window._launchpadImporting=true;window._tabularSnapshot={path:'snapshot.csv',tabularId:'immutable',native:true};await proceedWithFiles(['snapshot.csv']);window._launchpadImporting=false;});assert.ok(await page.evaluate(()=>window.calls.some(c=>c.command==='finance_headers'&&c.args.inputs[0].nativeId==='forked-input')));await page.evaluate(()=>window.releaseWorkspace());assert.ok(await page.evaluate(()=>window.released.includes('forked-input')));
  assert.ok(await page.evaluate(()=>window.calls.filter(c=>c.command==='read_finance_page').every(c=>c.args.limit<=100)));assert.deepEqual(errors,[]);console.log('PASS: million-row metadata, bounded ledger DOM, unseen-row search/paging, stale search protection, safe text, full native export, atomic failure, replacement, handoff and release. IPC mocked.');
 }finally{if(browser)await browser.close();server.close();}
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
