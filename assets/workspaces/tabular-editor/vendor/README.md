# Tabular Editor browser parsers

PapaParse5.4.1 is extracted unchanged from the exact npm tarball after verifying
its registry SHA512 integrity. Its MIT license is included. The existing
SheetJS0.20.3 bundle is byte-preserved, not upgraded or rebuilt. Its local SHA256
records the retained snapshot; it is not an independently verified upstream hash.
The official Apache2.0 license text is included (source recorded in manifest).
No claim that this task reverified the original SheetJS bundle provenance is made.

editor.js loads these local scripts on demand: CSV/TSV import or export needs
PapaParse; XLSX import or export needs SheetJS. JSON needs neither. Failed loads
are removed and can be retried. The manifest records bytes/versions/SHA256 and
package integrity evidence; it is not browser-enforced SRI. This site still needs
to serve its assets; no PWA caching or universal offline promise is implied.
