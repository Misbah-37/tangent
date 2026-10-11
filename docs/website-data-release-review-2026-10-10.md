# Website data-tool fixes — release review

## Changes

- Finance validates complete amounts, preserves accounting negatives and zero values, reports excluded rows, and pages the ledger in groups of 100. Totals and charts include all valid transactions.
- SQL exports properly quoted CSV headers and multiline values, clears stale exports after failed queries, and keeps the newest result when Run is clicked repeatedly.
- CSV Insights rejects malformed records and duplicate headers, preserves special column names, validates numeric/date tokens, and exports every pivot group.
- Correlation uses stable Pearson calculations, displays N/A for undefined correlations, and reports paired observations and rejected numeric cells.
- Logs reports unrecognized lines, pages all raw/search results in groups of 200, parses in cancellable batches, and ignores obsolete file completions.
- Imported text renders literally across these tools.

## Validation

Source/generated syntax and known-answer fixtures passed. Edge checks passed for uploads, actual downloaded outputs, loaded 390-pixel layouts, delayed/cancelled operations, rapid SQL reruns, and 100,000-row fixtures across all five tools.

Detailed evidence: [Core data website audit](core-data-website-audit-2026-10-10.md).

## Final user review

1. Finance: load a statement, verify totals, and use Previous/Next through the ledger.
2. Logs: load logs, search in Raw Explorer, verify the match count and page navigation, then Clear during a large load.
3. SQL: download a query result and verify it opens correctly in your usual spreadsheet application.

## Release status

Changes are local and uncommitted. No publication has occurred. Million-row performance, many-column correlation, full offline operation, and cross-browser/device coverage are not established by these tests.
