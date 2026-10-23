# SQL Studio local runtime

Pinned DuckDB-Wasm1.32.0 (DuckDB corev1.4.3), with local Apache Arrow17.0.0,
flatbuffers24.3.25 and tslib2.6.3. EH and MVP bundles are included; the browser
fetches the selected bundle. Runtime payload inventory: 83,053,707 bytes.

Exact package tarballs were verified against npm SHA512 integrity before selected
assets were extracted. ESM snapshots from exact jsDelivr versions have dependency
imports rewritten to local files and source-map comments removed. The manifest
records upstream and final hashes. It is an audit manifest, not browser-enforced SRI.
No source tarballs are shipped in this directory.

Official signed JSON and Parquet extensions are mirrored at
extensions/v1.4.3/wasm_eh and wasm_mvp. SQL Studio explicitly installs these from
this site's repository before enabling imports. The default extension repository
is unchanged for other extensions explicitly requested by user SQL. Signature
verification has not been disabled. Exact extension bytes and HTTPS sources are
recorded in manifest.json. Licenses and notices are in licenses/; DuckDB core
MIT terms cover the bundled core extensions.

Startup and normal CSV/JSON/Parquet imports require only files from this site.
This is not a universal offline promise: the site must be served, and user SQL
can request remote data or additional extensions. Retained Arrow results and CSV
Blob exports still consume memory.

The preparation script and download provenance are in task319 evidence. The
initial preparation script covers package assets; extension assets and core license
were subsequently downloaded from the exact manifest URLs with curl.exe --fail
--location. Verify every final asset against manifest.json before release. Do not
regenerate ESM snapshots without reviewing any changed upstream/final hashes.
