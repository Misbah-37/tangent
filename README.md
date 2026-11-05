# RunTangent Web

Browser tools for data, documents, images, media and everyday work. This repository contains the website and browser tools only. The RunTangent desktop Free and Pro applications are separate products and are not included or relicensed here.

## Run locally

Install Python 3, then from this directory:

```sh
python build.py --local-only
python -m http.server 8000 --bind 127.0.0.1
```

Open http://127.0.0.1:8000/. Serve from the site root: templates use root-relative asset paths. The build uses Python's standard library and writes local generated HTML and sitemap files. It does not publish, install dependencies, sync external folders or access desktop code. Windows users can also use `Start-LocalWebsite.ps1` after generating the pages.

## Source layout

- `tools.json`: catalog of 31 active browser tools.
- `src/`: editable homepage, directory, tool fragments, content and retired-route notices.
- `templates/`: page layouts and shared navigation.
- `assets/`: browser engines, styles and third-party runtimes.
- `build.py`: website compiler. Edit source fragments, then regenerate pages.
- `docs/formats/`: TGT encrypted-container format documentation and reference readers.

Libraries, fonts, OCR resources or AI models may be loaded from external services by individual tools. Optional breach checks and user-requested remote resources also make network requests. Read each tool's disclosures; this is not a universal offline guarantee. Local drafts may remain in browser storage until cleared.

## Licensing

Project-owned website code and documentation in this candidate are licensed under Apache License 2.0; see `LICENSE` and `NOTICE`. Commercial reuse of that code is permitted under those terms. Bundled third-party components retain their original licences; see `THIRD-PARTY-NOTICES.md` and the retained component notices.

Decorative artwork, raster brand images and favicons are omitted from this source distribution. The RunTangent name, marks and domain do not come with permission to imply official affiliation. See `BRANDING.md`.

See `CONTRIBUTING.md` for contribution requirements. The source candidate is undergoing a pre-publication review; see `PREPUBLICATION.md` for the remaining checks. No public release or grant-program acceptance is implied by this local preparation.
