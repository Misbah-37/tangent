/* Reference TGT1 reader using only Node.js built-ins. See TGT1.md. */
'use strict';
const fs = require('node:fs');
const crypto = require('node:crypto');

function decryptTgt1(input, password) {
  const container = Buffer.from(input);
  if (container.length < 50 || container.subarray(0, 4).toString('ascii') !== 'TGT1') {
    throw new Error('Unsupported or truncated TGT1 container.');
  }
  const key = crypto.pbkdf2Sync(Buffer.from(password, 'utf8'), container.subarray(4, 20), 100000, 32, 'sha256');
  let plaintext;
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, container.subarray(20, 32));
    decipher.setAuthTag(container.subarray(-16));
    plaintext = Buffer.concat([decipher.update(container.subarray(32, -16)), decipher.final()]);
    if (plaintext.length < 2) throw new Error('Invalid metadata length.');
    const length = plaintext.readUInt16BE(0);
    if (length > plaintext.length - 2) throw new Error('Invalid metadata length.');
    const metadata = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(plaintext.subarray(2, 2 + length)));
    if (!metadata || typeof metadata.name !== 'string' || !metadata.name || typeof metadata.type !== 'string') {
      throw new Error('Invalid metadata.');
    }
    return { metadata, bytes: Buffer.from(plaintext.subarray(2 + length)) };
  } catch {
    throw new Error('Wrong password, damaged container, or invalid authenticated contents.');
  } finally {
    key.fill(0);
    if (plaintext) plaintext.fill(0);
  }
}

function readPassword() {
  return new Promise((resolve, reject) => {
    const input = process.stdin;
    if (!input.isTTY || typeof input.setRawMode !== 'function') {
      reject(new Error('Use an interactive terminal for the hidden password prompt.'));
      return;
    }
    const wasRaw = !!input.isRaw;
    let password = '';
    const cleanup = () => {
      input.off('data', onData);
      input.setRawMode(wasRaw);
      input.pause();
      process.stdout.write('\n');
    };
    const onData = chunk => {
      for (const char of chunk) {
        if (char === '\u0003') { cleanup(); reject(new Error('Cancelled.')); return; }
        if (char === '\r' || char === '\n') { cleanup(); resolve(password); return; }
        if (char === '\u007f' || char === '\b') { password = Array.from(password).slice(0, -1).join(''); }
        else if (char >= ' ' && char !== '\u001b') password += char;
      }
    };
    process.stdout.write('Password (hidden): ');
    input.setEncoding('utf8');
    input.setRawMode(true);
    input.on('data', onData);
    input.resume();
  });
}

async function main() {
  const [source, destination] = process.argv.slice(2);
  if (!source || !destination || process.argv.length !== 4) {
    throw new Error('Usage: node decrypt-tgt1.cjs INPUT.tangent EXPLICIT_OUTPUT_PATH');
  }
  const container = fs.readFileSync(source);
  const password = await readPassword();
  const recovered = decryptTgt1(container, password);
  // Never derive a filesystem path from untrusted embedded metadata.
  fs.writeFileSync(destination, recovered.bytes, { flag: 'wx', mode: 0o600 });
  process.stdout.write(`Recovered ${recovered.bytes.length} bytes to the requested output path.\n`);
}

module.exports = { decryptTgt1 };
if (require.main === module) main().catch(error => { process.stderr.write(error.message + '\n'); process.exitCode = 1; });
