(function(global) {
  'use strict';
  if (global.parent !== global && global.parent.TangentTabular) {
    global.TangentTabular = global.parent.TangentTabular;
    return;
  }
  const imports = new Map();
  const invoke = (command, args) => global.__TAURI__.core.invoke(command, args);
  const filename = path => String(path).split(/[\\/]/).pop();
  const ext = path => filename(path).split('.').pop().toLowerCase();
  const cancelled = () => Object.assign(new Error('Import cancelled'), {name:'AbortError'});
  function cell(value) {
    if (value == null) return {kind:'null'};
    if (typeof value === 'boolean') return {kind:'boolean', value};
    if (typeof value === 'number' && Number.isFinite(value)) return {kind:'number', value};
    if (Object.prototype.toString.call(value) === '[object Date]') return {kind:'date', value:value.toISOString()};
    return {kind:'text', value:typeof value === 'object' ? JSON.stringify(value,(_,v)=>typeof v === 'bigint' ? String(v) : v) : String(value)};
  }
  function fromRows(columns, rows, source = '') {
    const width = rows.reduce((width,row)=>Math.max(width,row.length),columns.length);
    const names = Array.from({length:width},(_,i)=>i < columns.length ? String(columns[i]) : 'Column ' + (i+1));
    return {columns:names, rows:rows.map(row => names.map((_, i) => cell(row[i]))), source, sheet:null, warnings:[]};
  }
  let modal = null, pending = null;
  function dialog() {
    if (modal) return modal;
    modal = document.createElement('dialog'); modal.id = 'tabular-dialog'; modal.setAttribute('aria-labelledby','tabular-title');
    modal.innerHTML = '<h2 id="tabular-title"></h2><p id="tabular-description"></p><div id="tabular-import-options"><label for="tabular-sheet">Worksheet</label><select id="tabular-sheet"></select><label class="tabular-header-option"><input id="tabular-header" type="checkbox" checked> First row contains column names</label><div id="tabular-preview" tabindex="0" aria-label="Import preview"></div></div><div id="tabular-export-options"><label for="tabular-format">File format</label><select id="tabular-format"><option value="csv">CSV — comma-separated text</option><option value="tsv">TSV — tab-separated text</option><option value="xlsx">Excel workbook (.xlsx)</option></select></div><p id="tabular-note"></p><p id="tabular-error" role="alert"></p><div class="confirm-actions"><button class="btn" id="tabular-cancel" type="button">Cancel</button><button class="btn primary" id="tabular-accept" type="button">Import dataset</button></div>';
    document.body.append(modal);
    modal.querySelector('#tabular-cancel').onclick = () => finish(null);
    modal.addEventListener('cancel', e => { e.preventDefault(); finish(null); });
    return modal;
  }
  function finish(value) {
    if (!pending) return;
    const {resolve, focus} = pending; pending = null; modal.close();
    if (focus?.isConnected) focus.focus({preventScroll:true});
    resolve(value);
  }
  function start() {
    if (pending) throw new Error('Finish the current import or export dialog first.');
    const d = dialog(); const focus = document.activeElement;
    d.querySelector('#tabular-error').textContent = '';
    return {d, promise:new Promise(resolve => { pending = {resolve, focus}; })};
  }
  function table(preview) {
    const box = modal.querySelector('#tabular-preview'); box.replaceChildren();
    const t = document.createElement('table'); const head = document.createElement('thead'); const hr = document.createElement('tr');
    for (const name of preview.columns) { const th = document.createElement('th'); th.textContent = name; hr.append(th); }
    head.append(hr); t.append(head); const body = document.createElement('tbody');
    for (const row of preview.rows.slice(0, 8)) { const tr = document.createElement('tr'); for (const cell of row) { const td = document.createElement('td'); td.textContent = cell.kind === 'null' ? '' : String(cell.value); tr.append(td); } body.append(tr); }
    t.append(body); box.append(t);
    modal.querySelector('#tabular-note').textContent = preview.warnings.join(' ');
  }
  async function review(path, label) {
    const {d, promise} = start(); const accept = d.querySelector('#tabular-accept');
    d.querySelector('#tabular-title').textContent = 'Import dataset';
    d.querySelector('#tabular-description').textContent = label || filename(path);
    d.querySelector('#tabular-import-options').hidden = false; d.querySelector('#tabular-export-options').hidden = true;
    const sheet = d.querySelector('#tabular-sheet'), header = d.querySelector('#tabular-header'); header.checked = true; sheet.replaceChildren();
    let sequence = 0, loaded = null;
    async function refresh() {
      const current = ++sequence; accept.disabled = true; loaded = null; d.querySelector('#tabular-error').textContent = '';
      try {
        const preview = await invoke('preview_tabular_import', {path, sheet:sheet.value || null, firstRowHeader:header.checked});
        if (current !== sequence || !pending) return;
        if (!preview?.columns) throw new Error('The file preview could not be read.');
        if (!sheet.options.length) { for (const name of preview.sheets) sheet.add(new Option(name,name)); sheet.value = preview.selectedSheet || ''; }
        sheet.hidden = preview.sheets.length === 0; sheet.previousElementSibling.hidden = sheet.hidden;
        loaded = preview.columns.length ? {sheet:preview.selectedSheet, firstRowHeader:header.checked} : null; table(preview); accept.disabled = !loaded;
      } catch (err) { if (current === sequence && pending) d.querySelector('#tabular-error').textContent = err.message || String(err); }
    }
    sheet.onchange = refresh; header.onchange = refresh;
    accept.textContent = 'Import dataset'; accept.onclick = () => { if (loaded) finish(loaded); };
    d.showModal(); d.querySelector('#tabular-cancel').focus(); refresh();
    const options = await promise; ++sequence;
    if (!options) throw cancelled();
    const result = await invoke('import_tabular_file', {path, ...options});
    if (!result?.path || !result?.tabularId) throw new Error('The imported dataset could not be created.');
    result.source = label || filename(path); imports.set(result.path, result);
    return result;
  }
  async function prepare(path, options = {}) {
    if (imports.has(path)) return imports.get(path);
    if (ext(path) === 'csv' && !options.review) return {path, source:path};
    if (!['csv','tsv','xlsx'].includes(ext(path))) throw new Error('Use CSV, TSV, or XLSX.');
    return review(path, options.label);
  }
  async function prepareFile(file) {
    if (!['tsv','xlsx'].includes(ext(file.name))) return file;
    const path = await invoke('stage_tabular_file',{name:file.name, bytes:Array.from(new Uint8Array(await file.arrayBuffer()))});
    const result = await prepare(path, {label:file.name});
    const bytes = await invoke('read_launchpad_file',{path:result.path});
    const normalized = new File([new Uint8Array(bytes)], file.name.replace(/\.[^.]+$/,'.csv'));
    normalized.tabularId = result.tabularId; normalized.sourceName = file.name;
    return normalized;
  }
  async function data(result) { return result?.tabularId ? invoke('read_tabular_dataset',{id:result.tabularId}) : null; }
  async function exportResult(output, name = 'dataset.csv') {
    const {d, promise} = start();
    d.querySelector('#tabular-title').textContent = 'Export data';
    d.querySelector('#tabular-description').textContent = output.label || 'Current dataset';
    d.querySelector('#tabular-import-options').hidden = true; d.querySelector('#tabular-export-options').hidden = false;
    const format = d.querySelector('#tabular-format'); format.value = 'csv';
    const note = () => { d.querySelector('#tabular-note').textContent = format.value === 'xlsx' ? 'Creates a new, single-sheet workbook with values only. Original formulas and formatting are not retained. Dates are exported as ISO text. Text identifiers retain leading zeros.' : 'Text export does not retain cell types. Empty cells and empty text both appear blank. Spreadsheet programs may interpret formula-like text when opening CSV or TSV.'; };
    format.onchange = note; note(); const accept = d.querySelector('#tabular-accept'); accept.textContent = 'Choose save location'; accept.disabled = false; accept.onclick = () => finish(format.value);
    d.showModal(); format.focus(); const selected = await promise;
    if (!selected) return null;
    return invoke('export_tabular_result',{dataset:output.dataset || null, text:output.dataset ? null : output.text ?? null, sourcePath:output.dataset ? null : output.sourcePath ?? null, format:selected, defaultName:name});
  }
  global.TangentTabular = {prepare, prepareFile, data, fromRows, cell, exportResult, metadata:path => imports.get(path)};
})(window);
