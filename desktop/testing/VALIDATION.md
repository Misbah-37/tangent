# Validation record — 1.0.0-beta.1

The optimized Windows x64 release compilation passed. The build reported existing unused-code warnings, a deprecated static-runtime build setting, and a future-compatibility notice for `sqlx-postgres 0.7.4`. These were warnings, not a certification that release hardening is complete.

The NSIS installer was generated successfully after retrying a Windows file-lock failure. The bundling retry reported a bundle-marker warning relevant to updater detection. This build has no automatic updater; manual installation is the documented update path. The executable metadata identifies Tangent Testing, version 1.0.0-beta.1. The package is unsigned.

## Automated checks

- Launchpad routing, persistent sessions, shell controls, and close/replace guards: browser harness passed during this packaging run.
- Independent current-result transfers, occupied destinations, cancellation, and edited CSV profiling: browser harness passed during this packaging run.
- CSV/TSV/XLSX import previews, typed editor/SQL transfers, new/closed workspaces, and exports: browser harness passed during this packaging run, with external requests blocked.
- All eight tools in dark, light, and narrow layouts: passed in the preceding UI validation run.
- Native tabular snapshot/XLSX tests and Finance date parser tests: passed in the preceding implementation validation run; no native parser changes in this packaging task.

Browser tests exercise the actual HTML/JavaScript and bundled SQL engine, but mock native dialogs and several Rust operations. They do not establish native end-to-end or financial accuracy.

## Required tester checks — not yet completed

- Install, start, and uninstall the release installer on a clean Windows machine.
- Confirm actual native imports, exports, and calculations using supplied samples.
- Confirm upgrade behavior and coexistence with Tangent Pro.
- Exercise real Windows dialogs, filesystem permissions, and WebView2 setup.
- Record representative large-file performance and memory limits.
- Confirm local workflows with the network disconnected.

This build is intended to perform these checks, not to claim they have already passed.
