# RunTangent TGT2 container format

TGT2 is the new-file format introduced in prototype204. It increases password derivation work relative to TGT1 and authenticates the outer header. This is a format specification, not a security certification. Weak passwords can still be guessed. No recovery key, batch packaging, streaming or early password verifier is added.

## Compatibility

- New Lock operations write **TGT2** only.
- Current Unlock reads **TGT1 and TGT2**. TGT1 is read with its original parameters; files are not silently rewritten or upgraded.
- Earlier TGT1-only tools and `decrypt-tgt1.cjs` cannot read TGT2. Keep a current reader, this specification and backups of important containers.
- Unlocking a TGT1 file and locking the recovered file again creates a separate TGT2 copy. Check that copy before deciding what originals to retain.

## Byte layout and derivation

| Offset | Length | Contents |
| --- | --- | --- |
| 0 | 4 | ASCII `TGT2`, hexadecimal `54 47 54 32` |
| 4 | 16 | Fresh cryptographic random salt |
| 20 | 12 | Fresh cryptographic random AES-GCM IV |
| 32 | Remaining | AES-GCM ciphertext followed by its 16-byte tag |

The complete **32-byte header** (offset0 inclusive to32 exclusive) is passed unchanged as AES-GCM **additional authenticated data (AAD)**. It is public but authenticated by the tag; this does not encrypt the header or conceal container size. The original filename/type/date remain inside the encrypted plaintext. The externally visible download name is a separately generated random identifier, not the original filename.

Password bytes are UTF-8 using JavaScript TextEncoder semantics, with no trimming, case folding or normalization. PBKDF2-HMAC-SHA-256 uses exactly **600,000 iterations** and the16-byte salt to derive a **32-byte key**. AES-256-GCM uses the12-byte IV and a **128-bit tag**. Fixed parameters are selected by the version marker, not read from an untrusted iteration field. Salt/IV must be regenerated for every encryption; do not reuse them to preserve a filename or file identity.

Authenticated plaintext is unchanged from [TGT1](TGT1.md): a2-byte unsigned **big-endian** metadata length N, followed by N bytes of UTF-8 JSON (`name`, `type`, `date`), followed by exact original file bytes. Metadata is bounded to65,535UTF-8bytes by the writer. Readers must validate metadata bounds/types after successful authentication. Empty original files are valid.

## Version-specific reader rules

| Magic | PBKDF2-SHA-256 iterations | AES-GCM AAD | Key/tag |
| --- | --- | --- | --- |
| TGT1 | 100,000 | None | 256-bit key /128-bit tag |
| TGT2 | 600,000 | Exact32-byte header | 256-bit key /128-bit tag |

Reject unknown or truncated formats before key derivation. Choose one profile from the marker; do not retry another version or cheaper parameters after authentication failure. A modified TGT2 marker claiming TGT1 must not cause an authentication failure to be ignored. Altered salt/IV/ciphertext/tag must fail without releasing plaintext. The header has no unauthenticated user-controlled work factor that could request arbitrarily expensive derivation.

This remains one whole-file GCM message, processed in memory. Higher derivation work adds device-dependent delay and is not a remedy for oversized files or a guarantee against password guessing. Authentication failure does not reliably distinguish an incorrect password from a damaged file. Format identification/header validation is not a fast password check.

## Independent recovery reader

`decrypt-tangent.cjs` uses only Node.js built-in APIs and reads both versions independently of the browser UI. No dependency installation or network operation is needed when Node.js is available.

```powershell
node docs/formats/decrypt-tangent.cjs path/to/container.tangent path/to/recovered-file.bin
```

Enter the password at the hidden interactive-terminal prompt. The original embedded filename is not used to choose a filesystem path; supply an explicit output path. The reader uses exclusive creation and refuses existing output files. Keep passwords out of command arguments/history. It reads the entire container into memory; it does not securely erase input, output or JavaScript password strings.

The exported `decryptContainer(containerBytes, password)` returns `{metadata, bytes}` or throws. The older `decrypt-tgt1.cjs` remains unchanged for legacy-only use. These files are saved locally; no external publication has been performed.
