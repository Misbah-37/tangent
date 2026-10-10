# Second-machine smoke test

Build: 1.0.0-beta.2. Test on another Windows x64 PC without this repository, Node or Rust. Record Windows version, RAM, WebView2 version and display scaling. Mark every item PASS, FAIL or UNTESTED; untested is not a pass.

- Install, launch, close and launch again. Export work before exit. Check uninstall/reinstall separately.
- Open all eight tools. Check both themes, keyboard focus, window controls and the shared loading card. No black loading screen; elapsed time should increase. Confirm SQL Cancel remains reachable.
- Editor: sample.csv contains 3 data rows. Preserve IDs 00123/00234, quoted commas, Unicode, zero, missing amount and multiline note. Edit a cell, export CSV/TSV/XLSX and reimport. sample.tsv must retain its embedded tab within one cell.
- Cancel file dialogs; previous data remains. Create two workspaces, switch and transfer to another tool. Cancel a loaded-workspace close warning and check data remains. Check the app exit warning; export before exiting regardless.
- SQL: transfer the sample; SELECT COUNT(*) should return 3. Export/reopen all rows and check IDs and edits. Test cancellation with a long query; mark untested if too fast.
- Hygiene: revenue-imputation.csv has 10 rows. Enable Numeric formatting for Revenue. Mean fills five missing values with 1104; reload original and median should fill them with 100. Existing values become 1000, 4400, 20, 100 and 0. Export and reopen.
- Correlation: correlation.csv gives x/positive=1 and x/negative=-1 in Pearson/Spearman. Filter group=0: N=3 and group=N/A. Export/handoff retains coefficients and blank undefined cells.
- Finance: finance-sample.csv gives inflow 10000, outflow 117.48, net 9882.52. Export/handoff has five transactions. Use this dedicated sample; sample.csv intentionally has a missing amount.
- Logs: known.log gives 14 lines, 12 parsed, 2 unrecognized, 12 errors. Failed requests: 127.0.0.1=10; scanner hits: 127.0.0.2=1. UTC hour 10 has 10 requests; hour 11 has 2. Export/reopen summary.
- Extractor: import/paste tables.html. First table has two data rows; both tables give three with one Name/Value header. Preserve café & Ω, quotes/commas and the empty cell. Export/handoff and compare.
- Disconnect network after installation and repeat local file workflows. URL/database operations are excluded from this offline check.

## Optional stress archive

- correlation-million.csv: 1,000,000 rows; group=0 gives N=500,000 and unchanged +/-1.
- million.log: 1,000,000 parsed, 0 unrecognized, 750,000 errors, 250,000 failed requests and 250,000 scanner hits.
- large-table.html: 100,000 data rows, IDs 0..99999, Text café & Ω.

Record load time and responsiveness. Exports must preserve all rows. Second-machine and packaged visual validation require a human retest.
