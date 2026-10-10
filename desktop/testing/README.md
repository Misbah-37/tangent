# Tangent Testing

Current private package: **1.0.0-beta.2**. Use [current setup instructions](private-beta/README.md) and [current smoke checklist](private-beta/SMOKE-TEST.md). See PRIVATE-BETA-PACKAGE.md for hashes, validation and pending installer checks. The earlier beta.1 checklist below is retained as historical context; current fixture expectations take precedence.

Internal Windows x64 test build. This is not a public release or a certification of financial results. Start with the supplied sample files, not confidential or irreplaceable data. The installer is unsigned; verify its SHA-256 against the supplied manifest. Windows may show an unknown-publisher warning. Follow your organization's installation policy.

The testing installation uses a separate application identity from Tangent Pro. WebView2 is required; the installer may download its runtime if it is missing. Installation can therefore require internet even when local file workflows do not.

## First run

1. Install on a clean Windows machine without Node, Rust, or this source repository. Record Windows and WebView2 versions, available RAM, and display scaling.
2. Open all eight tools. Check light/dark themes, keyboard focus, sidebar switching, and window controls at your usual display scaling.
3. Open `sample.csv` in Tabular Editor. Confirm identifiers `00123` and `00234`, quoted commas, Unicode, zero amounts, and a missing amount. Edit a cell and export a copy in CSV, TSV, and XLSX. Reimport each export and compare the values.
4. Open `sample.tsv` and verify that the note's embedded tab stays inside one cell. Test cancelling import and export dialogs without losing the previous dataset.
5. Create a second editor using Workspaces → New workspace. Load another sample, switch between them, and verify independence. Close an empty workspace; then cancel and accept closing a loaded workspace.
6. Use Open in another tool to send the edited table to SQL Studio and CSV Insights. Verify edits, leading zeros, and original workspace contents. Query and export the SQL result, then open it in an editor.
7. In Data Hygiene, load the sample, preview and execute a cleaning recipe, and export the result. Confirm the selected rules' effects manually.
8. In Finance, map Date, Description, and Amount from `sample.csv`. Expected numeric entries: inflow 100, outflow 20, net 80. Record how the missing amount is handled. In Correlation, select appropriate numeric columns and compare against independently calculated expectations.
9. Load `sample.log` in Log Analyzer and paste `sample.html` into Data Extractor's local HTML input. Verify the displayed records against the inputs.
10. Repeat local CSV/TSV/XLSX workflows with the network disconnected. Test increasing file sizes gradually and record load time, responsiveness, and memory. Do not assume an advertised maximum has been certified.

## Known limitations

- Excel import/export retains values only, not formulas, formatting, merges, or all worksheets. Imported formulas rely on saved cached results, which can be stale. Exported dates are ISO text.
- CSV/TSV cannot retain cell types or distinguish null from empty text. Spreadsheet software may interpret formula-like CSV/TSV text. Identifiers can also be reinterpreted by external applications.
- Workspaces are session-based. Export before quitting; crash recovery is not guaranteed. Session snapshots are local temporary files, not encrypted storage, and may remain after a crash.
- Direct JSON import in SQL Studio may request a DuckDB extension. Live URL extraction and database connections are explicit network workflows. The offline guarantee tested here covers local CSV/TSV/XLSX workflows.
- Large-file limits, all native calculations, scheduling, database connectors, and Python integrations still require separate validation. This build does not certify them.
- No automatic update channel is configured. Install the next testing build manually.

## Report a problem

Include build version, tool, file format, file size/row count, steps, expected and actual result, and whether the issue repeats. Include a screenshot or visible technical error when useful. Reproduce with synthetic sample data; do not send passwords, connection strings, or private datasets. Classify crashes, incorrect results, and unexpected data loss as release blockers.

## Reproduce the installer

From `desktop`, run:

```powershell
.\node_modules\.bin\tauri.cmd build --config src-tauri/tauri.testing.conf.json --bundles nsis --ci --no-sign -- --offline
```

The installer is generated under `src-tauri/target/release/bundle/nsis`. Packaging tools may require downloads even though Cargo dependencies are resolved offline.
