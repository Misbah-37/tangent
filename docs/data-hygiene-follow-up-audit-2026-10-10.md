# Data Hygiene follow-up audit — 10 October 2026

Read-only audit of the current local website after the initial fixes. Worker cases are reproduced using the embedded worker extracted from the source fragment. Browser cases use the generated page in Microsoft Edge. No deployment or website fix was made during this pass.

## Confirmed user-facing issues

| Priority | Issue | Reproduction and actual result | Expected behavior |
|---|---|---|---|
| P1 | Deduplication without valid keys drops distinct rows | Upload three distinct id/name rows; choose Specific Key Columns without selecting a column. Browser output contains only the first row and reports two duplicates. A worker recipe referring to a nonexistent column has the same effect. | Require at least one valid key and reject stale column references before changing data. |
| P1 | CSV headers execute HTML | A header containing an image with an inline error handler executes that handler when the preview renders. Browser reproduction only set a harmless window marker, using a data URL and no external request. | Render CSV headers, pills, and rule descriptions as literal text; do not insert file content into executable HTML. |
| P1 | Numeric cleanup guesses incorrect values | Worker converts `1e3` to `13`, `12abc34` to `1234`, and `1,25` to `125`. | Parse supported complete numeric formats; flag unknown text and ambiguous decimal/grouping conventions. Preserve the source when conversion is uncertain. |
| P2 | New word-number parser accepts malformed phrases | `one one` converts to `2`. This is an edge case in the recently expanded parser. | Validate number-word grammar instead of adding every recognized token. |
| P1 | Special column names lose values | Worker input with an own `__proto__` column containing `keep` returns a row with that field missing. Its row construction uses ordinary objects, invoking the prototype setter. | Preserve all column names and values using safe dictionaries or row arrays. This reproduction is worker-level; end-to-end handling by Papa Parse also needs checking. |
| P2 | Import Recipe button is broken | Clicking Import (.json) records `Invalid or unexpected token` in the real browser. The inline click handler contains backslash-escaped single quotes outside a JS string. | Open the recipe file chooser and validate/reload the recipe. |
| P2 | Mode imputation falsely reports completion | With only blank/N/A values in a column, mode returns empty text for both and reports two values imputed. | Report that no usable mode exists, as mean/median already do, rather than reporting empty replacements as successful fills. |
| P2 | Preview undercounts missing data | For blank, null, NaN, N/A and dash cells, the preview header reports only one empty cell and the anomalies-only filter shows only one row. Processing recognizes all five. | Share the same missing-value definition between preview, filtering, drop rules, and imputation. |

## Dormant and unconfirmed paths

The worker has a fuzzy deduplication branch that calls undefined `soundex`. It returns an error when invoked directly, but the current UI does not offer fuzzy deduplication. Treat this as dormant code, not a presently selectable feature failure.

Custom imputation values are also interpolated into HTML in source, but the browser audit did not establish execution through that control; the header execution result above is independently confirmed. Further review should cover recipe labels, imported recipe content, and column names in pill actions.

Closing a file does not terminate its active worker in the current source. A delayed completion could update cleared or newly loaded state. This remains a source-level concern requiring a controlled overlapping-load reproduction.

## Evidence and next steps

Evidence scripts/results are in ignored scratch files: `audit-hygiene-edge.cjs`, `audit-hygiene-edge.json`, `audit-hygiene-browser.cjs`, and `audit-hygiene-browser.json`. The browser script records page errors and uses benign markup markers.

Fix the row-loss guards, literal rendering, and numeric validation first. Then repair recipe import, unify missing-value reporting, and handle unavailable mode statistics. Add special-header and overlapping-processing tests before treating the tool as release-ready. These findings apply to the local build; the live website has not been retested for this pass.

## Implemented locally

All eight confirmed issues above have fixes in `src/tools/data-hygiene.html` and the rebuilt `data-hygiene.html`.

- Validate selected columns before processing, require at least one deduplication key, and reject unsupported methods. Remove the dormant fuzzy branch.
- Escape preview headers and cells; render selection options, pills, and rule descriptions through literal DOM text. Pill removal uses event listeners.
- Parse complete supported numeric formats, including currency, accounting negatives, standard comma grouping, scientific notation, and k/m suffixes. Shift decimal strings to preserve integer precision. Preserve unrecognized or ambiguous values and show a review notice. Validate English number-word groups and descending scales.
- Parse CSV records as arrays and construct own column properties safely, preserving `__proto__` and `constructor`. Reject duplicate headers, parser errors, and mismatched nonempty records before replacing data.
- Bind the recipe chooser correctly and validate settings, selections, and imputation rules before applying them. Reject stale column references.
- Reject mode imputation with no usable values. Share the same missing-value predicate between the preview and worker, including blank, null, NaN, N/A, and dash markers.
- Terminate prior workers on new processing, replacement, or clear. Operation identifiers reject obsolete file, recipe, and worker callbacks. Handle worker errors and disable CSV export during processing or after failure; enable it after a successful result.

### Validation

`scripts/test-data-hygiene.cjs` passes against both source and generated HTML. It covers original regressions plus missing/stale keys, invalid formatting columns, unavailable mode, complete numeric parsing, malformed word phrases, and special column names.

`scripts/test-data-hygiene-browser.cjs` passes in Edge against the generated page: real file uploads, real workers, downloaded CSV values, literal hostile headers, special-column exports, missing-value badges/filter, dedup rejection, recipe chooser/export/import/rejection, and obsolete worker callbacks. The cancellation cases deliberately substitute a controlled worker and invoke the clear handler programmatically because the shared loading overlay blocks pointer access while processing; these cases verify state guards, not an interactive cancel control.

The supplied `extreme_dirty_dataset.csv` still exports 231 retained rows with 76 missing revenue values filled. Exports match the independent decimal reference: mean 1754.19 and median 1000; title casing remains correct.

The special-column browser assertion initially failed because Playwright's object transfer omitted `__proto__`. Diagnostic JSON strings confirmed import, processed data, and the CSV all retained `keep`. The test now transfers JSON text and parses it in Node, preserving that own property. No app workaround was needed for that test transport behavior.

Focused syntax and whitespace checks pass. No deployment or Git push was performed.
