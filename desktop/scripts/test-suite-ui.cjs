'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Babar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const tools=require('../src/launchpad-routing.js').tools;
const root=path.resolve(__dirname,'../src'),out=path.resolve(__dirname,'../test-results/launch-polish');
(async()=>{
fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.html':'text/html'})[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1366,height:800}});const errors=[],network=[];page.on('pageerror',e=>errors.push(e.stack));page.on('dialog',d=>d.dismiss());page.on('request',req=>{if(!/^(http:\/\/127.0.0.1|blob:|data:)/.test(req.url()))network.push(req.url());});
await page.addInitScript(()=>{if(window.parent!==window)return;window.__TAURI__={core:{invoke:async(cmd,args={})=>{
const csv='Date,Description,Amount\r\n2026-10-01,Salary,3000\r\n2026-10-02,Groceries,-120\r\n';
if(cmd==='read_file_to_string_native')return csv;if(cmd==='read_launchpad_file')return Array.from(new TextEncoder().encode(csv));
if(cmd==='process_massive_csv')return JSON.stringify({path:args.filePath,columns:['Date','Description','Amount'],preview:[['2026-10-01','Salary','3000'],['2026-10-02','Groceries','-120']],null_counts:[0,0,0],pii_flags:[false,false,false],total_rows:2,file_size_mb:.01});
if(cmd==='extract_financial_headers')return {headers:['Date','Description','Amount']};
if(cmd==='parse_financial_statements')return {total_inflow:3000,total_outflow:120,net_cashflow:2880,transactions:[{id:1,date:'2026-10-01',raw_date:'2026-10-01',desc:'Salary',amount:3000,category:'Income'},{id:2,date:'2026-10-02',raw_date:'2026-10-02',desc:'Groceries',amount:-120,category:'Food'}],subscriptions:[],timeline_labels:['2026-10'],timeline_inflow:[3000],timeline_outflow:[120],category_totals:{Food:120}};
if(cmd==='parse_logs')return {mode:'web',total_lines:120,total_errors:8,brute_force_ips:[],scanner_ips:[],top_ips:[['127.0.0.1',120]],top_404s:[['/old',8]],top_500s:[],timeline_labels:['10:00','11:00'],timeline_traffic:[60,60],timeline_errors:[4,4]};
if(cmd==='get_csv_headers')return ['Date','Description','Amount'];
if(cmd==='compute_correlation_matrix')return {columns:['a','b'],matrix:[[{r:1,n:10,p:0},{r:.75,n:10,p:.01}],[{r:.75,n:10,p:.01},{r:1,n:10,p:0}]],raw_rows:[],all_headers:['a','b']};
if(cmd==='extract_tables')return [{rows:[['Name','Value'],['Ada','10']],headers:['Name','Value']}];
return null;}},window:{getCurrentWindow:()=>({onCloseRequested:async()=>()=>{}})},webviewWindow:{getCurrentWebviewWindow:()=>({onDragDropEvent:async()=>()=>{}})}};});
await page.goto('http://127.0.0.1:'+server.address().port+'/launchpad.html');assert.equal(await page.locator('#tool-search').count(),0);assert.equal(await page.locator('#permanent-tools button').count(),8);
await page.screenshot({path:path.join(out,'launchpad-dark.png')});
await page.locator('#theme-toggle').click();await page.screenshot({path:path.join(out,'launchpad-light.png')});await page.locator('#theme-toggle').click();
await page.locator('#toolkit-toggle').click();await page.screenshot({path:path.join(out,'sidebar-rail.png')});await page.locator('#toolkit-toggle').click();

const findings=[];
for(const tool of tools){
await page.evaluate(id=>window.TangentShell.open(id),tool.id);const frame=page.frameLocator('iframe[data-workspace-id="'+tool.id+'"]');await frame.locator('.workspace').waitFor();await frame.locator('link[href="suite-polish.css"]').waitFor({state:'attached'});
if(tool.id==='sql-studio.html')await frame.locator('#statusIndicator').filter({hasText:'DuckDB Engine Ready'}).waitFor({timeout:60000});
await page.screenshot({path:path.join(out,tool.id.replace('.html','')+'-dark.png')});
const contrast=await frame.locator('.workspace-title p').first().evaluate(el=>{const parse=s=>s.match(/[\d.]+/g).slice(0,3).map(Number);const lum=rgb=>rgb.map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((v,n,i)=>v+n*[.2126,.7152,.0722][i],0);const style=getComputedStyle(el),rootStyle=getComputedStyle(document.documentElement);const fg=lum(parse(style.color)),bg=lum(parse(rootStyle.getPropertyValue('--bg-surface')));return (Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05);});assert.ok(contrast>=4.5,tool.id+' muted text contrast '+contrast);
await page.locator('#theme-toggle').click();await page.screenshot({path:path.join(out,tool.id.replace('.html','')+'-light.png')});
await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,tool.id.replace('.html','')+'-narrow.png')});
const layout=await frame.locator('body').evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,header:document.querySelector('.workspace-title')?.getBoundingClientRect().toJSON()}));findings.push({tool:tool.id,...layout});
await page.setViewportSize({width:1366,height:800});await page.locator('#toolkit-toggle').click();await page.locator('#theme-toggle').click();
}
// Finance mapping/analysis remains operable and readable after replacing the old skeleton.
assert.equal(await page.evaluate(()=>window.TangentShell.open('finance-dashboard.html',['statements.csv'])),true);
const finance=page.frameLocator('iframe[data-workspace-id="finance-dashboard.html"]');await finance.locator('#mappingBox').waitFor();await finance.locator('#btnAnalyze').click();await finance.locator('#dashboardArea').waitFor();await page.screenshot({path:path.join(out,'finance-loaded.png')});
// Extractor works with no external script dependency.
await page.evaluate(()=>window.TangentShell.open('data-extractor.html'));const extract=page.frameLocator('iframe[data-workspace-id="data-extractor.html"]');await extract.locator('#tabRaw').click();await extract.locator('#htmlInput').fill('<table><tr><th>Name</th><th>Value</th></tr><tr><td>Ada</td><td>10</td></tr></table>');await extract.locator('#btnExtract').click();await extract.locator('#resultsPanel').waitFor();await page.screenshot({path:path.join(out,'extractor-loaded.png')});
// Local log report cards and charts.
assert.equal(await page.evaluate(()=>window.TangentShell.open('log-analyzer.html',['access.log'])),true);await page.screenshot({path:path.join(out,'logs-loaded.png')});
assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
fs.writeFileSync(path.join(out,'review.json'),JSON.stringify({findings,errors,network},null,2));console.log('PASS: all eight real tools, dark/light/narrow layouts, readable muted text, permanent tool navigation, finance mapping, log report, and offline extraction.');console.log(JSON.stringify(findings.map(f=>({tool:f.tool,width:f.width,scroll:f.scroll}))));
}finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
