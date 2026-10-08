# Desktop table formats

Data Hygiene, Tabular Editor, CSV Insights, SQL Studio, Correlation Matrix, and Finance Dashboard accept CSV, TSV, and XLSX. Log Analyzer and Data Extractor retain their specialized inputs. Table results use the shared CSV, TSV, or XLSX export dialog.

## Import behavior

Excel and TSV imports show a preview before loading. Excel imports select one worksheet; empty worksheets can be skipped. The first-row header option generates column names when disabled. The editor also previews CSV imports.

Excel imports use stored cell values, including cached formula results. They do not calculate formulas. Cached results can be missing or stale: recalculate and save the workbook in Excel before importing. Formatting, formulas, merged-cell structure, and additional worksheets are not retained.

The canonical snapshot stores text, numbers, booleans, ISO dates, and nulls. Delimited-file tokens remain text to preserve identifiers such as `00123`. Native operations also receive a CSV compatibility projection. Existing analysis engines may infer types from that projection.

## Transfer and export behavior

“Open in” creates an independent snapshot of the current result. Editor edits do not change the source workspace. SQL receives typed snapshots through bundled Apache Arrow without requesting DuckDB's JSON extension. Mixed-type columns use text; date columns use ISO text.

CSV and TSV cannot retain cell types or distinguish null from empty text. XLSX exports create a new, single-worksheet workbook with values only. Numbers and booleans retain their types; dates are ISO text. Text beginning with `=` remains literal text rather than an Excel formula.

This layer uses in-memory datasets and local session snapshots. It does not introduce an out-of-core storage engine. Parquet import/export expansion is a separate phase.

## Validation and remaining boundary

Targeted Rust tests cover quoted TSV, leading zeros, ragged records, worksheet selection, typed XLSX round trips, immutable snapshots, header normalization, and Finance date parsing. Browser tests exercise the actual tool pages and bundled SQL engine with external requests blocked; native dialogs and analysis commands are mocked in that browser harness. Layout checks cover all eight tools in light and dark themes and narrow viewports.

The existing direct JSON import path in SQL Studio is separate from typed transfers and may require DuckDB's JSON extension. It is not covered by the new offline CSV/TSV/XLSX guarantee.
