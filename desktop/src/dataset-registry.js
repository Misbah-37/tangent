(function(global) {
  "use strict";
  const datasets = new Map();
  function csv(rows) {
    return rows.map(row => row.map(value => {
      const s = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
      return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(",")).join("\r\n") + "\r\n";
  }
  function registerSource(paths) {
    const id = crypto.randomUUID();
    datasets.set(id, { id, revision: 0, snapshots: [], sourceNames: paths.map(global.TangentRouting.filename) });
    return id;
  }
  async function capture(provider, datasetId, parentSnapshotId = null, trace = null) {
    await trace?.stage('Prepare current result');
    const output = await provider(trace);
    if (!output || (!output.nativeId && !output.dataset && !output.sourcePath && typeof output.text !== "string")) throw new Error("This tool has no transferable result yet.");
    if (output.dataset) trace?.note(output.dataset.rows.length.toLocaleString() + ' rows × ' + output.dataset.columns.length + ' columns');
    await trace?.stage('Native snapshot request (IPC serialization + Rust snapshot write)');
    const snapshot = output.nativeId ? await global.__TAURI__.core.invoke('snapshot_editor_dataset',{id:output.nativeId}) : output.dataset || (global.TangentTabular && (!output.ext || output.ext === "csv")) ? await global.__TAURI__.core.invoke("create_tabular_snapshot", {dataset:output.dataset || null,text:output.dataset ? null : output.text ?? null,sourcePath:output.dataset ? null : output.sourcePath ?? null}) : await global.__TAURI__.core.invoke("create_dataset_snapshot", {
      text: output.text ?? null, sourcePath: output.sourcePath ?? null, ext: output.ext || "csv"
    });
    if (!snapshot?.path || !snapshot?.id) throw new Error("The native snapshot could not be created.");
    if (snapshot.native) global.TangentTabular.registerNative(snapshot);
    const id = datasetId || registerSource([]);
    const dataset = datasets.get(id);
    const entry = Object.freeze({ ...snapshot, datasetId: id, revision: ++dataset.revision, parentSnapshotId, label: output.label || "Current result", ext: output.ext || "csv" });
    dataset.snapshots.push(entry);
    return entry;
  }
  global.TangentDatasets = { csv, registerSource, capture, inspect: () => [...datasets.values()].map(d => ({ ...d, sourceNames: d.sourceNames.slice(), snapshots: d.snapshots.slice() })) };
})(window);
