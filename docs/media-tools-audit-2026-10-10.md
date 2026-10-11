# Media tools audit — 2026-10-10

Scope: current local generated Photo Scrubber, Photo Resizer and Bulk Watermarker pages. Synthetic images only; headless Microsoft Edge, actual downloaded outputs, Pillow and ZIP inspection. Tool source was inspected but not modified in this batch.

## Confirmed findings

1. **High — silent batch file loss in Scrubber and Watermarker.** Two distinct PNGs named `same.png` produce a ZIP containing only one entry (`same_clean.png` or `same_watermarked.png`). JSZip replaces the first entry. Preserve every input with collision-safe output names, including names colliding after extension conversion.
2. **High — stale output after Clear in all three tools.** Holding canvas encoding until after Clear reproduced Scrubber batch downloading an old ZIP while reporting “Cleaned 0 photo(s)”; Resizer restores a completed download after reset; Watermarker automatically downloads after Clear and enables Process despite an empty queue. Single Scrubber completes against cleared selection and reports a null `size` error. Snapshot operation inputs, invalidate pending work on Clear/replacement, and check validity after every asynchronous boundary, including ZIP creation. Watermarker settings and queue are read live inside its export loop.
3. **Medium — incorrect Watermarker output extensions.** An accepted SVG produces `vector_watermarked.svg` containing PNG bytes because Canvas falls back for unsupported SVG encoding. Select supported output formats deliberately and derive extension from actual Blob MIME type. Scrubber's “Preserve Original Format” similarly accepts unsupported image types but assumes JPEG extension unless the requested type is PNG/WebP (source finding; not separately exported in this audit).
4. **Medium — corrupt image processing has no useful completion/error.** Watermarker stays disabled at “Processing 1 / 1...” for a corrupt JPEG; its reader/image promises have no rejection handlers. Scrubber inspector stays at “Reading EXIF data...” for the same fixture. Resizer also has no image error handler (source finding). Report failures, restore controls, and prevent a stale prior image from being used.
5. **Medium — invalid Resizer dimensions fail silently.** Width zero triggers a zero-sized crop canvas and an uncaught `drawImage` error, leaving “Rendering lossless PNG...” without a download. HTML min/max attributes do not validate the processing function. Enforce finite positive integer dimensions and a defensible pixel budget before cropping/allocating Canvas; handle null encoding results and errors.
6. **Medium — Resizer unexpectedly removes WebP transparency.** PNG export retains transparent corners; WebP export of the same crop has opaque white corners. Code paints a white background for every format except PNG. Fill white only for JPEG, or make alpha removal an explicit option.
7. **Copy and resource handling.** Scrubber promises no compression artifacts despite lossy JPEG re-encoding and says all files process simultaneously despite a sequential loop. Watermarker claims no file-size limits despite browser memory/Canvas limits. Scrubber's metadata inspector does not establish absence of all possible GPS metadata when EXIF-js finds none. Its output JPEG includes a browser color profile: do not promise removal of every metadata block. Object URLs are repeatedly allocated without revocation in Scrubber/Resizer. Watermarker registers Clear handlers repeatedly inside file-loading and export handlers.

## Passed checks

- JPEG camera and timestamp EXIF removed in actual Scrubber download. A source EXIF rotation of 6 becomes a visually oriented 120 × 240 output, with no EXIF orientation tag remaining.
- PNG private text metadata removed and transparency retained in Scrubber output.
- Resizer PNG output has requested 100 × 80 dimensions and preserves transparency; WebP output also has requested dimensions.
- Normal Watermarker batch creates a readable ZIP and image output; the duplicate filename case reveals loss rather than an unreadable archive.
- Empty-state mobile pages at 390 × 844 had no document horizontal overflow. This does not cover every loaded control arrangement or browser.
- Source processing paths use local FileReader/Canvas/ZIP APIs; CDN dependencies are fetched for loading the tools. This is a scoped source observation, not a full network/offline certification.

## Fix order

1. Prevent duplicate ZIP entries and obsolete exports; capture stable settings/queues and handle Clear/replacement.
2. Add image/encoding errors, restore controls, validate dimensions and ensure MIME/extension agreement.
3. Preserve WebP alpha, correct unsupported claims, clean up URLs and repeated listeners.
4. Repeat actual download inspection with duplicate names, corrupted files, SVG conversion, transparent PNG/WebP, delayed reads/encoding/ZIP generation, replacement and mobile loaded states.

Evidence and reproducible browser audit: `scripts/audit-media-tools.cjs`, `scratch/media-audit/results.json` and downloaded fixtures/outputs in `scratch/media-audit/`. The audit harness intentionally exercises existing failures; it is not a passing regression suite. No deployment or publication performed. Animated/multipage images, extreme memory pressure, broad EXIF/XMP/IPTC variants and browser-specific encoders remain outside this bounded audit.


## Remediation completed locally

The three tool sources and generated pages now use a shared local image helper (`assets/media-utils.js`). ZIP filenames are unique even after format conversion; extensions reflect actual Blob types. JPEG, PNG and WebP output are supported, with other decodable formats converted to PNG. Processing snapshots queues/settings, blocks duplicate submissions, and invalidates old work on Clear, removal or replacement. Cancellation is checked after reads, encodes and ZIP creation. Watermarker registers its Clear handler once.

Corrupt/undecodable images and null encodes fail visibly and controls recover. Resizer validates whole-number dimensions before allocating Canvas, preserves WebP alpha, and limits dimensions to 10,000 per side / 25 million pixels total. The same pixel budget applies to input decoding checks in all three tools; actual browser memory limits can be lower. Old output Blob URLs are revoked when replaced or cleared. Scrubber copy now explains lossy re-encoding and the limited EXIF inspection rather than promising a complete metadata inventory or zero recompression.

Verification: `node scripts/test-media-tools.cjs` passed actual Edge downloads, duplicate filenames, SVG conversion, Clear during encoding/read/ZIP generation, replacement during encoding, stable batch settings, corrupt images, zero dimensions, null encodes and empty-state mobile overflow. `python scripts/test-media-tools-outputs.py` independently verified preserved image count, correct format signatures/extensions, EXIF and PNG text removal, JPEG orientation, requested dimensions, PNG and WebP alpha. Source and generated inline script syntax was checked; compiled pages include the shared helper. Evidence is under `scratch/media-fixed/`.

Changes remain local and unpublished. The original audit evidence is retained under `scratch/media-audit/`. The bounded-audit limits above still apply; this does not certify every image metadata format or memory-pressure scenario.
