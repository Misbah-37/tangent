# Website audit — 10 October 2026

## Fix status

The four processing defects below are fixed in the local source and generated Data Hygiene page. Regression checks passed on both the source worker and compiled page. Real Edge browser tests passed for CSV upload, mean/median imputation, invalid-date notices, keyed deduplication, and downloaded CSV values. Accounting signs, exact decimal suffix scaling, duplicate-key collisions, leap years, ISO/slash dates, and common named-month dates have known-answer fixtures. The live website has not been updated by this task.

Run `node scripts/test-data-hygiene.cjs`, `node scripts/test-data-hygiene.cjs data-hygiene.html`, and `node scripts/test-data-hygiene-browser.cjs` from the repository root.

Follow-up user report: compound word numbers, missing-value markers, and title casing were also fixed locally. The worker now handles common English compound numbers; mean/median exclude recognized missing markers and non-finite/non-numeric values, and fill blank, null, NaN, N/A, and dash cells while preserving zero. Title-case and phone selections are now included in the worker recipe. Older recipe files default missing selection lists to empty arrays. The embedded title/phone regex escapes were corrected.

The supplied extreme dirty dataset was tested through actual upload, processing, and CSV download, using a separate Python Decimal reference. After dropping one completely empty row, it retained 231 rows and imputed 76 Revenue cells: mean 1754.19, median 1000. All exported Revenue values matched, and title casing was verified. Synthetic regressions also cover compound words, zero, missing markers, selection wiring, and unavailable numeric statistics. No deployment was performed.

## Scope and evidence

First audit pass of the current generated local website and its source fragments. All 31 catalog tool pages plus the homepage were opened in headless Microsoft Edge at 1366×768. No uncaught JavaScript startup errors or failed requests were recorded during the bounded startup observation. This does not validate complete workflows, long-running initialization, or exports. The homepage was also captured at 390×844; no document-level horizontal overflow was detected.

Data correctness cases execute the actual Data Hygiene worker extracted from its source template, with the same recipe structure used by the UI. These are processing reproductions, not end-to-end upload/export tests. The deployed homepage was inspected separately; tool behavior below has not yet been independently reproduced on the deployed website.

Reproducible scripts and JSON evidence are in `scratch/website-audit.cjs`, `scratch/website-audit-results.json`, `scratch/audit-data-worker.cjs`, and `scratch/audit-data-worker-results.json`. Scratch is ignored by Git. No website code was changed during this audit.

## Confirmed processing defects — fix first

### P1 — Distinct rows are silently removed by exact deduplication

Source: `src/tools/data-hygiene.html`, deduplication key construction.

Input columns A,B, with rows `a|b,c` and `a,b|c`. Run exact deduplication. Both keys become `a|b|c`, so the worker returns one row and reports one duplicate. Expected: retain both distinct rows. Key-column deduplication has the same delimiter-based construction. Use collision-safe tuple encoding.

### P1 — Decimal magnitude suffixes corrupt amounts and imputation

Source: `src/tools/data-hygiene.html`, numeric formatting pass.

Input Revenue values `1.5k`, `2.5k`, and an empty cell. Select Revenue for numeric formatting and mean imputation. Actual output: `1.5000`, `2.5000`, `2.00`. Expected: `1500`, `2500`, `2000`. The formatter appends zeros instead of multiplying. The `m` branch has the same construction. Fix normalization before relying on aggregate or imputation results.

### P1 — Accounting negatives become positive

Source: `src/tools/data-hygiene.html`, numeric character stripping.

Input Revenue `($1,200.00)` and apply numeric formatting. Actual: `1200.00`. Expected: `-1200.00`, or an explicit unsupported-format warning. Parentheses are discarded with no preservation of their sign. This can invert financial meaning.

### P2 — Invalid dates silently roll into another month

Source: `src/tools/data-hygiene.html`, date formatting pass.

Input Date `02/31/2026` and apply date formatting to ISO. Actual: `2026-03-03`. Expected: preserve and flag the invalid source value. JavaScript's date constructor normalizes invalid calendar components; the code checks only whether the resulting Date is valid.

## Shared experience and messaging defects

### Local fix status — shared website batch

The homepage now explains the relationship between browser tools and Tangent Pro, with a hero link to a responsive Pro introduction. The introduction describes native processing and paged data views, identifies the Windows private beta, and does not offer an unavailable public download or claim unlimited capacity.

Homepage metadata no longer hardcodes a tool count. Its offline feature and FAQ explain on-demand library/model downloads, cache eviction, and the Password Shield network requirement. Browser-tool pricing copy is scoped to the browser toolkit. This corrects the homepage claims; it is not a certification that every tool works offline in a fresh profile. Further per-tool offline verification and model readiness/cache handling remain audit work.

The shared sidebar generator renders category buttons with controlled-region IDs and expanded states. Shared JavaScript updates those states on activation and search expansion, makes the closed directory inert, focuses search on opening, and returns focus to the Toolkit button on closing. Search has a label, and shared controls have visible keyboard focus styles. The generated sidebars and updated asset references are present on all 31 tool pages.

`node scripts/test-website-shared.cjs` passes: generated-control checks across the catalog; real Edge keyboard Enter/Space activation, search expansion, Escape/close focus restoration, mobile closed-directory inertness, Pro anchor links, and desktop/mobile dark/light layouts. Homepage and shared-script syntax checks pass. Screenshots at 1366 and 390 pixels were visually reviewed. The generated Data Hygiene worker regression still passes.

The final scoped build succeeded using complete-file replacement after direct writes failed intermittently with Windows `OSError: [Errno 22] Invalid argument` on different outputs. Original tool content and line endings outside the shared navigation were preserved. The precise cause of those intermittent direct-write failures was not established. No sitemap sync, external build sync, deployment, or Git push was performed.

### P2 — Offline guarantee is broader than implementation

Homepage FAQ claims loading a tool page caches all required modules and permits uninterrupted use after disconnecting. Audio Transcriber creates its Whisper pipeline inside `transcribeAudio`, after a file is submitted; Background Remover also loads model assets on demand. Page load alone cannot guarantee those models are cached. This is confirmed by source timing, not an offline browser reproduction. Replace the blanket guarantee with accurate first-use download guidance and explicit readiness status; test each tool in a fresh browser profile after disconnecting.

### P2 — Sidebar category controls cannot be operated by keyboard

`build.py` renders category headings as plain divs. `assets/tangent.js` attaches click handlers without tabindex, key handling, or expanded-state semantics. Keyboard users cannot focus and activate these category toggles. Render buttons with aria-expanded and preserve focus when opening/closing the directory.

### P3 — Homepage metadata advertises the wrong tool count

`src/index.html` description and Open Graph description say 24 utilities; the catalog contains 31. Generate the count from the catalog or remove the fixed count.

## Product and design observations

The homepage leads with privacy and a large directory, but does not explain the relationship between browser tools and Tangent Pro or provide a clear Pro discovery path. This is an information architecture gap relative to the intended first-interaction role, rather than a broken control.

On mobile, the directory produces a very long page with repeated dense card grids. Consider a prominent search, task-based entry points, and a smaller curated starting section. The mobile screenshot alone does not establish an accessibility or functional failure.

## Next audit coverage

1. Reproduce the four worker cases through upload, preview, processing, and downloaded CSV.
2. Check Correlation Matrix statistics and undefined correlations, Finance totals/search/export, SQL row preservation, and Log Analyzer parsing and timestamps with known-answer fixtures.
3. Exercise QR/image/PDF downloads and invalid-file recovery, including repeated operations and reset.
4. Test mobile tool layouts, keyboard focus, theme contrast, and offline first-use behavior.
5. Confirm critical findings against the deployed build before release verification.

Recommended first fix batch: the four Data Hygiene processing defects, with small regression fixtures. Then shared accessibility and truthful loading/offline messaging, followed by homepage design work.
