# SQL Studio large-result plan — 2026-10-09

Status: local result streaming, native paging/export/handoff and bounded chart previews implemented with user approval. Release build and laptop retest tracked below. Remote streaming remains a separate stage.

Release executable rebuilt successfully at 16:50:12 IST on 2026-10-09: desktop/src-tauri/target/release/tangent-desktop.exe, 49,704,960 bytes, SHA-256 0F3FFBBA85BF5B54F8484285DA1AEA4CCC083ECB6C2891DA1DB9F4CEFE3388B8. Decompressed the generated Tauri assets and verified the SQL streaming script matches the tested source exactly; the bundled SQL HTML includes the native result path. Build completed in 5m26s with five existing warnings. Laptop retest remains pending.

## Feature map

Read the web SQL source and desktop result/import/history/chart/export handlers, plus the Rust remote-query command. Preserve CSV/JSON/Parquet mounting, safe table-name normalization, schema display, SQL execution, null and BigInt display, query persistence and complete CSV export from the web baseline. Desktop adds offline DuckDB bundles, Monaco/autocomplete, multiple tables, native CSV/TSV/XLSX handles and import review, table close/Peek, history (50 entries), named saved queries, paged results, fullscreen/clear, bar/line/doughnut charts, shared format export, workspace handoff and remote database connections.

At source review, local Run and Peek converted the complete Arrow result into JavaScript rows. Pagination limited only DOM rendering. Charts mapped all results into additional arrays; Open in constructed both a typed dataset and CSV text. Remote queries fetched all rows in Rust and serialized a complete JSON response. Cancel displayed an explanatory alert rather than interrupting execution. These findings defined the work below.

## Proposed architecture

Keep local execution in the existing DuckDB-Wasm worker. Do not introduce a Rust SQL engine as an incidental performance change. Retain query results in the engine and fetch metadata plus bounded pages into JavaScript. Evaluate the installed worker's streaming/result APIs before choosing materialization; paging must not reexecute the user's query or repeat side effects. Preserve statements, empty results, SQL errors, output ordering and column types. Never silently append LIMIT to a user's query.

JavaScript owns editor, schema/history controls, page state, progress/errors and chart configuration. Preview pages need row and byte bounds, safe text rendering and visible long-field truncation. Export retains full values. Preserve BigInt/decimal precision, nulls, dates, duplicate aliases and quoted/multiline text through typed metadata rather than inferring columns from the first object row.

Rust owns local output writes and native handoff sessions. Stream bounded Arrow/typed result batches into a staging session/file; publish only after successful completion. CSV/TSV/XLSX export and Open in must include all result rows, with independent snapshots and resource cleanup. Format-specific limits must be explicit. Preserve the prior result on query/export failure and ignore stale page responses.

Charts must not send a million points to the renderer. Offer an explicit aggregation or clearly labeled preview/point limit; keep query-result totals and full exports unchanged. Validate the existing chart behavior on small results before extending large-result options.

Remote results require a separate Rust streaming/session path replacing fetch_all plus full JSON. Preserve remote types and errors; distinguish database network access from local-file processing in UI copy. Query cancellation must be verified against the installed local API and remote driver; do not label a control Cancel if it only hides progress. Confirm interruption behavior and preservation of mounted tables before promising it.

## Validation and rollout

Start with local Run/Peek, bounded paging and complete native export/handoff; then bounded charts and remote streaming. Compare small golden results with the current engine. Test a million-row SELECT, joins/aggregations, empty output, errors, multiple statements/side effects, precision/null/date cases, long Unicode and hostile HTML, rapid page changes, source/destination closure and failed transfers. Reopen exports and compare row counts and values. Record UI heartbeat, IPC sizes, duration and total process memory separately. UI heap alone is not a total-memory measurement.

The user approved implementation after this plan and the local-first rollout were discussed.

## Implemented local path

Installed DuckDB supports conn.send and cancelSent. Arrow readers must be opened before reading their schema. The PendingQuery API accepts only one statement: use DuckDB's tokenizer with UTF-8 offsets to separate statements outside strings/comments, execute each once in order, drain intermediate outputs, and retain the final result. This does not wrap scripts in a transaction or roll back earlier side effects after a later error.

The worker streams results through sql-results.js into a staging store in Rust (sql_results.rs). Batches are limited to 2,048 rows, 32,768 cells and a conservative JSON byte budget. Native staging validates order, shape and finite numeric cells; only a completed stream becomes an editor session. Errors/cancellation abort staging and retain the previous result. Query execution remains in DuckDB; the completed result resides in native memory rather than keeping a second complete JavaScript array. DuckDB inputs and the native output still occupy memory: this is not a disk-backed, unlimited-size engine.

Run and Peek use this path. Preview pages are at most 100 rows, reduced for wide results; Rust clips long preview fields with a per-page character budget. Full native values remain available to existing CSV/TSV/XLSX export and independent handoff snapshots. The UI shows a truncation note. Page generations reject stale responses. Result/schema/saved-query text uses textContent, and duplicate result names use positional values.

BigInt values and exact decimals are retained as text to avoid the native f64 precision limit. Timestamps retain the Arrow unit's precision as ISO text; dates use ISO dates, binary uses hexadecimal and nested values use JSON text. Shared value-only export rules and Excel limits still apply. Charts request a maximum of 1,000 rows (fewer for wide results), explicitly label the preview and suggest GROUP BY for aggregation. Export always uses all result rows.

Local cancellation calls cancelSent and stops batch ingestion, discarding partial staging. Workspace closure and table/connection replacement are guarded during execution. Completed sessions are released on replacement, Clear and workspace close. Remote queries still use fetch_all/full JSON; their nonfunctional Cancel control is hidden. Direct CSV/JSON/Parquet mounting still uses the existing whole-file WebView buffer; native-handle transfers avoid that input copy. These remaining input/remote memory costs are not fixed or claimed safe by this result-streaming stage.

## Passed checks

- Rust targeted staging test: sequence/shape validation, incomplete finish rejection, duplicate column preservation, exact text/null/number cells and abort cleanup.
- Actual SQL page with real offline DuckDB and mocked native IPC: one million result rows with checked order and checksum; bounded DOM/IPC/chart; full-result native provider/export; exact BigInt, scaled decimal and microsecond timestamp, including negative epoch; hostile HTML; empty/error results; multi-statement execution once; semicolons in Unicode strings/comments; duplicate aliases; Peek leaves editor unchanged; stale page suppression; cancellation and subsequent-query recovery.
- Largest measured test batch: 2,048 rows, 4,096 cells and 141,313 JSON bytes (the million-row test is two columns). This is not a WebView process-memory or real Tauri IPC benchmark.
- Shared actual-page tabular regressions: six-tool XLSX/TSV routing and review, typed editor changes, real DuckDB, SQL/native handoffs, export options and cancellation. Open-in regression also passed.
- Inline SQL scripts and sql-results.js syntax parsed successfully. Native build retains five existing unrelated compiler warnings.

Laptop retest: open the million-row CSV in Tabular Editor and use Open in SQL Studio (the native-handle import route), run SELECT * against its displayed table name, page results, cancel another large query, export/reopen and confirm every row, then Open in Editor/Insights. Compare a GROUP BY query with known expected counts. Record diagnostics and total process memory separately. Test direct file imports separately because their existing whole-file buffer path remains. No installer update or push is included.

## Laptop result and timing refinement

The user confirmed all rows survived the million-row query export. Tabular Editor → SQL Studio transfer completed in 37.9 seconds, with 32.76 seconds in the destination import stage, a 0.43-second largest UI heartbeat gap and 70 MB observed JavaScript heap. Query completed in 38.2 seconds, with a 0.18-second heartbeat gap and 64 MB observed JavaScript heap. Neither heap figure measures total process memory.

Added cumulative import counters for native column-type scan, native page reads, JavaScript Arrow conversion, DuckDB worker insertion and scheduling yields, plus batch count. Query counters cover tokenization, execution to stream header, subsequent worker fetch/Arrow decoding, cell conversion/JSON size checks, result IPC/native storage, scheduling yields and first-page IPC/rendering. Reader fetch can include continued execution; IPC counters include transport and serialization. These are elapsed pipeline measurements, not isolated CPU timings. Aggregates are components of the overall duration and must not be added to the overall stage again. No speed optimization is claimed by this instrumentation.

Timing refinement validation: actual-page million-row SQL test passed, including finite stage counters, precision, bounded paging/export, cancellation and recovery. Inline/module syntax passed. Generated compressed assets match the updated streaming, import and diagnostics scripts. Shared tabular regression is not passing yet: the taller completed diagnostics panel intercepts Run. Dismissing it before the first query resolved that location, but a later SQL workspace's query hit the same overlay. Stopped further adjustments under GEMINI.md's two-strike rule; the test must dismiss completed diagnostics before each affected query before this refinement is fully validated. Earlier shared-regression passes above refer to the original streaming release, not this timing refinement.

After explicit user authorization to continue, updated the later query test to dismiss completed diagnostics before Run. The shared tabular regression now passes, including the import timing assertions. No application changes were required for that test adjustment. The timing release build finished successfully in 4m45s, at 17:08:09 IST on 2026-10-09; executable size 49,704,960 bytes, SHA-256 59DD427863ED6C6E229EFAA97BDCD92124017B8862CA1930098B29B314E3873F. This supersedes the original streaming executable recorded above. Laptop stage measurements remain the next step.

## Binary Arrow transfer refinement (2026-10-09)

The user's four-column financial dataset measured 29.6 seconds to mount and 25.9 seconds for SELECT *. Import spent 10.29 seconds reading native pages and 8.63 seconds converting cells into Arrow; query spent 20.56 seconds in result IPC/native storage. These are distinct measurements from the earlier 12-column customer file.

Native-handle imports now encode Arrow streams in Rust and send raw responses directly to DuckDB's IPC-stream insertion API. Scalar SQL results serialize bounded Arrow streams and pass raw bytes plus staging headers to Rust, which validates schema, bounds and offset before atomically appending decoded cells. Limits are 16,384 rows, 131,072 cells and 4 MiB per binary transfer. Oversized import pages reduce their row count; oversized result buffers split. A single oversized row reports an explicit error. Mixed native columns remain text, nulls remain null, and numeric/boolean columns retain their types.

Complex types and duplicate result column names retain JSON compatibility transfers. Arrow slicing was observed to merge duplicate-name field types; the compatibility path preserves positional values. The embedded workspace invoke wrapper now forwards transport options/headers. Native snapshots/results remain all-row data with bounded UI previews. Direct whole-file browser imports and remote database results are outside this optimization.

Validation discovered and corrected an undefined insertNativeArrow function introduced by an earlier edit, then missing forwarded transport headers and duplicate-name Arrow type corruption. Actual browser tests passed for a million-row result with order/checksum, exact BIGINT/decimal/microsecond timestamps, duplicate aliases, full export/provider, cancellation/recovery, and shared import/export/handoff routes. Browser mocks verify encoding and integration but do not measure actual Windows WebView IPC speed or total application memory. A generated real DuckDB Arrow fixture is also used by targeted native tests; run test-sql-results.cjs before cargo test sql_arrow::tests.

Laptop retest: repeat the same four-column Finance/Editor → SQL transfer and SELECT *, export/reopen to confirm one million rows, and provide both diagnostics panels. Speed improvement is pending this real-IPC retest; no percentage improvement is claimed yet.
Native Arrow validation passed: decoded the real browser/DuckDB precision fixture without loss, rejected truncated data and mismatched schema, rejected an out-of-sequence append, then completed staging with the exact original values. Existing five compiler warnings remain unrelated.
Release build completed in 17m53s. Embedded Brotli assets were decoded and verified: exact source matches for sql-results.js, tabular-formats.js and tool-workspace.js, and updated SQL timing labels in compiled HTML. Executable built 2026-10-09 18:32:07 IST, 52,341,760 bytes; SHA-256 006906A45C87E0A2EA3DAAD6A52E51EB4C936BE6690A8FEE241A75460BEB2CB8. No installer, commit or push was performed for this refinement.
Final SQL browser rerun passed after compilation finished, including the actual raw Arrow buffer size assertion. The earlier chart-click timeout during concurrent compilation did not recur. Shared tabular and open-in regressions passed; native fixture validation and syntax/compiled-asset checks passed.

## Verified laptop result and restore checkpoint

The user measured Finance Dashboard → SQL Studio at 9.4 seconds (previously 29.6 seconds) and SELECT * at 6.1 seconds (previously 25.9 seconds), on the same laptop and financial dataset. Both used 62 batches instead of 489. Observed JS heap peaks were 18 MB for transfer and 30 MB for query, compared with 67 MB and 59 MB previously; these are not total app-memory measurements. Largest UI heartbeat gaps were 0.43 seconds and 0.11 seconds. The user confirmed every row survived the exported/reopened result. These are user-observed timings, not a controlled cross-hardware benchmark.

Checkpoint scope: native staged SQL results, binary Arrow import/results with compatibility fallback, bounded paging/chart previews, all-row exports/handoffs, cancellation, transport-header forwarding, detailed timing diagnostics, and targeted regressions. Restore tag: restore/tangent-pro-sql-binary-2026-10-09. Earlier implementation notes above are chronological; this verified result supersedes the pending laptop-retest status.
