# Shared loading presentation

All eight tool pages load loading-state.js and loading-state.css. Existing loaders are replaced visually by a compact theme-aware status card over a subtle tint. Status uses textContent, elapsed time resets for each loading session, overlapping operations retain the loader until all complete, and reduced motion disables spinner animation. No artificial percentage is shown.

The workspace native-command wrapper shows named loading states for parsing, profiling, imports, extraction and database operations and clears them in finally. Existing legacy loader style/text changes are observed, preserving current tool lifecycles. SQL queries use a pointer-transparent overlay to retain access to the existing functional Cancel control.

Validation: test-loading-state.cjs passed on all eight pages in light/dark mode, covering literal status, elapsed time, overlap and legacy show/hide. test-tabular.cjs passed file routing, edits, offline SQL, immutable handoffs, exports, cancellation and staging. test-native-logs.cjs passed after initial integration. Native timing/cancellation behavior is not altered.

Packaged visual retest pending rebuild. No commit or push performed.
