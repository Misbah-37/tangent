async function switchWorkspace(page, id, prefix=false) {
 const tool=id.split('::')[0];
 await page.locator('.tool-nav[data-tool="'+tool+'"]').click();
 if(await page.locator('#workspace-picker').isVisible()) await page.locator('[data-pick-workspace'+(prefix?'^':'')+'="'+id+'"]').first().click();
}
async function closeFromMenu(page,id) {
 if(!await page.locator('#workspace-picker').isVisible()) { await switchWorkspace(page,id);await page.locator('#workspace-menu').click(); }
 await page.locator('[data-pick-close="'+id+'"]').click();
}
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');
const { once } = require('node:events');
const { randomUUID } = require('node:crypto');
const routing = require('../src/launchpad-routing.js');
const root = path.resolve(__dirname, '../src');
function registryContext() {
  const calls = [];
  const window = { TangentRouting: routing, __TAURI__: { core: { invoke: async (command, args) => {
    calls.push({ command, args });
    return { id: randomUUID(), path: 'snapshot.csv', bytes: Buffer.byteLength(args.text || '') };
  } } } };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'dataset-registry.js'), 'utf8'), { window, crypto: { randomUUID } });
  return { registry: window.TangentDatasets, calls };
}
async function registryAndProviders() {
  const { registry, calls } = registryContext();
  assert.equal(registry.csv([['name','value'], ['a,"b"\r\nc',0], [null,false]]), 'name,value\r\n"a,""b""\r\nc",0\r\n,false\r\n');
  const id = registry.registerSource(['C:\\private\\source.csv']);
  const first = await registry.capture(async () => ({ text: 'first', label: 'Edited data' }), id);
  const second = await registry.capture(async () => ({ text: 'second' }), id, first.id);
  assert.equal(first.revision, 1); assert.equal(second.revision, 2);
  assert.equal(second.parentSnapshotId, first.id); assert.equal(first.datasetId, second.datasetId);
  assert.equal(calls[0].command, 'create_dataset_snapshot');
  const metadata = registry.inspect(); metadata[0].snapshots.length = 0; metadata[0].sourceNames.length = 0;
  assert.equal(registry.inspect()[0].snapshots.length, 2); assert.equal(registry.inspect()[0].sourceNames[0], 'source.csv');
  await assert.rejects(registry.capture(async () => ({})), /no transferable/);
  const cases = {
    'index.html': { activeFilePath: 'original.csv', window: { lastExportTempPath: 'cleaned.csv' } },
    'data-editor.html': { headers: ['name','zero'], rows: [['a,"b"',0]] },
    'csv-insights.html': { nativeInsights:null, currentHeaders: ['name','zero'], rawData: [{name:'keep',zero:0},{name:'omit',zero:1}], currentFilterFn: row => row.name === 'keep' },
    'sql-studio.html': { sqlOperation:null,nativeResult:{tabularId:'sql-result',rowCount:1000000},resultCount:()=>1000000 },
    'correlation-matrix.html': { matrixData: { columns:['a','b'], matrix:[[{r:1},{r:0.125}],[{r:0.125},{r:1}]] } },
    'finance-dashboard.html': { currentReport: { native_id:'financial-ledger',row_count:1000000 } },
    'log-analyzer.html': { window: { report:{brute_force_ips:[],scanner_ips:[],top_ips:[['127.0.0.1',2]],top_404s:[['/a,"b"',1]],top_500s:[]} } },
    'data-extractor.html': { structuredData:[], extractMode:{value:'tables'}, extractedTables:[{rows:[['name'],['a,"b"']]}], document:{querySelectorAll:()=>[{value:'0'}]} }
  };
  for (const [file, data] of Object.entries(cases)) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const code = html.match(/window\.tangentCurrentResult = async function\((?:trace)?\) \{[\s\S]*?\n\};/)[0];
    const context = { ...data, window: { ...data.window, TangentToolWorkspace:{csv:registry.csv} } };
    vm.runInNewContext(code, context);
    const result = await context.window.tangentCurrentResult();
    assert.equal(result.ext, 'csv', file);
    if (file === 'index.html') assert.equal(result.sourcePath, 'cleaned.csv');
    else if(file === 'finance-dashboard.html'){assert.equal(result.nativeId,'financial-ledger');assert.equal(result.text,undefined);assert.equal(result.dataset,undefined);}
    else if(file === 'sql-studio.html'){assert.equal(result.nativeId,'sql-result');assert.equal(result.text,undefined);assert.equal(result.dataset,undefined);}
    else assert.ok(result.text.length > 0, file);
    if (file === 'csv-insights.html') { assert.match(result.text,/keep,0/); assert.doesNotMatch(result.text,/omit/); }
    if (file === 'data-editor.html' || file === 'data-extractor.html') assert.match(result.text,/"a,""b"""/);
  }
}
async function browserTransfers() {
  const { chromium } = require('C:/Users/Babar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
  const server = http.createServer((req, res) => {
    const filename = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (!filename.startsWith(root + path.sep) || !fs.existsSync(filename) || fs.statSync(filename).isDirectory()) {res.writeHead(404); return res.end();}
    const mime = { '.js':'text/javascript', '.css':'text/css', '.wasm':'application/wasm', '.html':'text/html' };
    res.setHeader('Content-Type', mime[path.extname(filename)] || 'application/octet-stream'); res.end(fs.readFileSync(filename));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  let browser;
  try {
    browser = await chromium.launch({ channel:'msedge', headless:true });
    const page = await browser.newPage({viewport:{width:1280,height:900}});
    await require('./insights-fixture-helper.cjs')(page);
    await require('./sql-arrow-fixture.cjs')(page);
    const errors=[]; page.on('pageerror', error=>errors.push(error.stack));
    page.on('dialog', dialog=>dialog.dismiss());
    await page.addInitScript(() => {
      // Every fixture file is a separate immutable native snapshot.
      if (window.parent !== window) return;
      window.__snapshots = {}; window.__tabular = {}; window.__snapshotCount = 0; window.__failSnapshot = false;
      window.__TAURI__ = {
        core:{invoke:async (command,args={},options)=>{
          [command,args]=await window.__sqlArrowFixture(command,args,options);
          if(command==='__sql_arrow_response')return args.bytes;
          if (command==='create_dataset_snapshot' || command==='create_tabular_snapshot') {
            if (window.__failSnapshot) throw new Error('Fixture snapshot write failed');
            const id='snapshot-'+(++window.__snapshotCount), path='C:\\session\\'+id+'.csv';
            const text=args.dataset ? window.TangentDatasets.csv([args.dataset.columns,...args.dataset.rows.map(row=>row.map(cell=>cell.kind==='null'?null:cell.value))]) : args.text ?? window.__snapshots[args.sourcePath] ?? 'name,value\r\nAda,0\r\n';
            window.__snapshots[path]=text; if(args.dataset)window.__tabular[id]=args.dataset; return {id,path,bytes:text.length,tabularId:args.dataset?id:null};
          }
          if (command==='read_file_to_string_native' && window.__failImport) throw new Error('Fixture destination import failed');
          if (command==='read_file_to_string_native') return window.__snapshots[args.path] || 'name,value\r\nAda,0\r\n';
          if (command==='read_launchpad_file') return Array.from(new TextEncoder().encode(window.__snapshots[args.path] || 'name,value\r\nAda,0\r\n'));
          if (command==='pick_launchpad_files') return [];
          if (command==='preview_tabular_import' || command==='import_tabular_file' || command==='import_editor_file') {
            const records=(window.__snapshots[args.path] || 'name,value\r\nAda,0\r\n').trim().split(/\r?\n/).map(row=>row.split(','));
            const dataset={columns:records[0],rows:records.slice(1).map(row=>row.map(value=>({kind:'text',value}))),source:args.path,sheet:null,warnings:[]};
            if(command==='preview_tabular_import')return {...dataset,sheets:[],selectedSheet:null};
            const id='import-'+(++window.__snapshotCount),path='C:\\session\\'+id+'.csv';window.__tabular[id]=dataset;window.__snapshots[path]=window.TangentDatasets.csv(records);return {id,tabularId:id,path,source:args.path,columns:dataset.columns,rowCount:dataset.rows.length,native:command==='import_editor_file'};
          }
          if(command==='open_editor_dataset'){const id='editor-'+(++window.__snapshotCount),dataset=structuredClone(window.__tabular[args.id]);window.__tabular[id]=dataset;return {id,tabularId:id,native:true,columns:dataset.columns,rowCount:dataset.rows.length};}
          if(command==='begin_sql_result'){const id='sql-'+(++window.__snapshotCount);window.__tabular[id]={columns:args.columns,rows:[],source:'SQL',warnings:[]};return id;}
          if(command==='append_sql_result'){const d=window.__tabular[args.id];if(d.rows.length!==args.offset)throw Error('SQL batch out of sequence');d.rows.push(...args.rows);return null;}
          if(command==='abort_sql_result'){delete window.__tabular[args.id];return null;}
          if(command==='finish_sql_result'){const d=window.__tabular[args.id];return {tabularId:args.id,columns:d.columns,rowCount:d.rows.length,native:true};}
          if(command==='read_sql_page'){const d=window.__tabular[args.id];return {rows:d.rows.slice(args.offset,args.offset+args.limit),rowCount:d.rows.length,truncated:false};}
          if(command==='read_editor_page'){const d=window.__tabular[args.id];return {offset:args.offset,rows:structuredClone(d.rows.slice(args.offset,args.offset+args.limit)),rowCount:d.rows.length};}
          if(command==='edit_editor_cell'){window.__tabular[args.id].rows[args.row][args.column]=args.value;return null;}
          if(command==='release_editor_dataset'){delete window.__tabular[args.id];return null;}
          if(command==='snapshot_editor_dataset'){if(window.__failSnapshot)throw new Error('Fixture snapshot write failed');const id='snapshot-'+(++window.__snapshotCount),path='C:\\session\\'+id+'.csv',dataset=structuredClone(window.__tabular[args.id]);window.__tabular[id]=dataset;window.__snapshots[path]=window.TangentDatasets.csv([dataset.columns,...dataset.rows.map(row=>row.map(cell=>cell.kind==='null'?null:cell.value))]);return {id,tabularId:id,path,native:true,columns:dataset.columns,rowCount:dataset.rows.length};}
          if(command==='read_tabular_dataset')return window.__tabular[args.id];
          if(command==='profile_insights'){const d=window.__tabular[args.id];return {headers:d.columns,rowCount:d.rows.length,stats:Object.fromEntries(d.columns.map((name,c)=>[name,window.__fixtureProfile(d.rows.map(row=>row[c].kind==='null'?null:row[c].value),d.rows.length)]))};}
          if(command==='aggregate_insights')return {order:[],groups:{},seriesNames:['Total'],skipped:0,totalGroups:0};
          return null;
        }},
        window:{getCurrentWindow:()=>({onCloseRequested:async()=>()=>{}})},
        webviewWindow:{getCurrentWebviewWindow:()=>({onDragDropEvent:async()=>()=>{}})}
      };
    });
    await page.addInitScript(()=>{if(window.parent!==window)return;document.addEventListener('DOMContentLoaded',()=>{new MutationObserver(()=>{const button=document.querySelector('#tabular-dialog[open] #tabular-accept');if(button&&!button.disabled&&button.textContent==='Import dataset')button.click();}).observe(document.body,{subtree:true,childList:true,attributes:true});});});
    for (const tool of routing.tools) await page.route('**/'+tool.id, route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><script src="tool-workspace.js"></script></head><body><textarea id="edit"></textarea><script>window.boot=Math.random();window.imports=[];window.launchpadImport=async paths=>{window.imports.push(paths);document.getElementById("edit").value=await window.__TAURI__.core.invoke("read_file_to_string_native",{path:paths[0]});};window.tangentCurrentResult=async()=>({text:document.getElementById("edit").value,ext:"csv",label:"Edited rows"});</script></body></html>'}));
    await page.goto('http://127.0.0.1:'+server.address().port+'/launchpad.html');
    await page.evaluate(()=>window.TangentShell.open('data-editor.html',['source.csv']));
    const source=page.frameLocator('#frame-data-editor\\.html');
    await source.locator('#edit').fill('name,value\r\n"Edited, quoted",0\r\n');
    const original = await source.locator('#edit').inputValue();
    await page.evaluate(()=>window.TangentShell.open('sql-studio.html'));
    const occupied=page.frameLocator('#frame-sql-studio\\.html');
    await occupied.locator('#edit').fill('Existing SQL work');
    const existingBoot=await occupied.locator('body').evaluate(()=>window.boot);
    await switchWorkspace(page,'data-editor.html');
    await page.locator('#workspace-open-in').click();
    assert.equal(await page.locator('#open-in-mode').inputValue(),'new');
    await page.locator('[data-transfer-target="sql-studio.html"]').click();
    await page.waitForFunction(()=>document.querySelectorAll('#workspace-panels iframe').length===3 && !document.querySelector('#open-in-dialog').open);
    const copy=page.frameLocator('iframe[data-workspace-id^="sql-studio.html::"]');
    await copy.locator('#edit').waitFor();
    assert.equal(await copy.locator('#edit').inputValue(),original);
    assert.equal(await occupied.locator('#edit').inputValue(),'Existing SQL work');
    assert.equal(await occupied.locator('body').evaluate(()=>window.boot),existingBoot);
    await copy.locator('#edit').fill('Destination edits');
    await page.locator('#shell-home').click();
    await page.locator('[data-tool="sql-studio.html"]').click();
    await page.locator('[data-pick-workspace^="sql-studio.html::"]').click();
    assert.equal(await copy.locator('#edit').isVisible(),true,'tool picker restores the selected copy');
    assert.equal(await page.locator('[data-tool="sql-studio.html"] .tool-open-count').textContent(),'2');
    assert.equal(await page.locator('#workspace-panels iframe').count(),3,'navigation must not create an extra session');
    assert.equal(await source.locator('#edit').inputValue(),original);
    assert.match(await page.locator('#active-workspace-title').textContent(), /Unsaved changes/);
    // Onward transfer uses the edited copy and retains lineage.
    await page.locator('#workspace-open-in').click();
    await page.locator('[data-transfer-target="csv-insights.html"]').click();
    const onward=page.frameLocator('#frame-csv-insights\\.html');
    await onward.locator('#edit').waitFor();
    await page.waitForFunction(()=>document.getElementById('frame-csv-insights.html').contentWindow.document.getElementById('edit').value==='Destination edits');
    const registry=await page.evaluate(()=>window.TangentDatasets.inspect());
    assert.equal(registry.length,1); assert.equal(registry[0].snapshots.length,2);
    assert.equal(registry[0].snapshots[1].parentSnapshotId,registry[0].snapshots[0].id);
    // Replacement requires explicit consent and cancellation preserves its work.
    await switchWorkspace(page,'data-editor.html');
    await page.locator('#workspace-open-in').click(); await page.locator('#open-in-mode').selectOption('replace');
    await page.locator('[data-transfer-target="sql-studio.html"]').click(); await page.locator('#confirm-cancel').click();
    assert.equal(await occupied.locator('#edit').inputValue(),'Existing SQL work');
    await page.locator('#workspace-open-in').click(); await page.locator('#open-in-mode').selectOption('replace');
    await page.locator('[data-transfer-target="sql-studio.html"]').click(); await page.locator('#confirm-accept').click();
    await page.waitForFunction(()=>document.getElementById('frame-sql-studio.html').contentWindow.document.getElementById('edit').value.startsWith('name,value'));
    assert.equal(await occupied.locator('body').evaluate(()=>window.boot),existingBoot);
    // Native snapshot errors are visible and preserve all current data.
    await switchWorkspace(page,'data-editor.html');
    await page.evaluate(()=>window.__failSnapshot=true); await page.locator('#workspace-open-in').click();
    await page.locator('[data-transfer-target="index.html"]').click();
    await page.locator('#open-in-error').filter({hasText:'Fixture snapshot write failed'}).waitFor();
    assert.equal(await source.locator('#edit').inputValue(),original);
    await page.locator('#open-in-cancel').click(); await page.evaluate(()=>window.__failSnapshot=false);
    await page.evaluate(()=>window.__failImport=true); await page.locator('#workspace-open-in').click();
    await page.locator('[data-transfer-target="index.html"]').click();
    await page.locator('#open-in-error').filter({hasText:'Fixture destination import failed'}).waitFor();
    assert.equal(await source.locator('#edit').inputValue(),original);
    await page.locator('#open-in-cancel').click(); await page.evaluate(()=>window.__failImport=false);
    // Use real editor and profiler pages, including committing the active cell edit before capture.
    await page.unroute('**/data-editor.html'); await page.unroute('**/csv-insights.html');
    await page.evaluate(()=>window.TangentShell.open('data-editor.html',['real.csv'],{newWorkspace:true}));
    const realEditor=page.frameLocator('iframe[data-workspace-id^="data-editor.html::"]');
    await realEditor.locator('.grid-cell').filter({hasText:'Ada'}).dblclick();
    await realEditor.locator('.grid-cell input').fill('Real edit, "quoted"');
    await page.locator('#workspace-open-in').click(); await page.locator('[data-transfer-target="csv-insights.html"]').click();
    const realCsv=page.frameLocator('iframe[data-workspace-id^="csv-insights.html::"]');
    await realCsv.locator('#statRows').waitFor({state:'attached'});
    await page.waitForFunction(()=>document.querySelector('#open-in-error').textContent || [...document.querySelectorAll('iframe')].some(f=>f.dataset.workspaceId.startsWith('csv-insights.html::') && f.contentWindow.document.getElementById('workspace')?.style.display==='block'));
    assert.equal(await page.locator('#open-in-error').textContent(),'');
    await realCsv.locator('#workspace').waitFor();
    await page.waitForFunction(()=>[...document.querySelectorAll('iframe')].find(f=>f.dataset.workspaceId.startsWith('csv-insights.html::'))?.contentWindow.document.getElementById('statRows').textContent==='1');
    const csvResult=await realCsv.locator('body').evaluate(()=>window.tangentCurrentResult());
    const csvText=await page.evaluate(id=>{const d=window.__tabular[id];return window.TangentDatasets.csv([d.columns,...d.rows.map(row=>row.map(c=>c.kind==='null'?null:c.value))]);},csvResult.nativeId);
    assert.match(csvText, /"Real edit, ""quoted""",0/);
    // Verify actual module-scoped SQL import, local DuckDB initialization, and result export.
    await page.unroute('**/sql-studio.html');
    const sqlOpened = await page.evaluate(()=>window.TangentShell.open('sql-studio.html',['sql.csv'],{newWorkspace:true}));
    assert.equal(sqlOpened,true,'real SQL import must initialize and mount its file');
    const realSql=page.frameLocator('iframe[data-workspace-id^="sql-studio.html::"]').last();
    await realSql.locator('body').evaluate(()=>window.sqlEditorInstance.setValue('SELECT * FROM sql;'));
    await realSql.locator('#btnRun').click();
    await page.waitForFunction(()=>[...document.querySelectorAll('iframe')].filter(f=>f.dataset.workspaceId.startsWith('sql-studio.html::')).at(-1)?.contentWindow.document.getElementById('resultsCount').textContent.includes('1 rows'));
    const sqlResult=await realSql.locator('body').evaluate(()=>window.tangentCurrentResult());
    assert.ok(sqlResult.nativeId);const sqlText=await page.evaluate(id=>{const d=window.__tabular[id];return window.TangentDatasets.csv([d.columns,...d.rows.map(row=>row.map(c=>c.kind==='null'?null:c.value))]);},sqlResult.nativeId);assert.match(sqlText,/Ada,0/);
    await switchWorkspace(page,'csv-insights.html::',true);
    assert.deepEqual(errors,[]);
    await page.locator('#workspace-open-in').click();
    fs.mkdirSync(path.resolve(__dirname,'../test-results'),{recursive:true});
    await page.screenshot({path:path.resolve(__dirname,'../test-results/open-in-desktop.png')});
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:path.resolve(__dirname,'../test-results/open-in-mobile.png')});
  } finally {if(browser) await browser.close(); server.close();}
}
(async()=>{await registryAndProviders();console.log('PASS: CSV escaping, eight current-result providers, versions, and snapshot lineage');await browserTransfers();console.log('PASS: independent transfers, occupied destinations, cancellation, native errors, and real edited CSV profiling');})().catch(error=>{console.error(error.stack);process.exitCode=1;});
