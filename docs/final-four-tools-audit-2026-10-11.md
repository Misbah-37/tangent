# Final website batch: audit and fixes

Scope: Screen Recorder, Password Shield, File Organizer and Typing Test. Website source and scoped generated pages updated locally. No commit, publication or Pro executable rebuild performed.

## Confirmed problems

- Password Shield applied an old breach response after its input was cleared. It checked while users typed, lacked request cancellation/padding, defaulted to online lookup, and claimed passwords could be "uncrackable". With every generator character set disabled it silently generated lowercase text. Copy announced success before clipboard permission completed.
- File Organizer placed two same-named input files into one ZIP entry. Direct-disk writes opened an existing destination with create=true and could overwrite it. Async scan/reset handling and partial-progress reporting were incomplete. The website's standalone executable checksum did not match the executable inside File_Organizer.zip.
- A screen-recorder constructor failure left the captured video track live. Startup accepted repeated clicks, pending microphone monitoring could return after cancellation, errors were logged without user feedback, and recorded URLs were not released. The finalizer also referenced a MIME variable outside its scope when the recorder did not expose a MIME type. There was no enforceable memory/duration boundary despite unrestricted-recording claims.
- Typing results threw when localStorage was unavailable, leaving results hidden. Multi-character mobile insertion and composition handling discarded valid text. A near-zero elapsed time could produce unstable live WPM. Copy claimed saved graphs/percentiles although only per-difficulty best scores were stored.

Reproduction evidence: `scripts/audit-final-tools.cjs` and `scratch/final-tools/audit.json`. All passwords and disk objects used in browser fixtures were synthetic. No real user password was submitted and no actual user file was moved or deleted during tests.

## Implemented behavior

### Screen Recorder

One guarded capture session owns its streams, recorder, timer, chunks and audio context. No microphone permission is requested on page load. Capture/encoder failures show feedback and close acquired resources. Pending permissions are invalidated when leaving the page; late streams are stopped. Native stop sharing, pause/resume, errors, reset and page lifecycle cleanup are covered. Final chunks are retained even when an error first sets the recorder inactive. Empty captures return useful feedback. MIME selection is scoped to the session; download type follows the actual format. Preview/download URLs are revoked on reset or leaving.

The recorder stops at 30 minutes of active recording or approximately 256 MiB of encoded chunks. This is not a total browser memory cap; final chunks can cross the encoded-data threshold. Lower-memory devices should use shorter clips. UI, FAQ and metadata now describe the limits and variable browser/system-audio support.

### Password Shield

Local strength analysis and CSPRNG generation remain local; zxcvbn 4.4.2 is vendored with its license. Online lookup is off by default. Users enable it and press Check breach database after entering a complete password. Requests send only the five-character SHA-1 prefix, request padded responses, omit credentials/referrer, and have a timeout. Changes, clear, disable and pagehide cancel/invalidate pending work. Malformed responses/errors cannot produce a clean result.

Privacy UI and the homepage explain the optional prefix request and service-visible IP address. Guidance follows the [Pwned Passwords API documentation](https://haveibeenpwned.com/API/v3#PwnedPasswords), including response padding and avoiding incremental searches. "No match" is qualified; crack-time estimates and character-space upper bounds do not claim measured entropy or absolute security. Passphrase default is ten words from the embedded list; the generator displays theoretical random-choice bits. Empty character-set selection blocks output, and failed clipboard writes report failure.

### File Organizer

ZIP names are normalized to safe basenames and numbered for collisions, including case-insensitive duplicates. Direct-disk mode preserves existing destination names and keeps originals by default. An explicit Move originals checkbox enables removal only after byte-for-byte copy verification and checking the source content again. Writable failures retain originals. Completed items are removed from the remaining work list; partial errors report completion count and potential leftover destination copies.

Scans use operation identities so reset cancels late results. Actions cannot replace a list while writing. Status is visible outside the preview, including load errors. Batches are limited to 2,000 files totaling 500 MiB; selected folders scan top-level files only. Selection labels no longer imply ZIP extraction.

The advertised executable SHA-256 is now `2e668ef85c7be7d09d63937618af6bf16fe5e71b0565ab3145e710af4e478c33`, verified against the executable inside the downloadable ZIP. Its hash lookup link matches. Unsubstantiated clean-scan/certificate and forced SmartScreen-bypass claims were removed. The legacy Windows binary itself was not rebuilt or behaviorally audited in this website batch.

### Typing Test

Result computation survives unavailable storage and corrupt score values, reports when saving is unavailable, and guards duplicate completion. Live WPM uses a minimum elapsed interval. Mobile multi-character insertion and committed composition are processed without counting composition twice; paste remains excluded. Product copy distinguishes in-memory graphs from the saved best WPM. Formula remains correct characters divided by five per elapsed minute, with mistakes reported separately.

## Verification

```text
node scripts/test-final-tools.cjs
node scripts/test-final-tool-lifecycle.cjs
node scripts/test-final-tool-boundaries.cjs
python scripts/check-final-tool-artifacts.py
```

All passed in headless Edge. Checks included actual MediaRecorder encoding/download, pause/resume and resource cleanup; mocked permission/encoder failures, native stop events, time/memory boundaries and final error chunks; explicit padded breach traffic, stale results, malformed responses and clipboard denial; actual ZIP download with all original bytes, destination collision safety, opt-in verified moves and disk failures; typing WPM/errors, storage denial, multi-character input and composition; and all four 390px layouts plus the password generator layout. Browser runs recorded no uncaught page errors.

Limits: recording tests used synthetic canvas streams rather than the OS screen chooser. Direct-disk write/move/error tests used browser handle doubles; no user files were modified. Other browsers, every OS permission dialog and simultaneous external edits of destination folders were not exhaustively tested. The File System Access API does not provide an exclusive atomic destination-create operation; avoid organizing a folder while other software writes there.

All 31 website tools have now been covered by the audit/fix batches. This does not claim the website is free of every possible bug.
