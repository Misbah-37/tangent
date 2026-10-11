const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context={};vm.runInNewContext(fs.readFileSync('assets/data-utils.js','utf8'),context);const d=context.TangentData;
for(const [text,expected] of [['($125.50)',-125.5],['$1,234.50',1234.5],['1e3',1000],['-25',-25],['0',0],['12abc34',null],['1,25',null],['',null],['NaN',null],['Infinity',null],['( -2 )',null]])assert.equal(d.parseNumber(text),expected,text);
for(const text of ['x,x\n1,2','x,y\n1,2,3','x,y\n1,"unfinished','x,y\n1,bad"quote'])assert.throws(()=>d.parseCsv(text));
const parsed=d.parseCsv('\uFEFF__proto__,constructor\r\nkeep,"line1\nline2"');assert.equal(parsed.data[0].__proto__,'keep');assert.equal(parsed.data[0].constructor,'line1\nline2');assert.equal(d.csvCell('a,b'),'"a,b"');assert.equal(d.csvCell('a\nb'),'"a\nb"');assert.equal(d.csvCell('"'),'""""');
assert.equal(d.dateToken('2026-02-31'),null);assert.equal(d.dateToken('02/29/2025'),null);assert.equal(d.dateToken('2024-02-29'),Date.parse('2024-02-29'));
const rows=[{x:1e12+1,y:1e12+2},{x:1e12+2,y:1e12+4},{x:1e12+3,y:1e12+6}];assert.ok(Math.abs(d.pearson(rows,'x','y').r-1)<1e-12);assert.equal(d.pearson([{x:1,y:7},{x:2,y:7}],'x','y').r,null);assert.equal(d.pearson([{x:1,y:2},{x:NaN,y:3},{x:3,y:6}],'x','y').n,2);
for(const base of ['src/tools/',''])for(const tool of ['finance-dashboard','sql-studio','csv-insights','correlation-matrix','log-analyzer']) {
 const source=fs.readFileSync(base+tool+'.html','utf8');
 for(const m of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g))if(!/src=|application\/ld\+json/.test(m[1]))new vm.Script(m[2].replace(/^\s*import .*?;\s*$/gm,''));
 if(tool==='csv-insights') {
  const workerSrc=vm.runInNewContext(source.slice(source.indexOf('var workerSrc ='),source.indexOf('var workerBlob ='))+'workerSrc',context);
  const run=text=>{let result;const ctx={self:{postMessage:r=>result=JSON.parse(JSON.stringify(r))}};vm.runInNewContext(workerSrc,ctx);ctx.self.onmessage({data:{text}});return result;};
  assert.equal(run('x,x\n1,2').status,'error');assert.equal(run('x,y\n1,2,3').status,'error');assert.equal(run('x,y\n1,"unfinished').status,'error');assert.equal(run('__proto__,x\nkeep,1').data[0].__proto__,'keep');
  const categories=run('label\n__proto__\nconstructor\nnormal').stats.label;assert.equal(categories.distinctCount,3);assert.deepEqual(categories.dist,[1,1,1]);
  const baseline=run('x\n1\n2\n3\n4').stats.x;assert.equal(baseline.mean,2.5);assert.equal(baseline.median,2.5);assert.equal(run('date\n2026-02-31\n2026-03-01').stats.date.invalidDates,1);
 }
}
console.log('PASS: core-data source/generated syntax, strict CSV/amount/date parsing, special fields/categories, numeric profiles, stable and undefined Pearson correlations');
