# Desktop large-data audit — 2026-10-08

Scope: the eight tools in `src/launchpad-routing.js`, their input/result providers, the shared handoff transport, and their Rust implementations. This is a source inspection, not a million-row certification of every tool.

Update, 2026-10-09: the primary desktop CSV Insights paths now use native profiling, filtering/grouping, paged rows and native-view exports. See `NATIVE-INSIGHTS.md` for implemented scope, validation and the laptop retest. The table below records the original audit baseline; other tool priorities remain open.

Recheck after the successful million-row Insights retest, 2026-10-09: Finance still reads all lines for header discovery (`finance.rs::find_csv_header_and_read`), collects transactions and returns the ledger; SQL still calls `res.toArray()` in its query handler before slicing display pages. Extractor still reads the complete HTML via IPC and creates full extracted-row arrays. Correlation retains native analysis vectors and a quadratic matrix; Log Analyzer bounds top lists to 20 but retains every timeline bucket and growing native maps. These are confirmed source paths, not measured crashes. Prioritize native Finance ledger pages and bounded SQL results, followed by Data Hygiene source-path snapshot serialization and Extractor large-document handling. Preserve full export/analysis semantics rather than silently capping rows.

## Evidence and priorities

Finance implementation update: the desktop page now uses `finance_native.rs` with prefix header discovery, streaming CSV parsing/native input handles, a native four-column ledger, summary responses and 100-row pages. Native export/snapshot writers retain all ledger rows. Failed inputs reject replacement; invalid dates and blank amounts generate visible warnings. The native million-row financial fixture and targeted UI tests passed; real laptop WebView testing remains pending. See `NATIVE-FINANCE-PLAN.md`. SQL result materialization is the next major outstanding tool path. The table below retains the historical audit baseline.

The user's million-row editor import improved from 238.4 seconds to 6.7 seconds after switching to Rust-owned cells and bounded grid pages. CSV Insights subsequently crashed the WebView with `STATUS_BREAKPOINT`. That code does not establish the crash's precise cause or prove an out-of-memory condition. The source does establish avoidable full-dataset copies that must be removed before retesting the same workload.

| Tool | Current large-data path | Required work | Priority |
| --- | --- | --- | --- |
| Tabular Editor | Rust session; bounded page responses; sparse edits; native exports and snapshots | Keep as reference. Test wide columns, long strings, multiple live workspaces, and cancellation. Rust still holds the parsed dataset in memory. | Regression coverage |
| CSV Insights | Complete typed rows accumulate in JavaScript; records are cloned into a worker and returned with all rows; categorical profiles retain all distinct labels. Filtering, aggregation and transfer create additional arrays. Comparison also reads the entire previous file into JavaScript. | Native profiling, native row filtering/grouping, bounded grid pages and native exports. Keep charts and controls in JavaScript. | First |
| Finance Dashboard | Rust collects the full input, builds transactions, clones the full ledger into its report, and sends it to JavaScript. Header discovery also reads the whole file. The result provider creates both typed rows and CSV text. | Read only enough input to find headers; retain ledger natively; send summaries and transaction pages; apply rules/filter/export against the full ledger natively. Preserve amount/date parsing and category/subscription rules. Run the project's Liability Check before modifying financial behavior. | Next |
| SQL Studio | Native editor snapshots enter DuckDB through bounded Arrow batches. Legacy typed snapshots still enter as whole arrays. Query execution calls `toArray()` for complete results; table pagination only limits DOM rows. Charts and result transfer use the complete result array. | Extend the native input route; retain query results in DuckDB and request pages; aggregate charts there; export/transfer without materializing every result in the UI. Preserve user queries, saved queries and full result semantics. | High |
| Data Hygiene | `process_massive_csv` streams records and returns at most 500 preview rows. Its current result is a file path. Shared capture converts that source path into a typed JSON/CSV snapshot. | Replace source-path handoffs with immutable native snapshots to avoid JSON serialization. Check recipe-specific memory use, progress/cancellation and repeated snapshots separately. | Shared handoff work |
| Correlation Matrix | Rust computes analysis; raw preview is limited to 100 rows. All input columns are still retained in Rust and converted into analysis vectors. Output matrix grows with the square of the column count. Transfer exports coefficients, not the original dataset. | Measure native memory with wide files; load selected columns where possible; bound matrix rendering and show progress/cancellation. No full-row UI transfer was found in this path. | Targeted hardening |
| Log Analyzer | Native line-by-line input, including GZ. Threat/top-path results are limited to 20 per category. Native maps and all timeline buckets can grow with input cardinality. Transfer contains the analysis summary. | Adaptive timeline buckets, native cardinality/memory measurements and progress/cancellation. Preserve exact totals; do not silently sample threats. | Targeted hardening |
| Data Extractor | Full HTML text crosses IPC into the editor; extracted tables/records remain complete UI arrays. Transfer builds typed rows plus CSV text. | Large-input preflight and bounded previews; native extraction result handles, pages and export for large tables. Preserve selectors and user-editable HTML. | Separate large-document work |

The active Data Hygiene implementation is `src/index.html`, as defined by the routing catalog; `src/data-hygiene.html` is not the active suite route.

## Shared transport fix implemented

`launchpad-handoff.js` now resolves the typed dataset handle before requesting file bytes. For handle-backed CSV/TSV/XLSX imports it passes an empty `File` envelope with `tabularId`, the normalized filename and the source filename. Its two consumers, CSV Insights and SQL Studio, already read typed data when that identifier is present.

This removes the redundant `read_launchpad_file` JSON byte-array response, `Uint8Array` and CSV `Blob` from typed handoffs. Files without a typed handle still use the byte-backed fallback, including SQL JSON/Parquet inputs. TSV/XLSX worksheet review is retained when a handle does not already exist.

This transport change alone does **not** finish the CSV Insights native refactor, eliminate its worker copies, or make unrestricted SQL results safe. Do not describe it as a verified fix for the WebView crash.

## CSV Insights parity checklist for the native refactor

Reviewed the web baseline `src/tools/csv-insights.html` and desktop `src/csv-insights.html`. Preserve the existing algorithms and controls rather than replacing them with a simplified profiler:

- CSV quoting/BOM/newlines and ragged rows; typed workbook cells and worksheet/header selection.
- Trimmed missing values; finite numeric-token detection; numeric-first classification with the existing strictly greater-than-80% threshold; ISO/slash date recognition.
- Numeric min/max/mean, midpoint median, population standard deviation, current percentile index rules, Tukey outliers, non-conforming counts and unique ratios.
- Discrete distributions for at most 20 distinct numeric values; main/fine histogram bin rules, compact labels and date label thresholds.
- Categorical counts, case variants, top five plus Other, ID-like indicators and the detailed chart's existing top-200 policy. Preserve full distinct counts without transmitting every distinct string.
- Raw grid pages, global text/column slicing, clear filter and chart drill-downs. Apply the same selected view to export and transfer.
- Manual sum/average/count/distinct/min/max/median; grouped series; year/month/quarter bins; Unknown values; skipped-value notes; current top-50 and doughnut Other policies.
- Bar/line/doughnut rendering, tooltips, theme changes, resize/zoom, chart PNGs and pivot CSVs.
- Dashboard save/load, filter restoration, period comparison and error handling. Comparison should use native CSV parsing, including quoted commas/newlines.
- Independent source/destination snapshots, replacement/cancellation behavior, and release of analysis handles when a dataset or workspace closes.

## Validation gates

1. Compare native profiles/aggregations with the current worker on fixtures covering empty columns, small sample percentiles, mixed values, leading-zero identifiers, Unicode/case, dates, quotes and missing values.
2. Exercise all UI controls and exports against those fixtures, including chart drill-down followed by transfer.
3. Use a million-row file with high-cardinality text, not only repeated strings. Record end-to-end duration, UI heartbeat, process/native memory and the largest response. The parent's observed JavaScript heap excludes iframe, worker and Rust allocations.
4. Repeat with multiple open workspaces, filtered exports, destination failure, cancellation and close/reopen. Confirm data independence and native resource release.
5. Before public beta, apply the same gate to Finance and unrestricted SQL results. Do not infer their readiness from the editor benchmark.

Transport validation: `node scripts/test-handoff-handles.cjs` checks native/legacy handles, cached imports, workbook preparation and ordinary-file fallback. `node scripts/test-tabular.cjs` exercises the actual tool pages, typed imports, immutable handoffs and real offline DuckDB.
