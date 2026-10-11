# HEIC Converter and Background Remover audit — 2026-10-11

Scope: current local generated website; tool source inspected without modification. Actual Edge downloads, one upstream HEIC sample and synthetic PNG inputs. Controlled Transformer responses isolate lifecycle errors; a separate unmodified model-loading test checks real integration.

## Confirmed findings

1. **High — HEIC filenames are interpreted as HTML.** Loading a synthetic file named `<img src=x onerror="window.auditInjection=true">.heic` executes the handler in the loading card. The output name is also interpolated into text, `title` and `download` attributes without escaping. This can affect page content and run script in the page context. Use DOM nodes/textContent and property assignments for untrusted filenames; never interpolate them into HTML.
2. **High — duplicate HEIC filenames silently lose ZIP entries.** Two real inputs named `sample.heic` generate two visible individual downloads but a ZIP containing only `sample.jpg`. Preserve all inputs with collision-safe names shared by cards and ZIP entries.
3. **High — older Background Remover jobs overwrite newer results.** Hold job A's inference, complete job B with an empty synthetic mask, then release A with a full mask. Result alpha at (40,30) changes from 0 to 255, despite B being the newer selected file. Shared `originalImg` and mask state cross asynchronous jobs. Capture local per-job image/mask state, invalidate older work and guard every asynchronous publication/progress callback.
4. **Medium — model “cached” state is recorded before loading succeeds.** A controlled model-load failure leaves `tangent_bg_model_cached=true`. This flag only records a prior button click; it does not establish model availability. It also bypasses the download prompt after cache eviction. Track download permission separately from verified in-memory/cache readiness; do not promise offline availability based on localStorage.
5. **Medium — Background Remover fails silently on null PNG encoding.** Forcing Canvas `toBlob` to return null triggers uncaught `createObjectURL` overload failure with no useful download error. Guard null blobs, block duplicate exports, snapshot output and invalidate pending downloads when the image changes. Revoke Blob URLs after downloads have had time to start, not immediately.
6. **Medium — false HEIC metadata preservation promise.** Tool states timestamps, orientation and camera models remain perfectly intact, but it only calls heic2any and contains no metadata-copy step. The decoder's own documentation states metadata is not transferred. The real test JPEG has no EXIF; the chosen input sample itself has no Exif marker, so this sample alone does not demonstrate loss of known source tags. Correct the promise rather than claiming preservation.
7. **Error/detail and input consistency issues.** Invalid HEIC yields only a generic “Failed” card with details in console; the badge still counts prior successes. Drop filters only `.heic`, while the picker submits every selected file. `.heif` is not accepted by the drop path. Background Remover's native image load awaits only `onload`, so corrupt images can stay pending (source finding, not separately reproduced with real model). There are no image pixel-budget checks or operation-level cleanup of source object URLs. Mask state should be cleared on failed/new jobs and downloads hidden until a valid current result exists.
8. **Copy exceeds tested behavior.** Background Remover claims any photo, instant future offline processing, and blanket commercial clearance. The model card describes portrait matting; cache availability, runtime assets, hardware and dependency terms are separate concerns. HEIC conversion is sequential within a batch and concurrent across submissions, without cancellation, Clear controls, memory limits or reliable global in-flight status. Multi-image output is reduced to its first Blob; disclose that only a primary still image is exported rather than implying burst/animation preservation.

## Passed checks

- Actual heic2any conversion of upstream demo `1.heic` creates a readable JPEG (1440 × 960); an individual downloaded file opens in Pillow. Bad HEIC is caught and represented by a failure card.
- Real, unmocked Transformers.js 2.17.1 loaded processor/config, quantized MODNet and ONNX WASM, completed local inference on a synthetic PNG and downloaded a PNG. No page errors occurred in this test. This validates integration, not semantic cutout quality on portraits or arbitrary objects.
- Controlled model export preserves alpha: PNG (80 × 60) has alpha range 0–255. Consent Cancel restores the empty state.
- Empty-state mobile pages at 390 × 844 had no document horizontal overflow.
- No image-upload path appears in the tool processing source. Dependencies and model files are network downloads; clicking the first-run consent controls the model-loading attempt. The module dependency loads before that consent. No offline-cache guarantee was tested.

## Fix order

1. Eliminate HEIC filename HTML injection and duplicate ZIP names.
2. Isolate Background Remover job state; invalidate stale inference, progress and export callbacks.
3. Separate download permission from readiness; handle decode/encode failures, cleanup URLs and add pixel budgets.
4. Add consistent HEIC/HEIF validation, useful per-file errors, stable batch/ZIP state and explicit primary-still/metadata limitations.
5. Retest real HEIC and real model integration alongside controlled race/error tests and downloaded PNG/JPEG/ZIP inspection.

Evidence: `scripts/audit-image-ai.cjs`, `scripts/audit-background-real.cjs`, `scratch/image-ai-audit/results.json`, `real-model-results.json` and actual downloaded images/ZIP. The HEIC fixture comes from https://github.com/alexcorvi/heic2any/blob/master/demo/1.heic (downloaded from the upstream raw file). Controlled-model tests are explicitly synthetic and do not measure segmentation quality.

Primary references: decoder limitations https://github.com/alexcorvi/heic2any and model card https://huggingface.co/Xenova/modnet. Existing page metadata-preservation text conflicts with the decoder's documented behavior; the model card's Apache-2.0 label does not substantiate blanket clearance for every dependency.

No source fixes, deployment or publication in this audit batch. Orientation/crop/HDR/color fidelity across diverse HEIC files, multi-frame containers, semantic mask quality, cache eviction/offline operation and extreme memory pressure remain outside this bounded audit.


## Remediation verified locally

- HEIC Converter builds filename-bearing cards with DOM properties/textContent, uses collision-safe JPEG names for both individual links and ZIP entries, and handles `.heic`/`.heif` consistently. Per-file failures show decoder details. New selections replace the batch, with an explicit Clear control; old conversion and ZIP callbacks cannot publish. ZIP submission is guarded against duplicates and snapshots completed files. Blob URLs are revoked on Clear/replacement.
- HEIC limits are explicit: 50 MB per input, 100 MB per batch, 25 million decoded output pixels / 10,000 per side. The decoder can allocate memory before output dimensions are checked; these limits do not guarantee conversion under all browser memory conditions. Copy now describes primary still-image export without source metadata preservation.
- Background Remover keeps decoded input local to each job, checks operation identity at asynchronous boundaries and publishes only current output. Its model session is reused in memory, with inference serialized. Clear/replacement invalidates old inference and pending PNG downloads. Model progress from obsolete operations is ignored. Old localStorage cache flags are not trusted; download permission during the visit is separate from actual loaded session state. Model-load failures clear the session promise so retry works.
- Background Remover handles corrupted image decoding and null/failed PNG encoding visibly. Downloads snapshot the canvas, block duplicates and revoke their temporary URLs after a delay. Shared image-size checks limit decoded images and masks. Caching, performance, portrait suitability and dependency-license copy no longer make blanket promises.

Validation passed: `node scripts/test-image-ai.cjs` (real HEIC/HEIF conversions, ZIP collisions, hostile filename text, controlled failed model load, overlapping-job masks, null PNG errors and mobile overflow); `node scripts/test-image-ai-lifecycle.cjs` (filename-safe successful output, delayed conversion/ZIP Clear and replacement, pending PNG cancellation, ignored legacy cache flag, corrupted input and model reuse). `node scripts/audit-background-real.cjs` was rerun against the fixed page and real processor, quantized model and WASM runtime: completed inference and exported PNG with no page errors and no cached flag written. Independent Pillow/ZIP inspection verified 1440 × 960 JPEG, two JPEG entries, controlled PNG alpha range 0–255 and real RGBA PNG dimensions. Source/generated syntax and inclusion of the shared helper were checked.

Fixed-output evidence is under `scratch/image-ai-fixed/`; real-model test output was copied there after validation. All changes remain local and unpublished. Original audit limits still apply; controlled mask tests do not certify semantic background removal quality. Next planned tools: Mockup Generator and Code to Image.
