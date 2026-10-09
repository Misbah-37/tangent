'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
module.exports=async function install(page){
 const html=fs.readFileSync(path.resolve(__dirname,'../src/csv-insights.html'),'utf8');const start=html.indexOf('var workerSrc = '),end=html.indexOf('var workerBlob',start);const source=vm.runInNewContext(html.slice(start+'var workerSrc = '.length,end).trim().replace(/;$/,''));
 await page.addInitScript(source=>{if(window.parent===window)window.__fixtureProfile=new Function('self',source+';return classifyAndProfile;')({});},source);
};
