# Third-party components

Apache-2.0 applies to project-owned website code, not to the following upstream material. Retain the complete supplied licences and copyright notices when redistributing those components. This is an initial inventory for independent review, not a claim that all upstream provenance has been verified.

| Component | Retained licence / provenance |
| --- | --- |
| DuckDB-Wasm 1.32.0, DuckDB core 1.4.3 and JSON/Parquet extensions | `assets/vendor/duckdb-wasm/1.32.0/licenses/`, `manifest.json` and `README.md` (MIT) |
| Apache Arrow 17.0.0 | Same directory, Apache licence and NOTICE retained |
| flatbuffers 24.3.25 and tslib 2.6.3 | Same directory, licences and copyright notices retained |
| DOMPurify | `assets/dompurify-LICENSE.txt` and bundled header; review dual-licence choice against bundled version |
| zxcvbn | `assets/zxcvbn-LICENSE.txt` |
| KaTeX export CSS and embedded fonts | `assets/katex-LICENSE.txt`, `assets/katex-export-css.js` (MIT header) |
| SheetJS 0.20.3 and PapaParse 5.4.1 | `assets/workspaces/tabular-editor/vendor/` licences, README and manifest. Existing SheetJS bytes retained; original upstream provenance is not independently certified by this preparation. |
| Chart.js | Log Analyzer and Finance Dashboard vendor licence files/manifests |
| PapaParse in Finance Dashboard | Its vendor directory licence and manifest |
| html2canvas | `assets/workspaces/correlation-matrix/vendor/html2canvas-LICENSE` |
| EFF Long Wordlist adaptation | `assets/workspaces/password-meter/WORDLIST-NOTICE.md` (CC BY 4.0), attribution retained |

Other tools load libraries, fonts, OCR/AI resources or other packages from external URLs. Their own terms apply; their source is not relicensed by this repository. Review the external-resource inventory before publishing and keep network disclosures accurate. No desktop dependency or desktop licence is included.
