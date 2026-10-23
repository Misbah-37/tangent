/* Explicitly choose a table header when a statement has introductory records. */
(() => {
  const dialog = document.createElement('dialog');
  dialog.className = 'finance-import-dialog';
  dialog.innerHTML = '<h2>Where do transactions begin?</h2><p>This CSV could not be read with its first record as the header. Statements can include introductory information before the transaction table. Choose the column-header record; only records after it will be imported.</p><label>Column-header record<select id="financeHeaderRecord"></select></label><p>Record numbers include blank records; quoted multiline fields count as one record. Preview limited to the first 65 records.</p><div class="finance-import-preview"></div><p class="finance-import-error" role="alert"></p><div class="finance-import-actions"><button type="button" data-import-cancel>Cancel</button><button type="button" data-import-confirm>Use this header</button></div>';
  document.body.append(dialog);
  const select = dialog.querySelector('select');
  const preview = dialog.querySelector('.finance-import-preview');
  const error = dialog.querySelector('[role="alert"]');
  let finish = null, records = [];
  const nonblank = row => row.some(cell => String(cell).trim() !== '');
  function cancel() {
    if (finish) { const resolve = finish; finish = null; resolve(null); }
    if (dialog.open) dialog.close();
    records = []; preview.replaceChildren();
  }
  dialog.querySelector('[data-import-cancel]').addEventListener('click', cancel);
  dialog.addEventListener('cancel', event => { event.preventDefault(); cancel(); });
  dialog.querySelector('[data-import-confirm]').addEventListener('click', () => {
    const index = Number(select.value);
    try {
      const header = records[index];
      if (!header || !nonblank(header)) throw Error('Choose a nonempty column-header record.');
      const table = records.slice(index).filter(nonblank);
      // Retain strict width, quote, unique-name and nonempty-header validation.
      const parsed = TangentData.parseCsv(table.map(row => row.map(TangentData.csvCell).join(',')).join('\r\n'));
      if (!parsed.data.length) throw Error('No transaction records follow this header.');
      const resolve = finish;
      finish = null;
      dialog.close();
      records = []; preview.replaceChildren();
      resolve?.({...parsed, headerRecord: index + 1, skippedRecords: index});
    } catch (e) { error.textContent = e.message; }
  });
  async function read(text) {
    cancel();
    try { return {...TangentData.parseCsv(text), headerRecord: 1, skippedRecords: 0}; }
    catch (initialError) {
      if(typeof window.Papa?.parse!=='function')throw Error('CSV preview library could not load. Reload the page before choosing an introductory header.');
      const result = Papa.parse(String(text).replace(/^\uFEFF/, ''), {header: false, delimiter: ',', skipEmptyLines: false});
      if (result.errors.length) throw Error(result.errors[0].message);
      records = result.data;
      if (!records.length) throw initialError;
      select.replaceChildren(); preview.replaceChildren(); error.textContent = '';
      const table = document.createElement('table');
      const tbody = document.createElement('tbody');
      let suggested = 0;
      records.slice(0, 65).forEach((row, index) => {
        select.add(new Option('Record ' + (index + 1) + ' · ' + row.length + ' fields', String(index)));
        const tr = document.createElement('tr');
        const number = document.createElement('th'); number.textContent = String(index + 1); tr.append(number);
        row.slice(0, 12).forEach(value => {
          const td = document.createElement('td');
          const string = String(value); td.textContent = string.slice(0, 180) + (string.length > 180 ? '…' : ''); tr.append(td);
        });
        tbody.append(tr);
        const names = row.map(value => String(value).trim().toLowerCase());
        if (!suggested && names.some(n => /date/.test(n)) && names.some(n => /amount|value/.test(n))) suggested = index;
      });
      table.append(tbody); preview.append(table); select.value = String(suggested);
      return new Promise(resolve => { finish = resolve; dialog.showModal(); select.focus(); });
    }
  }
  window.FinanceCsvImport = Object.freeze({read, cancel});
})();
