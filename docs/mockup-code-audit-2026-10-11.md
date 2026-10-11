# Mockup Generator and Code to Image audit — 2026-10-11

Scope: local generated website, Microsoft Edge, synthetic PNGs, actual downloads and source inspection. No tool implementation changes in this audit.

## Confirmed findings

1. **High — Code to Image default PNG export does not work.** The SVG embeds `lineNumbers.innerHTML`, which contains HTML `<br>` tags that are not closed in XML. DOMParser reports an opening/ending tag mismatch; Image emits an error. The promise has no image-error rejection, so no download occurs and the button stays disabled.
2. **High — disabling line numbers does not fix export.** The Blob-backed SVG uses foreignObject; after drawing it, Canvas `toBlob` throws `Tainted canvases may not be exported` in Edge. The throw occurs in an asynchronous callback outside a catch, and the download button remains disabled. Replace this path with an export implementation that works in the target browser and catches rendering/encoding errors with control restoration.
3. **Medium — Code to Image omits long code from the preview.** A 500-character line yields a 549-pixel textarea client width and 3851-pixel scroll width with overflow hidden. The preview cannot display the complete line. Export separately uses non-wrapping `<pre>`, so once export is repaired, capture width/overflow must match the documented preview behavior. Choose horizontal scrolling or a deliberate wrap mode and test exports of full content.
4. **Medium — Mockup stale reads replace newer selections.** Hold old blue PNG FileReader completion, load a newer green PNG, then release the old read. `state.currentImage` center changes from green (0,180,0,255) to blue (0,0,255,255). Guard all read/decode callbacks by current operation identity. Default-demo loading also has no operation guard (source finding).
5. **Medium — corrupt Mockup input leaves an old image silently exportable.** Selecting invalid JPEG bytes retains the previous `state.currentImage`, with Download still enabled and no visible error. Reader and Image lack error handlers. Report the failed file and make current/previous output status explicit.
6. **Medium — Mockup clipboard errors escape the catch.** A controlled clipboard rejection generates an uncaught page error; the surrounding try/catch cannot catch a rejection inside Canvas's async callback. The label remains unchanged. Await encoding and clipboard write in one guarded flow; handle null blobs, unsupported clipboard APIs and duplicate submissions visibly.
7. **Source-confirmed Code export inconsistencies.** Export always draws macOS dots regardless of Windows/minimal selection. It hard-codes dark backgrounds and references CSS custom properties without defining them in the SVG document. Window-title text is not XML escaped; ampersands/angle brackets can corrupt export markup. An export attempt with `a & b <title>` hangs with disabled button. A shared global render canvas can be modified by concurrent copy/download jobs, and the eventual download filename is read after awaiting rendering. Output URLs are not revoked; image load/encoding errors and allocation budgets are unhandled.
8. **Copy/feature mismatch.** Code to Image advertises syntax themes but its editable content is a plain textarea with no syntax highlighting/theme engine. Mockup has a 4096-pixel maximum dimension safety rail; very large decoded source files still have no input pixel budget or failure feedback. Its shadow settings use fixed blur/offset values after downscaling the frame (source finding; not assessed across a broad fixture set).

## Passed checks

- Actual Mockup PNG pixels exactly match the canvas preview for the synthetic image and default settings (Pillow ImageChops comparison); downloaded dimensions are 272 × 320.
- Both empty-state mobile pages at 390 × 844 have no document horizontal overflow. This does not establish that long code is accessible within its hidden-overflow textarea.
- Mockup renderer caps final canvas dimensions at 4096, includes frame clipping, and uses the same Canvas for preview and PNG download.
- No source image/code upload API is present in these processing paths. Clipboard writes require browser permission and support.

## Fix order

1. Replace Code to Image's broken SVG/foreignObject export path; ensure default, line numbers on/off and Windows/minimal/no chrome all export actual PNGs. Match preview colors, title and dimensions; snapshot settings/text and restore buttons on failure.
2. Make long code visible with explicit wrap/scroll behavior and export complete content. Remove unsupported syntax-theme claims unless implemented.
3. Guard Mockup image loading and default-demo callbacks; surface corrupted inputs and add input size checks.
4. Make copy/download asynchronous operations catch errors, handle null encodes, prevent duplicates and revoke URLs safely.
5. Compare saved pixels across frames, transparent/gradient backgrounds, long/Unicode text, unusual titles, delayed loads/encoding and loaded mobile layouts.

Evidence: `scripts/audit-mockup-code.cjs`, `scratch/mockup-code-audit/results.json`, screenshots, preview.png and mockup.png. No valid Code to Image PNG was produced by the current export path, so output-style findings are source-based until the pipeline is fixed. Clipboard errors were injected to test failure handling; image replacement uses controlled read delay.

No source fixes or publishing in this batch. Cross-browser exports, extreme memory pressure, font substitution and broad visual fixture coverage remain untested.


## Remediation verified locally

Code to Image now draws gradients, plain text, line numbers, title and selected chrome using native Canvas primitives. SVG/foreignObject and XML interpolation are removed. Unicode and special title characters are drawn as text. Long lines are horizontally scrollable in the editor; the PNG contains the complete line and may expand beyond the selected minimum width, as explained in the UI. Dark code/header colors are explicit and readable in either site theme. Transparent backgrounds and 2× output are supported, with 25-million-pixel / 10,000-pixel side limits. Copy and Download share a guarded export flow that snapshots text/settings/name, prevents competing jobs, handles encoding/clipboard errors, restores controls and revokes download URLs after a delay.

Mockup image reads, decodes and the initial demo are guarded by operation identity. Starting a new load clears old image state and disables export; errors are visible. Inputs use the shared decoded-image pixel budget. Copy/download encode a private canvas snapshot, guard duplicates and suppress obsolete exports after file replacement. Encoding and clipboard failures are awaited and reported. Existing 4096-pixel output dimension cap remains.

`node scripts/test-mockup-code.cjs` passed actual downloads for default code, Unicode/special titles, all four chrome options, line numbers on/off, transparency and a 500-character line; oversized output rejection; immutable export filename; clipboard denial/null encode recovery; Mockup downloads across dark/light macOS, Windows, glass and no frame; delayed older read suppression, corrupt input, export replacement cancellation and mobile overflow, with no uncaught page errors. Pillow comparison confirmed exact Mockup preview/download pixels across the tested frames; code files are readable PNGs, long-line output is 7,986 pixels wide, transparency survives and chrome selections produce different images. Visual inspection caught and corrected inherited black header text, and focused tests passed again.

Source/generated script and JSON syntax passed. The scoped builder now refreshes the preserved application description from current source metadata, avoiding stale syntax-theme claims in generated structured data. Evidence: `scratch/mockup-code-fixed/`. Changes remain local and unpublished.

Code rendering is intentionally plain text, without syntax highlighting. Native code exports follow the chosen styling and complete-content policy, rather than claiming pixel-identical capture of the editable HTML controls. Browser font substitution and broad cross-browser coverage remain untested.
