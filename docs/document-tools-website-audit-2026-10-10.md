# Document-tool website audit — 2026-10-10

## Scope and evidence

Audited the local generated Data Extractor, PDF Converter, PDF Redactor, and Document Signer pages in Microsoft Edge at 1366×900 and loaded pages at 390×844. Source inspection covered their `src/tools/` fragments. Production source/generated pages were not changed during this audit.

The known-answer fixture has three pages, mixed 400×300 and 600×400 point dimensions, a 90-degree rotated third page, visible page labels, a secret text marker, a public text marker, and private author/title metadata. Saved outputs were examined with pypdf; redaction/signature outputs were rendered with PDF.js and inspected as PNGs. Poppler was unavailable. This validates these fixtures, not every PDF feature.

Ignored evidence lives under `scratch/pdf-audit/`: `browser-results.json`, `followup-results.json`, `remaining-results.json`, `pdf-structure-results.json`, downloaded CSV/TXT/PDF files, and rendered PNGs. Reproduction harnesses: `scratch/audit-document-tools.cjs`, `scratch/audit-document-followup.cjs`, `scratch/audit-document-remaining.cjs`. Harness-only mistakes are excluded from the findings: a premature duplicate initial canvas render and an incorrect image-tab ID. The later rapid-navigation canvas error uses a separate completed-load case and is reproducible.

## Confirmed findings

| Priority | Tool | Reproduction and result | Required correction |
| --- | --- | --- | --- |
| P1 | PDF Converter | UI/FAQ promises AES. Actual encrypted output has `/V=1`, `/R=2`; pypdf maps this to `RC4_40` with a 40-bit key. The password rejects a wrong value but the implemented algorithm contradicts the claim. | Replace with verified, interoperable PDF AES encryption; disable the outdated encryption option while a proper implementation is unavailable. Do not present this output as AES. |
| P1 | PDF Converter | Valid range `1-2` fails with `Cannot read properties of null (reading 'value')`; no download. `splitPdf()` reads `splitPassword`, but the page has no element with that ID. | Remove the dangling dependency or provide a correctly supported control, then verify real page extraction/download. |
| P1 | Document Signer | A page-1 stamp at canvas x=60,y=80,w=100,h=40 renders at PDF bounds (40,53)-(107,80) when page 1 is active. Exporting the same stamp with the differently sized page 2 active moves it to (27,40)-(71,60). Export uses the currently displayed canvas dimensions for every stamp. | Store placement in page-local PDF coordinates or normalized coordinates with the original viewport; export each page independently of the active page. |
| P1 | Document Signer | A stamp at x=60,y=80 on rotated page 3 should appear near (40,53) in its displayed coordinates. Export places red pixels at (240,53)-(260,142), rotating/resizing the stamp incorrectly. | Apply the actual page viewport transform and inverse PDF transform, including page rotation. |
| P1 | Document Signer | After completing a load of a new PDF, the prior document's stamp remains (`placedStamps.length=1`). | Reset document-specific stamps/history after a successful replacement; handle unsaved placements explicitly. |
| P2 | Data Extractor | Before any file upload, paste a table and extract. Clear stays hidden; invoking its click does not clear input/results. The input/Clear listeners are nested inside `handleFile()`. Upload followed by Clear does work. | Attach listeners once during initialization, outside the file-loading function. |
| P2 | Data Extractor | A rowspan table exports rows `[Name,Value]`, `[A,1]`, `[2]` instead of `[A,2]` in the last row. Values shift into the wrong column. | Expand rowspan/colspan into a rectangular grid while preserving cell positions. |
| P2 | Data Extractor | An outer table containing an inner table yields `[Table 1,OuterInner,Inner,Tail]`, `[Table 1,Inner]`, `[Table 2,Inner]`. Descendant rows/cells are counted repeatedly. | Restrict each table to its own rows/cells and define how nested tables are represented without duplication. |
| P2 | Data Extractor | After success, extracting HTML without a table alerts but leaves the old preview and Export control visible. | Clear or explicitly retain/label previous results consistently; disable exports of failed current extraction. |
| P2 | Data Extractor | Clear during a delayed HTML read is undone when the read completes (`old content` returns). | Invalidate closed/replaced reads and manual edits using an operation token. |
| P2 | PDF Redactor | Start a delayed PDF read, close the document, then let the read finish. It restores a loaded PDF and displays the workspace. | Cancel/invalidate pending loads/renders on Close and replacement. |
| P2 | PDF Converter | Start Merge and clear the queue during a delayed read. The operation finishes with `Successfully merged 0 documents` and restores the Download control despite the queue being empty. | Snapshot input files and discard operation results after queue reset/replacement. |
| P2 | PDF Converter | A 400×300 point page becomes 1000×750 in encrypted output; all page dimensions grow by 2.5. Raster pixel sizes are treated as PDF points. | Keep source point dimensions while rendering at a higher raster resolution. |
| P2 | Document Signer | Rapid navigation after a completed load causes `Cannot use the same canvas during multiple render() operations`. | Cancel/serialize render tasks and ignore obsolete page completions. |
| P2 | Document Signer | Uploading a corrupt PDF produces an uncaught `InvalidPDFException`; the signing workspace remains visible. | Catch loading errors and restore a coherent document state with a visible error. |
| P2 | PDF Converter | Range token `1abc` is accepted by `parseInt`; instrumenting the actual `copyPages` call records page index 0 before the separate missing-password-field failure. | Validate complete range tokens, bounds, and malformed ranges before copying pages. This case did not produce a download because of the independent P1 error. |

## Checks that passed

- Ordinary HTML table CSV download preserves the known two-column fixture. Preview uses textContent rather than rendering extracted text as HTML.
- PDF Merge produces all six pages in source order, preserving page dimensions, rotation, and text. Private author/title metadata is absent from this output.
- PDF text extraction includes all three page labels and both text markers, including the rotated page.
- Compression retains all three pages, source sizes/rotation, and text; the small fixture shrinks from about 2.0 KB to 1.5 KB.
- One-image conversion creates a readable one-page PDF.
- Redaction export retains the three pages and their displayed dimensions. The covered secret is replaced by black pixels; public content remains visible. pypdf finds no text layer on any page and no source author/title metadata. This is raster burn-in, not merely a removable rectangle over live text.
- The Signer includes a visual-signature disclaimer. It does not claim to supply a cryptographic signing audit trail.
- Loaded mobile pages showed no horizontal document overflow or controls beyond the measured viewport. This does not establish complete touch usability.

## Fix order

1. Address the false AES promise and outdated encryption output.
2. Fix Signer page-local coordinates, rotation, and document replacement state; verify saved pixel placement across mixed-size pages.
3. Restore PDF page extraction and validate ranges with actual downloaded results.
4. Correct Extractor listeners, span/nested-table handling, stale results, and delayed reads.
5. Add operation guards/render cancellation and corrupt-file recovery across PDF tools.

Each change should include known-answer saved-output tests before release. No live deployment, commit, or production-code fix was performed in this audit.

## Limits

Not tested exhaustively: AcroForm persistence, existing cryptographic signatures, encrypted input variants, crop boxes differing from media boxes, very large PDFs, scanned OCR, all signature drawing/upload options, full offline operation, browser diversity, and touch gestures. Signature replacement was rechecked only after load/render completion; the earlier fixed-delay sample is not used as evidence for page-number state. The redaction fixture confirms burn-in for its covered area, not a universal guarantee for all confidential content in all PDFs.

## Fixes and regression validation

Implemented locally after the audit. Source fragments and the four generated pages were updated; no deployment or commit occurred.

- Removed the RC4 export path and its AES claims. The PDF Encryption tab now says password encryption is temporarily unavailable. Merge's password option was removed, and an older direct encryption call fails explicitly. A verified interoperable AES implementation remains future work; this change contains the unsafe option rather than providing a new encryption engine. The old encrypted-output page-size bug is no longer reachable.
- Signer placements retain their own page viewport transform. Vector export maps each stamp through that transform, including PDF rotation and user stamp rotation. Fallback export uses each stamp's stored viewport dimensions and each page's displayed point dimensions. Neither path depends on the currently viewed page.
- Signer clears stamps after a successful new document load, catches invalid PDFs without an uncaught rejection, cancels obsolete render tasks, and snapshots exports so replacement cannot change an in-progress result.
- A further measured mobile issue was fixed: a 600-pixel canvas displayed at 269 CSS pixels previously left a stamp at 60 CSS pixels instead of 26.9. The overlay now scales with the canvas, including container resize, and drag/resize deltas use that scale. Stamp image bounds match export bounds; the selection decoration does not add padding inside the image.
- PDF page extraction no longer references a missing password field. It validates full range tokens and bounds before copying pages. Queue/reset operations invalidate pending merge/split results.
- HTML Extractor installs listeners once, expands row/column spans, separates nested tables without duplicating cells, clears stale results, and invalidates reads after Clear or edits.
- Redactor ignores closed/replaced loads, cancels stale renders, and snapshots export state. Burn-in behavior is retained.

Validation passed:

1. `node scripts/test-document-tools-syntax.cjs` — scripts in both source and generated pages.
2. `node scripts/test-document-tools-browser.cjs` — real Edge downloads, pasted/file extraction, merged cells/nesting, stale results and cancellation, split/merge, disabled encryption, redaction export/Close, Signer replacement/corrupt input/rapid navigation, forced fallback export, user stamp rotation, and loaded mobile layouts and overlay/image geometry.
3. `scripts/test-document-tools-outputs.py` with the bundled Python runtime — saved signature bounds stay identical when a different-size page is active; rotated-page and fallback bounds agree within one pixel; vector outputs retain original text/rotation; split/merge page order is correct; redaction removes text and metadata and covers the target pixels.
4. Scoped rebuild and diff whitespace checks passed.

To recreate the synthetic browser fixtures, run `scripts/create-document-test-fixtures.py` with Python packages reportlab, pypdf, and Pillow. Tests use `scratch/pdf-fixed/`; original audit evidence remains under `scratch/pdf-audit/`. The audit limits above still apply, particularly existing cryptographic signatures, AcroForms, unusual crop boxes, large PDFs, and full touch/offline coverage.
