<div align="center">

  <img src="assets/og-banner.png" alt="Tangent Suite Banner" width="550" />

  <p align="center">
    <strong>Ultra-fast, 100% private, client-side digital utilities.</strong><br>
    Break away from bloated web apps. Process documents, compress images, and organize files locally without transmitting a single byte to an external server.
  </p>

  <p align="center">
    <a href="https://misbah-37.github.io/tangent/"><strong>Explore Live Site »</strong></a>
    <br />
    <br />
    <img src="https://img.shields.io/badge/Privacy-100%25%20Client--Side-00d2ff?style=flat-square" alt="Privacy" />
    <img src="https://img.shields.io/badge/Telemetry-Zero-success?style=flat-square" alt="No Telemetry" />
    <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License" />
  </p>

</div>

---

## ⚡ The Tangent Philosophy

Most utility websites quietly upload your sensitive photos, contracts, and financial PDFs to remote cloud servers to process them. 

**Tangent is engineered differently:**
- **0 Bytes Outbound:** All web tools run 100% inside your browser's local sandbox via WebAssembly and client-side JavaScript.
- **No Accounts, No Tracking:** Zero sign-ups, zero analytics cookies, and zero personal data collection.
- **Offline Capable:** Once loaded, web utilities continue running seamlessly even if you disconnect from the internet.

---

## 🛠️ The Toolkit

### 1. 🛡️ PDF Redactor & Metadata Scrubber (`pdf-redactor.html`)
- **Features:** Visually black out sensitive data (bank details, SSNs, signatures) with true burn-in raster flattening and purge hidden author/GPS metadata.
- **Engine:** Client-side execution using [`pdfjs`](https://mozilla.github.io/pdf.js/) and [`pdf-lib`](https://pdf-lib.js.org/). Zero unredacted bytes leave your device.

### 2. 📄 PDF Suite (`pdf-converter.html`)
- **Features:** Merge multiple PDFs, split documents, extract page ranges, and perform structural compression.
- **Engine:** Client-side execution using [`pdf-lib`](https://pdf-lib.js.org/) and [`pdf.js`](https://mozilla.github.io/pdf.js/). Your files never leave RAM.

### 3. 🔍 Client-Side Document OCR (`document-ocr.html`)
- **Features:** Optical Character Recognition extracting text from images, photos, receipts, and multi-page scanned PDFs. Auto-contrast preprocessing, multi-language support, and side-by-side verification.
- **Engine:** Client-side WebAssembly execution using [`Tesseract.js v5`](https://github.com/naptha/tesseract.js) and [`pdf.js`](https://mozilla.github.io/pdf.js/). 100% in-browser RAM.

### 4. 🎥 Screen & Audio Recorder (`screen-recorder.html`)
- **Features:** Full HD screen, app window, or tab recording with mixed microphone and system audio. No time limit, zero watermarks, and Safari MP4 fallback.
- **Engine:** HTML5 `MediaRecorder` API and Web Audio API with hardware-accelerated VP9/WebM and H.264/MP4 encoding.

### 5. 💻 Screenshot Beautifier & Mockup Studio (`mockup-generator.html`)
- **Features:** Transform raw screenshots into production mockups with macOS/Windows frames, gradient backdrops, soft 3D shadows, and high-res 4K export with 4096px safety rail.
- **Engine:** Client-side HTML5 Canvas 2D rasterizer with Retina 2x rendering.

### 6. 📸 Photo EXIF & GPS Location Scrubber (`photo-scrubber.html`)
- **Features:** Inspect hidden GPS coordinates, camera hardware serials, and timestamps. Strip all metadata via 100% in-browser Canvas re-encoding or batch clean multiple photos into a ZIP.
- **Engine:** Client-side parsing using [`exif-js`](https://github.com/exif-js/exif-js) and [`JSZip`](https://stuk.github.io/jszip/). Zero bytes transmitted over the network.

### 7. 🔐 Password Strength & Zero-Knowledge Breach Meter (`password-meter.html`)
- **Features:** Mathematical k-Anonymity breach checking against billions of compromised records (the password never leaves local RAM), realistic entropy and crack time calculations, and multi-word diceware passphrase generator.
- **Engine:** [`zxcvbn`](https://github.com/dropbox/zxcvbn), native Web Crypto API (`SHA-1` & `CSPRNG`), and HaveIBeenPwned range API.

### 8. 📁 File Organizer (`file-organizer.html`)
- **Features:** In-browser folder organizer using the HTML5 File System Access API / JSZip, plus a native standalone Windows utility that sorts cluttered directories into 12 distinct categories in seconds.
- **Compiled with Nuitka:** Direct C-binary compilation with minimal heuristic profile.
- **Integrity (SHA-256):** `d9ed3365e1308b9b827baa434c2b5875ad871b84deb29ebc60bddf5e3f989f18`
- **VirusTotal:** [Verified Clean Report](https://www.virustotal.com/gui/file/d9ed3365e1308b9b827baa434c2b5875ad871b84deb29ebc60bddf5e3f989f18)

### 9. 🖼️ Photo Resizer & Compressor (`photo-resizer.html`)
- **Features:** Scale dimensions, Cropper.js aspect ratio presets (Passport, Square, Social Banner, A4), iterative binary search KB compressor, and convert image formats (JPEG, PNG, WebP) in real time.
- **Engine:** Hardware-accelerated HTML5 Canvas 2D rasterization.

### 10. 📱 QR Code Generator (`qr-generator.html`)
- **Features:** Generate high-density, error-corrected QR codes for URLs, Wi-Fi networks, and contact cards with custom colors and instant PNG downloads.
- **Engine:** Lightweight client-side QR generation engine.

### 11. ⌨️ Typing Speed Test (`typing-test.html`)
- **Features:** Clean, distraction-free typing benchmark with real-time WPM, accuracy calculation, error highlighting, and difficulty tiers.
- **Privacy:** Best scores saved locally via `localStorage`.

### 12. 💻 Code to Image (`code-to-image.html`)
- **Features:** Render syntax-highlighted code snippets into beautiful, shareable images.
- **Engine:** Client-side HTML5 Canvas.

### 13. 🖼️ SVG Optimizer (`svg-optimizer.html`)
- **Features:** Minify, sanitize, and optimize SVG code locally.
- **Engine:** Client-side string manipulation and DOM parsing.

### 14. ✍️ Document Signer (`document-signer.html`)
- **Features:** Sign PDFs and images with drawn, typed, or uploaded signatures.
- **Engine:** `pdf-lib` vector injection and PDF.js fallback.

### 15. 📄 Resume Builder (`resume-builder.html`)
- **Features:** Live-preview resume builder and PDF exporter.
- **Engine:** Client-side layout engine and print stylesheet.

### 16. 🧾 Invoice Generator (`invoice-generator.html`)
- **Features:** Professional invoice and receipt studio with printable layout.
- **Engine:** Client-side generation with no watermarks.

### 17. 🗄️ File Vault (`file-vault.html`)
- **Features:** Client-side AES-GCM file encryption and decryption.
- **Engine:** Web Crypto API and PBKDF2 key derivation.

### 18. 📝 Markdown Studio (`markdown-studio.html`)
- **Features:** Split-screen Markdown editor with live LaTeX preview and export.
- **Engine:** Marked.js and KaTeX.

---

## 🚀 Running Locally

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

## 🏗️ Static Site Generator (SSG) & Master Shell Architecture

Tangent uses a lightweight, zero-dependency Python template compiler (`build.py`) with a single master shell (`templates/shell.html`):
- **Single Source of Truth**: The global navigation, push-sidebar, and 2-line footer are defined once in `templates/shell.html`.
- **Modular Tool Fragments**: Tool workspaces, styles, and scripts live cleanly in `src/tools/` without repetitive boilerplate.
- **Zero-Flicker Static Output**: Running `python build.py` compiles pure static HTML files with 0ms Cumulative Layout Shift (CLS) and 100% crawlable SEO markup.

```bash
# Compile all 13 HTML pages, regenerate sitemap, and run the 9-check pre-flight audit
python build.py

# Manage tools (list, sync, scaffold new tools)
python scripts/manage_tools.py list
```

---

## 🔒 Security & Architecture

| Feature | Tangent Implementation |
| :--- | :--- |
| **Server Uploads** | **None.** Processing occurs in browser memory or native offline binary. |
| **Content Security Policy** | Strict inline execution with pinned CDNs (`cdnjs.cloudflare.com`, `cdn.jsdelivr.net`). |
| **Network Telemetry** | No Google Analytics, no Facebook Pixel, no tracking pixels. |
| **Data Retention** | Data disappears as soon as you close or refresh the tab. |

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more information. Built for speed, privacy, and precision.
