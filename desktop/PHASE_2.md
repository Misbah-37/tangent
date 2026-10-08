# Phase 2: local datasets and Open in

The shared workspace bar exposes **Open in** for each tool. It captures the current result, creates a local snapshot through Rust, then imports that snapshot into a compatible tool. Switching tools never reloads a workspace.

An occupied destination defaults to a new workspace. Choosing replacement requires confirmation. Cancelling keeps existing work; snapshot and import failures appear in the transfer dialog.

| Tool | Transferred result |
| --- | --- |
| Data Hygiene | Last completed cleaning output, or the loaded CSV if no recipe has run |
| Tabular Editor | Current edited rows, including the active cell edit |
| CSV Insights | Current filtered dataset |
| SQL Studio | Current query or table-preview results |
| Correlation Matrix | Correlation coefficient matrix |
| Finance Dashboard | All analyzed transactions |
| Log Analyzer | Exported analysis summary |
| Data Extractor | Selected tables or structured extraction output |

Transfers use CSV escaping that preserves quotes, commas, embedded newlines, zero, null, and large integers. Result snapshots have dataset identity, revision, parent snapshot identity, result label, and byte count. Later edits do not change earlier snapshots or another workspace.

The registry metadata lives in memory; snapshot files live in a unique temporary session directory on the local device. Original input files are not overwritten. Normal app exit cleans up that session directory. A crash can leave temporary files behind. Save exports before closing the app; workspace persistence across restarts is not implemented.

The large-data storage engine, complete editing/sorting/filtering/undo-redo requirements, and web-editor parity work remain in the next editor phase. This phase repairs the existing editor's missing CSV controls and duplicate load listeners so it can participate in transfers.

Validation:

- `node desktop/scripts/test-open-in.cjs`: serialization, eight result providers, snapshot lineage, independent workspaces, replacement cancellation/acceptance, native and destination errors, real edited-cell transfer into CSV Insights, real local DuckDB SQL import and query export.
- `node desktop/scripts/test-launchpad.cjs`: syntax, import adapters, routing, persistent workspace lifecycle, theme synchronization, close guards, and actual Data Hygiene import.
- `cargo test --offline snapshots::tests::independent_snapshots_and_validation -- --exact`: native copying, independent snapshots, and format/source validation.
- `cargo build --offline`: desktop executable and embedded frontend assets.
