
    // Setup PDF.js Worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

    let pdfDoc = null;
    let pdfRawBytes = null;
    let pdfFileName = 'document.pdf';
    let currentPageNum = 1;
    let totalPages = 1;
    let currentScale = 1.5;
    let redactType = 'blackout'; // 'blackout' or 'stamp'

    // Store redactions in scale-1 displayed page coordinates (rotation/crop applied): pageNum -> array of { id, x, y, w, h, type }
    let redactions = {};
    let selectedBoxId = null;
    let nextBoxId = 1;
    let currentTool = 'redact'; // 'redact' or 'pan'

    // Pan state
    let isPanning = false;
    let panStartX = 0;
    let panStartY = 0;
    let panScrollLeft = 0;
    let panScrollTop = 0;

    // Smooth GPU Pinch State
    let initialPinchDistance = null;
    let initialPinchScale = 1.0;
    let currentPinchRatio = 1.0;

    // History stack for Undo / Redo
    let historyStack = [];
    let historyIndex = -1;

    // Interaction state
    let interactionMode = null; // 'draw' | 'move' | 'resize'
    let activeHandle = null;     // 'nw', 'ne', 'se', 'sw', 'n', 's', 'e', 'w'
    let dragStartX = 0;
    let dragStartY = 0;
    let initialBoxState = null;

    // DOM Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('pdf-input');
    const workspace = document.getElementById('workspace');
    const stageContainer = document.querySelector('.stage-container');
    const pdfCanvas = document.getElementById('pdf-canvas');
    const drawCanvas = document.getElementById('draw-canvas');
    const pdfCtx = pdfCanvas.getContext('2d');
    const drawCtx = drawCanvas.getContext('2d');
    const pageNumDisplay = document.getElementById('page-num-display');
    const zoomDisplay = document.getElementById('zoom-display');
    const redactionCountDisplay = document.getElementById('redaction-count-display');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    const deleteBtn = document.getElementById('delete-btn');
    const progressOverlay = document.getElementById('progress-overlay');
    const progressText = document.getElementById('progress-text');
    const progressSub = document.getElementById('progress-sub');
    const metaSummaryText = document.getElementById('meta-summary-text');

    // Drag & Drop
    ['dragenter', 'dragover'].forEach(name => {
      dropZone.addEventListener(name, (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    });
    ['dragleave', 'drop'].forEach(name => {
      dropZone.addEventListener(name, (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); });
    });
        // Allow dragging a new PDF directly onto the active workspace
    ['dragenter', 'dragover'].forEach(name => {
      workspace.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });
    workspace.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const files = e.dataTransfer.files;
      if (files && files.length > 0 && files[0].type === 'application/pdf') {
        if (hasUnsavedRedactions()) {
          const confirmed = confirm('Opening a new document will discard unsaved redactions on this file. Continue?');
          if (!confirmed) return;
        }
        loadPdfFile(files[0]);
      }
    });

    dropZone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files && files.length > 0 && files[0].type === 'application/pdf') {
        loadPdfFile(files[0]);
      } else {
        alert('Please drop a valid PDF file.');
      }
    });
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        loadPdfFile(e.target.files[0]);
      }
    });

    let fileOperation=0, renderOperation=0, activeRender=null;
    async function loadPdfFile(file) {
      const operation=++fileOperation;

      try {
        const bytes=new Uint8Array(await file.arrayBuffer());
        if(operation!==fileOperation) return;
        const candidate=await pdfjsLib.getDocument({data:bytes.slice()}).promise;
        const metadata=await candidate.getMetadata().catch(()=>null);
        if(operation!==fileOperation) {await candidate.destroy();return;}
        pdfDoc=candidate;pdfRawBytes=bytes;pdfFileName=file.name;
        totalPages = pdfDoc.numPages;
        currentPageNum = 1;
        redactions = {};
        selectedBoxId = null;
        historyStack = [];
        historyIndex = -1;

        // Inspect metadata
        displayMetadata(metadata);

                workspace.style.display = 'block';
        dropZone.style.display = 'none';
        const filenameDisplay = document.getElementById('doc-filename-display');
        if (filenameDisplay) {
          filenameDisplay.textContent = file.name;
          filenameDisplay.title = file.name;
        }

        // Auto-fit initial scale for mobile screens
        if (window.innerWidth < 768) {
          const firstPage = await pdfDoc.getPage(1);
          const natural = firstPage.getViewport({ scale: 1.0 });
          const screenW = Math.max(280, window.innerWidth - 40);
          currentScale = Math.round((screenW / natural.width) * 100) / 100;
        } else {
          currentScale = 1.35;
        }
        updatePageSelectOptions();

        saveHistoryState('Initial Document Load');
        await renderCurrentPage();
      } catch (err) {
        if(operation!==fileOperation) return;
        alert('Failed to parse PDF document: ' + err.message);
      }
    }


    function hasUnsavedRedactions() {
      return Object.values(redactions).some(arr => Array.isArray(arr) && arr.length > 0);
    }

    function openNewPdf() {
      if (hasUnsavedRedactions()) {
        const confirmed = confirm('Opening a new document will discard unsaved redactions on this file. Continue?');
        if (!confirmed) return;
      }
      fileInput.value = '';
      fileInput.click();
    }

    function closeDocument() {
      if (hasUnsavedRedactions()) {
        const confirmed = confirm('Closing this document will discard unsaved redactions. Continue?');
        if (!confirmed) return;
      }
      fileOperation++;renderOperation++;if(activeRender)activeRender.cancel();
      pdfDoc = null;
      pdfRawBytes = null;
      pdfFileName = 'document.pdf';
      currentPageNum = 1;
      totalPages = 1;
      redactions = {};
      selectedBoxId = null;
      historyStack = [];
      historyIndex = -1;
      fileInput.value = '';

      if (pdfCtx && pdfCanvas) {
        pdfCtx.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);
        pdfCanvas.width = 0;
        pdfCanvas.height = 0;
      }
      if (drawCtx && drawCanvas) {
        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        drawCanvas.width = 0;
        drawCanvas.height = 0;
      }

      if (metaSummaryText) {
        metaSummaryText.innerHTML = '<span>Scanning document metadata...</span>';
      }

      workspace.style.display = 'none';
      dropZone.style.display = 'block';
      dropZone.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function displayMetadata(meta) {
      if (!meta || !meta.info) {
        metaSummaryText.innerHTML = '<span class="meta-badge clean">No standard information fields found</span> <span>Review the document itself for sensitive information.</span>';
        return;
      }
      const info = meta.info;
      let tagsFound = 0;
      let details = [];
      if (info.Author) { tagsFound++; details.push(`Author: <strong>${escapeHtml(info.Author)}</strong>`); }
      if (info.Producer) { tagsFound++; details.push(`App: <strong>${escapeHtml(info.Producer)}</strong>`); }
      if (info.Creator) { tagsFound++; details.push(`Creator: <strong>${escapeHtml(info.Creator)}</strong>`); }
      if (info.CreationDate) { tagsFound++; details.push('Created: ' + info.CreationDate.substring(2, 10)); }

      if (tagsFound > 0) {
        metaSummaryText.innerHTML = `
          <span class="meta-badge detected"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-1px; margin-right:4px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>${tagsFound} information fields found</span>
          <span>${details.join(' • ')}</span>
        `;
      } else {
        metaSummaryText.innerHTML = '<span class="meta-badge clean">No standard information fields found</span> <span>Review the document itself for sensitive information.</span>';
      }
    }

    function escapeHtml(str) {
      return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
    }

    // --- HISTORY / UNDO / REDO ENGINE ---
    function saveHistoryState(actionName) {
      // If we made changes after an undo, truncate forward history
      if (historyIndex < historyStack.length - 1) {
        historyStack = historyStack.slice(0, historyIndex + 1);
      }
      // Push deep clone of current redactions
      historyStack.push(JSON.parse(JSON.stringify(redactions)));
      historyIndex = historyStack.length - 1;
      updateUndoRedoButtons();
    }

    function updateUndoRedoButtons() {
      const canUndo = (historyIndex > 0);
      const canRedo = (historyIndex < historyStack.length - 1);

      document.querySelectorAll('.btn-undo, #undo-btn').forEach(btn => {
        btn.disabled = !canUndo;
      });
      document.querySelectorAll('.btn-redo, #redo-btn').forEach(btn => {
        btn.disabled = !canRedo;
      });
    }

    function undo() {
      if (historyIndex > 0) {
        historyIndex--;
        redactions = JSON.parse(JSON.stringify(historyStack[historyIndex]));
        selectedBoxId = null;
        redrawPageRedactions();
        updateUndoRedoButtons();
      }
    }

    function redo() {
      if (historyIndex < historyStack.length - 1) {
        historyIndex++;
        redactions = JSON.parse(JSON.stringify(historyStack[historyIndex]));
        selectedBoxId = null;
        redrawPageRedactions();
        updateUndoRedoButtons();
      }
    }

    // --- RENDERING ENGINE ---
    async function renderCurrentPage() {
      if(!pdfDoc) return;
      const operation=++renderOperation, source=pdfDoc, number=currentPageNum;
      workspace.dataset.rendering='true';drawCanvas.style.pointerEvents='none';drawCtx.clearRect(0,0,drawCanvas.width,drawCanvas.height);
      if(activeRender) {const previous=activeRender;previous.cancel();try {await previous.promise;} catch(_) {}}
      try {
        const page=await source.getPage(number);
        if(operation!==renderOperation||source!==pdfDoc) return;
        updatePageNavUI();zoomDisplay.textContent=Math.round(currentScale*100)+'%';
        prevBtn.disabled=number<=1;nextBtn.disabled=number>=totalPages;
        const viewport=page.getViewport({scale:currentScale});
        const wrapper=document.getElementById('canvas-wrapper');wrapper.style.width=viewport.width+'px';wrapper.style.height=viewport.height+'px';
        for(const canvas of [pdfCanvas,drawCanvas]) {canvas.width=viewport.width;canvas.height=viewport.height;canvas.style.width=viewport.width+'px';canvas.style.height=viewport.height+'px';}
        const task=page.render({canvasContext:pdfCtx,viewport});activeRender=task;
        try {await task.promise;} finally {if(activeRender===task)activeRender=null;}
        if(operation===renderOperation&&source===pdfDoc){workspace.dataset.rendering='false';drawCanvas.style.pointerEvents='auto';redrawPageRedactions();}
      } catch(error) {if(error.name!=='RenderingCancelledException'&&operation===renderOperation) alert('Unable to display page: '+error.message);}
    }

    // Convert scale-1 viewport coordinates to current canvas pixels
    function toCanvasCoord(val) { return val * currentScale; }
    // Convert canvas pixels to unscaled PDF points
    function toPdfCoord(val) { return val / currentScale; }

    function redrawPageRedactions() {
      if(workspace.dataset.rendering==='true')return;
      drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
      const list = redactions[currentPageNum] || [];

      list.forEach(box => {
        const isSelected = (box.id === selectedBoxId);
        drawBox(drawCtx, box, currentScale, isSelected);
      });

      redactionCountDisplay.textContent = `${list.length} redaction${list.length === 1 ? '' : 's'} on this page`;
      deleteBtn.style.display = selectedBoxId ? 'inline-flex' : 'none';
    }

    function drawBox(ctx, box, scale, isSelected) {
      const bx = box.x * scale;
      const by = box.y * scale;
      const bw = box.w * scale;
      const bh = box.h * scale;

      // Solid blackout fill
      ctx.fillStyle = '#000000';
      ctx.fillRect(bx, by, bw, bh);

      // Stamp text
      if (box.type === 'stamp' && Math.abs(bw) > 36 && Math.abs(bh) > 14) {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        const fontSize = Math.min(Math.abs(bh) * 0.52, 14 * scale);
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('REDACTED', bx + bw / 2, by + bh / 2);
        ctx.restore();
      }

      // Selection Outline & Resize Handles
      if (isSelected) {
        ctx.save();
        // Cyan dashed bounding box
        ctx.strokeStyle = '#8b98a6';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(bx, by, bw, bh);

        // Draw 8 handles: corners & edge midpoints
        const handles = getHandleCoords(bx, by, bw, bh);
        const handleSize = 8;
        ctx.setLineDash([]);
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#8b98a6';
        ctx.lineWidth = 2;

        for (const [key, pt] of Object.entries(handles)) {
          ctx.fillRect(pt.x - handleSize / 2, pt.y - handleSize / 2, handleSize, handleSize);
          ctx.strokeRect(pt.x - handleSize / 2, pt.y - handleSize / 2, handleSize, handleSize);
        }
        ctx.restore();
      }
    }

    function getHandleCoords(x, y, w, h) {
      return {
        nw: { x: x, y: y },
        ne: { x: x + w, y: y },
        se: { x: x + w, y: y + h },
        sw: { x: x, y: y + h },
        n:  { x: x + w / 2, y: y },
        s:  { x: x + w / 2, y: y + h },
        w:  { x: x, y: y + h / 2 },
        e:  { x: x + w, y: y + h / 2 }
      };
    }

    // --- INTERACTIVE HIT TESTING & SELECTION ---
    function getBoxById(id) {
      const list = redactions[currentPageNum] || [];
      return list.find(b => b.id === id);
    }

    function getSelectedBox() {
      return selectedBoxId ? getBoxById(selectedBoxId) : null;
    }

    function getHandleAtPoint(pt, box) {
      if (!box) return null;
      const bx = box.x * currentScale;
      const by = box.y * currentScale;
      const bw = box.w * currentScale;
      const bh = box.h * currentScale;
      const handles = getHandleCoords(bx, by, bw, bh);
      const radius = 10; // hit radius in pixels

      for (const [key, h] of Object.entries(handles)) {
        if (Math.hypot(pt.x - h.x, pt.y - h.y) <= radius) {
          return key;
        }
      }
      return null;
    }

    function isInsideBox(pt, box) {
      const bx = box.x * currentScale;
      const by = box.y * currentScale;
      const bw = box.w * currentScale;
      const bh = box.h * currentScale;
      const minX = Math.min(bx, bx + bw);
      const maxX = Math.max(bx, bx + bw);
      const minY = Math.min(by, by + bh);
      const maxY = Math.max(by, by + bh);
      return pt.x >= minX && pt.x <= maxX && pt.y >= minY && pt.y <= maxY;
    }

    function getBoxAtPoint(pt) {
      const list = redactions[currentPageNum] || [];
      // Top-most first
      for (let i = list.length - 1; i >= 0; i--) {
        if (isInsideBox(pt, list[i])) {
          return list[i];
        }
      }
      return null;
    }

    function getCursorForHandle(handle) {
      switch (handle) {
        case 'nw': case 'se': return 'nwse-resize';
        case 'ne': case 'sw': return 'nesw-resize';
        case 'n': case 's':   return 'ns-resize';
        case 'w': case 'e':   return 'ew-resize';
        default: return 'default';
      }
    }

    // --- UNIFIED POINTER & TOUCH GESTURES ---
    function getEventPoint(e) {
      if (e.touches && e.touches.length > 0) return e.touches[0];
      if (e.changedTouches && e.changedTouches.length > 0) return e.changedTouches[0];
      return e;
    }

    function getCanvasCoordinates(e) {
      const p = getEventPoint(e);
      const rect = drawCanvas.getBoundingClientRect();
      const scaleX = drawCanvas.width / rect.width;
      const scaleY = drawCanvas.height / rect.height;
      return {
        x: (p.clientX - rect.left) * scaleX,
        y: (p.clientY - rect.top) * scaleY
      };
    }

    // --- TOOL SWITCHER: REDACT VS PAN ---
    function toggleActiveTool() {
      setActiveTool(currentTool === 'redact' ? 'pan' : 'redact');
    }

    function setActiveTool(tool) {
      currentTool = tool;
      const redactBtn = document.getElementById('btn-mode-redact');
      const panBtn = document.getElementById('btn-mode-pan');
      if (redactBtn) redactBtn.classList.toggle('active', tool === 'redact');
      if (panBtn) panBtn.classList.toggle('active', tool === 'pan');

      const dockBtn = document.getElementById('dock-mode-toggle');
      const dockText = document.getElementById('dock-tool-text');
      if (dockBtn && dockText) {
        dockBtn.classList.toggle('pan-active', tool === 'pan');
        dockText.textContent = tool === 'pan' ? 'Move / Pan' : 'Draw Box';
      }

      if (tool === 'pan') {
        selectedBoxId = null;
        redrawPageRedactions();
        drawCanvas.style.cursor = 'grab';
      } else {
        drawCanvas.style.cursor = 'crosshair';
      }
    }

    function nudgeStage(dx, dy) {
      if (stageContainer) {
        stageContainer.scrollBy({ left: dx, top: dy, behavior: 'smooth' });
      }
    }

    function scrollToBottom() {
      if (stageContainer) {
        stageContainer.scrollTo({ top: stageContainer.scrollHeight, behavior: 'smooth' });
      }
    }

    // --- MULTI-PAGE DOCUMENT NAVIGATION ---
    function updatePageSelectOptions() {
      const select = document.getElementById('page-select');
      if (!select) return;
      select.innerHTML = '';
      for (let i = 1; i <= totalPages; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        const count = (redactions[i] && redactions[i].length > 0) ? ` (${redactions[i].length} marked)` : '';
        opt.textContent = `Page ${i}${count}`;
        select.appendChild(opt);
      }
      document.getElementById('page-total-display').textContent = `of ${totalPages}`;
    }

    function updatePageNavUI() {
      const select = document.getElementById('page-select');
      if (select) {
        select.value = currentPageNum;
        for (let i = 0; i < select.options.length; i++) {
          const pg = i + 1;
          const count = (redactions[pg] && redactions[pg].length > 0) ? ` (${redactions[pg].length} marked)` : '';
          select.options[i].textContent = `Page ${pg}${count}`;
        }
      }
      const totalDisplay = document.getElementById('page-total-display');
      if (totalDisplay) totalDisplay.textContent = `of ${totalPages}`;
    }

    function goToPage(pageNum) {
      if (pageNum >= 1 && pageNum <= totalPages) {
        currentPageNum = pageNum;
        selectedBoxId = null;
        renderCurrentPage();
      }
    }

    // --- SMOOTH GPU PINCH & TWO-FINGER PAN ENGINE ---
    let pinchMidStartX = 0;
    let pinchMidStartY = 0;
    let pinchScrollStartX = 0;
    let pinchScrollStartY = 0;

    function getTouchDistance(e) {
      if (e.touches && e.touches.length >= 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        return Math.hypot(dx, dy);
      }
      return null;
    }

    function getTouchMidpoint(e) {
      if (e.touches && e.touches.length >= 2) {
        return {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2
        };
      }
      return null;
    }

    function handlePointerDown(e) {
      if(workspace.dataset.rendering==='true')return;
      // 1. Check for two-finger pinch & pan gesture on mobile
      if (e.touches && e.touches.length >= 2) {
        interactionMode = null;
        isDrawing = false;
        isPanning = false;
        initialPinchDistance = getTouchDistance(e);
        initialPinchScale = currentScale;
        currentPinchRatio = 1.0;
        const mid = getTouchMidpoint(e);
        if (mid) {
          pinchMidStartX = mid.x;
          pinchMidStartY = mid.y;
          pinchScrollStartX = stageContainer.scrollLeft;
          pinchScrollStartY = stageContainer.scrollTop;
        }
        return;
      }

      // 2. PAN MODE: drag to scroll the zoomed viewport with 1 finger or mouse
      if (currentTool === 'pan') {
        const pt = e.touches ? e.touches[0] : e;
        isPanning = true;
        panStartX = pt.clientX;
        panStartY = pt.clientY;
        panScrollLeft = stageContainer.scrollLeft;
        panScrollTop = stageContainer.scrollTop;
        drawCanvas.style.cursor = 'grabbing';
        if (e.cancelable) e.preventDefault();
        return;
      }

      // 3. Scrollbar Deadzone Protection:
      // If single touch starts within 42px of right or bottom container edge, ignore to prevent accidental redactions
      if (e.touches && e.touches.length === 1) {
        const touch = e.touches[0];
        const containerRect = stageContainer.getBoundingClientRect();
        const distFromRight = containerRect.right - touch.clientX;
        const distFromBottom = containerRect.bottom - touch.clientY;
        if (distFromRight < 42 || distFromBottom < 42) {
          return;
        }
      }

      // 4. REDACT MODE: hit testing and drawing
      if (e.cancelable && e.type.startsWith('touch')) e.preventDefault();
      const pt = getCanvasCoordinates(e);
      dragStartX = pt.x;
      dragStartY = pt.y;

      const selBox = getSelectedBox();

      // Check handle of selected box
      if (selBox) {
        const handle = getHandleAtPoint(pt, selBox);
        if (handle) {
          interactionMode = 'resize';
          activeHandle = handle;
          initialBoxState = { ...selBox };
          if (e.pointerId && drawCanvas.setPointerCapture) {
            try { drawCanvas.setPointerCapture(e.pointerId); } catch (_) {}
          }
          return;
        }
      }

      // Check click inside existing box
      const hitBox = getBoxAtPoint(pt);
      if (hitBox) {
        selectedBoxId = hitBox.id;
        interactionMode = 'move';
        initialBoxState = { ...hitBox };
        redrawPageRedactions();
        if (e.pointerId && drawCanvas.setPointerCapture) {
          try { drawCanvas.setPointerCapture(e.pointerId); } catch (_) {}
        }
        return;
      }

      // Otherwise click on canvas: start drawing new blackout box
      selectedBoxId = null;
      interactionMode = 'draw';
      redrawPageRedactions();

      if (e.pointerId && drawCanvas.setPointerCapture) {
        try { drawCanvas.setPointerCapture(e.pointerId); } catch (_) {}
      }
    }

    function handlePointerMove(e) {
      // 1. Two-finger pinch & pan anywhere (zero jitter, simultaneous scroll)
      if (e.touches && e.touches.length >= 2 && initialPinchDistance) {
        if (e.cancelable) e.preventDefault();
        const dist = getTouchDistance(e);
        if (dist) {
          currentPinchRatio = dist / initialPinchDistance;
          const canvasWrapper = document.getElementById('canvas-wrapper');
          canvasWrapper.style.transformOrigin = 'center center';
          canvasWrapper.style.transform = `scale(${currentPinchRatio})`;
        }
        const mid = getTouchMidpoint(e);
        if (mid) {
          const dx = mid.x - pinchMidStartX;
          const dy = mid.y - pinchMidStartY;
          stageContainer.scrollLeft = pinchScrollStartX - dx;
          stageContainer.scrollTop = pinchScrollStartY - dy;
        }
        return;
      }

      // 2. PAN MODE MOVE: scroll viewport smoothly
      if (isPanning && currentTool === 'pan') {
        const pt = e.touches ? e.touches[0] : e;
        const dx = pt.clientX - panStartX;
        const dy = pt.clientY - panStartY;
        stageContainer.scrollLeft = panScrollLeft - dx;
        stageContainer.scrollTop = panScrollTop - dy;
        if (e.cancelable) e.preventDefault();
        return;
      }

      if (currentTool === 'pan') return;

      const pt = getCanvasCoordinates(e);

      // Hover cursor updates
      if (!interactionMode) {
        const selBox = getSelectedBox();
        if (selBox) {
          const handle = getHandleAtPoint(pt, selBox);
          if (handle) {
            drawCanvas.style.cursor = getCursorForHandle(handle);
            return;
          }
        }
        const hitBox = getBoxAtPoint(pt);
        if (hitBox) {
          drawCanvas.style.cursor = (hitBox.id === selectedBoxId) ? 'move' : 'pointer';
          return;
        }
        drawCanvas.style.cursor = 'crosshair';
        return;
      }

      if (e.cancelable && e.type.startsWith('touch')) e.preventDefault();

      // REDACT ACTIONS: draw, move, resize
      if (interactionMode === 'draw') {
        const currentW = pt.x - dragStartX;
        const currentH = pt.y - dragStartY;

        redrawPageRedactions();

        drawCtx.save();
        drawCtx.strokeStyle = '#8b98a6';
        drawCtx.lineWidth = 2;
        drawCtx.setLineDash([4, 4]);
        drawCtx.strokeRect(dragStartX, dragStartY, currentW, currentH);
        drawCtx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        drawCtx.fillRect(dragStartX, dragStartY, currentW, currentH);
        drawCtx.restore();

      } else if (interactionMode === 'move') {
        const box = getSelectedBox();
        if (!box || !initialBoxState) return;
        const deltaX = toPdfCoord(pt.x - dragStartX);
        const deltaY = toPdfCoord(pt.y - dragStartY);

        box.x = initialBoxState.x + deltaX;
        box.y = initialBoxState.y + deltaY;
        redrawPageRedactions();

      } else if (interactionMode === 'resize') {
        const box = getSelectedBox();
        if (!box || !initialBoxState) return;

        const curPdfX = toPdfCoord(pt.x);
        const curPdfY = toPdfCoord(pt.y);
        const startPdfX = toPdfCoord(dragStartX);
        const startPdfY = toPdfCoord(dragStartY);
        const deltaX = curPdfX - startPdfX;
        const deltaY = curPdfY - startPdfY;

        let newX = initialBoxState.x;
        let newY = initialBoxState.y;
        let newW = initialBoxState.w;
        let newH = initialBoxState.h;

        if (activeHandle.includes('e')) newW = initialBoxState.w + deltaX;
        if (activeHandle.includes('s')) newH = initialBoxState.h + deltaY;
        if (activeHandle.includes('w')) {
          newX = initialBoxState.x + deltaX;
          newW = initialBoxState.w - deltaX;
        }
        if (activeHandle.includes('n')) {
          newY = initialBoxState.y + deltaY;
          newH = initialBoxState.h - deltaY;
        }

        if (newW >= 5 && newH >= 5) {
          box.x = newX;
          box.y = newY;
          box.w = newW;
          box.h = newH;
          redrawPageRedactions();
        }
      }
    }

    function handlePointerUp(e) {
      // 1. PINCH END: apply final scale and preserve viewport center (high-res crisp quality)
      if (initialPinchDistance) {
        const canvasWrapper = document.getElementById('canvas-wrapper');
        canvasWrapper.style.transform = '';
        canvasWrapper.style.transformOrigin = '';
        const oldScale = currentScale;
        const finalScale = Math.max(0.4, Math.min(3.5, initialPinchScale * currentPinchRatio));
        currentScale = Math.round(finalScale * 100) / 100;

        const viewCenterX = stageContainer.scrollLeft + (stageContainer.clientWidth / 2);
        const viewCenterY = stageContainer.scrollTop + (stageContainer.clientHeight / 2);
        const ratio = currentScale / oldScale;

        initialPinchDistance = null;
        currentPinchRatio = 1.0;
        renderCurrentPage().then(() => {
          stageContainer.scrollLeft = Math.round((viewCenterX * ratio) - (stageContainer.clientWidth / 2));
          stageContainer.scrollTop = Math.round((viewCenterY * ratio) - (stageContainer.clientHeight / 2));
        });
        return;
      }

      // 2. PAN END
      if (isPanning) {
        isPanning = false;
        drawCanvas.style.cursor = (currentTool === 'pan') ? 'grab' : 'crosshair';
        return;
      }

      if (!interactionMode) return;

      if (e.pointerId && drawCanvas.releasePointerCapture) {
        try { drawCanvas.releasePointerCapture(e.pointerId); } catch (_) {}
      }

      const pt = getCanvasCoordinates(e);

      if (interactionMode === 'draw') {
        const w = pt.x - dragStartX;
        const h = pt.y - dragStartY;

        const minIntent = (e.type && e.type.startsWith('touch')) ? 14 : 8;
        if (Math.abs(w) >= minIntent && Math.abs(h) >= minIntent) {
          const normCanvasX = w < 0 ? pt.x : dragStartX;
          const normCanvasY = h < 0 ? pt.y : dragStartY;
          const normCanvasW = Math.abs(w);
          const normCanvasH = Math.abs(h);

          const newBox = {
            id: 'box_' + (nextBoxId++),
            x: toPdfCoord(normCanvasX),
            y: toPdfCoord(normCanvasY),
            w: toPdfCoord(normCanvasW),
            h: toPdfCoord(normCanvasH),
            type: redactType
          };

          if (!redactions[currentPageNum]) {
            redactions[currentPageNum] = [];
          }
          redactions[currentPageNum].push(newBox);
          selectedBoxId = newBox.id;
          saveHistoryState('Add Redaction');
        }
      } else if (interactionMode === 'move' || interactionMode === 'resize') {
        const box = getSelectedBox();
        if (box && initialBoxState) {
          if (box.w < 0) { box.x += box.w; box.w = Math.abs(box.w); }
          if (box.h < 0) { box.y += box.h; box.h = Math.abs(box.h); }

          if (box.x !== initialBoxState.x || box.y !== initialBoxState.y || box.w !== initialBoxState.w || box.h !== initialBoxState.h) {
            saveHistoryState(interactionMode === 'move' ? 'Move Redaction' : 'Resize Redaction');
          }
        }
      }

      interactionMode = null;
      activeHandle = null;
      initialBoxState = null;
      redrawPageRedactions();
      updatePageNavUI();
    }

    // Attach unified pointer events
    drawCanvas.addEventListener('pointerdown', handlePointerDown, { passive: false });
    drawCanvas.addEventListener('pointermove', handlePointerMove, { passive: false });
    drawCanvas.addEventListener('pointerup', handlePointerUp, { passive: false });
    drawCanvas.addEventListener('pointercancel', handlePointerUp, { passive: false });

    // Touch event fallbacks for older browsers
    drawCanvas.addEventListener('touchstart', handlePointerDown, { passive: false });
    drawCanvas.addEventListener('touchmove', handlePointerMove, { passive: false });
    drawCanvas.addEventListener('touchend', handlePointerUp, { passive: false });
    drawCanvas.addEventListener('touchcancel', handlePointerUp, { passive: false });

    // --- ACTIONS & KEYBOARD SHORTCUTS ---
    function deleteSelectedBox() {
      if (!selectedBoxId) return;
      const list = redactions[currentPageNum] || [];
      const idx = list.findIndex(b => b.id === selectedBoxId);
      if (idx !== -1) {
        list.splice(idx, 1);
        selectedBoxId = null;
        saveHistoryState('Delete Redaction');
        redrawPageRedactions();
      }
    }

    function clearCurrentPageRedactions() {
      if (redactions[currentPageNum] && redactions[currentPageNum].length > 0) {
        redactions[currentPageNum] = [];
        selectedBoxId = null;
        saveHistoryState('Clear Page');
        redrawPageRedactions();
      }
    }

    function changePage(delta) {
      const target = currentPageNum + delta;
      if (target >= 1 && target <= totalPages) {
        currentPageNum = target;
        selectedBoxId = null;
        renderCurrentPage();
      }
    }

    function setRedactType(type) {
      redactType = type;
      document.getElementById('mode-blackout').classList.toggle('active', type === 'blackout');
      document.getElementById('mode-stamp').classList.toggle('active', type === 'stamp');
      // If a box is currently selected, update its type too!
      const selBox = getSelectedBox();
      if (selBox) {
        selBox.type = type;
        saveHistoryState('Change Type');
        redrawPageRedactions();
      }
    }

    // Zoom Functions with Center-Anchored Viewport Preservation
    async function zoomPage(delta) {
      if (!pdfDoc) return;
      const oldScale = currentScale;
      const newScale = Math.max(0.4, Math.min(3.5, currentScale + delta));
      currentScale = Math.round(newScale * 100) / 100;
      if (currentScale === oldScale) return;

      // Keep viewport center point stable during zoom
      const viewCenterX = stageContainer.scrollLeft + (stageContainer.clientWidth / 2);
      const viewCenterY = stageContainer.scrollTop + (stageContainer.clientHeight / 2);
      const ratio = currentScale / oldScale;

      await renderCurrentPage();

      stageContainer.scrollLeft = Math.round((viewCenterX * ratio) - (stageContainer.clientWidth / 2));
      stageContainer.scrollTop = Math.round((viewCenterY * ratio) - (stageContainer.clientHeight / 2));
    }

    async function resetZoom() {
      currentScale = 1.0;
      await renderCurrentPage();
      stageContainer.scrollLeft = 0;
      stageContainer.scrollTop = 0;
    }

    async function fitPageWidth() {
      if (!pdfDoc) return;
      const page = await pdfDoc.getPage(currentPageNum);
      const natural = page.getViewport({ scale: 1.0 });
      const availableWidth = Math.max(280, stageContainer.clientWidth - 48);
      currentScale = Math.round((availableWidth / natural.width) * 100) / 100;
      await renderCurrentPage();
      stageContainer.scrollLeft = 0;
      stageContainer.scrollTop = 0;
    }

    // Ctrl + Mouse Wheel Zoom: anchors to current viewport center
    stageContainer.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        zoomPage(e.deltaY < 0 ? 0.15 : -0.15);
      }
    }, { passive: false });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      // Delete / Backspace: delete selected box
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedBoxId && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
          e.preventDefault();
          deleteSelectedBox();
        }
      }
      // Escape: deselect
      if (e.key === 'Escape') {
        selectedBoxId = null;
        redrawPageRedactions();
      }
      // Ctrl+Z: Undo
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      }
      // Ctrl+Y or Ctrl+Shift+Z: Redo
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault();
        redo();
      }
      // Arrow keys to nudge selected box
      if (selectedBoxId && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const selBox = getSelectedBox();
        if (selBox) {
          const step = e.shiftKey ? 10 : 2;
          if (e.key === 'ArrowUp') selBox.y -= toPdfCoord(step);
          if (e.key === 'ArrowDown') selBox.y += toPdfCoord(step);
          if (e.key === 'ArrowLeft') selBox.x -= toPdfCoord(step);
          if (e.key === 'ArrowRight') selBox.x += toPdfCoord(step);
          redrawPageRedactions();
        }
      }
    });

    // --- TRUE BURN-IN EXPORT ENGINE (ZERO METADATA) ---
    async function exportRedactedPdf() {
      if (!pdfDoc) return;

      const operation=fileOperation, source=pdfDoc, pages=totalPages, boxes=JSON.parse(JSON.stringify(redactions)), name=pdfFileName;
      progressOverlay.style.display = 'flex';
      progressText.textContent = 'Permanently burning in redactions...';

      try {
        const { PDFDocument, PDFName } = PDFLib;
        // updateMetadata: false stops pdf-lib from auto-injecting its own producer/dates
        const newPdfDoc = await PDFDocument.create({ updateMetadata: false });
        const exportScale = 2.0; // High resolution 2x scale for crisp print quality
        const purgeMeta = document.getElementById('purge-meta-checkbox').checked;

        // Render each page with burn-in flattening
        for (let p = 1; p <= pages; p++) {
          progressSub.textContent = `Processing Page ${p} of ${pages}...`;

          const page = await source.getPage(p);
          const viewport = page.getViewport({ scale: exportScale });

          // Offscreen render canvas
          const offCanvas = document.createElement('canvas');
          offCanvas.width = viewport.width;
          offCanvas.height = viewport.height;
          const offCtx = offCanvas.getContext('2d');

          // 1. Render original page
          await page.render({ canvasContext: offCtx, viewport: viewport }).promise;

          // 2. Draw burned-in redactions scaled to high DPI
          const pageBoxes = boxes[p] || [];

          pageBoxes.forEach(box => {
            // Draw box in the same rotated/cropped viewport space used in preview
            drawBox(offCtx, box, exportScale, false);
          });

          // 3. Preserve the painted pixels with lossless PNG encoding
          const pageDataUrl = offCanvas.toDataURL('image/png');
          const pageImgBytes = await fetch(pageDataUrl).then(res => res.arrayBuffer());
          const embeddedImage = await newPdfDoc.embedPng(pageImgBytes);

          // 4. Create new PDF page with original point dimensions
          const originalViewport = page.getViewport({ scale: 1.0 });
          const newPage = newPdfDoc.addPage([originalViewport.width, originalViewport.height]);
          newPage.drawImage(embeddedImage, {
            x: 0,
            y: 0,
            width: originalViewport.width,
            height: originalViewport.height
          });
        }

        // Omit standard output document information when requested.
        if (purgeMeta) {
          progressSub.textContent = 'Purging all metadata tags...';

          // Strip any default fields
          newPdfDoc.setTitle('');
          newPdfDoc.setAuthor('');
          newPdfDoc.setSubject('');
          newPdfDoc.setKeywords([]);
          newPdfDoc.setProducer('');
          newPdfDoc.setCreator('');

          // Delete Info dictionary reference entirely from the PDF trailer
          delete newPdfDoc.context.trailerInfo.Info;

          // Delete XML / XMP metadata stream from catalog if present
          try {
            newPdfDoc.catalog.delete(PDFName.of('Metadata'));
          } catch (_) {}
          try {
            newPdfDoc.catalog.delete(PDFName.of('PieceInfo'));
          } catch (_) {}
        }

        progressSub.textContent = 'Finalizing file...';
        // updateMetadata: false guarantees pdf-lib will NOT inject its own Producer, CreationDate or ModDate!
        const finalPdfBytes = await newPdfDoc.save({ updateMetadata: false });

        if(operation!==fileOperation) return;
        // Trigger Download
        const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const cleanName = name.replace(/\.pdf$/i, '');
        link.download = `Tangent_Redacted_${cleanName}.pdf`;
        link.href = downloadUrl;
        document.body.appendChild(link);
        link.click();
          if(window.TangentToast) window.TangentToast.show("PDF Redacted & Saved!");
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);

      } catch (err) {
        if(operation!==fileOperation) return;
        alert('Export failed: ' + err.message);
      } finally {
        progressOverlay.style.display = 'none';
      }
    }

    // Mobile Navigation Toggle
