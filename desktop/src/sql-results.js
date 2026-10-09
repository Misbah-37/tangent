(function(global){
  'use strict';
  const invoke=(command,args,options)=>global.__TAURI__.core.invoke(command,args,options);
  const text=value=>({kind:'text',value:String(value)});
  function decimal(value,scale){
    let digits=String(value),sign='';if(digits[0]==='-'){sign='-';digits=digits.slice(1);}
    if(scale<0)return sign+digits+'0'.repeat(-scale);
    if(!scale)return sign+digits;
    digits=digits.padStart(scale+1,'0');return sign+digits.slice(0,-scale)+'.'+digits.slice(-scale);
  }
  function cell(value,type,vector,index){
    if(value===null||value===undefined)return {kind:'null'};
    if(type.typeId===7)return text(decimal(value,type.scale));
    // Timestamp scalars exposed by Arrow are milliseconds; use the raw integer
    // to retain micro/nanoseconds instead of rounding through a JS Date.
    if(type.typeId===10){
      let local=index,data;for(const chunk of vector.data){if(local<chunk.length){data=chunk;break;}local-=chunk.length;}
      const raw=typeof data.values[local]==='bigint'?data.values[local]:(BigInt(data.values[local*2+1])<<32n)+BigInt(data.values[local*2]>>>0),unit=type.unit;
      const ns=BigInt(raw)*[1000000000n,1000000n,1000n,1n][unit];
      let seconds=ns/1000000000n,fraction=ns%1000000000n;if(fraction<0){seconds--;fraction+=1000000000n;}
      const date=new Date(Number(seconds)*1000);if(!Number.isFinite(date.getTime()))throw Error('Timestamp is outside the supported ISO range.');
      const precision=[0,3,6,9][unit];
      return {kind:'date',value:date.toISOString().slice(0,-5)+(precision?'.'+fraction.toString().padStart(9,'0').slice(0,precision):'')+'Z'};
    }
    if(type.typeId===8){const date=new Date(Number(value));if(!Number.isFinite(date.getTime()))throw Error('Invalid SQL date.');return {kind:'date',value:date.toISOString().slice(0,10)};}
    if(typeof value==='bigint')return text(value);
    if(typeof value==='number')return Number.isFinite(value)?{kind:'number',value}:text(value);
    if(typeof value==='boolean')return {kind:'boolean',value};
    if(typeof value==='string')return text(value);
    if(type.typeId===4||type.typeId===15)return text('0x'+Array.from(value,b=>b.toString(16).padStart(2,'0')).join(''));
    const object=value.toJSON?.()??(value.toArray?Array.from(value.toArray()):value);
    return text(JSON.stringify(object,(_key,v)=>typeof v==='bigint'?v.toString():v));
  }
  async function collect(conn,sql,operation,report,discard=false){
    let staging=null,reader=null,completed=null,total=0;
    const timings=operation.timings;let started;
    try{
      started=performance.now();
      reader=await conn.send(sql);
      await reader.open();
      timings.open+=performance.now()-started;
      if(operation.cancelled)throw new DOMException('Query cancelled','AbortError');
      if(discard){for await(const _batch of reader){if(operation.cancelled)throw new DOMException('Query cancelled','AbortError');}return null;}
      const fields=reader.schema.fields,columns=fields.map(f=>f.name);
      if(!columns.length){for await(const _batch of reader){}return null;}
      started=performance.now();staging=await invoke('begin_sql_result',{columns});timings.store+=performance.now()-started;
      // Arrow's slicing path merges fields with duplicate names; preserve their
      // positional types through the compatibility path.
      const binary=new Set(columns).size===columns.length&&fields.every(field=>[0,2,3,4,5,6,7,8,10,15].includes(field.type.typeId));
      if(binary){
        const arrow=await import('apache-arrow');operation.transport='Arrow binary';
        let parts=[],count=0,estimated=0;
        const rowLimit=Math.max(1,Math.min(16384,Math.floor(131072/columns.length)));
        async function send(table){
          if(operation.cancelled)throw new DOMException('Query cancelled','AbortError');
          let mark=performance.now();const bytes=arrow.tableToIPC(table,'stream');timings.convert+=performance.now()-mark;
          if(bytes.byteLength>4*1024*1024){if(table.numRows<=1)throw Error('A SQL row exceeds the 4 MiB binary transfer limit.');const half=Math.floor(table.numRows/2);await send(table.slice(0,half));await send(table.slice(half));return;}
          mark=performance.now();await invoke('append_sql_arrow',bytes,{headers:{'x-sql-id':staging,'x-sql-offset':String(total)}});timings.store+=performance.now()-mark;total+=table.numRows;timings.batches++;report?.(total);
          mark=performance.now();await new Promise(r=>setTimeout(r,0));timings.yield+=performance.now()-mark;
        }
        async function flushBinary(){if(!count)return;await send(new arrow.Table(reader.schema,parts));parts=[];count=0;estimated=0;}
        const iterator=reader[Symbol.asyncIterator]();
        while(true){
          started=performance.now();const next=await iterator.next();timings.fetch+=performance.now()-started;if(next.done)break;
          for(let offset=0;offset<next.value.numRows;offset+=rowLimit){
            const part=next.value.slice(offset,Math.min(offset+rowLimit,next.value.numRows));
            const bytes=part.data.byteLength;
            if(count&&(count+part.numRows>rowLimit||estimated+bytes>2*1024*1024))await flushBinary();
            parts.push(part);count+=part.numRows;estimated+=bytes;
            if(count>=rowLimit||estimated>=2*1024*1024)await flushBinary();
          }
        }
        await flushBinary();if(operation.cancelled)throw new DOMException('Query cancelled','AbortError');
        started=performance.now();completed=await invoke('finish_sql_result',{id:staging,expected:total});timings.store+=performance.now()-started;staging=null;return completed;
      }
      operation.transport='JSON compatibility';
      let rows=[],size=0;
      async function flush(){if(!rows.length)return;let mark=performance.now();await invoke('append_sql_result',{id:staging,offset:total,rows});timings.store+=performance.now()-mark;timings.batches++;total+=rows.length;rows=[];size=0;report?.(total);mark=performance.now();await new Promise(r=>setTimeout(r,0));timings.yield+=performance.now()-mark;}
      const iterator=reader[Symbol.asyncIterator]();
      while(true){
        started=performance.now();const next=await iterator.next();timings.fetch+=performance.now()-started;if(next.done)break;
        const batch=next.value;let conversionStarted=performance.now();
        const vectors=fields.map((_f,c)=>batch.getChildAt(c));
        for(let r=0;r<batch.numRows;r++){
          if(operation.cancelled)throw new DOMException('Query cancelled','AbortError');
          const row=fields.map((field,c)=>cell(vectors[c].get(r),field.type,vectors[c],r));
          // UTF-16 JSON length * 3 bounds UTF-8 bytes, including quoted strings.
          const bytes=JSON.stringify(row).length*3;
          if(bytes>4*1024*1024)throw Error('A SQL row exceeds the 4 MiB transfer limit. Select fewer columns or smaller fields.');
          if(rows.length&&(size+bytes>1024*1024||rows.length>=2048||(rows.length+1)*columns.length>32768)){timings.convert+=performance.now()-conversionStarted;await flush();conversionStarted=performance.now();}
          rows.push(row);size+=bytes;
        }
        timings.convert+=performance.now()-conversionStarted;
      }
      await flush();if(operation.cancelled)throw new DOMException('Query cancelled','AbortError');
      started=performance.now();completed=await invoke('finish_sql_result',{id:staging,expected:total});timings.store+=performance.now()-started;staging=null;return completed;
    }finally{
      if(staging)await invoke('abort_sql_result',{id:staging}).catch(()=>{});
      if(!completed&&reader)await reader.cancel().catch(()=>{});
    }
  }
  async function run(conn,sql,operation,report){
    operation.timings={plan:0,open:0,fetch:0,convert:0,store:0,yield:0,batches:0};const planStarted=performance.now();
    // DuckDB's tokenizer identifies statement separators outside strings/comments.
    // Its offsets are UTF-8 byte positions, not JS UTF-16 string indices.
    const tokens=await conn.bindings.tokenize(sql),bytes=new TextEncoder().encode(sql),decoder=new TextDecoder();
    const statements=[];let start=0,meaningful=false;
    for(let i=0;i<tokens.offsets.length;i++){
      const offset=tokens.offsets[i];
      if(tokens.types[i]===3&&bytes[offset]===59){if(meaningful)statements.push(decoder.decode(bytes.subarray(start,offset+1)));start=offset+1;meaningful=false;}
      else if(tokens.types[i]!==5)meaningful=true;
    }
    if(meaningful)statements.push(decoder.decode(bytes.subarray(start)));
    operation.timings.plan=performance.now()-planStarted;
    let result=null;
    try{for(let i=0;i<statements.length;i++){
      if(operation.cancelled)throw new DOMException('Query cancelled','AbortError');
      result=await collect(conn,statements[i],operation,report,i<statements.length-1);
    }return result;}finally{operation.measure?.(operation.timings);}
  }
  global.TangentSqlResults={collect:run,cell,decimal};
})(window);
