# Log Analyzer validation

Native validation: `cargo test log_analyzer::tests -- --nocapture` — four tests passed. Known Apache and JSON fixtures verify UTC hour buckets, mixed input, recognition coverage, exact errors, failed-auth thresholds and scanner paths. Unicode/unknown timestamps do not panic or invent auth time buckets. Invalid custom regexes return errors. Concatenated gzip members are all read; corrupt gzip returns an error.

Million-line fixture: `testing/artifacts/logs/million.log`. Expected 1,000,000 total and parsed lines, zero unrecognized, 750,000 errors, 1,000,000 requests from 127.0.0.1, 250,000 scanner-path hits and 250,000 failed-auth requests. Timeline has one UTC hour with 1,000,000 traffic and 750,000 errors. Four native tests completed in 111.88 seconds in debug mode; this is not packaged release timing.

Browser validation: `node scripts/test-native-logs.cjs` — passed with native IPC mocked. Verifies counts and parsed/unrecognized coverage, literal hostile paths, quoted summary exports, parser-error recovery, loader release, and reset.

Changes: parsing is offloaded to a blocking worker; malformed regex/read errors are surfaced; timestamps are parsed and normalized instead of byte-sliced; JSON requires valid status and IP; gzip matching is case-insensitive and supports concatenated members; tied aggregate ordering is deterministic. Tables render log paths literally. Exports use the shared CSV writer and describe failed requests accurately. No executable rebuild had occurred at the earlier two-strike pause. User authorized resuming; subsequent native and browser validation passed.

Limits: only the top 20 entries per category are exported. Threat flags are heuristics, not confirmed attacks. Unknown timestamps contribute to traffic/errors but cannot establish per-minute auth bursts. Charts still scale with hour-bucket count. Cancellation and native total-memory measurement are not covered. Packaged-app large-file responsiveness remains a live retest.

Live retest: user confirmed million-line dashboard counts and responsiveness. Follow-up chart correction renders one-hour traffic/errors as two labeled points without area fill; browser canvas checks assert two points, no filled area, and the full UTC label. Table header now reads Failed requests. Packaged retest of this display correction is pending.
