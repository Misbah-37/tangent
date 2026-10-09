# Native editor validation — 2026-10-08

Use `desktop/src-tauri/target/release/tangent-desktop.exe` for this change. The earlier debug executable and archived testing installer have not been updated by this task.

## Behavior

- Rust owns parsed cells. Editor imports no longer write/read a JSON snapshot or send all cells across IPC.
- The grid requests at most 128 rows per page, caches eight pages, and coalesces viewport requests. Native responses also enforce a 32,768-cell limit.
- Cell edits preserve the previous numeric/boolean conversion rules. Export and transfer wait for pending edits; failed edits remain visible and block exporting a result until resolved or discarded.
- CSV/TSV/XLSX export runs in Rust. XLSX remains values-only with dates written as ISO text and formula-like strings written as text.
- Handoffs share an immutable Rust base dataset and capture independent sparse edits. The CSV projection is written natively for existing analysis engines. Source and destination changes do not alter the captured result.
- SQL Studio consumes bounded Arrow batches with one schema for the dataset, preserving leading-zero text, numeric values, booleans, nulls, and mixed columns.
- Closing/replacing an editor releases its writable native handle. Handoff snapshots are retained for the app session. Multiple distinct datasets and destination analysis engines still consume native or JavaScript memory.

## Evidence

- Native store regression: bounded/out-of-range pages, independent edits and snapshots, shared immutable base, and actual CSV/XLSX output passed.
- Browser million-row simulation: distant scrolling/editing, no complete editor row arrays, bounded cache/requests, pending/failed edits, cancellation, import failure preservation, native result handles, and dataset release passed. Native commands are mocked in this check.
- Actual HTML plus bundled DuckDB: typed transfer, export options, workspace independence, cancellation, offline operation, and appending 4,100 rows across multiple Arrow batches passed. Native commands are mocked.
- Open in regression: independent results, occupied destinations, cancellation, native errors, and real edited CSV profiling passed.
- Optimized native synthetic benchmark (110 MB, 1,000,000 rows, 12 columns): parsing 3,053 ms, three grid pages 1 ms combined, CSV snapshot 3,112 ms, zero JSON snapshots. This is not a WebView end-to-end benchmark.

## Required actual-file retest

Load the original million-row CSV in the optimized executable and record import total, largest heartbeat gap, and observed JavaScript heap. Confirm the row count, first/middle/last rows, a distant cell edit, export/reimport, and Open in to Data Hygiene and SQL Studio. Confirm the source stays unchanged after destination edits. Compare against the previous actual import: 238.4 seconds, 1,410 MB observed JavaScript heap, 8.69-second heartbeat gap.

Other analysis tools still use bounded compatibility reads but may hold a full dataset in JavaScript or a worker. Their million-row memory limits require separate measurement. Native memory remains proportional to input size; this implementation is not a disk-backed unlimited-size store. Temporary diagnostics remain enabled for the actual-file retest and should be removed after verification.
