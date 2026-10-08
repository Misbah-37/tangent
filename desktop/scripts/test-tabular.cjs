'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Babar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../src'),out=path.resolve(__dirname,'../test-results/tabular');
(async()=>{
 const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.html':'text/html'})[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try {
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1366,height:900}});const errors=[],network=[];page.on('pageerror',e=>errors.push(e.stack));page.on('dialog',d=>d.dismiss());page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1')&&!/^(blob:|data:)/.test(r.url()))network.push(r.url());});
  await page.addInitScript(()=>{if(window.parent!==window)return;
   const text=value=>({kind:'text',value}),number=value=>({kind:'number',value}),bool=value=>({kind:'boolean',value});
   const originals={
    'input.xlsx':{columns:['id','amount','enabled','note','date'],rows:[[text('00123'),number(0),bool(false),text('=SUM(A1:A2)'),{kind:'date',value:'2026-10-08T00:00:00'}],[text('00234'),number(12.5),bool(true),text('quoted "text",\nUnicode Ω'),{kind:'null'}]],source:'input.xlsx',sheet:'Records',warnings:['Values only. Formulas and formatting are not retained.']},
    'input.tsv':{columns:['id','note'],rows:[[text('00123'),text('tab\tand newline\n"quoted"')]],source:'input.tsv',sheet:null,warnings:[]},
    'input.csv':{columns:['id','amount'],rows:[[text('00123'),text('0')]],source:'input.csv',sheet:null,warnings:[]}
   };
   window.__tabular={};window.__csv={};window.__exports=[];window.__calls=[];window.__failExport=false;
   const projected=d=>window.TangentDatasets.csv([d.columns,...d.rows.map(row=>row.map(c=>c.kind==='null'?null:c.value))]);
   function source(args){const name=args.path.split(/[\\/]/).pop();const original=originals[name]||originals['input.tsv'];let d=structuredClone(original);if(args.sheet==='Cover')d={...d,columns:[],rows:[],sheet:'Cover',warnings:['This sheet is empty. Choose another worksheet.']};else if(!args.firstRowHeader){d.rows.unshift(d.columns.map(text));d.columns=d.columns.map((_,i)=>'Column '+(i+1));}return d;}
   function snap(d){const id=crypto.randomUUID(),p='C:\\session\\'+id+'.csv';window.__tabular[id]=structuredClone(d);window.__csv[p]=projected(d);return {id,tabularId:id,path:p,bytes:window.__csv[p].length,source:d.source,columns:d.columns,rowCount:d.rows.length,sheet:d.sheet,warnings:d.warnings};}
   window.__TAURI__={core:{invoke:async(command,args={})=>{window.__calls.push({command,args});
    if(command==='preview_tabular_import'){const d=source({...args,sheet:args.sheet||(/xlsx$/i.test(args.path)?'Cover':null)});return {...d,sheets:/xlsx$/i.test(args.path)?['Cover','Records']:[],selectedSheet:d.sheet};}
    if(command==='import_tabular_file')return snap(source(args));
    if(command==='read_tabular_dataset')return structuredClone(window.__tabular[args.id]);
    if(command==='create_tabular_snapshot')return snap(args.dataset);
    if(command==='read_launchpad_file')return Array.from(new TextEncoder().encode(window.__csv[args.path]||'id,amount\n00123,0\n'));
    if(command==='read_file_to_string_native')return window.__csv[args.path]||'id,amount\n00123,0\n';
    if(command==='stage_tabular_file')return args.name;
    if(command==='pick_csv_file')return window.__pickedPath||null;
    if(command==='export_tabular_result'){if(window.__failExport)throw new Error('Fixture disk full');window.__exports.push(args);return 'C:\\exports\\result.'+args.format;}
    if(command==='process_massive_csv')return JSON.stringify({path:args.filePath,columns:['id','amount'],preview:[['00123','0']],null_counts:[0,0],pii_flags:[false,false],total_rows:1,file_size_mb:.01});
    if(command==='extract_financial_headers')return {headers:['date','note','amount']};
    if(command==='get_csv_headers')return ['id','amount'];
    if(command==='compute_correlation_matrix')return {columns:['a','b'],matrix:[[{r:1,n:2,p:0},{r:.5,n:2,p:.1}],[{r:.5,n:2,p:.1},{r:1,n:2,p:0}]],raw_rows:[],all_headers:['id','amount']};
    return null;
   }},window:{getCurrentWindow:()=>({onCloseRequested:async()=>()=>{}})},webviewWindow:{getCurrentWebviewWindow:()=>({onDragDropEvent:async()=>()=>{}})}};
  });
  await page.route(/^https?:\/\/(?!127\.0\.0\.1(?::|\/))/,route=>route.abort('blockedbyclient'));
  await page.goto('http://127.0.0.1:'+server.address().port+'/launchpad.html');
  for(const ext of ['tsv','xlsx'])assert.equal(await page.evaluate(ext=>window.TangentRouting.compatible(['input.'+ext]).length,ext),6);
  async function begin(tool,file){await page.evaluate(([tool,file])=>{window.__opening=window.TangentShell.open(tool,[file]);},[tool,file]);await page.locator('#tabular-dialog').waitFor();await page.locator('#tabular-sheet').selectOption('Records');await page.waitForFunction(()=>!document.getElementById('tabular-accept').disabled);}
  await page.evaluate(()=>{window.__opening=window.TangentShell.open('data-editor.html',['input.xlsx']);});await page.locator('#tabular-dialog').waitFor();
  await page.waitForFunction(()=>document.querySelector('#tabular-note')?.textContent.includes('empty'));assert.equal(await page.locator('#tabular-accept').isDisabled(),true);
  await page.locator('#tabular-sheet').selectOption('Records');await page.waitForFunction(()=>!document.getElementById('tabular-accept').disabled);
  await page.locator('#tabular-header').uncheck();await page.waitForFunction(()=>document.querySelector('#tabular-preview th')?.textContent==='Column 1');
  await page.locator('#tabular-header').check();await page.waitForFunction(()=>document.querySelector('#tabular-preview th')?.textContent==='id');
  fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,'sheet-preview.png')});await page.locator('#tabular-accept').click();assert.equal(await page.evaluate(()=>window.__opening),true);
  const editor=page.frameLocator('iframe[data-workspace-id="data-editor.html"]');
  const initial=await editor.locator('body').evaluate(()=>window.tangentEditorDataset());assert.equal(initial.rows[0][0].value,'00123');assert.equal(initial.rows[0][1].value,0);assert.equal(initial.rows[0][2].value,false);assert.equal(initial.rows[0][4].kind,'date');
  const amount=editor.locator('.grid-row').first().locator('.grid-cell').nth(2);await amount.dblclick();await amount.locator('input').fill('5');await amount.locator('input').press('Enter');
  await editor.locator('#btn-save-file').click();await page.locator('#tabular-format').selectOption('xlsx');await page.screenshot({path:path.join(out,'export-options.png')});await page.locator('#tabular-accept').click();
  const exported=await page.evaluate(()=>window.__exports.at(-1));assert.equal(exported.format,'xlsx');assert.equal(exported.dataset.rows[0][1].kind,'number');assert.equal(exported.dataset.rows[0][1].value,5);assert.equal(exported.dataset.rows[0][3].value,'=SUM(A1:A2)');
  await page.locator('#workspace-open-in').click();await page.locator('[data-transfer-target="sql-studio.html"]').click();
  const sql=page.frameLocator('iframe[data-workspace-id="sql-studio.html"]');await sql.locator('.table-schema-card').waitFor({timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#active-workspace-title')?.dataset.hasData==='true');
  await sql.locator('#statusIndicator').filter({hasText:'Ready'}).waitFor();
  await sql.locator('#btnRun').click();
  await sql.locator('#resultsCount').filter({hasText:'2 rows'}).waitFor();
  const results=await sql.locator('body').evaluate(()=>window.tangentCurrentResult());assert.equal(results.dataset.rows[0][0].value,'00123');assert.equal(results.dataset.rows[0][1].value,5);assert.equal(results.dataset.rows[0][2].value,false);
  await page.locator('#workspace-open-in').click();await page.locator('[data-transfer-target="data-editor.html"]').click();
  const copy=page.frameLocator('iframe[data-workspace-id^="data-editor.html::"]');await copy.locator('#grid-container').waitFor();assert.equal((await copy.locator('body').evaluate(()=>window.tangentEditorDataset())).rows[0][1].kind,'number');
  assert.equal((await editor.locator('body').evaluate(()=>window.tangentEditorDataset())).rows[0][1].value,5);
  await page.locator('#toolkit-toggle').click();
  await page.locator('#workspace-menu').click();await page.locator('#workspace-new').click();
  await page.waitForFunction(()=>document.querySelectorAll('iframe[data-workspace-id^="data-editor.html"]').length===3);
  await page.locator('#workspace-menu').click();
  const blankId=await page.locator('[data-pick-workspace]').last().getAttribute('data-pick-workspace');
  await page.locator('[data-pick-close]').last().click();
  await page.waitForFunction(()=>document.querySelectorAll('iframe[data-workspace-id^="data-editor.html"]').length===2);
  assert.equal(await page.locator('[data-pick-workspace="'+blankId+'"]').count(),0);
  await page.locator('[data-pick-close="data-editor.html"]').click();await page.locator('#workspace-confirm').waitFor();await page.locator('#confirm-cancel').click();await page.locator('#workspace-picker').waitFor();
  assert.equal(await page.locator('[data-pick-workspace]').count(),2);
  await page.screenshot({path:path.join(out,'workspace-picker.png')});
  await page.locator('[data-pick-workspace^="data-editor.html::"]').click();
  await page.locator('.tool-nav[data-tool="data-editor.html"]').click();await page.locator('#workspace-picker').waitFor();
  assert.equal(await page.locator('[data-pick-workspace]').count(),2);
  await page.locator('[data-pick-workspace="data-editor.html"]').click();assert.equal(await editor.locator('#grid-container').isVisible(),true);
  await page.locator('.tool-nav[data-tool="data-editor.html"]').click();await page.locator('[data-pick-workspace^="data-editor.html::"]').click();assert.equal(await copy.locator('#grid-container').isVisible(),true);
  await page.locator('#toolkit-toggle').click();
  await page.locator('#workspace-export').click();await page.locator('#tabular-format').selectOption('tsv');await page.locator('#tabular-accept').click();assert.equal(await page.evaluate(()=>window.__exports.at(-1).format),'tsv');
  // Cancellation leaves the existing editor data intact.
  await copy.locator('#btn-load-file').click(); // native fixture returns null, leaves dataset alone
  await page.evaluate(()=>{window.__pickedPath='input.tsv';});await copy.locator('#btn-load-file').click();await page.locator('#tabular-dialog').waitFor();await page.waitForFunction(()=>!document.getElementById('tabular-accept').disabled);await page.locator('#tabular-accept').click();
  await page.waitForFunction(()=>document.querySelector('iframe[data-workspace-id^="data-editor.html::"]').contentWindow.tangentEditorDataset().columns.length===2);
  assert.equal((await copy.locator('body').evaluate(()=>window.tangentEditorDataset())).rows[0][1].value,'tab\tand newline\n"quoted"');
  assert.equal((await editor.locator('body').evaluate(()=>window.tangentEditorDataset())).rows[0][1].value,5);
  await page.evaluate(()=>window.TangentShell.showHome());
  await page.evaluate(()=>{window.__opening=window.TangentShell.open('data-editor.html',['input.tsv'],{newWorkspace:true});});await page.locator('#tabular-dialog').waitFor();await page.waitForFunction(()=>!document.getElementById('tabular-accept').disabled);await page.locator('#tabular-cancel').click();assert.equal(await page.evaluate(()=>window.__opening),false);assert.equal(await page.locator('#workspace-status').isVisible(),false);
  // Non-CSV inputs reach each existing analysis engine after sheet selection.
  for(const tool of ['index.html','finance-dashboard.html','correlation-matrix.html','csv-insights.html']){await begin(tool,'input.xlsx');await page.locator('#tabular-accept').click();assert.equal(await page.evaluate(()=>window.__opening),true,tool);}
  const profile=page.frameLocator('iframe[data-workspace-id="csv-insights.html"]');assert.equal(await profile.locator('#statRows').textContent(),'2');const profileData=await profile.locator('body').evaluate(()=>window.tangentCurrentResult());assert.equal(profileData.dataset.rows[0][0].value,'00123');assert.equal(profileData.dataset.rows[0][2].kind,'boolean');
  // Native staging also supports the existing browser file-input route.
  await profile.locator('#fileInput').setInputFiles({name:'input.tsv',mimeType:'text/tab-separated-values',buffer:Buffer.from('id\tnote\n00123\t"tab\tand newline\n""quoted"""\n')});await page.locator('#tabular-dialog').waitFor();await page.waitForFunction(()=>!document.getElementById('tabular-accept').disabled);await page.locator('#tabular-accept').click();await page.waitForFunction(()=>document.querySelector('iframe[data-workspace-id="csv-insights.html"]').contentWindow.document.getElementById('statRows').textContent==='1');
  const staged=await profile.locator('body').evaluate(()=>window.tangentCurrentResult());assert.equal(staged.dataset.rows[0][1].value,'tab\tand newline\n"quoted"');
  await page.screenshot({path:path.join(out,'loaded-insights.png')});
  assert.equal(await profile.locator('#btnCloseFile').count(),0);
  await profile.locator('#btn-close-file').click();await profile.locator('#emptyState').waitFor({state:'visible'});assert.equal(await profile.locator('#workspace').isVisible(),false);
  assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
  console.log('PASS: six-tool XLSX/TSV routing, empty-sheet selection, header preview, typed editor edits, real offline SQL, immutable handoffs, export options, cancellation, and browser-file staging.');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
