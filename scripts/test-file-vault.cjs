'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto'),vm=require('node:vm');
const {chromium}=require('C:/Users/Babar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'scratch/vault-fixed');fs.mkdirSync(out,{recursive:true});
function decode(bytes,password){
 assert.equal(bytes.subarray(0,4).toString(),'TGT1');const key=crypto.pbkdf2Sync(password,bytes.subarray(4,20),100000,32,'sha256'),dec=crypto.createDecipheriv('aes-256-gcm',key,bytes.subarray(20,32));dec.setAuthTag(bytes.subarray(-16));
 const plain=Buffer.concat([dec.update(bytes.subarray(32,-16)),dec.final()]),length=plain.readUInt16BE();return {meta:JSON.parse(plain.subarray(2,2+length).toString()),bytes:plain.subarray(2+length)};
}
function legacy(password){
 const salt=crypto.randomBytes(16),iv=crypto.randomBytes(12),meta=Buffer.from(JSON.stringify({name:'legacy-Ω.txt',type:'text/plain',date:1})),length=Buffer.alloc(2);length.writeUInt16BE(meta.length);
 const enc=crypto.createCipheriv('aes-256-gcm',crypto.pbkdf2Sync(password,salt,100000,32,'sha256'),iv);
 return Buffer.concat([Buffer.from('TGT1'),salt,iv,enc.update(Buffer.concat([length,meta,Buffer.from('legacy bytes\0Ω')])),enc.final(),enc.getAuthTag()]);
}
(async()=>{
 for(const name of ['src/tools/file-vault.html','file-vault.html']){
  const html=fs.readFileSync(path.join(root,name),'utf8');for(const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g))if(!match[1].includes('application/ld+json'))new vm.Script(match[2]);
  assert.doesNotMatch(html,/unbreakable|military-grade|zero size limits|Bundle multiple sensitive/);
 }
 const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);return res.end();}res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':'text/css');res.end(fs.readFileSync(file));});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({acceptDownloads:true});const errors=[];page.on('pageerror',error=>errors.push(error.message));let downloads=0;page.on('download',()=>downloads++);
  await page.goto('http://127.0.0.1:'+server.address().port+'/file-vault.html');
  await page.evaluate(()=>handleFile({name:'old.txt',type:'text/plain',size:3,arrayBuffer:()=>new Promise(resolve=>{window.finishRead=()=>resolve(new TextEncoder().encode('OLD').buffer);})}));
  await page.locator('#vaultPassword').fill('original-long-password');await page.locator('#confirmPassword').fill('original-long-password');
  const pending=page.waitForEvent('download');await page.locator('#submitBtn').click();
  assert.equal(await page.locator('#vaultPassword').isDisabled(),true);assert.equal(await page.locator('#tabUnlockMode').isDisabled(),true);
  await page.evaluate(()=>{handleFile(new File(['NEW'],'new.txt'));setMode('unlock');vaultPassword.value='changed';vaultPassword.dispatchEvent(new Event('input'));submitBtn.dispatchEvent(new Event('click'));window.finishRead();});
  const download=await pending;assert.equal(download.suggestedFilename(),'old.txt.tangent');await download.saveAs(path.join(out,'race-fixed.tangent'));await page.waitForFunction(()=>!vaultBusy);
  const restored=decode(fs.readFileSync(path.join(out,'race-fixed.tangent')),'original-long-password');assert.equal(restored.meta.name,'old.txt');assert.equal(restored.bytes.toString(),'OLD');assert.equal(downloads,1);assert.equal(await page.locator('#submitBtn').isDisabled(),true);
  await page.locator('#tabUnlockMode').click();const bytes=legacy('legacy-password');await page.locator('#fileInput').setInputFiles({name:'legacy.tangent',buffer:bytes});await page.locator('#vaultPassword').fill('wrong');await page.locator('#submitBtn').click();await page.waitForFunction(()=>!vaultBusy&&dangerAlert.style.display==='block');assert.equal(downloads,1);
  await page.locator('#vaultPassword').fill('legacy-password');const recovered=page.waitForEvent('download');await page.locator('#submitBtn').click();const recoveredFile=await recovered;await recoveredFile.saveAs(path.join(out,'legacy-recovered.txt'));assert.equal(recoveredFile.suggestedFilename(),'legacy-Ω.txt');assert.equal(fs.readFileSync(path.join(out,'legacy-recovered.txt'),'utf8'),'legacy bytes\0Ω');await page.waitForFunction(()=>!vaultBusy);
  const tampered=Buffer.from(bytes);tampered[tampered.length-1]^=1;await page.locator('#fileInput').setInputFiles({name:'tampered.tangent',buffer:tampered});await page.locator('#submitBtn').click();await page.waitForFunction(()=>!vaultBusy&&dangerAlert.style.display==='block');assert.equal(downloads,2);
  await page.locator('#fileInput').setInputFiles({name:'truncated.tangent',buffer:Buffer.from('TGT1')});await page.locator('#submitBtn').click();await page.waitForFunction(()=>!vaultBusy&&dangerAlert.style.display==='block');assert.match(await page.locator('#dangerAlert').textContent(),/Invalid container/);
  await page.locator('#tabLockMode').click();await page.locator('#fileInput').setInputFiles({name:'empty.bin',buffer:Buffer.alloc(0)});await page.locator('#vaultPassword').fill('empty-password');await page.locator('#confirmPassword').fill('empty-password');const emptyWait=page.waitForEvent('download');await page.locator('#submitBtn').click();await(await emptyWait).saveAs(path.join(out,'empty.tangent'));assert.equal(decode(fs.readFileSync(path.join(out,'empty.tangent')),'empty-password').bytes.length,0);
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true});assert.deepEqual(errors,[]);
  console.log('PASS: immutable file/password/mode, blocked replacement/double submit, independent AES-GCM verification, legacy recovery, wrong password/tamper/truncation, empty file, source/generated syntax and truthful copy.');
 }finally{if(browser)await browser.close();server.close();}
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
