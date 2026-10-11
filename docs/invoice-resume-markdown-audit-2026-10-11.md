# Invoice, Resume and Academic Markdown audit — 2026-10-11

Scope: local generated Invoice & Receipt Studio, Resume Studio and Academic Markdown pages. Audit only: no production source/generated page edits.

Evidence: `scripts/audit-invoice-resume-markdown.cjs`, `scripts/audit-document-studio-lifecycle.cjs`; outputs in `scratch/invoice-resume-markdown-audit/` including JSON findings, actual HTML/Markdown downloads, browser-generated print PDFs and Poppler renders. Edge headless; styles served with correct MIME types. First harness attempt selected the sidebar's `.item-desc` div; scoped to `input.item-desc` and reran. This was a harness error, not a product failure.

## Confirmed findings

### All three — high priority

**User-supplied HTML executes in the website origin.** Invoice line description, resume name and Markdown HTML each execute a harmless local image-error sentinel (17, 23 and 31 respectively). Invoice/resume use interpolated innerHTML rather than escaped text/DOM values. Markdown inserts Marked output without sanitization. No exfiltration payload was used. Use safe DOM construction for text fields and a maintained sanitizer/resource policy for Markdown. Prevent external content from contradicting the privacy guarantee.

### Invoice & Receipt Studio

1. **High: visible amounts do not reconcile.** Three lines with quantity 0.333 and rate 1 display €0.33 each, while subtotal displays €1.00. Define decimal precision/rounding explicitly and calculate subtotal from the same rounded monetary amounts displayed in line totals. Binary floating point and independent toFixed calls are insufficient for consistent monetary display.
2. **High: draft preservation promise is false.** Set sender name PERSIST INVOICE, reload; sample Apex Design & Engineering LLC returns. Source has no localStorage read/write despite FAQ saying data is automatically preserved. Implement a visible local draft policy or correct the claim; make reset/clear semantics explicit.
3. **Medium: quoted descriptions are truncated after row reconstruction.** Enter `Consulting "quoted" & <literal>`, add item; original input becomes `Consulting `. Interpolating input value attributes breaks valid text independently of script execution. Safe DOM values must preserve exact text.
4. **Medium: currency change leaves input-row totals in old currency.** Switch USD to EUR: form line remains $5000.00 while paper shows €125.00 unit price. Refresh all monetary displays together. Source forces two decimal places for every listed currency; precision policy needs review.
5. **Medium: invalid discount remains printable.** Discount 150% produces €-0.50 and print stays enabled. Qty/rate/discount/tax have no runtime validity gates; input min attributes alone do not stop rendering/printing. Validate according to explicit supported invoice semantics.
6. **Medium: Clear All retains logo; pending upload can resurrect removed logo.** Valid logo persists after clear; holding a read, removing logo then completing the read restores display block. Add operation identity, validated image loading and comprehensive clear behavior. Source has no read/decode failure or size handling; drag positions are unbounded.
7. **Medium: print dialog is described as successful PDF generation.** Replacing window.print with a no-op still produces PDF generated successfully. The browser can cancel or choose a printer. Label the control Print / Save PDF and avoid claiming a completed download.
8. Source/copy review: itemized-tax wording exceeds the single document-level tax-rate feature. Clarify supported calculation model rather than implying per-item tax rules.

### Resume Studio

1. **High: quoted dynamic fields lose data.** Job title `Engineer "quoted" & <literal>` becomes `Engineer ` when adding another experience. Same DOM/value escaping issue affects dynamic experience/education fields and preview content.
2. **Medium: Clear All retains personal photo; pending upload resurrects removed photo.** Photo remains in the sheet after Clear All. Holding FileReader, removing photo then releasing restores a photo. No validation/decode feedback or size limits for photos.
3. **Medium: persistence wording is misleading.** Edited name PERSIST RESUME disappears after reload, returning Alex Rivera. Privacy FAQ names localStorage but source has no persistence implementation. Decide explicit draft behavior and correct UI copy.
4. **Medium: print reports successful PDF generation even when nothing is saved.** Same false success toast as invoice tool.
5. Source/copy review: blanket ATS compliance and comparisons accusing other products are not validated by this audit. Text extraction from tested PDFs works, but does not establish universal ATS compatibility. Long content needs template-by-template pagination checks, especially two-column layouts and photos.

### Academic Markdown

1. **High: exported HTML preserves executable scripts.** Save raw Markdown containing a script setting a harmless sentinel. Opening downloaded HTML sets exportSentinel=43. Sanitization must apply to preview and HTML exports, not just one output path; resource policy also matters for remote images/links.
2. **Medium: backslash math delimiters are lost before KaTeX.** Input `\\(x^2\\)` plus `$$y^2$$` produces one rendered formula; inline expression appears as literal `(x^2)` in PDF. Marked consumes delimiter backslashes before configured KaTeX auto-render sees them. Protect/parse math before generic Markdown escaping; count actual supported expressions rather than only dollar-sign regex matches.
3. **Medium: downloaded HTML ignores selected typography theme.** Modern preview is sans-serif; downloaded file is Georgia/Cambria serif. Code block background is transparent because exported CSS references undefined theme variables. Preserve chosen typography and resolved styles.
4. **Medium: HTML advertised as standalone requires external KaTeX CSS/fonts.** Offline-blocked stylesheet leaves math inheriting Georgia. Either bundle needed styles/fonts or describe network dependencies explicitly.
5. Source review: template replacement immediately overwrites unsaved text; no recovery draft/confirmation. Reload restores template (confirmed), but there is no explicit persistence claim, so this is a usability/recovery gap rather than a broken autosave promise. Print lifecycle mutates live preview DOM and lacks repeated-event guards; ordinary PDF export restored it in the tested run.

## Working checks and limits

- Default invoice and default resume each produce one readable, text-extractable PDF page. Poppler renders inspected: no clipping/overlap observed in those fixtures.
- Long invoice: 3 pages, final line present. Long resume: 2 pages, final bullet present. Long Markdown: 4 pages, final paragraph present. This checks content retention, not all templates/print settings.
- Markdown print restores preview parent and removes print table after PDF generation in the tested normal path.
- Actual raw Markdown and HTML downloads complete. Dollar-delimited block math renders; the backslash-delimiter issue is visible in a rendered PDF.
- Styled initial mobile layouts fit 390px viewport (375px content width with scrollbar); loaded/fullscreen states and every resume template remain to be covered during fixes.
- Browser PDF exports use A4 and printBackground, without browser headers/footers. This is not proof that user printer dialog defaults cannot add headers/footers.
- No production edits, commit, or publication made in this audit.

## Proposed fix order

1. Safe text rendering and sanitized Markdown preview/export with explicit external-resource policy.
2. Invoice decimal calculation and validation; exact text preservation; synchronized currency display.
3. Honest draft saving/recovery controls, complete clear/reset and guarded photo/logo uploads.
4. Correct print messaging, Markdown math/theme/export fidelity and qualified product claims.
5. Focused browser tests plus actual PDF/HTML/Markdown exports, long documents, loaded mobile views and representative resume templates.

## Implemented and verified

The authorized fixes are now applied to source and scoped generated pages for all three tools.

- Invoice and Resume render user fields as escaped text, preserving quotes and literal markup through dynamic form rebuilding. Markdown uses vendored DOMPurify for raw HTML, preview and HTML export; active elements and automatic external images are omitted. Exported HTML includes a restrictive resource policy.
- Invoice uses decimal integer arithmetic, currency precision, rounded unit rates and line totals, a subtotal that sums displayed lines, discount before tax, and validation that disables printing for invalid amounts or percentages. Form and paper currencies stay synchronized. JPY uses zero decimal places.
- Each studio has an explicit optional "Save draft on this browser" checkbox, off initially, with restoration and visible storage-error feedback. Turning it off removes its stored draft. Invoice logo position, size and opacity are stored as bounded numbers. Sample loading restores a sample without reloading the page.
- Clear/reset removes photos and logos, cancels pending uploads, and prevents removed images returning. Uploads accept bounded PNG/JPEG/WebP files, resize to 1200px and report decode errors.
- Print buttons say "Print / Save PDF" and no longer claim a PDF was generated after opening a dialog. Product copy qualifies persistence and resume parsing claims.
- Markdown recognizes dollar and backslash inline/block delimiters before Markdown processing, preserves code fences, and counts rendered formulas. HTML export preserves selected typography and resolved code styles and embeds KaTeX CSS plus 20 WOFF2 fonts for offline math. Template replacement asks before discarding text, and printing restores the live preview.

Verification commands:

```text
node scripts/test-invoice-resume-markdown.cjs
node scripts/test-studio-pdfs.cjs
node scripts/test-studio-errors.cjs
```

All passed. The main focused suite passed twice, including safe text, exact fields, financial reconciliation, currency switching, drafts, clear/cancel upload lifecycle, four math delimiter styles, actual Markdown/HTML downloads, offline HTML fonts, mobile widths and no uncaught browser errors. Additional checks covered corrupt drafts, quota failures and malformed images.

Actual A4 PDFs were generated for all 15 resume templates and reviewed as rendered pages. Each default template remained one page in the sample fixture. Long invoice (3 pages), resume (2 pages), and Markdown (4 pages) retained their final text markers. Math PDF and offline HTML were visually inspected; formulas and code styles rendered correctly. Artifacts are under `scratch/invoice-resume-markdown-fixed/`.

Limits: browser tests used headless Edge on this laptop. Printer settings, every custom resume length and other browsers were not exhaustively covered. Markdown images are intentionally omitted rather than fetched automatically; the editable Markdown download preserves the original source. Optional drafts depend on available browser storage. Website changes remain local; no commit or publication was performed.
