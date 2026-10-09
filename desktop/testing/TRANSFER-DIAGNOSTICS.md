# Large-file transfer diagnosis — 2026-10-08

This development build includes a temporary green transfer diagnostics panel. It records preparation, typed-cell copying, the combined IPC/native snapshot request, destination loading, elapsed time, UI heartbeat gaps, and errors. It does not record file contents. JavaScript heap measurements, when available, exclude native memory and are sampled rather than exact peaks.

Editor file imports also show diagnostics, from both the launchpad and Load dataset. Stages cover native preview, parsing/snapshot creation, reading the typed dataset across IPC, and building editor arrays/rendering. Import errors remain visible with their available stack or native error text. Transfer imports preserve the surrounding transfer diagnostics instead of replacing them.

Native import channel messages now subdivide parsing/snapshot creation into file read/parsing/normalization, JSON serialization, JSON disk writing, and CSV serialization/disk writing. Completed messages show elapsed milliseconds measured with Rust's monotonic clock. Live stage durations in the panel also include message delivery delay. CSV serialization and disk writing remain a combined stage because the CSV writer streams records to disk. Messages contain stage names and timings only. No file values or paths are sent in diagnostic messages.

## Implemented native editor

The editor now imports into a Rust-owned dataset without JSON snapshot serialization or a whole-dataset IPC response. JavaScript holds grid pages (up to 128 rows each, eight cached pages, with a 32,768-cell response limit). Individual cell edits are sent to Rust. Native snapshots share the immutable base dataset and capture a separate edit overlay, so subsequent source and destination edits stay independent. CSV/TSV/XLSX export operates natively. Closing or replacing an editor releases its writable handle; immutable handoff snapshots remain available for the app session.

SQL Studio inserts native snapshots into DuckDB in bounded Arrow batches with a dataset-wide type schema. Other analysis tools use bounded IPC compatibility reads, but may still retain the complete analysis dataset in JavaScript or a worker. This change does not certify every destination tool's million-row memory usage.

The previous diagnostics below describe the removed editor path, retained as baseline evidence.

## Measurements

The Node synthetic provider probe used 12 columns, repeated string values, and no pre-existing typed-cell cache. It excludes parsing, IPC, Rust, and destination loading, so it is not an end-to-end WebView benchmark.

- Before removing CSV generation, 100,000 rows: typed copy 947 ms; CSV generation 1,040 ms; observed Node heap 150 MB.
- After removal, 100,000 rows: typed copy 1,206 ms; observed Node heap 113 MB.
- After removal, 1,000,000 rows: typed copy 13,128 ms; observed Node heap 1,045 MB.

Timing variation prevents treating these single runs as controlled speed comparisons. The million-row result establishes substantial synchronous preparation work even after the redundant CSV is removed.

## Native reproduction

Run the newly compiled `src-tauri/target/release/tangent-desktop.exe`. The earlier debug executable and packaged testing installer are separate, older artifacts. Load a 100,000-row file, then the original million-row file, and use Open in another tool. Record the diagnostics panel's stages and largest heartbeat gap. A stuck panel's last stage identifies the pending phase; elapsed timers cannot update while JavaScript is blocked. Keep the source workspace open and check destination values before dismissing the panel.

The user's previous actual-file import completed in 238.4 seconds: JSON serialization 64.353 seconds, typed dataset read/IPC 142.43 seconds, observed JavaScript heap 1,410 MB, and largest heartbeat gap 8.69 seconds. These stages are removed from the new editor import path. Total native memory is still proportional to dataset size.

## Optimized synthetic native benchmark

`cargo test --release editor::tests::million_row_benchmark -- --ignored --nocapture` passed. It generated a 110,000,110-byte CSV with 1,000,000 rows and 12 columns, including leading-zero identifiers and repeated text values.

- Native parsing and normalization: 3,053 ms.
- Three 128-row page reads (beginning, middle, end): 1 ms combined.
- CSV snapshot writing after an edit: 3,112 ms.
- JSON snapshots created: zero.

This single synthetic run excludes WebView rendering, IPC delivery, native preview, and destination analysis. It is not an end-to-end speedup measurement against the user's different CSV. The original million-row file must still be retested in the optimized executable.

## Validation

Targeted tabular and Open in browser checks passed, including typed values, independent snapshots, destination selection, cancellation, and native-error handling. Native commands are mocked in those browser checks. The actual million-row native reproduction remains pending. Remove temporary diagnostics after collecting that evidence and verifying the resulting fix.
