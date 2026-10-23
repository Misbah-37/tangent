'use strict';
importScripts('../../data-utils.js');
let rows=[],revision=-1,cache=new Map();
self.onmessage=event=>{const message=event.data;try{
 if(message.type==='data'){rows=message.rows;revision=message.revision;cache.clear();return;}
 if(message.type!=='compute')return;
 if(message.revision!==revision)throw Error('Correlation population changed.');
 if(!['pearson','spearman'].includes(message.method))throw Error('Unknown correlation method.');
 const pairs=[];let computed=0;
 for(let i=0;i<message.columns.length;i++)for(let j=i;j<message.columns.length;j++){
  const names=[message.columns[i],message.columns[j]].sort(),key=JSON.stringify([message.method,...names]);
  if(!cache.has(key)){cache.set(key,TangentData[message.method](rows,names[0],names[1]));computed++;}
  pairs.push({key,result:cache.get(key)});
 }
 self.postMessage({id:message.id,revision,pairs,computed});
}catch(error){self.postMessage({id:message.id,error:error.message});}};
