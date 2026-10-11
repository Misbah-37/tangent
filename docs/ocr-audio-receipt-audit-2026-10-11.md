# Document OCR, Audio Transcriber and Receipt Scanner audit — 2026-10-11

Scope: local generated website pages. Audit only; no production source or generated-page edits.

Evidence: `scripts/audit-ocr-audio-receipt.cjs`, `scripts/audit-ocr-real.cjs` and `scratch/ocr-audio-receipt-audit/`. Edge browser tests use actual uploads and downloads. Controlled worker/model responses exercise error and overlap states; they do not measure recognition accuracy. The separate unmocked run exercises real Tesseract and PDF.js.

## Confirmed findings

### Receipt Scanner — highest priority

1. **High: wrong totals despite correct OCR.** Unmocked OCR faithfully reads `TOTAL $12.50`, `CASH $20.00`, `CHANGE $7.50`, but the displayed total is `$20.00`. The parser selects the largest amount regardless of labels. Prioritize total/amount-due labels, exclude cash/change/tax/subtotal candidates as appropriate, and present uncertain candidates for review rather than claiming a definitive total.
2. **High: number parsing loses thousands separators and consumes dates.** Controlled OCR text `TOTAL $1,234.56` produces `$234.56`; `Date 10.11.2026` plus `TOTAL $5.00` produces `$10.11`. A valid zero total is reported Not Found. Separate date and money parsing, normalize supported locale separators, and distinguish zero from absent values.
3. **High: failed replacement copies the previous receipt.** The new job clears visible text, but `parsedData` remains from the previous success. After a recognition failure, Copy as JSON still copies the earlier `$12.50` result. Clear result state before replacement and gate copy controls on the current successful job.
4. **High: older completion overwrites newer receipt.** Resolve newer job with NEW/$2.00, then older job with OLD/$1.00; final output is OLD. Add operation guards and reset/cancel controls, with job-local state and progress.
5. **Medium: worker and object URL leaks.** Six worker creations after a controlled failed recognition result in only five terminations. Six preview URLs have zero revocations. Terminate workers and destroy PDF/render resources in finally; revoke old preview URLs on replacement/reset.
6. **Medium: clipboard errors falsely report success.** Denied JSON copy displays Copied! and raises an uncaught page error. Await writes and show actionable feedback.
7. Source review: PDF processing silently scans page 1 only, despite general PDF support; no page selection/count feedback. No file/pixel/page budgets or null canvas-blob handling. Metadata advertises line-item extraction but there is no structured line-item parser/output. Raw-text field edits are not reflected in copied `parsedData`; define editable review/export semantics explicitly.

### Document OCR

1. **High: reset does not invalidate running recognition.** Reset during a controlled job followed by completion restores STALE OCR and the result workspace. Shared page arrays/index and uncancelled finalization timer also permit overlapping drop/file jobs. Use operation identity, guard every asynchronous boundary, cancel pending finalization and block/serialize engine use.
2. **Medium: zero confidence is fabricated as 90%.** A response with confidence 0 displays 90%. Truthy filtering removes zero and the empty list falls back to 90. Include finite zero values and display unavailable for absent confidence.
3. **Medium: failed recognition leaves worker running.** Two creations, one termination after a controlled failure. Worker termination and PDF cleanup belong in finally; failed image decode also bypasses object URL revocation.
4. **Medium: denied clipboard writes are unhandled.** Copy uses then without catch. Show a visible failure and preserve manual copying.
5. Source review: all PDF pages and raster canvases retained with no total pixel/page/file budgets. Input options are read after PDF rendering rather than at upload time; changes during processing can affect the job. TIFF support is advertised in the upload prompt but loading uses browser Image decoding, so support is browser-dependent. The blanket 98%+ accuracy claim is unsupported by tests in this audit and should be qualified.

### Audio Transcriber

1. **High: older job overwrites newer transcript.** Resolve newer with NEW AUDIO then older with OLD AUDIO; output is OLD AUDIO. There is no operation identity/cancel/reset or inference queue, and overlapping model initialization can create duplicate pipelines. Use a shared initialization promise with retry, serialize inference, and reject stale progress/results.
2. **Medium: cache flag is set before model loading succeeds.** Controlled initialization failure still stores `tangent_whisper_model_cached=true`; the next upload skips consent and can initiate another network download. Storage is not proof of model availability. Separate session download permission from actual model readiness and avoid permanent-cache guarantees.
3. **Medium: clipboard denial falsely reports success.** Copied! appears and an uncaught page error is raised. Await writes and report failure.
4. **Medium: failure leaks audio URL.** Three URLs created, two revoked after a controlled inference failure. Revoke in finally.
5. Source review: model loading happens before validating/decoding audio, with no file/duration/memory limits or current filename display. Unsupported/corrupt files may trigger a large model download before the input fails. Offline/instant/permanent-cache copy overstates what browser eviction and network-loaded dependencies can guarantee.

## Working checks and limitations

- Real Document OCR recognized `TANGENT OCR TEST` and `Invoice total 123.45`, confidence 95%.
- Real PDF.js/Tesseract processing recognized both pages of a generated two-page PDF, with separate page headings.
- Actual OCR text download contains HELLO OCR in the controlled export check.
- Unmocked Receipt Scanner OCR correctly recognized the known receipt; its parser, not recognition, produced the incorrect cash-as-total result.
- Styled initial layouts fit a 390px viewport (375px content width with scrollbar). Loaded/result/error mobile states require fix-phase coverage.
- Audio lifecycle tests used a controlled module/model substitute and synthetic file; no real speech transcription accuracy or codec validation was performed. No accuracy conclusion is drawn for Whisper.
- No publication, commit, or production edits made by this audit.

## Proposed fix order

1. Receipt parsing and current-result integrity, with editable review fields and honest page/line-item limitations.
2. Shared job lifecycle principles across all three: operation guards, reset/cancel, clean worker/URL/PDF resources and bounded input/output allocations.
3. Truthful confidence and download/cache feedback; validated audio before model initialization; awaited clipboard operations.
4. Regression fixtures covering locale money/date ambiguity, multipage PDFs, zero confidence, errors and overlapping jobs; real OCR and actual speech/exports where feasible; loaded mobile checks.

## Remediation completed — 2026-10-11

Production source and scoped generated pages updated for Document OCR, Receipt Scanner and Audio Transcriber. Added `assets/processing-utils.js` for job identity, cancellation, bounded PDF rasterization, worker termination and resource cleanup; added `assets/receipt-parser.js` for reviewed receipt suggestions.

- Receipt Scanner: prioritize labelled totals, preserve zero, support decimal comma/dot and grouped thousands, reject unsupported/ambiguous amounts, exclude dates from amount scanning. Total/date/text are editable review fields and copying uses those current field values. Failed replacement clears output and disables copying; stale jobs cannot overwrite newer receipts. Clear/cancel releases previews and stops OCR. Multipage PDFs are explicitly rejected with visible feedback; single-page support is labelled. Removed line-item and unqualified caching claims. Correction to source-review note above: the original raw-text field was readonly; this change deliberately makes it editable.
- Document OCR: job-local canvases/text/options until successful completion; reset/cancel invalidates prior work, removes the delayed-finalization race and terminates running OCR. Finite zero confidence is retained; absent confidence displays Unavailable. PDF/render/worker cleanup runs through finally. Visible read/recognition/copy errors replace alert-only or unhandled failures. Snapshot language and enhancement options at ingestion. Corrected blanket accuracy/offline claims and removed browser-dependent TIFF upload claims.
- Audio: validate and decode audio before offering a model download; downmix/resample locally to 16 kHz. In-memory session download permission replaces reliance on permanent cache flags. A shared model promise retries after failure; inference runs in sequence and stale jobs cannot update results. Clear/cancel discards work; an already-running model inference finishes before the next job starts. No audio object URL is created. Await clipboard writes, retain manual fallback and export current reviewed transcript under its source filename.
- Limits: documents/receipts 50 MB, individual images/renders 25 million pixels and 10,000px sides; Document OCR at most 20 PDF pages and 50 million rendered pixels total, Receipt Scanner one page; audio 100 MB, 30 minutes and 100 million decoded input samples. Image/audio decoded dimensions are checked after browser decoding; these are bounded processing safeguards, not a guarantee that native decode allocation can never exceed memory.

Verification:
- `node scripts/test-ocr-audio-receipt.cjs`: controlled lifecycle regressions passed: zero confidence, cancellation, worker termination after failure, stale jobs, failed replacements, reviewed receipt JSON/text values, exact amount fixtures ($12.50 versus cash, grouped decimal separators, date exclusion, zero, one decimal digit, ambiguous/invalid values), preview URL revocation, clipboard denial, corrupt audio before model initialization, stale cache flag ignored, model retry, serialized inference, actual transcript download, mobile widths and no uncaught page errors.
- `node scripts/test-ocr-real.cjs`: unmocked Tesseract reads known text and both pages of a PDF; known receipt correctly suggests $12.50 with accurate OCR; two-page receipt rejection verified.
- `node scripts/test-audio-real.cjs`: unmocked Whisper transcribed a locally synthesized spoken fixture: "Hello Tangent. This is a local audio test. The invoice total is $12." Actual downloaded transcript equals displayed text. No uncaught page errors. This single fixture is a functional check, not a general transcription accuracy benchmark.
- Loaded receipt/audio mobile screenshots inspected; shared sidebar transition allowed to settle for final controlled mobile captures.

Changes remain local and unpublished. Receipt fields remain suggestions requiring review; ambiguous dates retain their extracted form instead of guessing a date convention. No website commit or publication performed.
