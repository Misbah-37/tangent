<div align="center">

  <img src="assets/og-banner.png" alt="Tangent Suite Banner" width="550" />

  <p align="center">
    <strong>Ultra-fast, 100% private, client-side digital utilities.</strong><br>
    Break away from bloated web apps. Process documents, compress images, and organize files locally without transmitting a single byte to an external server.
  </p>

  <p align="center">
    <a href="https://misbah-37.github.io/tangent/"><strong>Explore Live Site &rarr;</strong></a>
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

## The Toolkit (23 Tools)

### Data & Analytics Suite
1. **CSV Insights Studio** (`csv-insights.html`): High-performance client-side CSV parser and data profiler.
2. **SQL Studio** (`sql-studio.html`): Run complex SQL queries locally against your CSV files using alasql.
3. **Data Hygiene & Anomaly Profiler** (`data-hygiene.html`): Instantly detect missing data, outliers, and duplicates in datasets.
4. **Correlation Matrix Studio** (`correlation-matrix.html`): Generate Pearson correlation grids and heatmaps entirely offline.
5. **Server & Application Log Analyzer** (`log-analyzer.html`): Parse standard Apache/Nginx web logs and Syslog files to securely analyze server errors without cloud uploads.

### Document & PDF Utilities
6. **PDF Redactor & Metadata Scrubber** (`pdf-redactor.html`): Visually black out sensitive data and purge hidden GPS metadata via `pdf-lib`.
7. **PDF Suite** (`pdf-converter.html`): Merge, split, extract, and compress PDFs locally.
8. **Client-Side Document OCR** (`document-ocr.html`): Extract text from images using WebAssembly Tesseract.js.
9. **Document Signer** (`document-signer.html`): Sign PDFs locally with drawn or typed signatures.
10. **Resume Builder** (`resume-builder.html`): Live-preview builder and PDF exporter.
11. **Invoice Generator** (`invoice-generator.html`): Professional invoice generator with printable layouts.
12. **Markdown Studio** (`markdown-studio.html`): Split-screen Markdown editor with live KaTeX preview.

### Media & Design Utilities
13. **Screen & Audio Recorder** (`screen-recorder.html`): Full HD screen, app window, or tab recording (VP9/H.264).
14. **Screenshot Beautifier & Mockup Studio** (`mockup-generator.html`): Create gorgeous 3D mockups.
15. **Photo EXIF Scrubber** (`photo-scrubber.html`): Inspect and strip hidden GPS coordinates and serials from images.
16. **Photo Resizer & Compressor** (`photo-resizer.html`): Scale, crop, and compress JPEGs/PNGs in real-time.
17. **Code to Image** (`code-to-image.html`): Render syntax-highlighted code into shareable images.
18. **SVG Optimizer** (`svg-optimizer.html`): Minify and optimize SVGs via DOM parsing.

### Security & System Utilities
19. **Password Strength Meter** (`password-meter.html`): Check passwords against billions of compromised records using k-Anonymity without exposing them.
20. **File Organizer** (`file-organizer.html`): In-browser folder sorting logic.
21. **File Vault** (`file-vault.html`): Client-side AES-GCM file encryption.
22. **QR Code Generator** (`qr-generator.html`): Generate error-corrected QR codes instantly.
23. **Typing Speed Test** (`typing-test.html`): Distraction-free WPM test saved purely to `localStorage`.

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
# Compile all 23 HTML pages, regenerate sitemap, and run the pre-flight audit
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
