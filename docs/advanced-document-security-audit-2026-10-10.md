# File Vault and advanced PDF audit — 2026-10-10

Scope: current local generated website; synthetic files only. Audit performed in headless Microsoft Edge with downloaded outputs inspected independently using Node crypto, pypdf and PDF.js rendering. The initial audit was read-only; the remediation below updates local source and generated pages.

## Confirmed findings

1. **High: File Vault mixes file contents and metadata when the selected file changes during encryption.** A delayed read of `old.txt` containing `OLD`, followed by selection of `new.txt` containing `NEW`, downloads `new.txt.tangent`. Independent AES-GCM decryption confirms metadata `new.txt` but payload `OLD`. The operation reads mutable `selectedFile` after awaiting the original file read. Password and mode also remain mutable during processing; those related races need regression coverage with the fix. Capture file/password/mode at submission, prevent duplicate submissions and invalidate obsolete output.

2. **High: signature stamps can be hidden beneath form widgets.** A filled text widget crossing a signature displays above the vector stamp in the saved PDF. The image contains the full stamp, but its right portion is covered by the field appearance. Preview uses canvas-based field rendering and places the stamp above that canvas, creating a misleading preview/export difference. Preserve filled appearances with a deliberate flattening policy before stamps, or explicitly prevent overlapping widgets; test the actual saved rendering and form-value handling.

3. **Medium: File Vault copy promises unsupported features and excessive protection.** UI says multiple files can be bundled into `.vault`; implementation processes one file into `.tangent`. Claims such as “unbreakable,” “zero size limits,” and blanket safety of PINs are not justified: password entropy and available browser memory matter. Actual cryptography is AES-256-GCM, PBKDF2 SHA-256, 100,000 iterations, random 16-byte salt and 12-byte IV. Correct copy and explain password loss/recovery limits without weakening existing container compatibility.

4. **Medium: signer silently changes editable-form behavior in fallback export.** Primary export preserves AcroForm values and widgets; forced fallback rasterizes their visible appearances and drops editable fields and annotations. Filled values remain visible, but users are not informed of the structural loss. Tell users when fallback creates a flattened copy. This test deliberately forced primary failure; it does not prove the fixture naturally triggers fallback.

## Passed checks

- File Vault encrypted and recovered exact original bytes. Wrong password and a modified authentication tag were rejected with a visible error. Independent Node crypto decryption verifies compatibility with the stated AES/PBKDF2 parameters.
- No file-upload/network API was found in the File Vault processing script. This is a scoped source check, not an offline-cache availability certification.
- Signer primary export retains filled customer text, checked checkbox value, three annotation objects, CropBox and rotated displayed page dimensions (250 × 340 points).
- Redactor exports a cropped, 90-degree rotated page at the correct displayed size. A box covering the filled text field burns in correctly. Export contains no selectable text, AcroForm fields or annotation objects; the hidden comment and editable secret value do not survive as those objects. Visually inspected output shows the field fully covered and public label preserved.
- Signer fallback retains visible filled values and checkbox appearance, with the expected flattened structure.

## Evidence and limits

Reproduction scripts: `scratch/audit-advanced-fixtures.py` and `scratch/audit-advanced.cjs`. Outputs and rendered comparison images: `scratch/advanced-audit/`; result log: `results.json`. The generated PDFs contain synthetic secrets, not user documents.

This is a bounded audit, not a cryptographic certification or proof against every malicious PDF. Existing cryptographic signatures, XFA, optional-content layers, unusual fonts, multi-page form hierarchies and encrypted-input permission handling remain outside this test. PDF Converter password encryption remains disabled from the earlier fixes.

Recommended order: fix File Vault operation state and copy; fix form/stamp stacking and disclose fallback flattening; run focused regressions; then audit Photo Scrubber, Photo Resizer and Bulk Watermarker.


## Remediation verified locally

- File Vault snapshots file, password and mode at submission and locks input controls until completion. Duplicate submissions and file replacement during a delayed read no longer mix payload and metadata. Copy now describes one-file `.tangent` containers, browser memory limits, password strength and lack of recovery. Existing cryptographic parameters remain compatible.
- Signer preserves editable forms by default and blocks stamps overlapping widget rectangles, including cropped/rotated input. Users may explicitly choose to flatten filled appearances before stamping. Failed vector export asks before downloading a raster copy and explains loss of selectable text, editable fields and annotations. New document loads clear prior export notices.
- `node scripts/test-file-vault.cjs` passed actual Edge downloads, independent crypto, delayed-read mutations, duplicate submission, legacy unlock, empty file, wrong password, tampering and truncated-container checks.
- `node scripts/test-signer-forms.cjs` passed actual overlap rejection, editable export, explicit flattening, and fallback decline/accept checks. Independent pypdf inspection verified canonical text and checked checkbox values, two widgets retained in editable output, and no AcroForm/widgets in flattened output. PDF.js rendering showed the complete stamp above filled appearances; flattened vector and raster outputs had identical red stamp bounds and pixel counts on the synthetic cropped/rotated fixture.
- `node scripts/test-document-tools-browser.cjs`, `python scripts/test-document-tools-outputs.py` and `node scripts/test-document-tools-syntax.cjs` passed existing document workflows, saved placement/rotation comparisons, redaction burn-in, and source/generated syntax checks.

Evidence: `scratch/vault-fixed/`, `scratch/signer-forms/` and `scratch/pdf-fixed/`. Changes are local and have not been published. Next unfinished audit: Photo Scrubber, Photo Resizer and Bulk Watermarker. The limits listed above still apply.
