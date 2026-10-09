# Native Finance ledger plan — 2026-10-09

Local release executable rebuilt at 15:37 IST, 2026-10-09: `src-tauri/target/release/tangent-desktop.exe`, 49,446,912 bytes, SHA-256 `7D2279B243408E9A36CA279E318E1069ABC28EA12292BB7B3983B5D703070CEA`. This build adds `dialog:allow-message` after the sample retest exposed `plugin:dialog|message not allowed by ACL`. Validated all capability identifiers against the installed schema and verified Tauri's generated capability includes the message permission for the main window; capability source predates the executable. The user confirmed the live app retest completed without errors. Targeted Finance tests, shared tabular and Open-in regressions passed for the Finance implementation. No installer update or Git push was performed.

Source review: `src/tools/finance-dashboard.html`, `desktop/src/finance-dashboard.html`, `desktop/src-tauri/src/finance.rs`, and shared tabular import/export and native editor sessions. The user approved the all-or-nothing policy. The native implementation now lives in `src-tauri/src/finance_native.rs`; the previous command remains available for compatibility but the Finance page uses the new route.

## Existing behavior to preserve

- Desktop CSV/TSV/XLSX preparation with worksheet/header review, single statement and multi-file merge, column mapping and header guesses.
- Date, description, amount and optional category mapping. First matching case-insensitive description keyword overrides the imported category; empty categories become Uncategorized.
- Desktop amounts remove dollar signs, commas and quotes; parentheses indicate negatives. ISO, US-first slash, unambiguous day-first slash and workbook date forms normalize to ISO. Unknown dates currently retain their source text.
- Chronological ledger order, inflow, absolute outflow, net flow, expense category totals and monthly inflow/outflow chart.
- Budget targets, keyword rules, reanalysis after applying budgets, progress bars and over-budget amounts.
- Recurring-payment hints group negative transactions by the amount formatted to two decimals and exact description, require two occurrences, return up to 15 sorted by amount. They do not establish that a transaction is a contractual subscription or verify regular intervals.
- Description/category search affects the displayed ledger only. Dashboard totals, export and Open in use all analyzed transactions. Preserve this distinction explicitly in labels.
- CSV/TSV/XLSX ledger export, independent handoff snapshot, reset and separate workspaces.

The web baseline additionally has income/expense and category doughnuts plus a daily net chart. Desktop currently has a monthly inflow/outflow canvas instead. Record this existing difference; the performance refactor must not accidentally remove further controls. Adding chart modes is a separate UI decision.

## Architecture

Rust owns an immutable per-workspace ledger and its input references. Parsing, rules, chronological sorting, totals, recurring-payment counting, search and export run off the async command executor in blocking workers. Do not clone entire transactions into subscription groups; retain count and representative metadata. Send report metadata and summaries, never the complete ledger, across IPC.

JavaScript keeps mappings, budget/rule controls, charts, loading/error state and a 100-row ledger page. Search is debounced and runs in Rust; Previous/Next controls show matching count and page range. Request generations prevent old search/page responses from replacing a newer view. Render statement text via textContent.

Use existing native tabular handles for editor handoffs and native imports, avoiding the legacy JSON snapshot route. Retain worksheet/header review. Header discovery must inspect only the candidate prefix rather than read every record. Parse CSV with its record parser so quoted newlines remain intact.

Proposed commands: open_finance_ledger, read_finance_page, release_finance_ledger, export_finance_ledger and snapshot_finance_ledger. Opening returns a ledger ID, row count, summaries and import warnings. Pages are bounded by row and response-size policy; very long fields need a visible truncated preview without altering the full exported value. Exports stream all ledger rows and snapshots use a native handle suitable for downstream tools.

Release the old ledger only after a replacement is successfully ready; release on reset/workspace close. Failed or cancelled imports keep previous work. Reapplying rules creates a replacement ledger using retained inputs rather than reading full data into JavaScript. Independent handoff snapshots must survive source closure and rule changes.

## Liability check and parser decisions

All processing and storage remain local. No new network dependency or encryption claim is introduced. Recurring-payment copy must describe a heuristic. Show invalid amounts/dates, unreadable files, missing mapped columns and skipped records visibly; never claim complete financial totals after silently discarding an input. Non-finite amounts must be rejected or flagged, not allowed into totals. Invalid source dates need safe Unicode handling; current byte slicing can panic.

The current web currency parser and Rust parser differ. Preserve known desktop dollar/parentheses behavior in parity fixtures; broader currency interpretation and decimal-arithmetic migration need explicit specifications rather than an incidental speed change. Current f64 totals are a baseline, not an accounting-grade guarantee. Decide whether partially failed multi-file imports must fail atomically or allow a clearly identified partial analysis before implementation.

## Validation gates

Golden fixtures for current totals, date forms, quoted commas/newlines, currency signs/parentheses, zero/missing values, rules and rule precedence, budget totals, recurring hints and merged files. Verify invalid/non-finite values and missing mapped columns cannot silently produce a complete-looking report.

Actual-page tests for bounded ledger DOM/IPC, search across unseen pages, stale responses, reanalysis, all-row export despite search, handoff independence, failure/replacement, cancellation and native resource release. Native export rows and totals must match the ledger. Stress-test a million-row financial fixture with varied dates/descriptions/categories, then wide and long-field inputs; record UI heartbeat, duration, native/process memory and response size. Do not use an arbitrary customer CSV as proof of financial correctness.

## Implemented decisions and validation

Reject the replacement analysis if any selected file cannot be read, lacks required mapped columns, has malformed records or contains invalid/non-finite non-empty amounts. Retain previous work and report the affected file. Blank amounts retain the zero-value baseline with visible warnings. Unknown dates remain in financial totals and export, with warnings and an Unknown date chart bucket. This corrects unsafe date byte slicing without dropping amounts.

The ledger is a four-column native editor session, so existing native CSV/TSV/XLSX writers, immutable snapshots and downstream tools are reused. Closing/reset releases the ledger and owned input handles. Native handoffs fork the input handle; TSV/XLSX picker imports retain review and create native inputs. CSV paths use streaming record parsing and prefix header discovery. CSV reanalysis rereads the selected source paths; native-input reanalysis uses retained input sessions. Import-dialog cancellation preserves prior work. Running analysis must finish before workspace close; mid-analysis cancellation is not implemented.

Search is a debounced native scan with a 100-row response; unfiltered paging directly accesses the requested range. Summaries expose only requested budget categories, monthly totals and the existing top-15 recurring hints. Long preview text is clipped to 512 characters with a visible note; the ledger and exports retain full values. Rendering uses safe text/escaping. Analysis has green timing diagnostics; total process/native memory is not measured by the UI panel.

Passed native fixtures: totals, category overrides, recurrence counts, date and currency forms, paged search, atomic failure, quoted/multiline CSV with preamble, Unicode preview and native CSV export row count/net total. The actual-page mocked-IPC test covers million-row metadata, DOM bounds, stale searches, native export, failure preservation, replacement, handoff and release. Shared actual-page CSV/TSV/XLSX import regression checks passed.

Million-row native financial CSV stress test: 8,432 ms parsing/analysis, under 1 ms final-page fetch, 1,065 ms search; report 1,569 bytes and page 14,723 bytes. Expected inflow 100,000,000, outflow 90,000,000 and net 10,000,000 matched exactly. These measurements exclude native input generation, WebView IPC/rendering and user-file format differences. They are not a total-memory measurement or an accounting certification. A real WebView laptop retest remains necessary.

Retest with `finance-sample.csv`: five transactions; inflow 10,000.00, outflow 117.48, net 9,882.52. The Streaming service hint should show 15.99 with two matches. Search for Grocer, confirm totals stay unchanged, and export all five rows. Then test a larger financial file, record the green analysis timings, and transfer the result to Editor/Insights. Confirm a source error leaves the previous analysis available. The older testing installer has not been repackaged.

## Live laptop validation — 2026-10-09

The user confirmed the small sample totals and successful native dialog/export retest. The custom 1,000-row financial fixture showed inflow 114,537.50, outflow 68,674.00 and net 45,863.50; its million-row counterpart showed 114,537,500.00, 68,674,000.00 and 45,863,500.00. These match the independent fixture reference. The user also confirmed merged-file totals and demonstrated rejection of the invalid-amount fixture at record 3.

Searching Streaming service reported 100,000 matching transactions. Exporting the filtered million-row ledger and reopening Unified_Ledger.csv in Tabular Editor displayed all 1,000,000 rows and four canonical columns, confirming search does not restrict export.

The earlier generic customer dataset measured 10.6 seconds for Finance analysis and 1.9 seconds for Finance-to-Editor transfer, with a 0.11-second largest UI heartbeat gap. Those timings are throughput evidence, not financial-fixture timings. Live budget/rule and recurring-hint checks, total process memory, and mid-analysis cancellation remain outside these confirmed results. The older installer remains unrepackaged.