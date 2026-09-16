# Tangent - Project Context & Architecture Reference

## 1. Project Overview
**Tangent** is a proprietary, privacy-first suite of modern web utilities. 
- **Core Philosophy**: 100% client-side processing. Zero data ever leaves the user's browser. No tracking, no external API dependencies for tool execution, and no analytics or cookies.
- **Technology Stack**: Vanilla HTML5, CSS3 (custom properties/design tokens), Modern JavaScript (ES6+), HTML Canvas, Web Workers, and Web APIs.
- **Hosting**: Static file hosting (e.g., GitHub Pages or static web servers).

---

## 2. Directory & File Architecture
The project uses a clean **Template Build Architecture** to keep all pages consistent, maintainable, and DRY (Don't Repeat Yourself).

```
Tangent_Website_Update/
├── templates/
│   └── shell.html         # Master layout: <head>, global CSS tokens, navigation,
│                          # 280px push-sidebar toolkit, FAQ accordion styles, footer
├── src/
│   └── tools/             # Source files for each individual tool
│       ├── photo-scrubber.html
│       ├── invoice-generator.html
│       ├── resume-builder.html
│       ├── svg-optimizer.html
│       ├── document-signer.html
│       └── ... (all tool sources)
├── build.py               # Python compiler script: merges src/tools/ with templates/shell.html,
│                          # injects active nav states, generates root HTML, and runs audit
├── index.html             # Generated homepage / directory
├── *.html                 # Generated production pages for each tool
└── PROJECT_CONTEXT.md     # This reference file
```

---

## 3. The Build Workflow
**Rule**: Always edit the source files, never edit the generated root `.html` files in isolation.

1. **To modify a tool**: Edit the corresponding file inside `src/tools/<tool-name>.html`.
2. **To modify site-wide layout, navigation, sidebar, or footer**: Edit `templates/shell.html`.
3. **To compile the site**: Run the build script in the terminal:
   ```bash
   python build.py
   ```
   *The build script automatically merges the templates, produces the root HTML files, and runs a comprehensive pre-flight integrity audit.*

---

## 4. Design & UI Standards
Every page in Tangent must adhere strictly to these UX/UI standards:

1. **Strictly Zero Emojis**:
   - Never use emojis anywhere in the interface (buttons, headers, cards, or text).
   - Use clean, modern SVG icons or simple geometric badge indicators instead.

2. **Unified Navigation & Toolkit Drawer**:
   - Every page features the standard top navbar with the brand mark and a toolkit toggle button.
   - The **Push-Sidebar** (Toolkit Drawer) is standardized to **280px** width across all pages and lists all tools by category.

3. **Page Structure (Top to Bottom)**:
   - **Global Header**: Standard navigation and sidebar toggle.
   - **Main Tool Area**: Clean, focused workspace with high contrast and natural browser zooming (avoid fixed non-responsive widths or accidental overflow clipping).
   - **Educational Features Grid**: 3 to 4 highlight cards explaining features, performance, and the client-side privacy shield.
   - **Standardized FAQ Accordion**:
     - Expandable accordion items for common questions.
     - Headings and answers must be **left-aligned**.
     - Clean toggle icons (+ / − or caret).
   - **Global Footer**: Privacy badge, suite links, and copyright info.

4. **Privacy Shield Guarantee**:
   - All tools must process files locally in memory using `FileReader`, `Canvas`, `Blob`, or client-side libraries.
   - No file uploads to remote servers.

---

## 5. Tool Catalog (Current 18 Tools)
- **Media & Images**:
  - `photo-scrubber.html`: Remove EXIF metadata and scrub photos.
  - `photo-resizer.html`: Batch resize, compress, and convert image formats.
  - `svg-optimizer.html`: Minify, sanitize, and optimize SVG code.
  - `code-to-image.html`: Render syntax-highlighted code snippets into shareable images.
  - `mockup-generator.html`: Create clean device mockups for screenshots.
  - `screen-recorder.html`: In-browser screen and tab video capture.
- **Documents & Productivity**:
  - `document-signer.html`: Sign PDFs and images with drawn, typed, or uploaded signatures.
  - `invoice-generator.html`: Professional invoice and receipt studio with printable layout.
  - `resume-builder.html`: Live-preview resume builder and PDF exporter.
  - `markdown-studio.html`: Split-screen Markdown editor with live preview and export.
  - `document-ocr.html`: Client-side optical character recognition / text extractor.
  - `pdf-converter.html`: Client-side PDF manipulation and format conversion.
  - `pdf-redactor.html`: Redact sensitive information from documents.
- **Utilities & Security**:
  - `file-organizer.html`: Organize and sort files locally into structured folders.
  - `password-meter.html`: Password entropy, strength testing, and secure generation.
  - `file-vault.html`: Client-side AES-GCM file encryption and decryption.
  - `typing-test.html`: Minimalist speed and accuracy typing test.
  - `qr-generator.html`: Customizable QR code generator.

---

## 6. Guidelines for Antigravity & AI Assistants
- **No Unsolicited Pushes/Deploys**: Do not run `git push`, deploy commands, or background authentication flows unless the user explicitly requests it.
- **Respect User Workflow**: Offer explanations and discuss architectural changes before executing broad edits.
- **Maintain Template Integrity**: Ensure changes are made in `src/tools/` or `templates/shell.html` and tested with `python build.py`.
