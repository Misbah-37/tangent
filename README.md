# RunTangent

Browser tools for data, documents, images, media and everyday work.

[Open RunTangent](https://runtangent.com/) · [Browse tools](https://runtangent.com/tools.html)

## Privacy and network use

File processing takes place in your browser. Individual tools may download
libraries, fonts, OCR resources or AI models, so full offline operation depends
on the tool and which resources are already available. Browser memory, device
performance and format support impose practical limits.

Password Shield can optionally query Pwned Passwords using a five-character
hash prefix; the password and full hash are not sent. External links such as
support and payment destinations open third-party services.

Some tools offer optional local draft or progress saving. Saved content remains
in that browser until cleared; closing a tab does not necessarily erase it.
Check each tool's saving controls before using a shared device.

## Tools

31 active tools. Background Remover has been retired; its old route displays a
notice and links to the remaining image tools.

### Data & Analytics

- [CSV Insights](csv-insights.html): Explore CSV data with summaries, charts, filters and pivot tables.
- [Tabular Editor](tabular-editor.html): Edit cells in CSV, TSV, Excel and JSON files, then download your changes.
- [SQL Analytics Studio](sql-studio.html): Run SQL queries on loaded datasets and export query results.
- [Data Hygiene Profiler](data-hygiene.html): Clean and standardize CSV values, review changes and export the result.
- [Correlation Matrix Studio](correlation-matrix.html): Calculate correlations between numeric columns and inspect variable pairs.
- [Log Analyzer](log-analyzer.html): Parse supported log files, filter records and export matching entries.
- [Finance Dashboard](finance-dashboard.html): Review transaction CSVs with summaries, charts, filters and exports.
- [Data Extractor](data-extractor.html): Extract tables or selected text from HTML source into structured rows.

### Audio & Video

- [Screen Recorder](screen-recorder.html): Record a screen, window or browser tab with the audio your browser provides.
- [Audio Transcriber](audio-transcriber.html): Transcribe audio into text with a model running in your browser.

### Design & Dev Graphics

- [Screenshot Beautifier](mockup-generator.html): Frame screenshots with backgrounds, padding and visual styling.
- [Code-to-Image](code-to-image.html): Turn code snippets into styled images for sharing.
- [SVG Optimizer](svg-optimizer.html): Optimize SVG markup and download a smaller SVG file.

### Images & Photos

- [Photo Resizer](photo-resizer.html): Resize, crop and convert photos for your next use.
- [Photo Scrubber](photo-scrubber.html): Remove image metadata and download a separate cleaned copy.
- [Bulk Watermarker](bulk-watermarker.html): Apply text watermarks to multiple images and download new copies.
- [Color Palette Generator](color-palette.html): Extract a colour palette from an image and compare colour contrast.
- [HEIC Converter](heic-converter.html): Convert HEIC photos to a more widely supported image format.

### Documents & PDF

- [PDF Redactor](pdf-redactor.html): Mark sensitive areas in a PDF and export a redacted copy.
- [PDF Studio](pdf-converter.html): Merge, split, convert and refine PDF documents.
- [Document OCR](document-ocr.html): Extract editable text from scanned documents and images.
- [Academic Markdown](markdown-studio.html): Write Markdown, preview your document and prepare an export.
- [Visual e-Signer](document-signer.html): Place a visual signature on a document and export a copy.
- [Receipt Scanner](receipt-extractor.html): Read receipt images or a single-page PDF and review the extracted details.

### Security & System

- [File Lockbox](file-vault.html): Encrypt files with a password or unlock an existing Tangent container.
- [Password Shield](password-meter.html): Assess password strength, generate passwords and optionally check for breaches.
- [File Organizer](file-organizer.html): Plan and organize files in your browser, with copies as the default.

### Utilities

- [QR Generator](qr-generator.html): Create QR codes with custom colours and an optional centre logo.
- [Typing Practice](typing-test.html): Measure typing speed and accuracy, or practise at your own pace.

### Business & Career

- [Resume Studio](resume-builder.html): Build a resume with live preview, layout choices and browser PDF saving.
- [Invoice & Receipt Studio](invoice-generator.html): Create invoices, receipts and estimates with reusable clients and payment balances.

## Run locally

From the repository directory, serve the generated site with Python:

```sh
python -m http.server 8000
```

Open http://localhost:8000 . Stop the server with Ctrl+C. No npm installation is
needed for this preview. Some browser APIs require localhost or HTTPS, user
permission and a supported browser; a local HTTP server is preferable to opening
HTML files directly.

## Source and generated pages

This deployment branch contains generated public files only. The development
paths and compilation command below apply to the separate development checkout;
they are not included in this publishing branch.

- `tools.json`: active tool catalog, directory entries and sitemap inputs.
- `src/index.html` and `src/directory.html`: homepage and directory sources.
- `src/tools/`: tool page fragments.
- `src/content/`: supporting content such as FAQs.
- `templates/editorial.html`: homepage and directory layout.
- `templates/workspace.html`: shared tool header, footer and page structure.
- `assets/`: runtime scripts, styles, libraries and artwork.
- `templates/shell.html`: retained legacy template; not the active tool layout.
- Root HTML files: generated output. Edit sources rather than generated pages.

After source changes, compile locally with:

```sh
python build.py --local-only
```

This regenerates public pages and the sitemap while skipping external sync and
audit hooks. Plain `python build.py` can invoke those hooks; it is not the default
local preview command. Compilation does not publish the website.

Read `GEMINI.md` and `coordination/WORKFLOW.md` before contributing to the shared
checkout. Preserve unrelated changes and follow the current scoped assignment.

## Static hosting

The website is served as static HTML, CSS and JavaScript. An upload candidate
contains public pages and their runtime assets; source, prototypes, coordination
reports, backups, sample data and desktop downloads do not belong in the public
upload. Keep directory structure intact and upload the candidate's `public/`
contents as the website root. Local compilation and staging do not deploy it.

The public name is **RunTangent**, with capital R and T. The domain remains
`runtangent.com`. Existing internal identifiers, saved-data keys and `.tangent`
encrypted file formats retain their original names for compatibility. Container
format documentation is in `docs/formats/`.

## License

Free for personal and commercial use, including business operations, internal
self-hosting and paid client work. Your own outputs may be sold or shared.

The custom [LICENSE](LICENSE) restricts selling or monetizing a competing app or
service built from this code or substantial project-owned assets. Independent
implementations with similar functionality are not restricted. Third-party
components retain their own licenses. Read LICENSE for the governing terms.
