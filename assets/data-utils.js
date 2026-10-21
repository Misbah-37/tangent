/* Shared local parsing and output helpers for the browser data tools. */
(function (root) {
  'use strict';
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function parseNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    let text = String(value ?? '').trim();
    const accounting = text.startsWith('(') && text.endsWith(')');
    if (accounting) text = text.slice(1,-1).trim();
    text = text.replace(/^[$£€]\s*/, '').replace(/\s*[$£€]$/, '');
    if (!/^[+-]?(?:[0-9]+|[0-9]{1,3}(?:,[0-9]{3})+|[.][0-9]+)(?:[.][0-9]+)?(?:[eE][+-]?[0-9]+)?$/.test(text)) return null;
    if (accounting && /^[+-]/.test(text)) return null;
    const result = Number(text.replace(/,/g, '')) * (accounting ? -1 : 1);
    return Number.isFinite(result) ? result : null;
  }
  function csvCell(value) {
    const text = String(value ?? '');
    return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  }
  function parseCsv(text) {
    text = String(text).replace(/^\uFEFF/, '');
    const records = []; let row = [], field = '', quoted = false, closed = false, started = false;
    function finishField() { row.push(field); field = ''; closed = false; started = false; }
    function finishRow() { finishField(); if (row.length > 1 || row[0].trim() !== '') records.push(row); row = []; }
    for (let i=0;i<text.length;i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"') {if (text[i+1] === '"') {field += '"'; i++;} else {quoted = false; closed = true;}}
        else field += c;
        continue;
      }
      if (c === ',') {finishField(); continue;}
      if (c === '\r' || c === '\n') {if (c === '\r' && text[i+1] === '\n') i++; finishRow(); continue;}
      if (closed) throw new Error('Unexpected character after closing CSV quote.');
      if (c === '"') {if (started) throw new Error('Unexpected quote in CSV field.'); quoted = true; started = true;}
      else {field += c; started = true;}
    }
    if (quoted) throw new Error('Unterminated CSV quote.');
    if (started || closed || field || row.length) finishRow();
    if (!records.length) throw new Error('CSV is empty.');
    const headers = records.shift();
    if (headers.some(h => !h.trim())) throw new Error('CSV column names cannot be empty.');
    if (new Set(headers).size !== headers.length) throw new Error('Duplicate CSV column names must be renamed.');
    const data = records.map((values,i) => {
      if (values.length !== headers.length) throw new Error('CSV record ' + (i+2) + ' has ' + values.length + ' fields; expected ' + headers.length + '.');
      return Object.fromEntries(headers.map((h,j) => [h,values[j]]));
    });
    return {headers,data};
  }
  function dateToken(value) {
    const text = String(value).trim();
    let year, month, day;
    const iso = text.match(/^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})(?:[T ][0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?)?$/);
    const slash = text.match(/^([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{2,4})$/);
    if (iso) {year=Number(iso[1]);month=Number(iso[2]);day=Number(iso[3]);}
    else if (slash) {month=Number(slash[1]);day=Number(slash[2]);year=Number(slash[3]);if(year<100)year+=2000;}
    else return null;
    const date = new Date(0); date.setUTCFullYear(year,month-1,day); date.setUTCHours(0,0,0,0);
    if (date.getUTCFullYear()!==year || date.getUTCMonth()!==month-1 || date.getUTCDate()!==day) return null;
    const timestamp = Date.parse(iso ? text : year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0'));
    return Number.isFinite(timestamp) ? timestamp : null;
  }
  function pearson(rows, xCol, yCol) {
    let n=0, meanX=0, meanY=0, sx=0, sy=0, covariance=0;
    for (const row of rows) {
      const x=row[xCol], y=row[yCol];
      if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) continue;
      n++; const dx=x-meanX, dy=y-meanY;
      meanX+=dx/n; meanY+=dy/n;
      sx+=dx*(x-meanX); sy+=dy*(y-meanY); covariance+=dx*(y-meanY);
    }
    if (n<2 || sx<=0 || sy<=0) return {r:null,n};
    const r=(covariance/Math.sqrt(sx))/Math.sqrt(sy);
    return {r:Number.isFinite(r)?Math.max(-1,Math.min(1,r)):null,n};
  }
  function spearman(rows,xCol,yCol) {
    // Delete missing pairs before assigning ranks; ties receive average ranks.
    const pairs=rows.filter(row=>typeof row[xCol]==='number'&&Number.isFinite(row[xCol])&&typeof row[yCol]==='number'&&Number.isFinite(row[yCol]));
    function ranks(column){
      const sorted=pairs.map((row,index)=>({value:row[column],index})).sort((a,b)=>a.value-b.value);
      const result=new Array(sorted.length);
      for(let start=0;start<sorted.length;){let end=start+1;while(end<sorted.length&&sorted[end].value===sorted[start].value)end++;
        const rank=(start+1+end)/2;for(let i=start;i<end;i++)result[sorted[i].index]=rank;start=end;}
      return result;
    }
    const x=ranks(xCol),y=ranks(yCol);
    return pearson(x.map((value,i)=>({x:value,y:y[i]})),'x','y');
  }
  root.TangentData = Object.freeze({escapeHtml,parseNumber,csvCell,parseCsv,dateToken,pearson,spearman});
})(globalThis);
