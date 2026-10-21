
  let rawPdfBytes = null;
  let pdfDoc = null;
  let currentPageNum = 1;
  let totalPages = 1;
  let placedStamps = []; // { page, x, y, width, height, dataUrl }

  const dropZone = document.getElementById('dropZone');
  const pdfFileInput = document.getElementById('pdfFileInput');
  const signerWorkspace = document.getElementById('signerWorkspace');
  const pdfCanvas = document.getElementById('pdfCanvas');
  const stampsLayer = document.getElementById('stampsLayer');
  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');
  const pageIndicator = document.getElementById('pageIndicator');
  const downloadSignedPdfBtn = document.getElementById('downloadSignedPdfBtn');

  // Modal elements
  const sigModal = document.getElementById('sigModal');
  const createSignatureBtn = document.getElementById('createSignatureBtn');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const cancelSigBtn = document.getElementById('cancelSigBtn');
  const saveSigBtn = document.getElementById('saveSigBtn');
  const tabDraw = document.getElementById('tabDraw');
  const tabType = document.getElementById('tabType');
  const paneDraw = document.getElementById('paneDraw');
  const paneType = document.getElementById('paneType');
  const sigPadCanvas = document.getElementById('sigPadCanvas');
  const clearPadBtn = document.getElementById('clearPadBtn');
  const typeSigInput = document.getElementById('typeSigInput');
  const typeSigPreview = document.getElementById('typeSigPreview');
  const addDateBtn = document.getElementById('addDateBtn');
  const addCheckBtn = document.getElementById('addCheckBtn');

  // Signature Pad Logic
  const padCtx = sigPadCanvas.getContext('2d');
  let isDrawing = false;
  let activeColor = '#000000';

  // Dropzone Handlers
  dropZone.addEventListener('click', () => pdfFileInput.click());
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) loadPdfFile(e.dataTransfer.files[0]);
  });
  pdfFileInput.addEventListener('change', (e) => {
    if (e.target.files.length) loadPdfFile(e.target.files[0]);
  });

  let fileOperation = 0, renderOperation = 0, activeRender = null, currentViewport = null;
  async function loadPdfFile(file) {
    if(file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {alert('Please select a valid PDF file.');return;}
    const operation=++fileOperation;
    try {
      const bytes=new Uint8Array(await file.arrayBuffer());
      const candidate=await pdfjsLib.getDocument({data:bytes.slice()}).promise;
      if(operation!==fileOperation) {await candidate.destroy();return;}
      rawPdfBytes=bytes;pdfDoc=candidate;totalPages=candidate.numPages;currentPageNum=1;placedStamps=[];
      document.getElementById('signerExportNotice').hidden=true;
      dropZone.style.display='none';signerWorkspace.style.display='flex';
      await renderCurrentPage();
    } catch(error) {
      if(operation!==fileOperation) return;
      pdfFileInput.value='';
      alert('Unable to open PDF: '+error.message);
      if(!pdfDoc) {dropZone.style.display='block';signerWorkspace.style.display='none';}
    }
  }
  async function renderCurrentPage() {
    if(!pdfDoc) return;
    const operation=++renderOperation, document=pdfDoc, number=currentPageNum;
    signerWorkspace.dataset.rendering='true';stampsLayer.replaceChildren();
    [createSignatureBtn,addDateBtn,addCheckBtn].forEach(button=>button.disabled=true);
    if(activeRender) {const previous=activeRender;previous.cancel();try {await previous.promise;} catch(_) {}}
    try {
      const page=await document.getPage(number);
      if(operation!==renderOperation || document!==pdfDoc) return;
      const viewport=page.getViewport({scale:1.5});currentViewport=viewport;
      pageIndicator.textContent='Loading page '+number+'…';
      prevPageBtn.disabled=number===1;nextPageBtn.disabled=number===totalPages;
      pdfCanvas.width=viewport.width;pdfCanvas.height=viewport.height;
      const task=page.render({canvasContext:pdfCanvas.getContext('2d'),viewport});activeRender=task;
      try {await task.promise;} finally {if(activeRender===task)activeRender=null;}
      if(operation===renderOperation && document===pdfDoc) {
        signerWorkspace.dataset.rendering='false';
        pageIndicator.textContent='Page '+number+' of '+totalPages;
        renderStampsForPage();
        [createSignatureBtn,addDateBtn,addCheckBtn].forEach(button=>button.disabled=false);
      }
    } catch(error) {if(error.name!=='RenderingCancelledException' && operation===renderOperation) alert('Unable to display page: '+error.message);}
  }

  prevPageBtn.addEventListener('click', () => {
    if (currentPageNum > 1) {
      currentPageNum--;
      renderCurrentPage();
    }
  });

  nextPageBtn.addEventListener('click', () => {
    if (currentPageNum < totalPages) {
      currentPageNum++;
      renderCurrentPage();
    }
  });

  // Stamp Placement & Dragging
  const undoBtn = document.getElementById('undoBtn');

  function renderStampsForPage() {
    if(signerWorkspace.dataset.rendering==='true')return;
    const displayScale = pdfCanvas.width ? pdfCanvas.getBoundingClientRect().width/pdfCanvas.width : 1;
    stampsLayer.style.width=pdfCanvas.width+'px';stampsLayer.style.height=pdfCanvas.height+'px';
    stampsLayer.style.transformOrigin='top left';stampsLayer.style.transform='scale('+displayScale+')';
    undoBtn.style.display = placedStamps.length > 0 ? 'inline-flex' : 'none';
    stampsLayer.innerHTML = '';
    const pageStamps = placedStamps.filter(s => s.page === currentPageNum);

    pageStamps.forEach(stamp => {
      const el = document.createElement('div');
      el.className = 'placed-stamp';
      el.style.left = stamp.x + 'px';
      el.style.top = stamp.y + 'px';
      el.style.width = stamp.width + 'px';
      el.style.height = stamp.height + 'px';
      el.style.pointerEvents = 'auto';
      if (stamp.rotation) {
        el.style.transform = `rotate(${stamp.rotation}rad)`;
      }

      const img = document.createElement('img');
      img.src = stamp.dataUrl;
      el.appendChild(img);

      const controls = document.createElement('div');
      controls.className='stamp-controls';controls.setAttribute('role','group');controls.setAttribute('aria-label','Signature adjustments');
      const delBtn = document.createElement('button');delBtn.type='button';
      delBtn.className = 'stamp-delete';
      delBtn.title = 'Remove signature';delBtn.setAttribute('aria-label','Remove signature');
      delBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        placedStamps = placedStamps.filter(s => s !== stamp);
        renderStampsForPage();
      });
      controls.appendChild(delBtn);

      const resizeBtn = document.createElement('button');resizeBtn.type='button';resizeBtn.setAttribute('aria-label','Drag to resize signature');
      resizeBtn.className = 'stamp-resize';
      resizeBtn.title = 'Drag to Resize';
      resizeBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#08090d" stroke-width="3" stroke-linecap="round"><line x1="21" y1="9" x2="9" y2="21"></line><line x1="21" y1="15" x2="15" y2="21"></line><line x1="21" y1="21" x2="21" y2="21"></line></svg>`;

      function startResize(e) {
        e.stopPropagation();
        if (e.type !== 'touchstart') e.preventDefault();
        let startX = e.touches ? e.touches[0].clientX : e.clientX;
        const startY=e.touches ? e.touches[0].clientY : e.clientY;
        let initialW = stamp.width;
        let initialH = stamp.height;
        const aspect = initialW / initialH;

        function onResizeMove(moveEvent) {
          if (moveEvent.type === 'touchmove') moveEvent.preventDefault();
          let currentX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
          const currentY=moveEvent.touches ? moveEvent.touches[0].clientY : moveEvent.clientY;
          const angle=stamp.rotation||0;
          const deltaX = ((currentX-startX)*Math.cos(angle)+(currentY-startY)*Math.sin(angle))/displayScale;
          let newW = Math.max(35, Math.min(650, initialW + deltaX));
          let newH = Math.round(newW / aspect);
          stamp.width = newW;
          stamp.height = newH;
          el.style.width = newW + 'px';
          el.style.height = newH + 'px';
        }

        function onResizeUp() {
          document.removeEventListener('mousemove', onResizeMove);
          document.removeEventListener('mouseup', onResizeUp);
          document.removeEventListener('touchmove', onResizeMove);
          document.removeEventListener('touchend', onResizeUp);
          document.removeEventListener('touchcancel', onResizeUp);
        }

        document.addEventListener('mousemove', onResizeMove);
        document.addEventListener('mouseup', onResizeUp);
        document.addEventListener('touchmove', onResizeMove, { passive: false });
        document.addEventListener('touchend', onResizeUp);
        document.addEventListener('touchcancel', onResizeUp);
      }

      resizeBtn.addEventListener('mousedown', startResize);
      resizeBtn.addEventListener('touchstart', startResize, { passive: false });
      el.appendChild(resizeBtn);

      const rotateBtn = document.createElement('button');rotateBtn.type='button';
      rotateBtn.className = 'stamp-rotate-btn';
      rotateBtn.title = 'Drag to rotate; use arrow keys for precise rotation';rotateBtn.setAttribute('aria-label','Rotate signature');
      rotateBtn.innerHTML='<svg width=14 height=14 viewBox="0 0 24 24" fill=none stroke=currentColor stroke-width=1.6><path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/></svg><span>Rotate</span>';
      rotateBtn.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();stamp.rotation=(stamp.rotation||0)+(e.key==='ArrowLeft'?-1:1)*Math.PI/180;el.style.transform='rotate('+stamp.rotation+'rad)';}});
      rotateBtn.style.cursor = 'grab';

      function startRotate(e) {
        e.stopPropagation();
        if (e.type !== 'touchstart') e.preventDefault();

        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        let startX = e.touches ? e.touches[0].clientX : e.clientX;
        let startY = e.touches ? e.touches[0].clientY : e.clientY;
        let startAngle = Math.atan2(startY - cy, startX - cx);
        let initialRot = stamp.rotation || 0;

        function onRotateMove(moveEvent) {
          if (moveEvent.type === 'touchmove') moveEvent.preventDefault();
          let currentX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
          let currentY = moveEvent.touches ? moveEvent.touches[0].clientY : moveEvent.clientY;

          let currentAngle = Math.atan2(currentY - cy, currentX - cx);
          stamp.rotation = initialRot + (currentAngle - startAngle);
          el.style.transform = 'rotate(' + stamp.rotation + 'rad)';
        }

        function onRotateUp() {
          document.removeEventListener('mousemove', onRotateMove);
          document.removeEventListener('mouseup', onRotateUp);
          document.removeEventListener('touchmove', onRotateMove);
          document.removeEventListener('touchend', onRotateUp);
          document.removeEventListener('touchcancel', onRotateUp);
        }

        document.addEventListener('mousemove', onRotateMove);
        document.addEventListener('mouseup', onRotateUp);
        document.addEventListener('touchmove', onRotateMove, { passive: false });
        document.addEventListener('touchend', onRotateUp);
        document.addEventListener('touchcancel', onRotateUp);
      }

      rotateBtn.addEventListener('mousedown', startRotate);
      rotateBtn.addEventListener('touchstart', startRotate, { passive: false });
      controls.prepend(rotateBtn);

      const opacBtn = document.createElement('button');opacBtn.type='button';
      opacBtn.className = 'stamp-opac-btn';
      opacBtn.title = 'Adjust Transparency';
      opacBtn.textContent = 'Opacity '+Math.round((stamp.opacity ?? 1)*100)+'%';opacBtn.setAttribute('aria-label','Change signature opacity, currently '+Math.round((stamp.opacity ?? 1)*100)+' percent');
      opacBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (stamp.opacity === undefined) stamp.opacity = 1.0;
        stamp.opacity -= 0.25;
        if (stamp.opacity < 0.25) stamp.opacity = 1.0;
        img.style.opacity=stamp.opacity;opacBtn.textContent='Opacity '+Math.round(stamp.opacity*100)+'%';opacBtn.setAttribute('aria-label','Change signature opacity, currently '+Math.round(stamp.opacity*100)+' percent');
      });
      controls.insertBefore(opacBtn,delBtn);el.appendChild(controls);

      if (stamp.opacity !== undefined) {
        img.style.opacity = stamp.opacity;
      }

      // Dragging logic
      function startDrag(e) {
        if (e.target.closest('.stamp-controls') || e.target === delBtn || e.target.closest('.stamp-delete') ||
            e.target === resizeBtn || e.target.closest('.stamp-resize') ||
            e.target === rotateBtn || e.target.closest('.stamp-rotate-btn') ||
            e.target === opacBtn || e.target.closest('.stamp-opac-btn')) return;

        if (e.type !== 'touchstart') e.preventDefault();

        let startX = e.touches ? e.touches[0].clientX : e.clientX;
        let startY = e.touches ? e.touches[0].clientY : e.clientY;
        let initialX = stamp.x;
        let initialY = stamp.y;

        function onDragMove(moveEvent) {
          if (moveEvent.type === 'touchmove') moveEvent.preventDefault();
          let currentX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
          let currentY = moveEvent.touches ? moveEvent.touches[0].clientY : moveEvent.clientY;

          stamp.x = initialX + (currentX - startX)/displayScale;
          stamp.y = initialY + (currentY - startY)/displayScale;
          el.style.left = stamp.x + 'px';
          el.style.top = stamp.y + 'px';
        }

        function onDragUp() {
          document.removeEventListener('mousemove', onDragMove);
          document.removeEventListener('mouseup', onDragUp);
          document.removeEventListener('touchmove', onDragMove);
          document.removeEventListener('touchend', onDragUp);
          document.removeEventListener('touchcancel', onDragUp);
        }

        document.addEventListener('mousemove', onDragMove);
        document.addEventListener('mouseup', onDragUp);
        document.addEventListener('touchmove', onDragMove, { passive: false });
        document.addEventListener('touchend', onDragUp);
        document.addEventListener('touchcancel', onDragUp);
      }

      el.addEventListener('mousedown', startDrag);
      el.addEventListener('touchstart', startDrag, { passive: false });

      stampsLayer.appendChild(el);
    });
  }

  undoBtn.addEventListener('click', () => {
    if (placedStamps.length > 0) {
      placedStamps.pop();
      renderStampsForPage();
    }
  });

  function addStampToCurrentPage(dataUrl, width = 160, height = 60) {
    const x = (pdfCanvas.width - width) / 2;
    const y = (pdfCanvas.height - height) / 2;
    placedStamps.push({
      page: currentPageNum,
      x: x,
      y: y,
      width: width,
      height: height,
      dataUrl: dataUrl,
      viewportTransform: currentViewport.transform.slice(),
      viewportWidth: currentViewport.width,
      viewportHeight: currentViewport.height
    });
    renderStampsForPage();
  }
  window.addEventListener('resize',()=>{if(pdfDoc&&currentViewport)renderStampsForPage();});
  new ResizeObserver(()=>{
    if(pdfCanvas.width) stampsLayer.style.transform='scale('+(pdfCanvas.getBoundingClientRect().width/pdfCanvas.width)+')';
  }).observe(pdfCanvas);

  // Date Stamp Creator
  addDateBtn.addEventListener('click', () => {
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const c = document.createElement('canvas');
    c.width = 240;
    c.height = 60;
    const ctx = c.getContext('2d');
    ctx.font = 'bold 20px -apple-system, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(today, 10, 38);
    addStampToCurrentPage(c.toDataURL(), 150, 40);
  });

  // Checkmark Creator
  addCheckBtn.addEventListener('click', () => {
    const c = document.createElement('canvas');
    c.width = 60;
    c.height = 60;
    const ctx = c.getContext('2d');
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(12, 30);
    ctx.lineTo(24, 46);
    ctx.lineTo(48, 14);
    ctx.stroke();
    addStampToCurrentPage(c.toDataURL(), 40, 40);
  });

  // Modal Controls
  createSignatureBtn.addEventListener('click', () => {
    sigModal.classList.add('active');
    clearSignaturePad();
  });
  closeModalBtn.addEventListener('click', () => sigModal.classList.remove('active'));
  cancelSigBtn.addEventListener('click', () => sigModal.classList.remove('active'));

  const tabUpload = document.getElementById('tabUpload');
  const paneUpload = document.getElementById('paneUpload');
  const sigUploadDropzone = document.getElementById('sigUploadDropzone');
  const sigImageFileInput = document.getElementById('sigImageFileInput');
  const sigUploadControls = document.getElementById('sigUploadControls');
  const uploadPreviewCanvas = document.getElementById('uploadPreviewCanvas');
  const uploadCtx = uploadPreviewCanvas.getContext('2d');
  const chkAutoRemoveBg = document.getElementById('chkAutoRemoveBg');
  const rngThreshold = document.getElementById('rngThreshold');
  const thresholdVal = document.getElementById('thresholdVal');

  let uploadedImage = null;
  let uploadInkMode = 'black';

  tabDraw.addEventListener('click', () => {
    tabDraw.classList.add('active');
    tabType.classList.remove('active');
    tabUpload.classList.remove('active');
    paneDraw.style.display = 'block';
    paneType.style.display = 'none';
    paneUpload.style.display = 'none';
  });

  tabType.addEventListener('click', () => {
    tabType.classList.add('active');
    tabDraw.classList.remove('active');
    tabUpload.classList.remove('active');
    paneDraw.style.display = 'none';
    paneType.style.display = 'block';
    paneUpload.style.display = 'none';
  });

  tabUpload.addEventListener('click', () => {
    tabUpload.classList.add('active');
    tabDraw.classList.remove('active');
    tabType.classList.remove('active');
    paneDraw.style.display = 'none';
    paneType.style.display = 'none';
    paneUpload.style.display = 'block';
  });

  // Upload Signature Image Logic
  sigUploadDropzone.addEventListener('click', () => sigImageFileInput.click());
  sigUploadDropzone.addEventListener('dragover', (e) => { e.preventDefault(); sigUploadDropzone.style.borderColor = 'var(--accent)'; });
  sigUploadDropzone.addEventListener('dragleave', () => { sigUploadDropzone.style.borderColor = '#242e42'; });
  sigUploadDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    sigUploadDropzone.style.borderColor = '#242e42';
    if (e.dataTransfer.files.length) handleSignatureImageFile(e.dataTransfer.files[0]);
  });
  sigImageFileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleSignatureImageFile(e.target.files[0]);
  });

  function handleSignatureImageFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (JPG, PNG, WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        uploadedImage = img;
        sigUploadControls.style.display = 'block';
        processUploadedSignature();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  const chkAutoCrop = document.getElementById('chkAutoCrop');
  const rngContrast = document.getElementById('rngContrast');
  const contrastVal = document.getElementById('contrastVal');

  function processUploadedSignature() {
    if (!uploadedImage) return;
    const maxDim = 800;
    let origW = uploadedImage.naturalWidth || uploadedImage.width;
    let origH = uploadedImage.naturalHeight || uploadedImage.height;
    let w = origW;
    let h = origH;
    if (w > maxDim || h > maxDim) {
      if (w > h) {
        h = Math.round((h * maxDim) / w);
        w = maxDim;
      } else {
        w = Math.round((w * maxDim) / h);
        h = maxDim;
      }
    }

    // Step 1: Draw to offscreen buffer
    const offCanvas = document.createElement('canvas');
    offCanvas.width = w;
    offCanvas.height = h;
    const offCtx = offCanvas.getContext('2d');
    offCtx.drawImage(uploadedImage, 0, 0, w, h);

    if (!chkAutoRemoveBg.checked) {
      uploadPreviewCanvas.width = w;
      uploadPreviewCanvas.height = h;
      uploadCtx.clearRect(0, 0, w, h);
      uploadCtx.drawImage(offCanvas, 0, 0);
      return;
    }

    // Step 2: Sample paper background tone from perimeter pixels (corners and borders)
    const imgData = offCtx.getImageData(0, 0, w, h);
    const data = imgData.data;

    const perimSamples = [];
    const stepX = Math.max(1, Math.floor(w / 40));
    const stepY = Math.max(1, Math.floor(h / 40));
    const marginX = Math.max(2, Math.floor(w * 0.08));
    const marginY = Math.max(2, Math.floor(h * 0.08));

    for (let x = 0; x < w; x += stepX) {
      for (let y = 0; y < marginY; y += 2) {
        const idx = (y * w + x) * 4;
        perimSamples.push(0.299 * data[idx] + 0.587 * data[idx+1] + 0.114 * data[idx+2]);
      }
      for (let y = h - marginY; y < h; y += 2) {
        const idx = (y * w + x) * 4;
        perimSamples.push(0.299 * data[idx] + 0.587 * data[idx+1] + 0.114 * data[idx+2]);
      }
    }
    for (let y = marginY; y < h - marginY; y += stepY) {
      for (let x = 0; x < marginX; x += 2) {
        const idx = (y * w + x) * 4;
        perimSamples.push(0.299 * data[idx] + 0.587 * data[idx+1] + 0.114 * data[idx+2]);
      }
      for (let x = w - marginX; x < w; x += 2) {
        const idx = (y * w + x) * 4;
        perimSamples.push(0.299 * data[idx] + 0.587 * data[idx+1] + 0.114 * data[idx+2]);
      }
    }

    perimSamples.sort((a, b) => a - b);
    // Baseline paper brightness is the 80th percentile of border pixels
    const paperLum = perimSamples.length > 0 ? perimSamples[Math.floor(perimSamples.length * 0.82)] : 220;

    // Filter parameters
    const cleanPct = parseInt(rngThreshold.value, 10) / 100; // 0.05 to 0.65
    const contrastFactor = parseInt(rngContrast.value, 10) / 10; // 1.0 to 3.5

    thresholdVal.textContent = rngThreshold.value + '%';
    contrastVal.textContent = contrastFactor.toFixed(1) + 'x';

    // Pixels within cutOffset of paperLum are considered paper
    const cutOffset = Math.max(8, Math.round(paperLum * cleanPct));
    const cutoff = Math.max(40, paperLum - cutOffset);

    // Track bounding box for auto-crop
    let minX = w, maxX = 0, minY = h, maxY = 0;
    let visiblePixelCount = 0;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        if (lum >= cutoff) {
          data[i + 3] = 0; // Pure transparent paper
        } else {
          // Calculate relative stroke darkness (0.0 = at cutoff, 1.0 = completely dark)
          const relDarkness = (cutoff - lum) / cutoff;
          // Apply contrast boost and feathering
          let alpha = Math.min(255, Math.round(Math.pow(relDarkness, 0.85) * 255 * contrastFactor));
          data[i + 3] = alpha;

          if (alpha > 20) {
            visiblePixelCount++;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }

          if (uploadInkMode === 'black') {
            data[i] = 0;
            data[i + 1] = 0;
            data[i + 2] = 0;
          } else if (uploadInkMode === 'navy') {
            data[i] = 15;
            data[i + 1] = 23;
            data[i + 2] = 42;
          } else if (uploadInkMode === 'blue') {
            data[i] = 2;
            data[i + 1] = 132;
            data[i + 2] = 199;
          }
        }
      }
    }

    offCtx.putImageData(imgData, 0, 0);

    // Step 3: Render to uploadPreviewCanvas, auto-cropping margins if enabled
    if (chkAutoCrop && chkAutoCrop.checked && visiblePixelCount > 25 && minX < maxX && minY < maxY) {
      const pad = 12;
      const cropX = Math.max(0, minX - pad);
      const cropY = Math.max(0, minY - pad);
      const cropW = Math.min(w - cropX, (maxX - minX) + pad * 2);
      const cropH = Math.min(h - cropY, (maxY - minY) + pad * 2);

      uploadPreviewCanvas.width = cropW;
      uploadPreviewCanvas.height = cropH;
      uploadCtx.clearRect(0, 0, cropW, cropH);
      uploadCtx.drawImage(offCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    } else {
      uploadPreviewCanvas.width = w;
      uploadPreviewCanvas.height = h;
      uploadCtx.clearRect(0, 0, w, h);
      uploadCtx.drawImage(offCanvas, 0, 0);
    }
  }

  rngThreshold.addEventListener('input', processUploadedSignature);
  rngContrast.addEventListener('input', processUploadedSignature);
  chkAutoRemoveBg.addEventListener('change', processUploadedSignature);
  if (chkAutoCrop) chkAutoCrop.addEventListener('change', processUploadedSignature);

  document.querySelectorAll('[data-upload-ink]').forEach(dot => {
    dot.addEventListener('click', () => {
      document.querySelectorAll('[data-upload-ink]').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      uploadInkMode = dot.dataset.uploadInk;
      processUploadedSignature();
    });
  });

  // Drawing Pad Canvas
  function clearSignaturePad() {
    padCtx.clearRect(0, 0, sigPadCanvas.width, sigPadCanvas.height);
  }
  clearPadBtn.addEventListener('click', clearSignaturePad);

  function getCoordinates(e) {
    const rect = sigPadCanvas.getBoundingClientRect(), point=e.touches?.[0] || e;
    return {x:(point.clientX-rect.left)*sigPadCanvas.width/rect.width,y:(point.clientY-rect.top)*sigPadCanvas.height/rect.height};
  }

  function startDrawing(e) {
    e.preventDefault(); // Prevent scrolling on touch
    isDrawing = true;
    padCtx.beginPath();
    padCtx.strokeStyle = activeColor;
    padCtx.lineWidth = 3;
    padCtx.lineCap = 'round';
    padCtx.lineJoin = 'round';
    const coords = getCoordinates(e);
    padCtx.moveTo(coords.x, coords.y);
  }

  function draw(e) {
    if (!isDrawing) return;
    e.preventDefault(); // Prevent scrolling on touch
    const coords = getCoordinates(e);
    padCtx.lineTo(coords.x, coords.y);
    padCtx.stroke();
  }

  function stopDrawing() {
    isDrawing = false;
  }

  sigPadCanvas.addEventListener('mousedown', startDrawing);
  sigPadCanvas.addEventListener('mousemove', draw);
  window.addEventListener('mouseup', stopDrawing);

  sigPadCanvas.addEventListener('touchstart', startDrawing, { passive: false });
  sigPadCanvas.addEventListener('touchmove', draw, { passive: false });
  window.addEventListener('touchend', stopDrawing);
  window.addEventListener('touchcancel', stopDrawing);

  // Color Pickers
  document.querySelectorAll('.color-dot[data-color]').forEach(dot => {
    dot.addEventListener('click', () => {
      document.querySelectorAll('.color-dot[data-color]').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      activeColor = dot.dataset.color;
    });
  });

  // Type Name Input
  typeSigInput.addEventListener('input', (e) => {
    typeSigPreview.textContent = e.target.value || 'Your Signature';
  });

  saveSigBtn.addEventListener('click', () => {
    let finalDataUrl;
    let w = 180;
    let h = 70;
    if (tabDraw.classList.contains('active')) {
      if(!padCtx.getImageData(0,0,sigPadCanvas.width,sigPadCanvas.height).data.some((v,i)=>i%4===3&&v>0)){alert('Draw a signature before using it.');return;}
      finalDataUrl = sigPadCanvas.toDataURL();w=180;h=w*sigPadCanvas.height/sigPadCanvas.width;
    } else if (tabType.classList.contains('active')) {
      if(!typeSigInput.value.trim()){alert('Type your name before using it.');return;}
      const c = document.createElement('canvas');
      c.width = 400;
      c.height = 120;
      const ctx = c.getContext('2d');
      ctx.font = '48px "Brush Script MT", "Segoe Script", cursive';
      ctx.fillStyle = activeColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(typeSigInput.value.trim(), 200, 60,380);w=180;h=54;
      finalDataUrl = c.toDataURL();
    } else if (tabUpload.classList.contains('active')) {
      if (!uploadedImage) {
        alert('Please select or upload a signature image first.');
        return;
      }
      finalDataUrl = uploadPreviewCanvas.toDataURL('image/png');
      const ratio = uploadPreviewCanvas.width / uploadPreviewCanvas.height;
      w = Math.min(220, Math.round(70 * ratio));
      h = Math.round(w / ratio);
    }
    addStampToCurrentPage(finalDataUrl, w, h);
    sigModal.classList.remove('active');
  });

  function downloadPdfBlob(blob, filename = 'signed-document.pdf') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function stampIntersectsWidget(stamp, rect) {
    const [a,b,c,d,e,f]=stamp.viewportTransform, determinant=a*d-b*c;
    const theta=stamp.rotation||0, cos=Math.cos(theta), sin=Math.sin(theta);
    const cx=stamp.x+stamp.width/2, cy=stamp.y+stamp.height/2;
    const polygon=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([sx,sy])=>{
      const dx=sx*stamp.width/2,dy=sy*stamp.height/2;
      const x=cx+dx*cos-dy*sin-e,y=cy+dx*sin+dy*cos-f;
      return [(d*x-c*y)/determinant,(-b*x+a*y)/determinant];
    });
    const box=[[rect[0],rect[1]],[rect[2],rect[1]],[rect[2],rect[3]],[rect[0],rect[3]]];
    const axes=[[1,0],[0,1],...polygon.map((p,i)=>{const q=polygon[(i+1)%4];return [p[1]-q[1],q[0]-p[0]];})];
    return axes.every(([x,y])=>{
      const left=polygon.map(p=>p[0]*x+p[1]*y),right=box.map(p=>p[0]*x+p[1]*y);
      return Math.max(...left)>Math.min(...right)&&Math.max(...right)>Math.min(...left);
    });
  }

  // Export Signed PDF (Dual-Engine: Vector Injection + High-Res Synthesis Fallback)
  downloadSignedPdfBtn.addEventListener('click', async () => {
    if (!rawPdfBytes) return;
    const operation=fileOperation, exportBytes=rawPdfBytes.slice(), exportDoc=pdfDoc, exportPages=totalPages, exportStamps=placedStamps.map(stamp=>({...stamp}));
    const flattenFields=document.getElementById('flattenFormFields').checked;
    const notice=document.getElementById('signerExportNotice');notice.hidden=true;notice.textContent='';
    downloadSignedPdfBtn.disabled = true;
    downloadSignedPdfBtn.textContent = 'Generating PDF...';

    try {
      // Primary Engine: Direct vector PDF injection via PDF-Lib
      const pdfDocLib = await PDFLib.PDFDocument.load(exportBytes, { ignoreEncryption: true });
      const pages = pdfDocLib.getPages();

      if(flattenFields) {
        // Reuse existing filled appearances, then stamp above them.
        pdfDocLib.getForm().flatten({updateFieldAppearances:false});
        for(const page of pages) {
          const annotations=page.node.Annots()?.asArray()||[];
          if(annotations.some(ref=>pdfDocLib.context.lookup(ref)?.get?.(PDFLib.PDFName.of('Subtype'))?.toString()==='/Widget')) throw new Error('A form widget could not be flattened.');
        }
        pdfDocLib.catalog.delete(PDFLib.PDFName.of('AcroForm'));
      } else {
        for(const pageNumber of new Set(exportStamps.map(stamp=>stamp.page))) {
          const sourcePage=await exportDoc.getPage(pageNumber);
          const widgets=(await sourcePage.getAnnotations()).filter(annotation=>annotation.subtype==='Widget'&&annotation.rect);
          if(exportStamps.some(stamp=>stamp.page===pageNumber&&widgets.some(widget=>stampIntersectsWidget(stamp,widget.rect)))) {
            if(operation!==fileOperation)return;
            notice.textContent='A stamp overlaps an editable form field. Move it outside the field, or select Flatten form fields to export a non-editable form copy.';notice.hidden=false;
            return;
          }
        }
      }

      for (const stamp of exportStamps) {
        const pageIdx = stamp.page - 1;
        if (pageIdx < 0 || pageIdx >= pages.length) continue;
        const page = pages[pageIdx];
        const pngImage = await pdfDocLib.embedPng(stamp.dataUrl);
        const [a,b,c,d,e,f]=stamp.viewportTransform;
        const determinant=a*d-b*c;
        const toPdf=(x,y)=>[(d*(x-e)-c*(y-f))/determinant,(-b*(x-e)+a*(y-f))/determinant];
        const theta=stamp.rotation||0, cos=Math.cos(theta), sin=Math.sin(theta);
        const centerX=stamp.x+stamp.width/2, centerY=stamp.y+stamp.height/2;
        const corner=toPdf(centerX-stamp.width/2*cos-stamp.height/2*sin,centerY-stamp.width/2*sin+stamp.height/2*cos);
        const origin=toPdf(centerX,centerY), right=toPdf(centerX+cos,centerY+sin);
        const scale=Math.hypot(right[0]-origin[0],right[1]-origin[1]);
        page.drawImage(pngImage,{x:corner[0],y:corner[1],width:stamp.width*scale,height:stamp.height*scale,opacity:stamp.opacity??1,rotate:PDFLib.radians(Math.atan2(right[1]-origin[1],right[0]-origin[0]))});
      }

      const signedBytes = await pdfDocLib.save();
      if(operation!==fileOperation) return;
      downloadPdfBlob(new Blob([signedBytes], { type: 'application/pdf' }));
      if(flattenFields){notice.textContent='Exported copy has flattened form fields. Filled appearances are retained; fields are no longer editable.';notice.hidden=false;}
    } catch (primaryErr) {
      if(operation!==fileOperation)return;
      console.warn('Vector PDF injection failed, activating high-resolution synthesis fallback:', primaryErr);
      if(!confirm('Vector export could not complete. Download a flattened image copy instead? Visible values and stamps are kept, but selectable text, editable form fields and annotations are removed. Keep your original PDF.')) {
        notice.textContent='Export cancelled. No flattened copy was downloaded.';notice.hidden=false;
        return;
      }
      try {
        // Fallback Engine: High-resolution (2x Retina) PDF re-synthesis via PDF.js + Canvas
        const fallbackDoc = await PDFLib.PDFDocument.create();

        for (let p = 1; p <= exportPages; p++) {
          const page = await exportDoc.getPage(p);
          const viewport = page.getViewport({ scale: 2.0 });

          const offCanvas = document.createElement('canvas');
          offCanvas.width = viewport.width;
          offCanvas.height = viewport.height;
          const offCtx = offCanvas.getContext('2d');

          await page.render({ canvasContext: offCtx, viewport: viewport }).promise;

          // Render stamps for this page onto the high-res canvas
          const pageStamps = exportStamps.filter(s => s.page === p);


          for (const s of pageStamps) {
            const ratioX=viewport.width/s.viewportWidth, ratioY=viewport.height/s.viewportHeight;
            await new Promise((resolve) => {
              const stampImg = new Image();
              stampImg.onload = () => {
                if (s.opacity !== undefined) offCtx.globalAlpha = s.opacity;
                const cx = (s.x + s.width / 2) * ratioX;
                const cy = (s.y + s.height / 2) * ratioY;
                offCtx.save();
                offCtx.translate(cx, cy);
                if (s.rotation) offCtx.rotate(s.rotation);
                offCtx.drawImage(stampImg, -s.width / 2 * ratioX, -s.height / 2 * ratioY, s.width * ratioX, s.height * ratioY);
                offCtx.restore();
                if (s.opacity !== undefined) offCtx.globalAlpha = 1.0;
                resolve();
              };
              stampImg.onerror = resolve;
              stampImg.src = s.dataUrl;
            });
          }

          const pagePngUrl = offCanvas.toDataURL('image/png');
          const embeddedPage = await fallbackDoc.embedPng(pagePngUrl);
          const originalViewport=page.getViewport({scale:1});
          const pdfPage = fallbackDoc.addPage([originalViewport.width, originalViewport.height]);
          pdfPage.drawImage(embeddedPage, {
            x: 0,
            y: 0,
            width: originalViewport.width,
            height: originalViewport.height
          });
        }

        const signedBytes = await fallbackDoc.save();
        if(operation!==fileOperation) return;
        downloadPdfBlob(new Blob([signedBytes], { type: 'application/pdf' }));
        notice.textContent='Downloaded a flattened image copy. Visible values are retained; text, fields and annotations are no longer editable.';notice.hidden=false;
      } catch (fallbackErr) {
        console.error('All PDF export strategies failed:', fallbackErr);
        alert('Could not export PDF: ' + (fallbackErr.message || 'Please check console.'));
      }
    } finally {
      downloadSignedPdfBtn.disabled = false;
      downloadSignedPdfBtn.textContent = 'Download PDF';
    }
  });
