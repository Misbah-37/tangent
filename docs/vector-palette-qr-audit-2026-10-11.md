# SVG, Palette, and QR website audit — 2026-10-11

Scope: generated local website pages for SVG Optimizer, Color Palette Generator, and QR Generator. Audit only; production source unchanged.

Reproduction: `node scripts/audit-vector-palette-qr.cjs`, Edge headless, actual uploads and downloads. Evidence: `scratch/vector-palette-qr-audit/results.json`, saved SVG/PNG downloads and mobile screenshots.

## Confirmed findings

### SVG Optimizer
1. **High: uploaded active content executes in the website origin.** A valid SVG containing foreignObject XHTML img with a harmless onerror sentinel set window.auditSentinel to 29. Preview inserts untrusted markup through innerHTML. Root SVG onload did not fire in this test; foreignObject execution did. This also undermines the no-network guarantee: image source attributes are live. Fix with an isolated, noninteractive image preview and explicit active-content/external-resource policy for exports; reject unsafe/non-SVG input.
2. **High: hidden-node removal deletes visible artwork.** A visibility=hidden group with a visibility=visible rectangle descendant becomes an empty SVG. Preserve inherited visibility overrides and referenced definitions; do not equate visibility with display.
3. **Medium: valid comma-separated viewBox is corrupted.** `0,0,100,80` becomes `0`. Tokenize valid SVG number lists instead of splitting only whitespace. Saved 200x160 PNG remains red in this simple fixture because explicit dimensions masked the invalid viewBox; no claim of pixel damage from that particular fixture.
4. **Medium: malformed XML remains downloadable without a visible validation error.** `<svg><rect></svg>` is retained as output with the download enabled. Raster exporter has no image error handler, null-blob protection, or dimension limits (source review).
5. Source review: stale FileReader completions have no operation guards; precision regex is not a complete SVG number tokenizer; growth metrics can show a doubled sign. Further regression fixtures needed during implementation.

### Color Palette Generator
1. **High: unsuccessful replacement retains stale copyable CSS.** After a valid blue image, fully transparent input shows an extraction error but leaves prior CSS; corrupt JPEG leaves that CSS and results visible without decode feedback.
2. **Medium: clipboard denial falsely reports success.** Rejected writeText produces an unhandled page error while the button says Copied to Clipboard.
3. **Medium: solid image produces repeated swatches.** Six labels show only two nearly identical quantized colors, including exact duplicates. Deduplicate colors and report the number actually found.
4. Source review: reset/new uploads do not invalidate reads, no read/decode error handlers or explicit dimension limits; high-resolution downsampling claim is not implemented by the tool itself. Validate extraction lifecycle and bounded canvas allocation in the fix.

### QR Generator
1. **High: Wi-Fi credentials are not encoded faithfully.** SSID `Cafe;Guest` and password ` secret:pass; ` produce `WIFI:S:Cafe;Guest;T:WPA;P:secret:pass;;;`. Delimiters are unescaped and meaningful password spaces stripped. Add escaping, preserve credentials, and verify decoded exported payloads.
2. **Medium: text mode silently removes whitespace.** `  exact text\n` becomes `exact text`. Preserve exact raw text; distinguish empty input from demo content.
3. **Medium: excessive text throws without actionable feedback.** 5,000 characters causes Cannot read properties of undefined (reading '3'); a canvas remains in the DOM, so canvas existence does not prove a valid current code. Validate capacity, catch generator errors and disable export of invalid results.
4. **Medium: image clipboard rejection escapes outer try/catch.** Controlled denial produces an unhandled page error from the asynchronous toBlob callback. Await encoding and clipboard write; handle null encoding.
5. Source review: vCard field escaping and color contrast validation absent. Page advertises SVG export, but only PNG and image-copy controls/implementation exist. Correct the claim or implement SVG output.

## Working checks and limits
- Actual SVG and QR PNG downloads completed. SVG raster fixture is readable at 200x160; independent QR decoding is not yet performed.
- QR resolution control changes canvas width to 1200 correctly (inline change handler exists).
- All three initial pages fit a 390px viewport without document horizontal overflow. Loaded/error/mobile states require follow-up coverage.
- No files published, committed, or production tool changes made by this audit.

## Implementation order
1. SVG active content isolation and validation, then rendering-preserving optimization and guarded exports.
2. Palette upload/reset lifecycle, clear stale outputs, limits, honest extraction/copy states.
3. QR faithful payload encoding, capacity/error states, safe copy/export and accurate feature copy.
4. Add focused actual-file regression checks, mobile loaded states, and independent QR decoding.

## Remediation completed — 2026-10-11

- SVG: isolated image preview; reject active elements, event handlers, external resources, document types/entities, xml:base and escaped CSS. Invalid files disable output controls with visible feedback. Fixed built-in sample namespaces. Preserve visibility overrides, identified definitions and path numbers; correctly parse comma-separated viewBox. Preserve xml:space. Guard asynchronous loads and PNG exports, limit file size and output dimensions, catch decode/null encoding errors, revoke URLs and correct size-growth signs.
- Palette: operation guards invalidate reset/replacement reads; clear old CSS immediately; handle read/decode/extraction failures visibly. Downsample to a maximum 256px side before extraction after input size validation. Deduplicate exact colors and report actual count. Await clipboard operations and report denials honestly.
- QR: escape Wi-Fi separators and preserve credential spaces; preserve raw text whitespace; escape vCard fields and use CRLF. Require network/contact/text input rather than silently substituting sample credentials. Bound UTF-8 payload size, catch generation failures, enforce dark foreground/light background contrast, and add a four-module quiet border. Only export valid results. Await clipboard encoding/write and handle null encoding. Correct unsupported SVG download claims.

Validation: `node scripts/test-vector-palette-qr.cjs` passed in Edge with styles served correctly. Actual SVG/PNG downloads checked; Pillow verifies 200x160 output and visible red artwork. Independent jsQR decoder verifies default QR, exact whitespace, special-character Wi-Fi credentials, and the saved Wi-Fi PNG. Failed/transparent image replacements, reset during read, palette uniqueness, clipboard denials, null QR encoding, oversized QR input, resolution recovery and styled 390px mobile layouts passed with no uncaught page errors. Initial audit's mobile assertion was insufficient because the audit server lacked the CSS MIME type; the final test server fixes that and checks no overflow with scrollbar allowance.

Limits: SVG accepts self-contained static graphics; active HTML/animation and external resources are intentionally rejected with feedback. QR scanning across physical prints/devices still requires user testing; independent software decoding does not guarantee every scanner. Input-image dimensions are checked after browser decoding. Scoped generated pages rebuilt; changes remain local and unpublished.
