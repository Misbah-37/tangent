# Native CSV Insights — 2026-10-09

Release executable rebuilt successfully on 2026-10-09 at 12:22 IST: `src-tauri/target/release/tangent-desktop.exe`, 49,371,136 bytes. All frontend/native source inputs predate the rebuilt executable. SHA-256: `7E1BDF3B56DBC07707AD88FBA750D63244CCA7B8551F21C31EB4855292073B7F`. This updates the local executable; the older testing installer has not been repackaged.

## Implemented

CSV Insights opens native dataset sessions for desktop file-picker imports, launchpad path imports and typed handoffs. Legacy typed snapshots are read by Rust, rather than returned as whole datasets to JavaScript. The editor's immutable base and captured edit overlay are shared; filtering uses native row-index views. Subsequent source edits remain independent.

- Native profiling computes column statistics and distributions. Categorical summaries retain complete distinct counts and send only the existing top-200 detailed-chart policy. Numeric/date profiles retain their discrete/histogram policies.
- Global text/column filters and chart drill-downs create native views. The raw grid requests at most 100 rows, further reduced by the 32,768-cell response limit. Zero and false remain visible in the grid.
- Native chart aggregation supports sum, average, count, distinct, min, max and median, grouped series and date bins. It returns the existing top 50 groups, with the complete group count for the truncation note. An excessive series/label cross-product produces a visible error instead of an unlimited chart response.
- Exports and Open in use the selected native view. CSV/TSV/XLSX export and immutable handoff snapshots reuse the native editor writer and snapshot code.
- Comparison computes means natively, using parsed CSV/workbook cells. Quoted CSV fields no longer pass through the previous naive comma/newline splitting. The comparison modal retains the original chart canvas so later charts still work.
- Replaced filters/drill-down views and closed/replaced datasets release their workspace handles. Pending view operations are settled before releasing the dataset.
- Desktop imports keep the green diagnostics panel for the laptop retest. Finished diagnostics are no longer considered active, preventing a cancelled import's panel from being moved over a later dialog's buttons.
- Auto-Profiler imports defer Manual Explorer aggregation until its tab is opened. Unchanged chart requests share one cached native result, with separate copies for rendering. Changing the dataset view or chart settings triggers a new calculation.
- Categorical profiling selects the top 200 entries before sorting; chart aggregation computes group magnitude once and selects the top 50 before sorting. Existing tie order, full distinct/group counts and Other totals are preserved. Profiling borrows text cells instead of cloning them for token inspection.

Chart rendering, colors, tooltips, resizing, zoom, template controls, pivot and PNG export remain in JavaScript. The browser-only CSV fallback still uses the existing worker; use the desktop **Load dataset** button or native file-drop routing for large files. Browser-only TSV/XLSX staging also retains its existing whole-file staging path and needs separate shared-import hardening.

## Validation

- `cargo test --release insights::tests -- --nocapture`: profile parity with 13 fixtures generated from the existing worker, token/date rules, all seven grouped aggregations, typed distinct values and missing/non-numeric handling.
- `cargo test --release editor::tests::bounded_pages_and_independent_edits -- --nocapture`: bounded pages, independent edits, filtered view row mapping, and native CSV/XLSX writers.
- `node scripts/test-native-insights.cjs`: actual Insights page with mocked native IPC and a million-row handle; bounded pages, slicing/clear, native output, chart requests, comparison, retained canvas, bounded details and release. No million-row JavaScript fixture array is created.
- `node scripts/test-tabular.cjs`: actual tool pages, worksheet/header options, typed imports, editor edits, transfers, cancellation, browser staging and real offline DuckDB.
- `node scripts/test-open-in.cjs`: independent workspaces, snapshot lineage, destination errors/cancellation, real editor-to-Insights transfer and real SQL import.

Optimized native stress test:

`cargo test --release insights::tests::million_row_profile_and_chart -- --ignored --nocapture`

Synthetic input: 1,000,000 native rows with 1,000,000 distinct customer strings and numeric amounts.

| Operation | Previous run | Optimized run | Serialized summary |
| --- | ---: | ---: | ---: |
| Profile the customer column | 3,840 ms | 2,317 ms | 4,766 bytes |
| Aggregate 1,000,000 customer groups, return top 50 | 13,075 ms | 7,747 ms | 2,830 bytes |

These timings exclude file parsing, the other columns, IPC and UI rendering. They are not an end-to-end WebView benchmark or a peak-memory measurement. Rust still holds the parsed dataset, and high-cardinality counts/groups use native memory. The app is not yet certified for every file width/string size or every destination tool.

The optimized run is a single measurement on this machine, not a controlled hardware comparison. Targeted Rust tests and the actual-page native Insights test passed after these optimizations, including deferred chart calculation and reuse of unchanged chart requests. Open-in regression checks also passed. Manual Explorer still incurs its first aggregation when opened; deferred work is excluded from initial Auto-Profiler loading.

## Laptop retest

2026-10-09 user retest: million-row editor import completed in 7.2 seconds (largest UI heartbeat gap 0.11 seconds); Editor to Insights completed in 21.3 seconds (gap 0.13 seconds). Native profiling took 17.57 seconds; first grid/chart-summary preparation took 0.14 seconds; snapshot preparation took 3.49 seconds. The user reported no problems after checking Manual Explorer, filtering and export. These are user-observed results for this dataset, not full-suite certification. The reported 2 MB JavaScript heap excludes total app/native memory.

Open the rebuilt release executable, load the same million-row CSV into Tabular Editor, then use Open in another tool to open CSV Insights. Record total transfer time and diagnostics, check the raw grid and a chart, slice a column, clear the slice, export, and open the filtered result in another tool. Also try importing directly through Insights' Load dataset button. Keep the original input file and needed exports before closing workspaces.

Finance Dashboard, unrestricted SQL result materialization, source-path snapshot JSON serialization and the other targeted hardening items remain listed in `LARGE-DATA-AUDIT.md`.
