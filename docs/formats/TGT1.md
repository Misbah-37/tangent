# RunTangent TGT1 container format

This describes the existing File Lockbox format, not a new format or a security certification. Keep a copy of this document and the reference reader with important backups. A future format must use a different version marker if these fixed cryptographic parameters change. Existing TGT1 files require exactly the parameters below.

Prototype204 adds [TGT2](TGT2.md) for new files. Current Unlock and `decrypt-tangent.cjs` read both versions; the legacy `decrypt-tgt1.cjs` reader remains TGT1-only. The TGT1 bytes and parameters below have not changed.

## Outer layout

All offsets are byte offsets. The extension is conventionally `.tangent`; the four magic bytes determine this version. The visible filename is not used in decryption.

| Offset | Length | Contents |
| --- | --- | --- |
| 0 | 4 | ASCII `TGT1`, hexadecimal `54 47 54 31` |
| 4 | 16 | Cryptographically random salt |
| 20 | 12 | Cryptographically random AES-GCM IV |
| 32 | Remaining | Ciphertext followed by the 16-byte GCM authentication tag |

There is no external filename, media type, iteration field, recovery key or password verifier. Salt and IV are public. File/container size remains visible. The random download name added in prototype202 does not change these bytes; legacy names such as `original.pdf.tangent` still work.

## Password and encryption

1. Encode the password as UTF-8 using JavaScript `TextEncoder`. Do not trim, lowercase or normalize it. Spaces and Unicode differences matter. Interoperable readers should use well-formed Unicode; TextEncoder replaces unpaired UTF-16 surrogates with U+FFFD.
2. PBKDF2-HMAC-SHA-256, exactly **100,000 iterations**, using the 16-byte salt, produces a **32-byte key**.
3. Encrypt with AES-256-GCM and the 12-byte IV. No additional authenticated data is supplied. The tag is **128 bits**; Web Crypto appends it to the ciphertext.
4. Generate fresh salt and IV with a cryptographic random source for every encryption. The prototype's opaque download name uses a separate 12-byte random identifier.

Do not raise the iteration constant when reading TGT1. That would produce a different key and break decryption. Work-factor upgrades require versioned format handling that still reads TGT1. This document records implementation behavior, not a claim that these parameters are the latest recommended design.

## Authenticated plaintext

After successful GCM authentication, the decrypted bytes are:

| Offset | Length | Contents |
| --- | --- | --- |
| 0 | 2 | Unsigned **big-endian** metadata byte length `N` |
| 2 | N | UTF-8 JSON metadata |
| 2 + N | Remaining | Exact original file bytes, including an empty payload if the original was empty |

Current writers produce `{ "name": "original filename", "type": "MIME type", "date": <milliseconds since Unix epoch> }`. `type` falls back to `application/octet-stream`; `date` records lock time. Metadata is encrypted and authenticated. The writer refuses metadata longer than 65,535 UTF-8 bytes. Readers must validate bounds and JSON types; do not assume metadata order or extra properties.

The whole payload is one GCM message. Wrong passwords, altered ciphertext, altered salt/IV and tag failures must not release unauthenticated plaintext. The magic marker is checked before decryption; there is no separate authenticated header or streaming/chunked design. Authentication can fail for a wrong password or damaged file, without reliably distinguishing the two.

## Reference recovery reader

`decrypt-tgt1.cjs` uses Node.js built-in crypto and filesystem APIs. No package install is needed when Node.js is available. It is independent of the browser UI and has no network code.

From an interactive terminal:

```powershell
node docs/formats/decrypt-tgt1.cjs path/to/container.tangent path/to/recovered-file.bin
```

Enter the password at the hidden prompt. Do not place real passwords in command arguments or shell history. The reader requires an explicit output path and uses exclusive creation (`wx`), refusing to overwrite an existing file. It never uses the embedded original filename as a filesystem path. Input and output are processed in memory, so use smaller files if memory is limited. The example is not a secure-erasure tool, and JavaScript password strings cannot be reliably wiped from memory.

The exported `decryptTgt1(containerBytes, password)` API returns `{metadata, bytes}` and throws on authentication/format failure. Automated tests use synthetic passwords only. Current validation is bounded by the tested fixtures; retain originals and verify recovery before relying on backups. Documentation and example are saved locally here; no external publication has occurred.
