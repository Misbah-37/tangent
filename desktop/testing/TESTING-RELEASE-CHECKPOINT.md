# Testing release checkpoint — 2026-10-10

Verified scope: million-row Editor/Insights, Finance and SQL work is in earlier checkpoints. This checkpoint adds Data Hygiene, Correlation Matrix, Log Analyzer, Data Extractor and shared loading presentation fixes with targeted native/browser checks. User confirmed the requested live Hygiene, Correlation, Log and Extractor retests. Log counts and responsiveness were confirmed; the corrected one-hour chart was shown in the live screenshot. Shared-loader packaged visual feedback remains outstanding.

Latest executable: src-tauri/target/release/tangent-desktop.exe. SHA256 AB3A4953D6A109B7D03841353A2BA2AB44255A93C58FF9BBEF0FFB9AF1A032AA. The executable is a generated build artifact, not stored by the source restore tag.

## Before distributing the testing package

- Create a versioned package with README, known limits, fixture instructions, checksum and feedback instructions.
- Smoke-test the packaged app on a second Windows machine: launch, WebView2/runtime requirements, local imports, exports, handoff and reopen.
- Confirm shared loading presentation on the packaged app in light and dark themes.
- Decide which incomplete advanced paths are supported for testers: Hygiene database/batch workflows, fuzzy deduplication, formatting/imputation parity. Test supported paths or clearly exclude them from this testing scope.
- Document that workspaces are session-local and users must export work before exit; verify the closing/unsaved-work warning.

## Public-beta gates / outstanding validation

- Progress and cancellation coverage, temporary-file cleanup and total process-memory measurement.
- Hygiene large-data handoff memory, fuzzy matching scaling, preview/native deduplication parity and additional formatting/imputation cases.
- Correlation many-column capacity, categorical significance and cancellation.
- Extractor multirow headers, row-group rowspan semantics, large-result IPC memory and URL timeout/size bounds.
- Long-span Log charts and high-cardinality native memory use; cancellation.
- Packaging/install/update behavior, signing/distribution decisions and clean-machine tests.

Targeted correctness passes do not constitute approval of every advanced workflow or unrestricted file sizes. No public-beta readiness claim is made. No push or publication is authorized in this checkpoint.
