# Data Extractor validation

Scope: HTML tables and CSS-selector text/attribute extraction. The tool does not currently parse arbitrary JSON/XML files.

Native tests: `cargo test extractor::tests -- --nocapture`. Covers headerless and ragged tables, nested tables, mixed row labels, colspan/rowspan, inline text, HTML entities, Unicode, quotes, missing selector matches/attributes, invalid parent selectors, empty fields and oversized spans. Generated `testing/artifacts/extractor/large-table.html` contains 100,000 data rows: ID 0 through 99999, Text café & Ω. The first native run passed four tests in 15.25 seconds (debug); final header-detection refinement is being rechecked.

Browser tests: `node scripts/test-native-extractor.cjs` passed with IPC mocked. Checks 100,000-row metadata, 500-row preview plus footer, literal hostile cell values, compatible-table merging with one header, refusal to merge different headers, handoff preservation, stale-input hiding, and error recovery.

Changes: tables without an all-th first row get generated Column N headers so data is retained. Nested-table rows/cells are isolated by their closest table/row. Short rows are padded. Spans are bounded to 1,000 columns and actual row count; overlapping spans are rejected. Inline text joins preserve words. Selector definitions are validated. Parsing runs on a blocking worker. URL fetching surfaces non-success HTTP status. Preview, export and handoff share one validated table-selection path. Matching headers are required for table merging.

Limits: multirow headers are not consolidated; rowspan=0 is bounded by the table rather than individual row groups. Nested table text remains part of its containing cell. HTML parser recovery accepts malformed markup. Complete results still cross IPC and occupy frontend memory; 100k validation is not a million-row memory guarantee. URL timeout/size limits, total memory measurement and native cancellation remain separate work. No commit or push performed. Packaged retest is pending.

Final native rerun passed all four tests in 10.45 seconds, including the mixed row-label header case. Shared test-tabular.cjs checks also passed.

2026-10-10: user reported the packaged Extractor retest is working well. The tested source is included in the testing-release checkpoint.
