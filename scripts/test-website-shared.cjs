const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),vm=require('node:vm');
const {chromium}=require('C:/Users/Babar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),tools=JSON.parse(fs.readFileSync(path.join(root,'tools.json'),'utf8'));
for(const file of ['index.html',...tools.map(t=>t.filename)]) {
 const html=fs.readFileSync(path.join(root,file),'utf8');
 assert.ok(!/<div class="sidebar-group-title"/.test(html),file);
 assert.ok(/aria-controls="tangentSidebar"/.test(html),file);
 for(const m of html.matchAll(/<button[^>]*class="sidebar-group-title"[^>]*aria-controls="([^"]+)"/g)) assert.ok(html.includes('id="'+m[1]+'"'),file);
}
const source=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const m of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g))if(!/src=|application\/ld\+json/.test(m[1]))new vm.Script(m[2]);
assert.ok(!/suite of 24|zero interruptions|entire toolkit operates completely offline/.test(source));
(async()=>{
 const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'application/javascript'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try {
  browser=await chromium.launch({channel:'msedge',headless:true});
  for(const width of [1366,390]) {
   const page=await browser.newPage({viewport:{width,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:'+server.address().port+'/index.html');
   if(width===390) {assert.equal(await page.locator('#tangentSidebar').evaluate(el=>el.inert),true);await page.locator('#toolkitToggle').click();assert.equal(await page.locator('#toolkitSearch').evaluate(el=>el===document.activeElement),true);}
   const category=page.locator('.sidebar-group-title').first();await category.focus();await page.keyboard.press('Enter');assert.equal(await category.getAttribute('aria-expanded'),'true');await page.keyboard.press('Space');assert.equal(await category.getAttribute('aria-expanded'),'false');
   await page.locator('#toolkitSearch').fill('hygiene');const matching=page.locator('.sidebar-group').filter({has:page.locator('a[href="data-hygiene.html"]')});assert.equal(await matching.locator('.sidebar-group-title').getAttribute('aria-expanded'),'true');assert.equal(await matching.locator('a[href="data-hygiene.html"]').isVisible(),true);
   await page.keyboard.press('Escape');assert.equal(await page.locator('#tangentSidebar').evaluate(el=>el.inert),true);assert.equal(await page.locator('#toolkitToggle').evaluate(el=>el===document.activeElement),true);
   await page.locator('#toolkitToggle').click();await page.locator('#toolkitSearch').fill('');await page.locator('#sidebarCloseBtn').click();assert.equal(await page.locator('#toolkitToggle').evaluate(el=>el===document.activeElement),true);
   await page.locator('.hero a[href="#tangent-pro"]').click();assert.equal(await page.locator('#tangent-pro').isVisible(),true);assert.match(await page.locator('#tangent-pro').textContent(),/public download is not available yet/);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await page.screenshot({path:path.join(root,'scratch','homepage-pro-'+width+'.png')});
   await page.locator('#themeToggle').click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:path.join(root,'scratch','homepage-pro-light-'+width+'.png')});assert.deepEqual(errors,[]);await page.close();
  }
  console.log('PASS: generated sidebar controls across 31 tools; homepage syntax, keyboard toggles/search/focus restoration, mobile closed-sidebar inertness, Pro links and desktop/mobile theme layouts');
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
