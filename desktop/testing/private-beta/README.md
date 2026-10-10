# Tangent Testing 1.0.0-beta.2

Private Windows x64 testing package. Install alongside the regular app using its separate testing identity. This is not a public beta.

Extract the ZIP fully, verify CHECKSUMS.sha256, then run the included setup executable. The installer is unsigned; follow your normal software approval policy. Microsoft WebView2 Runtime is required and the installer can download it when missing. First setup may need internet. See [Tauri packaging](https://v2.tauri.app/distribute/windows-installer/) and [Microsoft WebView2 distribution](https://learn.microsoft.com/microsoft-edge/webview2/concepts/distribution).

Launch Tangent Testing and follow SMOKE-TEST.md. Start with synthetic fixtures. Local files are processed on the device; live URL fetching and database connections are explicit network operations.

Workspaces are session-based: export before closing. Temporary snapshots are not durable saves or encrypted storage. No automatic update channel is configured.

## Test scope and limits

- Test local CSV/TSV/XLSX import/export, editing, workspaces and handoff, basic Hygiene recipes, numeric correlations, mapped financial statements, local log files and HTML extraction.
- Database connectors, scheduled/batch jobs, Python integrations and fuzzy deduplication are outside this private test scope.
- Excel retains values rather than workbook layout or formulas. Formula imports rely on cached results. CSV/TSV may lose type distinctions in external software.
- Enable Numeric formatting before imputing formatted numbers. More Hygiene formatting/imputation edge cases remain unvalidated.
- Correlation constant/insufficient pairs are N/A. Small-sample Spearman significance is approximate. Many-column capacity and categorical significance remain unvalidated.
- Log threat flags are heuristics, not confirmed attacks. Summary exports contain the top 20 entries per category. Unknown timestamps cannot establish per-minute bursts.
- Extractor handles HTML/CSS selectors, not arbitrary JSON/XML. Multirow headers and row-group rowspan semantics are limited. Full results occupy frontend memory.
- Cancellation is unavailable for some operations. Total memory, temp cleanup and crash recovery require further validation. No universal file-size limit is certified.

Use FEEDBACK.md to report issues. Wrong results, crashes and unexpected data loss are blockers. Reproduce with synthetic data; omit private files, passwords and connection strings. Second-machine and packaged visual validation remain pending. No public distribution has been approved.
