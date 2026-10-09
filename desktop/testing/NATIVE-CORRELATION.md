# Correlation Matrix validation

Native checks: `cargo test correlation::tests -- --nocapture` — six passed, including a generated million-row CSV filtered to 500,000 observations (positive correlation 1, negative correlation -1, preview limited to 100 rows).

Fixed paired-row alignment for short CSV records, average ranks for tied values, Pearson cancellation with large offsets, and Student-t significance tails. Constant or insufficient numeric pairs are undefined and display N/A; exported coefficients use null for these cells. Native parsing rejects errors rather than skipping records, keeps long negative numbers eligible, excludes nonfinite values, and validates filter columns.

Browser check: `node desktop/scripts/test-native-correlation.cjs` — passed with native IPC mocked. Checks undefined cells, significance-star policy, literal CSV headers/preview/filter values/error messages, and close reset. This complements native calculation tests; it does not replace a packaged-app retest.

Spearman significance remains an approximation; stars are suppressed for samples of 500 or fewer. See [SciPy Spearman documentation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.spearmanr.html). Average tied ranks follow [rankdata](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.rankdata.html); Student-t tails use [Statrs](https://docs.rs/statrs/latest/statrs/distribution/struct.StudentsT.html).

Retest fixture: `testing/artifacts/correlation/million.csv`. Select Pearson: x/positive = 1, x/negative = -1. Filter group = 0: paired N = 500,000 and coefficients unchanged. Native tests also cover tied ranks, large offsets, constant columns and ragged records.

Remaining scope: this engine still holds source columns in native memory and computes pairwise statistics. Many-column capacity, cancellation/progress, categorical association significance and broader public-beta gates remain separate validation work.

Live retest confirmed filtered Pearson/Spearman coefficients, undefined constant column, 500,000 paired rows and transfer with empty undefined cells. Exact +/-1 heatmap colors were fixed and confirmed visually.
