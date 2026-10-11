# Core data website audit — 10 October 2026

Audit of the current local generated website and corresponding source fragments. No production code was changed during this pass, and nothing was deployed.

## Scope and evidence

Covered CSV Insights, SQL Studio, Correlation Matrix, Finance Dashboard, and Log Analyzer in Microsoft Edge at 1366×900, plus their initial pages at 390×844. Tabular Editor is not in `tools.json` and has no website source fragment; the earlier proposed six-tool list incorrectly included that Pro tool. This is a scope/catalog discrepancy, not a reproduced failure of a website editor.

Evidence: ignored `scratch/audit-core-data.cjs` and `scratch/audit-core-data-results.json`. The script runs the actual CSV Insights worker in a VM and real uploads, clicks, queries, and downloads in Edge. It records page errors and dialogs. Browser markup probes only set a harmless local window marker using a data URL; no file contents were sent elsewhere.

## Confirmed findings

| Priority | Tool | Reproduction and result | Required behavior |
|---|---|---|---|
| P1 | Finance | Upload amount `($125.50)`: added to inflow as positive 125.50. Mixed token `12abc34` becomes 1234. In a fixture with legitimate income 1000, dashboard shows inflow/net 2359.50 and outflow 0.00. | Parse complete supported amounts, preserve accounting signs, and report invalid/missing amounts. Valid fixture totals should be inflow 1000, outflow 125.50, net 874.50, with invalid rows explicitly reported. |
| P1 | Finance and Logs | A CSV description and a syslog message containing `<img src=data:,x onerror=window.auditMarker=1>` execute the handler during rendering. | Render all file-derived values literally, including raw logs and summary tables. |
| P1 | SQL | Query `SELECT 'line1' || chr(10) || 'line2' AS "a,b"`; exported bytes are `a,b\nline1\nline2\n`, representing the wrong header width and record count. Header names are unquoted; newline detection tests the literal backslash-n string. | Use proper CSV escaping for headers and values, including actual CR/LF, commas, and quotes. Expected one column and one record with a multiline value. |
| P1 | CSV Insights | Worker input `x,x\n1,2` retains only `x=2`. Input `x,y\n1,2,3` discards the third value. An unterminated quote is accepted as successful input. | Validate quote state and record width; reject or explicitly disambiguate duplicate headers without dropping values. |
| P1 | CSV Insights | Worker input `__proto__,x\nkeep,1` loses the own special-header value. Categories `__proto__`, `constructor`, and `normal` report two distinct values and a function string as one frequency. | Use safe own-property dictionaries or row arrays throughout parsing, statistics, and aggregation. This reproduction is worker-level. |
| P1 | Correlation | In-browser `processData` with x = 1000000000001, 1000000000002, 1000000000003 and y = 1000000000002, 1000000000004, 1000000000006 returns Pearson 0; expected 1. Direct sums suffer cancellation. | Use numerically stable covariance/variance accumulation, finite-value checks, and valid output bounds. |
| P2 | Correlation | Uploaded constant column 7,7,7 reports correlation 0.00 with other columns and diagonal 1.00. | Show undefined/N/A when variance is zero or insufficient paired observations exist, including the diagonal. |
| P2 | CSV Insights and Correlation | CSV Insights pivot sums `2bad` as 2: A rows 1 and 2bad export sum 3. In-browser Correlation processing converts x tokens 1abc,2abc,3abc to 1,2,3. | Validate whole numeric tokens consistently across profiling, aggregation, and correlation; report rejected observations. |
| P2 | SQL | After a successful query, run `SELECT * FROM table_that_does_not_exist`. The page shows Error but the previous result's Export button remains visible. | Disable/clear export on new execution and failure, or explicitly label the retained prior result. |
| P2 | Finance | Calling the real table renderer with amount -25 displays `$25.00`, without a minus sign. | Preserve the transaction sign in the ledger display. This case exercises the renderer directly in the browser. |
| P2 | CSV Insights | Worker classifies `2026-02-31` as a valid date and uses JavaScript's normalized March timestamp. | Validate calendar components, preserve invalid source dates, and report them. |
| P2 | Logs | A fixture with three valid requests and one invalid line reports three parsed records and 66.7% errors but never reports the unrecognized line. | Report recognized and unrecognized counts so users know what the analysis excluded. |

## Checks that passed

- CSV Insights worker mean/median for 1,2,3,4 are 2.5. Normal real-browser pivot exports A=3, B=7, and close returns to the initial state.
- SQL initializes DuckDB, mounts a CSV, runs a 1,000-row query, previews 500, and exports all 1,000 records plus the header. Row truncation was not observed in this fixture.
- Correlation's small known-answer upload produces +1 and -1. Reset clears data; PNG export produces a nonempty file with the PNG signature.
- Finance close clears data. Log fixture recognizes the three valid records and correctly reports two error statuses; reset clears the records.
- No uncaught page errors or unexpected dialogs occurred in the completed cases. Initial mobile pages showed no positive document overflow.

## Limits and follow-up

This is a bounded correctness pass, not exhaustive workflow validation. The mobile checks cover initial screens, not large loaded tables or every control. Finance and Logs currently have no CSV export controls in their website source; do not assume Pro's exports, transfers, or other features exist on the website. No million-row, full offline, or sustained responsiveness benchmark was run.

Source also shows raw HTML interpolation in SQL schema/results/error rendering and Correlation header/title rendering. Those paths warrant safe-rendering review, but HTML execution through them was not independently reproduced in this pass. File-name quoting in SQL mount statements and overlapping-operation recovery also need dedicated cases.

Recommended implementation order:

1. Literal rendering in the data tools, supported full-token amount parsing, and correct SQL CSV serialization/export state.
2. CSV Insights strict parsing, safe dictionaries, consistent aggregate parsing, and date validation.
3. Stable Correlation math, undefined-value semantics, and valid paired-observation counts.
4. Log rejection counts, then loaded mobile layouts and error/overlap recovery across tools.

Each batch should get known-answer fixtures and real downloaded-output checks before release. Work from `src/tools/` and regenerate only the affected pages. The live site remains unchanged.

## Implementation and regression results

All confirmed findings above are fixed in the five source fragments and regenerated pages. A shared local helper provides full-token number parsing, strict CSV records, CSV escaping, calendar validation, literal HTML rendering, and stable Pearson calculations. Finance reports excluded amounts and preserves accounting signs; SQL clears stale exports; Insights preserves special property names and exports every pivot group even when the chart shows only the first 50; Correlation reports undefined values and paired counts; Logs reports unrecognized nonempty lines.

Validation passed on 2026-10-10:

- `node scripts/test-core-data.cjs`: source/generated script syntax, strict parsing, special fields/categories, profiles, calendar validation, and stable/undefined correlations.
- `node scripts/test-core-data-browser.cjs`: real Edge uploads, Finance totals/signs, invalid numeric exclusions, literal imported text, Correlation paired tooltips and PNG download, Logs recognition counts, malformed CSV recovery, special headers, all-group pivot download, SQL quoted filename mounting, complete 1,000-row download, multiline/header CSV quoting, and failed-query export clearing. No uncaught page errors or unexpected dialogs.
- The scoped compiler rebuilt all five affected pages successfully.

The original audit evidence remains above for traceability. These are local fixes, not a live deployment. Loaded mobile layouts, overlapping-operation stress tests, million-row performance, and complete offline operation remain outside this regression pass.

## Loaded layouts, interrupted operations, and larger files

Follow-up completed locally on 2026-10-10. `node scripts/test-core-data-workflows.cjs` passes real Edge checks for the five loaded pages at 390×844, close/replacement races in Finance and Correlation, closing an Insights read, Log Analyzer close/replacement and mid-parse cancellation, rapid SQL reruns keeping the newest result/export, and 100,000-row known-answer fixtures. Finance and Logs pagination checks cover the next and final pages; log search counts all matching lines. No uncaught page errors or unexpected dialogs occurred.

Additional fixes:

- Log Analyzer ignores obsolete read completions after Clear, replacement, or sample loading. Read failures recover to the initial screen.
- Finance renders 100 ledger rows per page while keeping all transactions in totals and charts. Rendering every row previously stalled the 100,000-row browser case.
- Logs renders 200 raw lines per page. Search retains and counts all matches rather than silently slicing results to 1,000.
- Log parsing yields between 1,000-line batches, reports progress, and checks cancellation before committing results.

Final local timing sample (100,000 rows, headless Edge on this laptop):

| Tool | Elapsed | Largest 50 ms timer gap |
| --- | ---: | ---: |
| Finance | 470 ms | 251 ms |
| Correlation | 357 ms | 345 ms |
| Logs | 710 ms | 76 ms |
| CSV Insights | 1,145 ms | 257 ms |
| SQL query | 121 ms | 68 ms |

Finance/Correlation/Logs timing starts at the file handler; SQL starts before Run. Insights includes the automated file handoff because its handler is privately scoped. These are synthetic fixture measurements, not guaranteed performance or a million-row benchmark. Earlier large gaps included automation constructing files and should not be treated as application processing time. Many-column correlation, high-cardinality charts, and other devices remain outside this pass. The live site is unchanged.
