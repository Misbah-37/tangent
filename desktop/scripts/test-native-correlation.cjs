'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Babar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../src');
(async()=>{
 const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',path.extname(file)==='.js'?'text/javascript':'text/html');res.end(fs.readFileSync(file));});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.__TAURI__={core:{invoke:async()=>{throw Error('<img src=x onerror=window.injected=1>');}}};});
  await page.goto('http://127.0.0.1:'+server.address().port+'/correlation-matrix.html');
  await page.evaluate(()=>{const hostile='<img src=x onerror=window.injected=1>';const cell={r:0.948683298,p_value:0.001,n:4,is_defined:true,has_outlier_warning:false};matrixData={columns:[hostile,'y','constant'],all_headers:[hostile,'y'],raw_rows:[[hostile,'2']],matrix:[[cell,cell,{...cell,is_defined:false}],[cell,cell,{...cell,is_defined:false}],[{...cell,is_defined:false},{...cell,is_defined:false},{...cell,is_defined:false}]]};currentMethod='spearman';renderMatrix();openRawDataModal();allHeaders=[hostile];activeFilters=[{column:hostile,operator:'==',value:hostile}];renderFilters();});
  assert.equal(await page.locator('#heatmapContainer img,#rawDataContainer img').count(),0);
  assert.match(await page.locator('#heatmapContainer').textContent(),/N\/A/);assert.equal((await page.locator('#heatmapContainer').textContent()).includes('**'),false);
  assert.equal(await page.evaluate(()=>window.injected),undefined);
  for(const theme of ['light','dark']){
   await page.evaluate(theme=>{document.documentElement.setAttribute('data-theme',theme);matrixData.matrix[0][1].r=1;matrixData.matrix[1][0]={...matrixData.matrix[1][0],r:-1};renderMatrix();},theme);
   const colors=await page.locator('.corr-cell').evaluateAll(cells=>cells.slice(0,2).map(c=>({background:getComputedStyle(c).backgroundColor,color:getComputedStyle(c).color,text:c.textContent})));
   assert.deepEqual(colors.map(c=>c.background),['rgb(6, 95, 70)','rgb(153, 27, 27)']);assert(colors.every(c=>c.color==='rgb(255, 255, 255)'));assert.match(colors[0].text,/1\.00/);assert.match(colors[1].text,/-1\.00/);
  }
  await page.evaluate(()=>{currentMethod='pearson';renderMatrix();});assert.match(await page.locator('#heatmapContainer').textContent(),/\*\*/);
  await page.evaluate(async()=>{currentFilePath='fixture.csv';await runMath();});assert.equal(await page.locator('#heatmapContainer img').count(),0);assert.match(await page.locator('#heatmapContainer').textContent(),/Error:/);
  await page.evaluate(()=>resetStudio());assert.equal(await page.evaluate(()=>matrixData),null);assert.deepEqual(errors,[]);
  console.log('PASS: Correlation undefined cells, small-sample Spearman stars, Pearson stars, literal CSV headers/preview/filter/error, close reset (native IPC mocked).');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
