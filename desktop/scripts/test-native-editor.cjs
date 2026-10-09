'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Babar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../src');
(async()=>{
 const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try {
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1366,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.stack));
  await page.addInitScript(()=>{
   if(window.parent!==window)return;
   window.__sessions={};window.__calls=[];window.__picked='million.csv';window.__failEdit=false;window.__failPage=false;window.__failImport=false;
   const metadata=id=>({id,tabularId:id,path:'million.csv',native:true,columns:['id','amount','enabled'],rowCount:1000000,source:'million.csv',warnings:[]});
   window.__TAURI__={core:{Channel:class{onmessage(){}},invoke:async(command,args={})=>{
    window.__calls.push({command,args:structuredClone({...args,progress:undefined})});
    if(command==='pick_csv_file')return window.__picked;
    if(command==='preview_tabular_import')return {columns:['id','amount','enabled'],rows:[[{kind:'text',value:'00000000'},{kind:'number',value:0},{kind:'boolean',value:false}]],sheets:[],selectedSheet:null,warnings:[]};
    if(command==='import_editor_file'){if(window.__failImport)throw new Error('Fixture parse failure');const id=crypto.randomUUID();window.__sessions[id]=new Map();return metadata(id);}
    if(command==='read_editor_page'){
     if(window.__failPage)throw new Error('Fixture page failure');
     await new Promise(r=>setTimeout(r,args.offset===0?25:5));
     return {offset:args.offset,rowCount:1000000,rows:Array.from({length:Math.min(args.limit,1000000-args.offset)},(_,i)=>{const row=args.offset+i;return [0,1,2].map(column=>window.__sessions[args.id]?.get(row+':'+column)|| (column===0?{kind:'text',value:String(row).padStart(8,'0')}:column===1?{kind:'number',value:row}:{kind:'boolean',value:row%2===0}));})};
    }
    if(command==='edit_editor_cell'){await new Promise(r=>setTimeout(r,30));if(window.__failEdit)throw new Error('Fixture edit failure');window.__sessions[args.id].set(args.row+':'+args.column,args.value);return null;}
    if(command==='release_editor_dataset'){delete window.__sessions[args.id];return null;}
    return null;
   }},window:{getCurrentWindow:()=>({onCloseRequested:async()=>()=>{}})},webviewWindow:{getCurrentWebviewWindow:()=>({onDragDropEvent:async()=>()=>{}})}};
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/launchpad.html');
  await page.evaluate(()=>window.TangentShell.open('data-editor.html'));
  const editor=page.frameLocator('iframe[data-workspace-id="data-editor.html"]');
  await editor.locator('#btn-load-file').click();await page.locator('#tabular-dialog').waitFor();await page.waitForFunction(()=>!document.getElementById('tabular-accept').disabled);await page.locator('#tabular-accept').click();
  await editor.locator('#editor-row-count').filter({hasText:'1,000,000'}).waitFor();await editor.locator('.grid-row').first().locator('.grid-cell').nth(1).filter({hasText:'00000000'}).waitFor();
  assert.equal(await editor.locator('body').evaluate(()=>rows.length),0);assert.equal(await editor.locator('body').evaluate(()=>typedCells.length),0);
  await editor.locator('#grid-container').evaluate(element=>element.scrollTop=999990*28);
  await editor.locator('.grid-cell').filter({hasText:/^00999999$/}).waitFor();
  const lastRow=editor.locator('.grid-row').filter({has:editor.locator('.grid-cell').filter({hasText:/^00999999$/})});
  await lastRow.locator('.grid-cell').nth(2).dblclick();await lastRow.locator('input').fill('42');await lastRow.locator('input').press('Enter');
  const output=await editor.locator('body').evaluate(()=>window.tangentCurrentResult());assert.equal(output.dataset,undefined);assert.equal(output.text,undefined);
  assert.equal(await page.evaluate(id=>window.__sessions[id].get('999999:1').value,output.nativeId),42);
  await page.evaluate(()=>window.__failEdit=true);await lastRow.locator('.grid-cell').nth(2).dblclick();await lastRow.locator('input').fill('43');await lastRow.locator('input').press('Enter');
  await page.locator('#workspace-status').filter({hasText:'Fixture edit failure'}).waitFor();
  assert.match(await editor.locator('body').evaluate(async()=>{try{await window.tangentCurrentResult();return 'unexpected success';}catch(e){return e.message;}}),/Fixture edit failure/);
  await page.evaluate(()=>window.__failEdit=false);await lastRow.locator('input').press('Enter');await editor.locator('body').evaluate(()=>window.tangentCurrentResult());
  for(const row of [0,1000,20000,50000,100000,200000,400000,600000,800000,999990]){await editor.locator('#grid-container').evaluate((element,row)=>element.scrollTop=row*28,row);await page.waitForTimeout(50);}
  await editor.locator('.grid-cell').filter({hasText:/^00999999$/}).waitFor();
  assert.ok(await editor.locator('body').evaluate(()=>nativeEditor.pages.size<=8));
  assert.ok(await editor.locator('body').evaluate(()=>nativeEditor.requests.size<=2));
  const calls=await page.evaluate(()=>window.__calls);assert.equal(calls.some(call=>['read_tabular_dataset','import_tabular_file','create_tabular_snapshot'].includes(call.command)),false);assert.ok(calls.filter(call=>call.command==='read_editor_page').every(call=>call.args.limit===128));
  await editor.locator('#btn-load-file').click();await page.locator('#tabular-dialog').waitFor();await page.locator('#tabular-cancel').click();await page.waitForFunction(()=>window.TangentTransferDiagnostics.last?.result==='Import cancelled');
  assert.equal((await editor.locator('body').evaluate(()=>window.tangentCurrentResult())).nativeId,output.nativeId);
  await page.evaluate(()=>window.__failImport=true);await editor.locator('#btn-load-file').click();await page.locator('#tabular-dialog').waitFor();await page.waitForFunction(()=>!document.getElementById('tabular-accept').disabled);await page.locator('#tabular-accept').click();await page.waitForFunction(()=>window.TangentTransferDiagnostics.last?.result==='Import failed');
  assert.equal((await editor.locator('body').evaluate(()=>window.tangentCurrentResult())).nativeId,output.nativeId);
  await editor.locator('#btn-close-file').click();await editor.locator('#emptyState').waitFor({state:'visible'});assert.equal(await page.evaluate(id=>!!window.__sessions[id],output.nativeId),false);assert.deepEqual(errors,[]);
  fs.mkdirSync(path.resolve(__dirname,'../test-results/native-editor'),{recursive:true});
  await page.screenshot({path:path.resolve(__dirname,'../test-results/native-editor/closed.png')});
  console.log('PASS: million-row bounded paging, distant edits, pending edits, failed edits, bounded cache, cancellation, import failures, native handle export, and release. Native commands mocked; no million-row JS array.');
 }finally{if(browser)await browser.close();server.close();}
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
