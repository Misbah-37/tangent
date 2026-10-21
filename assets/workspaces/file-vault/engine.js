
  let activeMode = 'lock'; // 'lock' or 'unlock'
  let selectedFile = null;
  let vaultBusy = false;

  const tabLockMode = document.getElementById('tabLockMode');
  const tabUnlockMode = document.getElementById('tabUnlockMode');
  const vaultDropzone = document.getElementById('vaultDropzone');
  const fileInput = document.getElementById('fileInput');
  const dropzoneTitle = document.getElementById('dropzoneTitle');
  const dropzoneDesc = document.getElementById('dropzoneDesc');
  const fileBanner = document.getElementById('fileBanner');
  const fileNameText = document.getElementById('fileNameText');
  const fileSizeText = document.getElementById('fileSizeText');
  const vaultPassword = document.getElementById('vaultPassword');
  const confirmPassword = document.getElementById('confirmPassword');
  const confirmGroup = document.getElementById('confirmGroup');
  const togglePwdBtn = document.getElementById('togglePwdBtn');
  const submitBtn = document.getElementById('submitBtn');
  const submitBtnText = document.getElementById('submitBtnText');
  const successAlert = document.getElementById('successAlert');
  const dangerAlert = document.getElementById('dangerAlert');

  // Mode Switch
  tabLockMode.addEventListener('click', () => setMode('lock'));
  tabUnlockMode.addEventListener('click', () => setMode('unlock'));

  function setMode(mode) {
    if (vaultBusy) return;
    activeMode = mode;
    clearAlerts();
    selectedFile = null;
    fileBanner.style.display = 'none';
    vaultPassword.value = '';
    confirmPassword.value = '';
    fileInput.value = '';vaultPassword.type='password';tabLockMode.setAttribute('aria-pressed',String(mode==='lock'));tabUnlockMode.setAttribute('aria-pressed',String(mode==='unlock'));
    updateSubmitState();

    if (mode === 'lock') {
      tabLockMode.classList.add('active');
      tabUnlockMode.classList.remove('active');
      dropzoneTitle.textContent = 'Choose what you want to keep private.';
      dropzoneDesc.textContent = 'Choose one file. Its contents and filename go inside the encrypted container.';
      confirmGroup.style.display = 'block';
      submitBtnText.textContent = 'Lock & download';
    } else {
      tabUnlockMode.classList.add('active');
      tabLockMode.classList.remove('active');
      dropzoneTitle.textContent = 'Bring your locked file back.';
      dropzoneDesc.textContent = 'Select the .tangent encrypted container to decrypt';
      confirmGroup.style.display = 'none';
      submitBtnText.textContent = 'Unlock & download';
    }
  }

  // Dropzone Events
  vaultDropzone.addEventListener('click', () => { if (!vaultBusy) fileInput.click(); });
  vaultDropzone.addEventListener('dragover', (e) => { e.preventDefault(); vaultDropzone.classList.add('dragover'); });
  vaultDropzone.addEventListener('dragleave', () => vaultDropzone.classList.remove('dragover'));
  vaultDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    vaultDropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleFile(e.target.files[0]);
  });

  function handleFile(file) {
    if (vaultBusy) return;
    clearAlerts();
    selectedFile = file;
    fileNameText.textContent = file.name;
    fileSizeText.textContent = formatBytes(file.size);
    fileBanner.style.display = 'flex';
    updateSubmitState();
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  // Password Visibility Toggle
  togglePwdBtn.addEventListener('click', () => {
    const isPwd = vaultPassword.type === 'password';
    vaultPassword.type = isPwd ? 'text' : 'password';
  });

  [vaultPassword, confirmPassword].forEach(el => {
    el.addEventListener('input', updateSubmitState);
  });

  function updateSubmitState() {
    if (vaultBusy || !selectedFile || !vaultPassword.value) {
      submitBtn.disabled = true;
      return;
    }
    if (activeMode === 'lock' && vaultPassword.value !== confirmPassword.value) {
      submitBtn.disabled = true;
      return;
    }
    submitBtn.disabled = false;
  }

  function clearAlerts() {
    successAlert.style.display = 'none';
    dangerAlert.style.display = 'none';
  }

  // Web Crypto Key Derivation: PBKDF2 -> AES-GCM
  async function deriveKey(password, salt, iterations) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // Submit Handler: Lock or Unlock
  submitBtn.addEventListener('click', async () => {
    if (vaultBusy || !selectedFile || !vaultPassword.value || (activeMode === 'lock' && vaultPassword.value !== confirmPassword.value)) return;
    const operation = { file: selectedFile, password: vaultPassword.value, mode: activeMode };
    clearAlerts();
    vaultBusy = true;
    submitBtn.disabled = true;
    const controls = [fileInput, vaultPassword, confirmPassword, tabLockMode, tabUnlockMode, togglePwdBtn];
    controls.forEach(control => control.disabled = true);
    vaultDropzone.setAttribute('aria-busy', 'true');
    try {
      if (operation.mode === 'lock') await processLock(operation);
      else await processUnlock(operation);
    } finally {
      vaultBusy = false;
      controls.forEach(control => control.disabled = false);
      vaultDropzone.removeAttribute('aria-busy');
      updateSubmitState();
    }
  });

  // Lock File Pipeline
  async function processLock({file, password}) {
    submitBtnText.textContent = 'Encrypting in RAM...';
    try {
      const fileBuffer = await file.arrayBuffer();
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveKey(password, salt, 600000);
      const header = new Uint8Array(32);
      header.set(new TextEncoder().encode('TGT2'), 0);
      header.set(salt, 4);
      header.set(iv, 20);

      const metadata = JSON.stringify({
        name: file.name,
        type: file.type || 'application/octet-stream',
        date: Date.now()
      });
      const metaBytes = new TextEncoder().encode(metadata);
      const metaLen = metaBytes.byteLength;
      if (metaLen > 65535) throw new Error('File metadata exceeds the container limit.');

      // Plaintext format: [2 bytes metaLen] [metaBytes] [fileBytes]
      const combinedPlain = new Uint8Array(2 + metaLen + fileBuffer.byteLength);
      combinedPlain[0] = (metaLen >> 8) & 0xff;
      combinedPlain[1] = metaLen & 0xff;
      combinedPlain.set(metaBytes, 2);
      combinedPlain.set(new Uint8Array(fileBuffer), 2 + metaLen);

      // AES-GCM Encryption
      const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv, additionalData: header, tagLength: 128 },
        key,
        combinedPlain
      );

      // TGT2: the complete 32-byte header is authenticated as AES-GCM AAD.
      const packageBytes = new Uint8Array(32 + ciphertext.byteLength);
      packageBytes.set(header, 0);
      packageBytes.set(new Uint8Array(ciphertext), 32);

      // Trigger Download
      const blob = new Blob([packageBytes], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const downloadName = 'lockbox_' + Array.from(crypto.getRandomValues(new Uint8Array(12)), byte => byte.toString(16).padStart(2, '0')).join('') + '.tangent';
      a.download = downloadName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      if(window.TangentToast) window.TangentToast.show("Export successful!");

      successAlert.textContent = `Encrypted file prepared. Check your downloads for "${downloadName}".`;
      successAlert.style.display = 'block';
    } catch (err) {
      console.error(err);
      dangerAlert.textContent = 'Encryption failed. Please try again.';
      dangerAlert.style.display = 'block';
    } finally {
      submitBtnText.textContent = 'Lock & download';
    }
  }

  // Unlock File Pipeline
  async function processUnlock({file, password}) {
    submitBtnText.textContent = 'Decrypting in RAM...';
    try {
      const containerBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(containerBuffer);

      // Check Magic Header
      const magic = new TextDecoder().decode(bytes.slice(0, 4));
      if ((magic !== 'TGT1' && magic !== 'TGT2') || bytes.length < 50) {
        dangerAlert.textContent = 'Unsupported or truncated container. Choose a TGT1 or TGT2 .tangent file.';
        dangerAlert.style.display = 'block';
        return;
      }

      const salt = bytes.slice(4, 20);
      const iv = bytes.slice(20, 32);
      const ciphertext = bytes.slice(32);

      const isTgt2 = magic === 'TGT2';
      const key = await deriveKey(password, salt, isTgt2 ? 600000 : 100000);

      // AES-GCM Decryption (will throw error if authentication tag mismatches = wrong password)
      const decryptedPlain = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv, tagLength: 128, ...(isTgt2 ? { additionalData: bytes.slice(0, 32) } : {}) },
        key,
        ciphertext
      );

      const plainBytes = new Uint8Array(decryptedPlain);
      const metaLen = (plainBytes[0] << 8) | plainBytes[1];
      if (plainBytes.length < 2 || metaLen > plainBytes.length - 2) throw new Error('Invalid container metadata length.');
      const metaBytes = plainBytes.slice(2, 2 + metaLen);
      const metadata = JSON.parse(new TextDecoder().decode(metaBytes));
      if (!metadata || typeof metadata.name !== 'string' || !metadata.name || typeof metadata.type !== 'string') throw new Error('Invalid container metadata.');
      const originalFileBytes = plainBytes.slice(2 + metaLen);

      // Trigger Download of original file
      const blob = new Blob([originalFileBytes], { type: metadata.type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = metadata.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      if(window.TangentToast) window.TangentToast.show("Export successful!");

      successAlert.textContent = `Original file prepared. Check your downloads for "${metadata.name}".`;
      successAlert.style.display = 'block';
    } catch (err) {
      console.error(err);
      dangerAlert.textContent = 'Incorrect password or corrupted file. Verification failed.';
      dangerAlert.style.display = 'block';
    } finally {
      submitBtnText.textContent = 'Unlock & download';
    }
  }

setMode('lock');
