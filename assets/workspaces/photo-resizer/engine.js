let cropper = null;
  let resizerOperation=0,resizerBusy=false;
  function invalidateResizerOutput(){
    resizerOperation++;resizerBusy=false;TangentMedia.clearLink(downloadBtn);
    processBtn.disabled=!cropper;if(cropper)statusEl.textContent='Settings changed. Create a new image to update the download.';
  }
  const imageToCrop = document.getElementById('imageToCrop');
  const cropContainer = document.getElementById('cropContainer');
  const processBtn = document.getElementById('processBtn');
  const widthInput = document.getElementById('widthInput');
  const heightInput = document.getElementById('heightInput');
  const dropZone = document.getElementById('dropZone');
  const imageInput = document.getElementById('imageInput');
  const activeFileCard = document.getElementById('activeFileCard');
  const activeThumb = document.getElementById('activeThumb');
  const activeFileName = document.getElementById('activeFileName');
  const activeFileMeta = document.getElementById('activeFileMeta');
  const statusEl = document.getElementById('status');
  const downloadBtn = document.getElementById('downloadBtn');

  // Drag & Drop Listeners
  dropZone.addEventListener('click', () => imageInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      loadFile(e.dataTransfer.files[0]);
    }
  });

  imageInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      loadFile(e.target.files[0]);
    }
  });

  async function loadFile(file) {
    resetPhotoResizer();const operation=resizerOperation;
    if(!file||!file.type.startsWith('image/')){statusEl.textContent='Choose a supported image.';return;}
    statusEl.textContent='Loading image...';
    try {
      const img=await TangentMedia.loadImage(file);if(operation!==resizerOperation)return;
      activeFileName.textContent=file.name;activeFileMeta.textContent=`${img.naturalWidth} × ${img.naturalHeight} px · ${(file.size/1024).toFixed(1)} KB`;
      activeThumb.src=img.src;dropZone.style.display='none';activeFileCard.style.display='flex';
      imageToCrop.src=img.src;cropContainer.style.display='block';processBtn.style.display='inline-flex';processBtn.disabled=true;
      const w=Number(widthInput.value),h=Number(heightInput.value);
      cropper=new Cropper(imageToCrop,{aspectRatio:w>0&&h>0?w/h:1,viewMode:1,autoCropArea:0.9,responsive:true,background:false,
        crop(){if(downloadBtn.hasAttribute('href')||resizerBusy)invalidateResizerOutput();},
        ready(){if(operation===resizerOperation){processBtn.disabled=false;statusEl.textContent='';}}});
    } catch(error){if(operation===resizerOperation)statusEl.textContent=error.message;}
  }

  function resetPhotoResizer() {
    resizerOperation++;resizerBusy=false;processBtn.disabled=false;TangentMedia.clearLink(downloadBtn);
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
    imageInput.value = '';
    imageToCrop.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E";
    cropContainer.style.display = 'none';
    processBtn.style.display = 'none';
    activeFileCard.style.display = 'none';
    dropZone.style.display = 'block';
    statusEl.innerHTML = '';
    downloadBtn.style.display = 'none';
  }

  function applyPreset(w, h, btn) {
    invalidateResizerOutput();
    widthInput.value = w;
    heightInput.value = h;
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    updateAspectRatio();
  }

  function clearPresetActive() {
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  }

  function toggleFormat() {
    invalidateResizerOutput();
    const format = document.getElementById('formatSelect').value;
    const kbContainer = document.getElementById('kbRowContainer');
    kbContainer.querySelectorAll('input').forEach(input=>input.disabled=format==='image/png');
    if (format === 'image/png') {
      if (kbContainer) kbContainer.style.opacity = '0.35';
    } else {
      if (kbContainer) kbContainer.style.opacity = '1';
    }
  }

  function updateAspectRatio() {
    invalidateResizerOutput();
    if (cropper) {
      const w = parseInt(widthInput.value) || 1;
      const h = parseInt(heightInput.value) || 1;
      if(w>0&&h>0)cropper.setAspectRatio(w / h);
    }
  }

  function showResizerSuccess(blob, ext, w, h, note) {
    const sizeKb = (blob.size / 1024).toFixed(1);
    let noteHtml = note ? `<div style="font-size:0.84rem; color:#fbbf24; margin-top:4px;">${note}</div>` : '';
    statusEl.innerHTML = `
      <div class="success-banner">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <div>
          <div><strong>Ready for Download:</strong> ${w} × ${h} px · <strong>${sizeKb} KB</strong> (${ext.toUpperCase()})</div>
          ${noteHtml}
        </div>
      </div>
    `;
    TangentMedia.clearLink(downloadBtn);
    const url = URL.createObjectURL(blob);
    downloadBtn.href = url;
    downloadBtn.download = `Tangent_Resized_${w}x${h}.${ext}`;
    downloadBtn.style.display = 'inline-flex';
  }

  async function processAndCompress() {
    if(!cropper||resizerBusy)return;
    TangentMedia.clearLink(downloadBtn);
    const targetWidth=Number(widthInput.value),targetHeight=Number(heightInput.value);
    try{TangentMedia.checkSize(targetWidth,targetHeight);}catch(error){statusEl.textContent=error.message;return;}
    const operation=resizerOperation;
    resizerBusy=true;processBtn.disabled=true;
    const getBlob=async(canvas,type,quality)=>{const blob=await TangentMedia.encode(canvas,type,quality);if(operation!==resizerOperation)throw new Error('Cancelled');return blob;};
    const showSuccess=(blob,ext,w,h,note)=>{if(operation===resizerOperation)showResizerSuccess(blob,TangentMedia.extension(blob.type),w,h,note);};
    try {
    const format = document.getElementById('formatSelect').value;
    const isPng = format === 'image/png';
    const isWebp = format === 'image/webp';
    let ext = 'jpg';
    if (isPng) ext = 'png';
    if (isWebp) ext = 'webp';

    const minKbVal = parseFloat(document.getElementById('minKbInput').value);
    const maxKbVal = parseFloat(document.getElementById('maxKbInput').value);
    const minBytes = document.getElementById('minKbInput').value.trim()==='' ? 0 : minKbVal * 1024;
    const maxBytes = maxKbVal * 1024;
    if(!isPng&&(!Number.isFinite(minBytes)||minBytes<0||!Number.isFinite(maxBytes)||maxBytes<=0)){
      statusEl.textContent='Use a nonnegative minimum and a positive maximum size in KB.';return;
    }

    if (!isPng && minBytes >= maxBytes) {
      statusEl.innerHTML = `
        <div class="error-banner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          Maximum KB must be strictly greater than Minimum KB.
        </div>
      `;
      return;
    }

    statusEl.innerHTML = `
      <div style="text-align:center; padding:12px; color:var(--accent); font-weight:600;">
        ${isPng ? 'Rendering lossless PNG...' : 'Calculating optimal compression balance...'}
      </div>
    `;
    downloadBtn.style.display = 'none';

    const croppedCanvas = cropper.getCroppedCanvas({width:targetWidth,height:targetHeight});
    if (!croppedCanvas || !croppedCanvas.width || !croppedCanvas.height) {
      statusEl.innerHTML = `
        <div class="error-banner">
          Failed to process image canvas. Please try selecting a photo again.
        </div>
      `;
      return;
    }

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = targetWidth;
    finalCanvas.height = targetHeight;
    const ctx = finalCanvas.getContext('2d');

    // JPEG has no alpha channel. Preserve transparency for PNG and WebP.
    if (format === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(croppedCanvas, 0, 0, targetWidth, targetHeight);

    if (isPng) {
      const blob = await getBlob(finalCanvas, 'image/png');
      return showSuccess(blob, 'png', targetWidth, targetHeight);
    }

    const mimeType = isWebp ? 'image/webp' : 'image/jpeg';

    // Check maximum quality 1.0
    let blob = await getBlob(finalCanvas, mimeType, 1.0);
    if (blob.size < minBytes) {
      return showSuccess(blob, ext, targetWidth, targetHeight, `Note: Image is ${(blob.size/1024).toFixed(1)} KB at maximum quality (under your ${minKbVal} KB minimum).`);
    }
    if (blob.size <= maxBytes) {
      return showSuccess(blob, ext, targetWidth, targetHeight);
    }

    // Check minimum quality 0.01
    let minBlob = await getBlob(finalCanvas, mimeType, 0.01);
    if (minBlob.size > maxBytes) {
      return showSuccess(minBlob, ext, targetWidth, targetHeight, `Note: Compression limit reached: ${(minBlob.size/1024).toFixed(1)} KB. Try slightly smaller pixel dimensions to meet ${maxKbVal} KB.`);
    }

    // Iterative binary search for quality (15 iterations = ~0.00003 precision)
    let min_q = 0.01, max_q = 1.0, best_blob = minBlob;
    for (let i = 0; i < 15; i++) {
      let q = (min_q + max_q) / 2;
      blob = await getBlob(finalCanvas, mimeType, q);

      if (blob.size >= minBytes && blob.size <= maxBytes) {
        return showSuccess(blob, ext, targetWidth, targetHeight);
      }

      if (blob.size > maxBytes) {
        max_q = q;
      } else {
        min_q = q;
        best_blob = blob;
      }
    }

    if (best_blob) {
      return showSuccess(best_blob, ext, targetWidth, targetHeight, `Settled on closest safe size: ${(best_blob.size / 1024).toFixed(1)} KB`);
    }
    } catch(error){if(operation===resizerOperation)statusEl.textContent='Could not resize image: '+error.message;}
    finally{if(operation===resizerOperation){resizerBusy=false;processBtn.disabled=false;}}
  }

  // Mobile Navigation Hamburger Toggle
