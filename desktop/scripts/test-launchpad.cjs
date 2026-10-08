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
const esbuild = require('../node_modules/esbuild');
const routing = require('../src/launchpad-routing.js');
const root = path.resolve(__dirname, '../src');

function syntaxChecks() {
  for (const file of fs.readdirSync(root).filter(name => /^((?:launchpad.*|workspace-shell|tool-workspace)\.js|(?:index|data-editor|csv-insights|sql-studio|correlation-matrix|finance-dashboard|log-analyzer|data-extractor)\.html)$/.test(name))) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    if (file.endsWith('.js')) esbuild.transformSync(source, { loader: 'js', target: 'esnext' });
    else for (const match of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      if (/\bsrc\s*=/.test(match[1]) || /type\s*=\s*["'](?:importmap|application\/(?:ld\+)?json)["']/.test(match[1])) continue;
      esbuild.transformSync(match[2], { loader: 'js', target: 'esnext' });
    }
  }
}
function routingChecks() {
  const ids = files => routing.compatible(files).map(tool => tool.id);
  assert.equal(routing.tools.length, 8);
  for (const tool of routing.tools) assert.ok(fs.existsSync(path.join(root, tool.id)), tool.id);
  assert.equal(ids(['C:\\private\\DATA.CSV']).length, 6);
  assert.equal(ids(['DATA.XLSX']).length, 6);
  assert.equal(ids(['DATA.TSV']).length, 6);
  assert.deepEqual(ids(['a.csv', 'b.csv']), ['sql-studio.html', 'finance-dashboard.html']);
  assert.deepEqual(ids(['a.json', 'b.parquet']), ['sql-studio.html']);
  assert.deepEqual(ids(['access.log', 'archive.log.gz']), ['log-analyzer.html']);
  assert.deepEqual(ids(['C:\\folder.with.dots\\page.HTML']), ['data-extractor.html']);
  for (const files of [[], ['bad.pdf'], ['a.csv', 'access.log'], ['', 'a.csv'], [null]]) assert.deepEqual(ids(files), []);
  assert.equal(routing.filename('C:\\private\\odd # & name.csv'), 'odd # & name.csv');
  assert.deepEqual(routing.search('bank statement').map(t => t.id), ['finance-dashboard.html']);
  assert.equal(routing.search('impossible').length, 0);
}
async function adapterChecks() {
  for (const tool of routing.tools) {
    const html = fs.readFileSync(path.join(root, tool.id), 'utf8');
    const match = html.match(/window\.launchpadImport = async function\(paths\) \{([\s\S]*?)\n\};/);
    assert.ok(match, tool.id);
    const calls = [];
    const spy = name => async (...args) => { calls.push([name, ...args]); };
    const context = {
      window: {
        __TAURI__: { core: { invoke: async (...args) => { calls.push(['invoke', ...args]); return '<table></table>'; } } },
        TangentLaunchpad: { nativeFile: async p => ({ name: routing.filename(p) }) },
        tangentImportProfile: spy('handleFile'), launchpadEngineReady: Promise.resolve(), launchpadEditorReady: Promise.resolve()
      },
      conn: {}, loadedSchemas: {}, lastQueryRows: [], activeRemoteDb: null, setTimeout, clearTimeout,
      handleFile: spy('handleFile'),
      loadHygieneFile: spy('loadHygieneFile'),
      loadEditorFile: spy('loadEditorFile'),
      pickFile: spy('pickFile'),
      proceedWithFiles: spy('proceedWithFiles'),
      loadLogFiles: spy('loadLogFiles'),
      Event: class { constructor(type) { this.type = type; } },
      document: { getElementById: id => ({ replaceChildren: () => {}, click: () => calls.push(['click', id]), dispatchEvent: event => calls.push(['event', id, event.type]) }) }
    };
    vm.runInNewContext('window.launchpadImport = async function(paths) {' + match[1] + '\n};', context);
    const paths = tool.maxFiles > 1 ? ['C:\\private\\one.' + tool.formats[0], 'C:\\private\\two.' + tool.formats[0]] : ['C:\\private\\one.' + tool.formats[0]];
    await context.window.launchpadImport(paths);
    assert.equal(context.window._launchpadImporting, false);
    assert.ok(calls.length, tool.id);
    if (tool.id === 'sql-studio.html') assert.equal(calls.filter(c => c[0] === 'handleFile').length, 2);
    if (tool.id === 'finance-dashboard.html' || tool.id === 'log-analyzer.html') assert.deepEqual(calls[0][1], paths);
  }
}
async function handoffChecks() {
  const source = fs.readFileSync(path.join(root, 'launchpad-handoff.js'), 'utf8');
  let removed, received, initialized;
  function contextFor(handoff, fail = false) {
    removed = false; received = undefined;
    const nodes = new Map();
    const node = () => ({ style: { cssText: '' }, setAttribute() {}, append() {}, prepend() {}, replaceChildren() {}, remove() {} });
    const homeTarget = { prepend() {}, closest() { return {}; } };
    const context = {
      Date, Number, JSON, Error, Uint8Array, File: class {},
      location: { pathname: '/index.html' },
      getComputedStyle: () => ({ display: 'flex' }),
      sessionStorage: { getItem: () => JSON.stringify(handoff), removeItem: () => { removed = true; } },
      document: {
        createElement: node, createTextNode: text => text,
        getElementById: id => nodes.get(id),
        querySelector: () => homeTarget,
        body: { appendChild: box => nodes.set(box.id, box) }
      },
      window: {
        TangentRouting: routing,
        launchpadImport: async paths => { if (fail) throw Error('exact import failure'); received = paths; },
        addEventListener: (name, fn) => { if (name === 'DOMContentLoaded') initialized = fn; }
      }
    };
    vm.runInNewContext(source, context);
    initialized();
    return nodes;
  }
  const valid = { target: 'index.html', paths: ['C:\\private\\odd # & name.csv'], createdAt: Date.now() };
  contextFor(valid);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(received, valid.paths); assert.equal(removed, true);
  contextFor({ ...valid, createdAt: Date.now() - 400000 });
  assert.equal(received, undefined); assert.equal(removed, true);
  contextFor({ ...valid, target: 'finance-dashboard.html' });
  assert.equal(received, undefined); assert.equal(removed, true);
  const nodes = contextFor(valid, true);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(removed, false); assert.ok(nodes.has('launchpad-import-error'));
}
async function browserChecks() {
  const playwrightPath = process.env.PLAYWRIGHT_MODULE || 'C:/Users/Babar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
  const { chromium } = require(playwrightPath);
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const filename = path.resolve(root, '.' + pathname);
    if (!filename.startsWith(root + path.sep) || !fs.existsSync(filename) || fs.statSync(filename).isDirectory()) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', filename.endsWith('.js') ? 'text/javascript' : filename.endsWith('.css') ? 'text/css' : 'text/html');
    res.end(fs.readFileSync(filename));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const url = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      window.__paths = []; window.__commands = [];
      window.__TAURI__ = {
        core: { invoke: async command => {
          window.__commands.push(command);
          if (command === 'pick_launchpad_files') return window.__paths;
          if (command === 'read_file_to_string_native') return 'name,value\nAda,10\n';
          if (command === 'process_massive_csv') return JSON.stringify({ path: 'fixture.csv', columns: ['name','value'], preview: [['Ada','10']], null_counts: [0,0], pii_flags: [false,false], total_rows: 1, file_size_mb: 0.01 });
          return null;
        } },
        webviewWindow: { getCurrentWebviewWindow: () => ({ onDragDropEvent: async fn => { window.__nativeDrop = fn; return () => {}; } }) },
        window: { getCurrentWindow: () => ({ onCloseRequested: async fn => { window.__nativeClose = fn; return () => {}; }, close: async () => {}, minimize: async () => {}, toggleMaximize: async () => {} }) }
      };
    });
    for (const tool of routing.tools) {
      await page.route('**/' + tool.id, route => route.fulfill({
        contentType: 'text/html',
        body: '<!DOCTYPE html><html><head><script src="tool-workspace.js"></script></head><body><div class="titlebar">Redundant titlebar</div><div class="app-layout"><div class="sidebar">Redundant navigation</div><main><textarea id="fixture-edit"></textarea><button id="native-read" onclick="window.__TAURI__.core.invoke(\'read_file_to_string_native\')">Native load</button></main></div><script>window.fixtureBoot = Math.random(); window.fixtureImports = []; window.launchpadImport = async paths => { window.fixtureImports.push(paths); document.getElementById("fixture-edit").value = paths.join("|"); };</script><script src="launchpad-routing.js"></script><script src="launchpad-handoff.js"></script></body></html>'
      }));
    }
    await page.goto(url + '/launchpad.html');
    assert.equal(await page.locator('#tool-grid a').count(), 8);
    assert.equal(await page.locator('#workspace-panels iframe').count(), 0, 'tools must load lazily');
    assert.equal(await page.locator('.brand-word').first().textContent(), 'Tangent');
    assert.equal(await page.locator('#tool-search').count(), 0);
    assert.equal(await page.locator('#permanent-tools button').count(), 8);
    assert.equal(await page.locator('#workspace-section').count(), 0);
    await page.locator('#toolkit-toggle').click();
    assert.equal(await page.locator('#shell-sidebar').evaluate(el => el.getBoundingClientRect().width), 64);
    await page.locator('#toolkit-toggle').click();

    await page.locator('#tool-grid a[href="csv-insights.html"]').click();
    const csv = page.frameLocator('iframe[title="CSV Insights workspace"]');
    await csv.locator('#fixture-edit').fill('Keep this edited value');
    const boot = await csv.locator('body').evaluate(() => window.fixtureBoot);
    assert.equal(await page.locator('[data-tool="csv-insights.html"] .tool-open-count').textContent(), '1');
    assert.match(await page.locator('#active-workspace-title').textContent(), /Workspace 1/);
    assert.match(await page.locator('#active-workspace-title').textContent(), /Unsaved changes/);
    await page.locator('[data-tool="csv-insights.html"]').click();
    assert.equal(await csv.locator('body').evaluate(() => window.fixtureBoot), boot);
    assert.equal(await page.locator('[data-tool="csv-insights.html"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await csv.locator('.titlebar').isVisible(), false);
    await page.locator('#shell-home').click();
    await page.locator('#tool-grid a[href="sql-studio.html"]').click();
    const sql = page.frameLocator('iframe[title="SQL Studio workspace"]');
    await sql.locator('#fixture-edit').fill('SELECT * FROM retained_data;');
    await switchWorkspace(page,'csv-insights.html');
    assert.equal(await csv.locator('#fixture-edit').inputValue(), 'Keep this edited value');
    assert.equal(await csv.locator('body').evaluate(() => window.fixtureBoot), boot, 'switching must not reload the frame');
    assert.equal(await page.locator('#workspace-panels iframe').count(), 2);
    await page.locator('#theme-toggle').click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
    assert.equal(await csv.locator('html').getAttribute('data-theme'), 'light');
    await switchWorkspace(page,'sql-studio.html');
    assert.equal(await sql.locator('html').getAttribute('data-theme'), 'light');
    assert.equal(await sql.locator('#fixture-edit').inputValue(), 'SELECT * FROM retained_data;');

    await closeFromMenu(page,'csv-insights.html');
    assert.equal(await page.locator('#workspace-confirm').evaluate(el => el.open), true);
    await page.locator('#confirm-cancel').click();
    assert.equal(await page.locator('#workspace-panels iframe').count(), 2);
    await closeFromMenu(page,'csv-insights.html');
    await page.locator('#confirm-accept').click();
    assert.equal(await page.locator('#workspace-panels iframe').count(), 1);
    await page.locator('#shell-home').click();
    await page.evaluate(() => window.__nativeDrop({ payload: { type: 'enter' } }));
    assert.equal(await page.locator('#global-dropzone').evaluate(el => el.classList.contains('dragover')), true);
    await page.evaluate(() => window.__nativeDrop({ payload: { type: 'drop', paths: ['C:\\private\\one.csv','C:\\private\\two.csv'] } }));
    assert.equal(await page.locator('#route-choices a').count(), 2);
    await page.locator('#route-choices a[href="finance-dashboard.html"]').click();
    const finance = page.frameLocator('iframe[title="Finance Dashboard workspace"]');
    await finance.locator('#fixture-edit').waitFor();
    await page.waitForFunction(() => document.querySelector('iframe[title="Finance Dashboard workspace"]').contentWindow.fixtureImports.length === 1);
    assert.equal(await finance.locator('body').evaluate(() => window.fixtureImports[0].length), 2);
    assert.match(page.url(), /launchpad\.html$/, 'opening a tool must retain the shell URL');
    await page.locator('#shell-home').click();
    await page.evaluate(() => window.__nativeDrop({ payload: { type: 'drop', paths: ['C:\\private\\other.csv'] } }));
    await page.locator('#route-choices a[href="finance-dashboard.html"]').click();
    await page.locator('#confirm-cancel').click();
    assert.equal(await finance.locator('body').evaluate(() => window.fixtureImports.length), 1, 'cancelling replacement must preserve data');
    await page.evaluate(() => { window.__paths = ['C:\\private\\other.csv']; });
    await page.locator('#browse-files').click();
    await page.locator('#route-choices a[href="finance-dashboard.html"]').click();
    await page.locator('#confirm-accept').click();
    await page.waitForFunction(() => document.querySelector('iframe[title="Finance Dashboard workspace"]').contentWindow.fixtureImports.length === 2);

    await page.locator('#shell-home').click();
    await page.evaluate(() => window.__nativeDrop({ payload: { type: 'drop', paths: ['access.log'] } }));
    const logs = page.frameLocator('iframe[title="Log Analyzer workspace"]');
    await logs.locator('#native-read').click();
    assert.equal(await page.locator('#active-workspace-title').getAttribute('data-has-data'), 'true');
    await page.locator('[data-command="close_window"]').click();
    await page.locator('#confirm-cancel').click();
    assert.equal(await page.evaluate(() => window.__commands.includes('close_window')), false);
    await page.evaluate(() => {
      window.__nativeWasPrevented = false;
      window.__nativeClose({ preventDefault() { window.__nativeWasPrevented = true; } });
    });
    await page.locator('#confirm-cancel').click();
    await page.waitForFunction(() => window.__nativeWasPrevented);

    // Exercise an actual desktop tool inside the shell, using a small native import fixture.
    await page.unroute('**/index.html');
    await page.locator('#shell-home').click();
    await page.evaluate(() => window.__nativeDrop({ payload: { type: 'drop', paths: ['fixture.csv'] } }));
    await page.locator('#route-choices a[href="index.html"]').click();
    const hygiene = page.frameLocator('iframe[title="Data Hygiene workspace"]');
    await hygiene.locator('#stat-rows').waitFor();
    await page.waitForFunction(() => document.querySelector('iframe[title="Data Hygiene workspace"]').contentWindow.document.getElementById('stat-rows').textContent === '1');
    assert.equal(await hygiene.locator('.titlebar').isVisible(), false);
    assert.equal(await hygiene.locator('.sidebar').isVisible(), false);
    await page.locator('#shell-home').click();
    await switchWorkspace(page,'index.html');
    assert.equal(await hygiene.locator('#stat-rows').textContent(), '1');

    await page.locator('#shell-home').click();
    await page.evaluate(() => window.__nativeDrop({ payload: { type: 'drop', paths: ['bad.pdf'] } }));
    assert.match(await page.locator('#launchpad-status').textContent(), /No tool can open/);
    await page.evaluate(() => { document.getElementById('launchpad-status').textContent = ''; });
    fs.mkdirSync(path.resolve(__dirname, '../test-results'), { recursive: true });
    await page.locator('#theme-toggle').click();
    await page.locator('#home-panel').evaluate(el => { el.scrollTop = 0; });
    await page.screenshot({ path: path.resolve(__dirname, '../test-results/workspace-shell-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#toolkit-toggle').click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.locator('#home-panel').evaluate(el => { el.scrollTop = 0; });
    await page.screenshot({ path: path.resolve(__dirname, '../test-results/workspace-shell-mobile.png'), fullPage: true });
    assert.deepEqual(errors, []);
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

(async () => {
  syntaxChecks(); routingChecks(); await adapterChecks(); await handoffChecks();
  console.log('PASS: syntax, format routing, import adapters, and handoff lifecycle');
  await browserChecks();
  console.log('PASS: branded shell, persistent panels, close/replace guards, native routing, and real Data Hygiene import');
})().catch(error => { console.error(error); process.exitCode = 1; });

