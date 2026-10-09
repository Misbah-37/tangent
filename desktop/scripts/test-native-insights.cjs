'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Babar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../src');
(async()=>{
 const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try {
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1366,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.stack));page.on('dialog',d=>d.dismiss());
  await page.addInitScript(()=>{if(window.parent!==window)return;
   const columns=['id','amount','country'];window.__sessions={};window.__calls=[];window.__failProfile=false;
   const metadata=(id,count=1000000)=>({id,tabularId:id,path:'million.csv',native:true,columns,rowCount:count,source:'million.csv',warnings:[]});
   const create=(count=1000000)=>{const id=crypto.randomUUID();window.__sessions[id]={count};return metadata(id,count);};
   const profile=count=>({headers:columns,rowCount:count,stats:Object.fromEntries(columns.map((name,i)=>[name,i===1?{type:'numeric',mode:'continuous',total:count,missing:0,valued:count,min:0,max:999999,mean:499999.5,median:499999.5,stdev:288675,distinctCount:count,outliers:0,p25:250000,p75:750000,p90:900000,labels:['0–500k','500k–1M'],dist:[count/2,count/2],fullLabels:['0–500k','500k–1M'],fullDist:[count/2,count/2],uniqueRatio:1}:{type:'categorical',total:count,missing:0,valued:count,distinctCount:i===0?count:2,uniqueRatio:i===0?1:2/count,caseVariants:false,labels:i===0?['00000000']:['US','UK'],dist:i===0?[1]:[count/2,count/2],fullLabels:i===0?Array.from({length:200},(_,j)=>String(j).padStart(8,'0')):['US','UK'],fullDist:i===0?Array(200).fill(1):[count/2,count/2],fullCount:i===0?count:2}]))});
   window.__TAURI__={core:{Channel:class{onmessage(){}},invoke:async(command,args={})=>{
    window.__calls.push({command,args:structuredClone({...args,progress:undefined})});
    if(command==='pick_csv_file')return 'million.csv';
    if(command==='preview_tabular_import')return {columns,rows:[],sheets:[],selectedSheet:null,warnings:[]};
    if(command==='import_editor_file')return create();
    if(command==='open_editor_dataset')return create(window.__sessions[args.id].count);
    if(command==='profile_insights'){if(window.__failProfile)throw Error('Fixture profiling failure');return profile(window.__sessions[args.id].count);}
    if(command==='read_editor_page'){const count=window.__sessions[args.id].count;return {offset:args.offset,rowCount:count,rows:Array.from({length:Math.min(args.limit,count-args.offset)},(_,i)=>[{kind:'text',value:String(args.offset+i).padStart(8,'0')},{kind:'number',value:args.offset+i},{kind:'text',value:(args.offset+i)%2?'UK':'US'}])};}
    if(command==='filter_insights')return create(args.filter.query?500000:window.__sessions[args.id].count);
    if(command==='aggregate_insights')return {order:['US','UK'],groups:{US:{Total:10},UK:{Total:20}},seriesNames:['Total'],skipped:0,totalGroups:2};
    if(command==='compare_insights')return {sums:{amount:100},counts:{amount:2}};
    if(command==='release_editor_dataset'){delete window.__sessions[args.id];return null;}
    return null;
   }},window:{getCurrentWindow:()=>({onCloseRequested:async()=>()=>{}})},webviewWindow:{getCurrentWebviewWindow:()=>({onDragDropEvent:async()=>()=>{}})}};
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/launchpad.html');await page.evaluate(()=>window.TangentShell.open('csv-insights.html'));
  const tool=page.frameLocator('iframe[data-workspace-id="csv-insights.html"]');
  async function accept(){await page.locator('#tabular-dialog').waitFor();await page.waitForFunction(()=>!document.getElementById('tabular-accept').disabled);await page.locator('#tabular-accept').click();}
  await tool.locator('#btn-load').click();await accept();await tool.locator('#statRows').filter({hasText:'1,000,000'}).waitFor();
  await page.locator('#transfer-diagnostics .btn').click();
  await tool.locator('[data-tab="tab-raw"]').click();await tool.locator('#rawTbody tr').first().filter({hasText:'00000000'}).waitFor();
  await tool.locator('#btnNextPage').click();await tool.locator('#rawTbody tr').first().filter({hasText:'00000100'}).waitFor();
  assert.equal(await tool.locator('#rawTbody tr').count(),100);
  await tool.locator('#txtGlobalFilter').fill('country:US');await tool.locator('#btnApplyGlobalFilter').click();await tool.locator('#statRows').filter({hasText:'500,000'}).waitFor();
  await tool.locator('#globalFilterBanner button').click();await tool.locator('#statRows').filter({hasText:'1,000,000'}).waitFor();
  const output=await tool.locator('body').evaluate(()=>window.tangentCurrentResult());assert.ok(output.nativeId);assert.equal(output.dataset,undefined);assert.equal(output.text,undefined);
  assert.equal(await page.evaluate(()=>window.__calls.filter(c=>c.command==='aggregate_insights').length),0,'Auto-Profiler must not compute the hidden manual chart');
  await tool.locator('[data-tab="tab-manual"]').click();await tool.locator('#btnUpdateChart').click();await tool.locator('#chartLegendLabel').filter({hasText:'of'}).waitFor();
  await tool.locator('#btnUpdateChart').click();
  assert.equal(await page.evaluate(()=>window.__calls.filter(c=>c.command==='aggregate_insights').length),1,'Unchanged chart requests reuse the native result');
  await tool.locator('#btnCompareData').click();await accept();await tool.locator('#fullChartModalTitle').filter({hasText:'Dataset Comparison'}).waitFor();assert.equal(await tool.locator('#fullChartModalCanvas').count(),1);
  await tool.locator('#fullChartModalClose').click();await tool.locator('[data-tab="tab-auto"]').click();await tool.locator('.profile-card .chart-wrap').first().click();await tool.locator('#fullChartModalTitle').filter({hasText:'Top 200 of 1,000,000'}).waitFor();
  await tool.locator('#fullChartModalClose').click();
  const calls=await page.evaluate(()=>window.__calls);assert.ok(calls.some(c=>c.command==='aggregate_insights'));assert.ok(calls.filter(c=>c.command==='read_editor_page').every(c=>c.args.limit<=100));assert.ok(!calls.some(c=>['read_tabular_dataset','read_launchpad_file','read_file_to_string_native'].includes(c.command)));
  await tool.locator('#btn-close-file').click();await page.waitForFunction(()=>Object.keys(window.__sessions).length===0);
  assert.deepEqual(errors,[]);console.log('PASS: million-row native metadata, bounded pages, slicing/clear, native result handle, chart requests, comparison, retained modal canvas, bounded categorical details, and resource release. Native IPC mocked; no million-row JavaScript array.');
 }finally{if(browser)await browser.close();server.close();}
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
