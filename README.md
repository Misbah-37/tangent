<div align="center">

  <img src="assets/og-banner.png" alt="Tangent Suite Banner" width="550" />

  <p align="center">
    <strong>Ultra-fast, 100% private, client-side digital utilities.</strong><br>
    Break away from bloated web apps. Process documents, compress images, and organize files locally without transmitting a single byte to an external server.
  </p>

  <p align="center">
    <a href="https://runtangent.com/"><strong>Explore Live Site &rarr;</strong></a>
    <br />
    <br />
    <img src="https://img.shields.io/badge/Privacy-100%25%20Client--Side-00d2ff?style=flat-square" alt="Privacy" />
    <img src="https://img.shields.io/badge/Telemetry-Zero-success?style=flat-square" alt="No Telemetry" />
    <img src="https://img.shields.io/badge/License-Non--Commercial-orange?style=flat-square" alt="License" />
  </p>

</div>

---

## The Tangent Philosophy

Most utility websites quietly upload your sensitive photos, contracts, and financial PDFs to remote cloud servers to process them. 

**Tangent is engineered differently:**
- **0 Bytes Outbound:** All web tools run 100% inside your browser's local sandbox via WebAssembly and client-side JavaScript.
- **No Accounts, No Tracking:** Zero sign-ups, zero analytics cookies, and zero personal data collection.
- **Offline Capable:** Once loaded, web utilities continue running seamlessly even if you disconnect from the internet.

---

## The Toolkit (31 Tools)

### Data & Analytics Suite
1. **CSV Insights Studio** (`csv-insights.html`): High-performance client-side CSV parser, pivot table builder, and data profiler.
2. **SQL Analytics Studio** (`sql-studio.html`): Run complex SQL queries locally against CSV, JSON, and Parquet files using DuckDB-WASM.
3. **Data Hygiene & Anomaly Profiler** (`data-hygiene.html`): Instantly detect missing values, duplicate rows, trailing spaces, and outliers in datasets.
4. **Correlation Matrix Studio** (`correlation-matrix.html`): Generate Pearson correlation grids, heatmaps, and statistical tests entirely offline.
5. **Server & Application Log Analyzer** (`log-analyzer.html`): Parse standard Apache/Nginx web logs and Syslog files to securely analyze server errors without cloud uploads.
6. **Private Finance Dashboard** (`finance-dashboard.html`): Visualize bank statements locally and generate spending breakdowns with zero cloud uploads.
7. **HTML Data Extractor** (`data-extractor.html`): Extract tables, lists, and structured data from HTML locally using CSS selectors and export to CSV.

### Document & PDF Utilities
8. **PDF Redactor & Metadata Scrubber** (`pdf-redactor.html`): Visually black out sensitive data and purge hidden author, device, and GPS metadata via `pdf-lib`.
9. **PDF Suite** (`pdf-converter.html`): Merge, split, extract, and compress PDFs locally.
10. **Client-Side Document OCR** (`document-ocr.html`): Extract editable text from scanned PDFs, images, and screenshots 100% offline using WebAssembly Tesseract.js.
11. **Document Signer** (`document-signer.html`): Visually sign PDFs and documents locally with drawn, typed, or uploaded signatures.
12. **Smart Receipt Extractor** (`receipt-extractor.html`): Batch scan receipts and extract dates, vendors, and totals to a clean CSV using local OCR.
13. **Resume Builder** (`resume-builder.html`): Build ATS-friendly, professional resumes with live side-by-side preview and instant PDF export.
14. **Invoice Generator** (`invoice-generator.html`): Generate professional invoices and receipts with itemized taxes, custom logos, and printable PDF layouts.
15. **Markdown Studio** (`markdown-studio.html`): Write technical and academic papers with split-screen Markdown, live KaTeX math preview, and PDF/HTML export.

### Media & Design Utilities
16. **Screen & Audio Recorder** (`screen-recorder.html`): Record full HD screen, app window, or browser tab with microphone and system audio (VP9/H.264) and zero watermarks.
17. **Confidential AI Transcriber** (`audio-transcriber.html`): Transcribe audio and video recordings locally in your browser using a WebAssembly Whisper AI model.
18. **AI Background Remover** (`background-remover.html`): Remove backgrounds from high-resolution images offline in browser memory and export transparent PNGs.
19. **Screenshot Beautifier & Mockup Studio** (`mockup-generator.html`): Transform raw screenshots into presentation mockups with macOS window frames, gradients, and 3D shadows.
20. **Photo EXIF Scrubber** (`photo-scrubber.html`): Inspect and strip hidden GPS coordinates, camera models, and EXIF metadata from images.
21. **Photo Resizer & Compressor** (`photo-resizer.html`): Scale, crop, compress, and convert JPEGs, PNGs, and WebP images with pixel precision.
22. **HEIC to JPG Converter** (`heic-converter.html`): Convert Apple HEIC photos to standard JPG or PNG files locally without cloud uploads.
23. **Bulk Image Watermarker** (`bulk-watermarker.html`): Batch stamp copyright text and watermarks across hundreds of images offline.
24. **Color Palette Generator** (`color-palette.html`): Extract cohesive color palettes from images and export CSS design tokens offline.
25. **Code to Image** (`code-to-image.html`): Render syntax-highlighted code snippets into presentation-ready images.
26. **SVG Optimizer** (`svg-optimizer.html`): Inspect, clean, minify, and rasterize vector SVGs via local DOM parsing.

### Security & System Utilities
27. **Password Strength Meter** (`password-meter.html`): Audit passwords against compromised breach records using k-Anonymity and generate high-entropy passphrases.
28. **File Organizer** (`file-organizer.html`): Structure messy directories into clean categories locally.
29. **File Vault** (`file-vault.html`): Lock sensitive photos and documents with client-side AES-GCM encryption.
30. **QR Code Generator** (`qr-generator.html`): Generate customizable, error-corrected QR codes from URLs or text offline.
31. **Typing Speed Test** (`typing-test.html`): Distraction-free WPM velocity and accuracy benchmark saved purely to `localStorage`.

---

## Running Locally

Because Tangent is built with modern vanilla web standards, you don't need `npm install` or complex build pipelines.

Simply clone the repository and serve the files locally:

```bash
# Clone the repository
git clone https://github.com/Misbah-37/tangent.git

# Navigate to directory
cd tangent

# Serve with Python
python -m http.server 8000

# Or serve with Node.js
npx serve .
```

Open `http://localhost:8000` in your browser.

---

## Static Site Generator (SSG) & Master Shell Architecture

Tangent uses a lightweight, zero-dependency Python template compiler (`build.py`) with a single master shell (`templates/shell.html`):
- **Single Source of Truth**: The global navigation, push-sidebar, and 2-line footer are defined once in `templates/shell.html`.
- **Modular Tool Fragments**: Tool workspaces, styles, and scripts live cleanly in `src/tools/` without repetitive boilerplate.
- **Zero-Flicker Static Output**: Running `python build.py` compiles pure static HTML files with 0ms Cumulative Layout Shift (CLS) and 100% crawlable SEO markup.

```bash
# Compile all 31 tool pages and homepage, regenerate sitemap, and run the pre-flight audit
python build.py
```

---

## Security & Architecture

| Feature | Tangent Implementation |
| :--- | :--- |
| **Server Uploads** | **None.** Processing occurs in browser memory or native offline binary. |
| **Content Security Policy** | Strict inline execution with pinned CDNs (`cdnjs.cloudflare.com`, `cdn.jsdelivr.net`). |
| **Network Telemetry** | No Google Analytics, no Facebook Pixel, no tracking pixels. |
| **Data Retention** | Data disappears as soon as you close or refresh the tab. |

---

## License

Copyright © 2026 Tangent. Released under a **Custom Non-Commercial License**. 
- **The Website:** Free to use for any personal or commercial work tasks.
- **The Source Code:** Proprietary. You may not steal, host, monetize, or sell the source code. See `LICENSE` for exact details.
