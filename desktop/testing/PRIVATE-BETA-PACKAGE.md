# Private testing package — 2026-10-10

Built unsigned Windows x64 NSIS installer for Tangent Testing 1.0.0-beta.2 with com.tangent.desktop.testing identity. Build command: `tauri.cmd build --config src-tauri/tauri.testing.conf.json --bundles nsis --ci --no-sign -- --offline`. Build and bundling succeeded; existing Rust warnings and deprecated STATIC_VCRUNTIME warning remain.

Source checkpoint: 248eff2 (Revenue imputation correction). Testing version override and package documentation are subsequent packaging changes. BUILD.json records the config hash; no publication or push occurred.

Artifacts under testing/artifacts/releases:

- Tangent-Testing-1.0.0-beta.2.zip — 29.3 MiB, installer plus README, checklist, feedback template and synthetic fixtures.
- Tangent-Testing-1.0.0-beta.2-stress.zip — 7.1 MiB, optional million-row correlation/log and 100k-row HTML fixtures.
- Adjacent .sha256 files and per-archive CHECKSUMS.sha256 manifests.

Installer SHA256: f85d3ec88ce542789b78fac3d7b324891394cc7d38862ee3e1ab9fd812d44237.

Verified executable version metadata: ProductName Tangent Testing; ProductVersion/FileVersion 1.0.0-beta.2. Authenticode status NotSigned. Both ZIP CRC tests and every manifest entry hash passed. Small CSV fixture counts were checked independently. Generated package contains only selected synthetic fixtures, not the user's Revenue dataset.

User reported that the testing package works as intended on the available laptop. This is a successful user retest, not confirmation that every checklist item or both themes were exercised. Second-machine compatibility remains pending. Use private-beta/SMOKE-TEST.md and record PASS/FAIL/UNTESTED. This is a private test package, not public-beta approval.

Recreate with `python scripts/package-private-testing.py` after building the matching installer. Script refuses to overwrite an existing release folder. The generated installer and archives are ignored build artifacts, not included by a Git source restore tag.
