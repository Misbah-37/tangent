'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
function worker(file){const html=fs.readFileSync(file,'utf8'),start=html.indexOf('var workerSrc = '),end=html.indexOf('var workerBlob',start);if(start<0||end<0)throw Error('Worker source markers missing');const expression=html.slice(start+'var workerSrc = '.length,end).trim().replace(/;$/,'');return vm.runInNewContext(expression);}
const web=worker(path.join(root,'src/tools/csv-insights.html')),desktop=worker(path.join(root,'desktop/src/csv-insights.html'));
const a={self:{}},b={self:{}};vm.runInNewContext(web,a);vm.runInNewContext(desktop,b);
const columns=[[],['1'],['1','2'],['1','2','3'],Array.from({length:100},(_,i)=>String(i-50)),['001','2','3','4','5','6','oops',null],['Alpha','alpha','Beta','Alpha','Beta',' beta ','',' ','Ω','é'],Array.from({length:250},(_,i)=>'customer-'+i),['2026-10-08','2026-10-09','2026-10-10',null],['true','false',true,false,0,'0',''],['"quoted",\nline','<tag>','日本語','line\nnext'],['-2.5','+3.2','1e2','.5','-0','12x','']];
columns.push(['2026-02-31','2026-03-03','2026-03-04']);
const fixtures=columns.map((values,i)=>{
 const expected=JSON.parse(JSON.stringify(b.classifyAndProfile(values,values.length)));
 // The existing detailed chart already limits categorical output to 200 bars.
 if(expected.type==='categorical'){expected.fullLabels=expected.fullLabels.slice(0,200);expected.fullDist=expected.fullDist.slice(0,200);}
 return {name:'column-'+i,dataset:{columns:['value'],rows:values.map(v=>[{kind:v==null?'null':typeof v==='number'?'number':typeof v==='boolean'?'boolean':'text',...(v==null?{}:{value:v})}])},expected};
});
const directory=path.join(root,'desktop/scripts/fixtures');fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(path.join(directory,'insights-profiles.json'),JSON.stringify(fixtures,null,2)+'\n');
console.log('Generated '+fixtures.length+' desktop worker parity fixtures; web worker also parsed successfully.');
