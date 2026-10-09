'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Babar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../src');
(async()=>{
 const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>{errors.push(e.stack);console.error(e.stack)});
  await page.addInitScript(()=>{
   window.__hostile='<img src=x onerror=window.injected=1>';window.__TAURI__={core:{invoke:async(command,args)=>{
    if(command==='process_massive_csv')return JSON.stringify({path:args.filePath,columns:[window.__hostile,'amount'],preview:[['quoted "Ω",\ntext','1.5k'],[window.__hostile,'']],null_counts:[0,1],pii_flags:[false,false],total_rows:1000000,file_size_mb:'12.00'});
    if(command==='execute_recipe'){window.__recipe=JSON.parse(args.recipeStr);return JSON.stringify({temp_path:'cleaned-unique.csv',msg:window.__hostile,final_headers:[window.__hostile,'amount'],final_preview:[[window.__hostile,'1500']]});}
    throw Error('Unexpected command '+command);
   }}};
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/index.html');await page.evaluate(()=>loadHygieneFile('fixture.csv'));
  assert.match(await page.locator('#stat-rows').textContent(),/1,000,000/);assert.equal(await page.locator('#table-wrapper img').count(),0);
  assert.equal(await page.locator('#selImputeCol option').nth(1).getAttribute('value'),await page.evaluate(()=>window.__hostile));
  assert.equal(await page.evaluate(()=>cleanNumericJS('1.5k')),'1500');assert.equal(await page.evaluate(()=>cleanNumericJS('2.25m')),'2250000');assert.equal(await page.evaluate(()=>cleanNumericJS('9007199254740993k')),'9007199254740993000');
  await page.evaluate(()=>addPill('selNumberCols','amount'));assert.match(await page.locator('#table-wrapper tbody').textContent(),/1500/);
  await page.locator('.accordion-header').filter({hasText:'Missing Data Handling'}).click();
  await page.locator('#selImputeCol').selectOption('amount');await page.locator('#selImputeMethod').selectOption('custom');await page.locator('#txtImputeCustom').fill('<img src=x onerror=window.injected=1>');await page.locator('#btnAddImputeRule').click();
  assert.equal(await page.locator('#imputeRulesList img,#table-wrapper img').count(),0);await page.locator('#imputeRulesList button').click();assert.equal(await page.locator('#imputeRulesList button').count(),0);
  await page.locator('#btn-run').click();await page.waitForFunction(()=>window.lastExportTempPath==='cleaned-unique.csv');assert.equal(await page.locator('#table-wrapper img,#toast-container img').count(),0);
  assert.equal(await page.evaluate(()=>window.injected),undefined);assert.equal((await page.evaluate(()=>tangentCurrentResult())).sourcePath,'cleaned-unique.csv');assert.deepEqual(await page.evaluate(()=>window.__recipe.number_cols),['amount']);
  await page.locator('#btn-close-file').click();assert.equal((await page.locator('#table-wrapper').textContent()).includes('No dataset loaded'),true);assert.deepEqual(errors,[]);
  console.log('PASS: Data Hygiene million-row metadata, exact shorthand preview, literal hostile CSV/options/imputation/toasts, recipe execution/provider and close reset (native IPC mocked).');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
