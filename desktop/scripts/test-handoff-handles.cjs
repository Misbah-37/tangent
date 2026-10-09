'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { File } = require('node:buffer');
const source = fs.readFileSync(path.resolve(__dirname, '../src/launchpad-handoff.js'), 'utf8');
function context({ snapshot, cached, prepared } = {}) {
  const calls = [];
  const window = {
    parent: {}, addEventListener() {}, _launchpadImporting: Boolean(snapshot), _tabularSnapshot: snapshot,
    TangentRouting: { filename: value => value.split(/[\\/]/).pop() },
    TangentTabular: { metadata: () => cached, prepare: async () => { calls.push('prepare'); return prepared; } },
    __TAURI__: { core: { invoke: async (command) => { calls.push(command); return [97, 44, 98, 10, 49, 44, 50]; } } }
  };
  vm.runInNewContext(source, {window, File});
  return {nativeFile:window.TangentLaunchpad.nativeFile, calls};
}
(async () => {
  for (const native of [true, false]) {
    const {nativeFile,calls} = context({snapshot:{tabularId:'million-row-handle',native}});
    const file = await nativeFile('C:\\session\\result.csv');
    assert.equal(file.tabularId,'million-row-handle');
    assert.equal(file.name,'result.csv');
    assert.equal(file.size,0);
    assert.deepEqual(calls,[], 'Typed transfers must never request CSV bytes');
  }
  const cached = context({cached:{tabularId:'cached'}});
  assert.equal((await cached.nativeFile('data.csv')).tabularId,'cached');
  assert.deepEqual(cached.calls,[]);
  const workbook = context({prepared:{path:'normalized.csv',tabularId:'worksheet'}});
  const normalized = await workbook.nativeFile('data.xlsx');
  assert.equal(normalized.name,'data.csv');
  assert.equal(normalized.sourceName,'data.xlsx');
  assert.equal(normalized.tabularId,'worksheet');
  assert.deepEqual(workbook.calls,['prepare']);
  const ordinary = context();
  const bytes = await ordinary.nativeFile('data.json');
  assert.equal(await bytes.text(),'a,b\n1,2');
  assert.deepEqual(ordinary.calls,['read_launchpad_file']);
  console.log('PASS: native and legacy handles skip full-file IPC; workbook preparation and ordinary file fallback retained');
})().catch(error=>{console.error(error);process.exitCode=1;});
