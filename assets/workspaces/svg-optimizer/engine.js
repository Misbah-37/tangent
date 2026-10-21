
  // Sample SVG Graphic (Vibrant RunTangent Geometric Mark with Illustrator & Inkscape Junk)
  const SAMPLE_SVG = `<?xml version="1.0" encoding="utf-8"?>
<!-- Generator: Adobe Illustrator 28.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->
<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
     viewBox="0 0 120 120" width="120" height="120" xml:space="preserve">
  <metadata>
    <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
      <cc:Work xmlns:cc="http://creativecommons.org/ns#" xmlns:dc="http://purl.org/dc/elements/1.1/" rdf:about="">
        <dc:format>image/svg+xml</dc:format>
        <dc:title>RunTangent Logo Asset</dc:title>
      </cc:Work>
    </rdf:RDF>
  </metadata>
  <defs>
    <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00d2ff" stop-opacity="1"/>
      <stop offset="100%" stop-color="#3b82f6" stop-opacity="1"/>
    </linearGradient>
  </defs>
  <g id="empty-adobe-layer"></g>
  <g id="tangent-brand-mark">
    <circle cx="60.00000" cy="60.00000" r="54.00000" fill="#0d111a" stroke="#253047" stroke-width="2.50000"/>
    <circle cx="60.00000" cy="60.00000" r="42.00000" fill="none" stroke="#1e293b" stroke-width="1.50000" stroke-dasharray="4 4"/>
    <path d="M 60.00000 95.00000 C 40.67000 95.00000 25.00000 79.33000 25.00000 60.00000 C 25.00000 40.67000 40.67000 25.00000 60.00000 25.00000 L 98.00000 25.00000"
          fill="none" stroke="url(#cyanGrad)" stroke-width="7.00000" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="98.00000" cy="25.00000" r="5.00000" fill="#00d2ff"/>
  </g>
  <g display="none"><rect width="120" height="120" fill="#ff0000"/></g>
</svg>`;

  let originalRawSvg = SAMPLE_SVG;
  let optimizedSvg = '';
  let currentZoom = 1, svgOperation = 0, previewUrl = null, svgReady = false, exportBusy = false;
  function svgStatus(message) { document.getElementById('svgStatus').textContent = message; }
  function svgButtons() { [downloadSvgBtn,copySvgBtn,exportPngBtn].forEach(b => b.disabled = !svgReady || exportBusy); }
  function validateSvg(text) {
    if (new Blob([text]).size > 5000000) throw Error('Choose an SVG smaller than 5 MB.');
    if(/<!DOCTYPE/i.test(text)) throw Error('SVG document types and entities are unsupported.');
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    if (doc.querySelector('parsererror') || doc.documentElement.localName !== 'svg' || doc.documentElement.namespaceURI !== 'http://www.w3.org/2000/svg') throw Error('Choose a valid SVG with the SVG namespace.');
    for (const el of doc.querySelectorAll('*')) {
      if (['script','foreignObject','animate','animateMotion','animateTransform','set'].includes(el.localName)) throw Error('Active SVG content is unsupported. Remove scripts, HTML and animation first.');
      for (const a of el.attributes) {
        if ((a.localName === 'base' && a.namespaceURI === 'http://www.w3.org/XML/1998/namespace') || /^on/i.test(a.localName) || (/href$/i.test(a.localName) && a.value && !a.value.startsWith('#'))) throw Error('Event handlers and external resources are unsupported. Use a self-contained SVG.');
      }
    }
    if (/@import/i.test(text) || [...text.matchAll(/url\(([^)]*)\)/gi)].some(m=>!m[1].trim().replace(/^['"]|['"]$/g,'').startsWith('#')) || /<\?xml-stylesheet/i.test(text)) throw Error('External CSS resources are unsupported. Use a self-contained SVG.');
    for(const el of doc.querySelectorAll('style,[style]')) {const css=el.localName==='style'?el.textContent:el.getAttribute('style');if(css.includes('\\')) throw Error('Escaped CSS is unsupported. Use plain, self-contained SVG styles.');}
    return doc;
  }


  const dropZone = document.getElementById('dropZone');
  const dropTitle = document.getElementById('dropTitle');
  const dropSubtitle = document.getElementById('dropSubtitle');
  const fileInput = document.getElementById('fileInput');
  const stageDisplay = document.getElementById('stageDisplay');
  const svgOutputArea = document.getElementById('svgOutputArea');
  const savingsBadge = document.getElementById('savingsBadge');
  const origSizeText = document.getElementById('origSizeText');
  const optSizeText = document.getElementById('optSizeText');
  const savedBytesText = document.getElementById('savedBytesText');
  const downloadSvgBtn = document.getElementById('downloadSvgBtn');
  const copySvgBtn = document.getElementById('copySvgBtn');
  const copySvgText = document.getElementById('copySvgText');
  const exportPngBtn = document.getElementById('exportPngBtn');

  const optComments = document.getElementById('optComments');
  const optEditor = document.getElementById('optEditor');
  const optEmpty = document.getElementById('optEmpty');
  const optHidden = document.getElementById('optHidden');
  const optPaths = document.getElementById('optPaths');
  const precisionSelect = document.getElementById('precisionSelect');

  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const zoomResetBtn = document.getElementById('zoomResetBtn');

  // Background switches
  document.querySelectorAll('.bg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      stageDisplay.className = 'stage-display ' + btn.dataset.bg;
    });
  });

  // Zoom controls
  zoomInBtn.addEventListener('click', () => setZoom(currentZoom + 0.25));
  zoomOutBtn.addEventListener('click', () => setZoom(Math.max(0.25, currentZoom - 0.25)));
  zoomResetBtn.addEventListener('click', () => setZoom(1));

  function setZoom(z) {
    currentZoom = Math.round(z * 100) / 100;
    zoomResetBtn.textContent = `${Math.round(currentZoom * 100)}%`;
    const svgEl = stageDisplay.querySelector('img');
    if (svgEl) {
      svgEl.style.transform = `scale(${currentZoom})`;
    }
  }

  // Dropzone Handlers
  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      loadFile(e.dataTransfer.files[0]);
    }
  });
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
      loadFile(e.target.files[0]);
    }
  });

  function loadFile(file) {
    if (!file.name.toLowerCase().endsWith('.svg') && file.type !== 'image/svg+xml') {
      alert('Please select a valid .svg file.');
      return;
    }
    const op = ++svgOperation;
    svgReady = false; optimizedSvg = ''; stageDisplay.replaceChildren(); svgButtons(); svgStatus('Reading SVG...');
    const reader = new FileReader();
    reader.onerror = () => { if(op === svgOperation) svgStatus('Could not read this file.'); };
    reader.onload = () => {
      if(op !== svgOperation) return;
      originalRawSvg = reader.result; dropTitle.textContent = file.name; processOptimization();
    };
    reader.readAsText(file);
  }

  // Robust DOM-based SVG Optimizer
  function processOptimization() {
    ++svgOperation;
    try {
      const doc = validateSvg(originalRawSvg);
      const svgRoot = doc.documentElement;

      // 1. Remove Comments
      if (optComments.checked) {
        const commentIterator = doc.createNodeIterator(doc, NodeFilter.SHOW_COMMENT);
        const comments = [];
        let cNode;
        while (cNode = commentIterator.nextNode()) {
          comments.push(cNode);
        }
        comments.forEach(c => c.parentNode && c.parentNode.removeChild(c));
      }

      // 2. Strip Editor Namespaces & Metadata Tags
      if (optEditor.checked) {
        doc.querySelectorAll('metadata').forEach(m => m.remove());

        const allElements = doc.querySelectorAll('*');
        allElements.forEach(el => {
          const toRemove = [];
          for (let i = 0; i < el.attributes.length; i++) {
            const attrName = el.attributes[i].name.toLowerCase();
            if (
              attrName.startsWith('xmlns:inkscape') ||
              attrName.startsWith('xmlns:sodipodi') ||
              attrName.startsWith('xmlns:adobe') ||
              attrName.startsWith('xmlns:i') ||
              attrName.startsWith('xmlns:sketch') ||
              attrName.startsWith('inkscape:') ||
              attrName.startsWith('sodipodi:') ||
              attrName.startsWith('i:') ||
              attrName.startsWith('sketch:') ||
              attrName === 'enable-background' ||
              false
            ) {
              toRemove.push(el.attributes[i].name);
            }
          }
          toRemove.forEach(a => el.removeAttribute(a));
        });
      }

      // 3. Remove Hidden / Invisible Nodes
      if (optHidden.checked) {
        doc.querySelectorAll('[display="none"]').forEach(el => { if (!el.id && !el.querySelector('[id]')) el.remove(); });
      }

      // 4. Remove Empty Containers (<g></g>, <defs></defs>)
      if (optEmpty.checked) {
        for (let pass = 0; pass < 3; pass++) {
          doc.querySelectorAll('g, defs').forEach(el => {
            if (!el.children.length && !el.textContent.trim()) {
              el.remove();
            }
          });
        }
      }

      // 5. Precision & Path Optimization
      const precVal = precisionSelect.value;
      const hasPrec = (precVal !== 'none');
      const pNum = hasPrec ? parseInt(precVal, 10) : 2;

      const roundNum = (valStr) => {
        const n = parseFloat(valStr);
        if (isNaN(n)) return valStr;
        return parseFloat(n.toFixed(pNum)).toString();
      };

      doc.querySelectorAll('*').forEach(el => {
        // Optimize Path Data (d attribute ONLY)
        if (el.hasAttribute('d')) {
          let d = el.getAttribute('d');
          // Preserve path coordinates: rounding can alter arc flags and exponent notation.
          if (optPaths.checked) {
            d = d.replace(/,/g, ' ')
                 .replace(/\s*([a-df-z])\s*/gi, '$1 ')
                 .replace(/\s+/g, ' ')
                 .trim();
          }
          el.setAttribute('d', d);
        }

        // Numeric attributes
        if (hasPrec) {
          ['x', 'y', 'cx', 'cy', 'r', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2', 'stroke-width', 'width', 'height'].forEach(attr => {
            if (el.hasAttribute(attr)) {
              const v = el.getAttribute(attr);
              if (/^-?\d+\.\d+$/.test(v)) {
                el.setAttribute(attr, roundNum(v));
              }
            }
          });

          if (el.hasAttribute('viewBox')) {
            const vbParts = el.getAttribute('viewBox').trim().split(/[\s,]+/).map(roundNum);
            el.setAttribute('viewBox', vbParts.join(' '));
          }
        }
      });

      // Serialize back to clean XML string
      const serializer = new XMLSerializer();
      let res = serializer.serializeToString(svgRoot);

      if (optComments.checked) {
        res = res.replace(/^<\?xml[^>]*\?>\s*/i, '');
        res = res.replace(/^<!DOCTYPE[^>]*>\s*/i, '');
      }

      optimizedSvg = res.trim();
    } catch (e) {
      console.error('Optimization error:', e);
      optimizedSvg = ''; svgReady = false; stageDisplay.replaceChildren(); svgOutputArea.value = ''; svgStatus(e.message); svgButtons(); return;
    }

    renderOutput();
  }

  function renderOutput() {
    svgOutputArea.value = optimizedSvg;
    if(previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(new Blob([optimizedSvg],{type:'image/svg+xml'}));
    const img = new Image(); img.alt = 'SVG preview'; img.style.maxWidth = '100%'; img.style.maxHeight = '100%'; img.style.transform = `scale(${currentZoom})`;
    img.src = previewUrl; stageDisplay.replaceChildren(img);
    svgReady = true; svgButtons(); svgStatus('Ready. Active content and external resources are unsupported; path coordinates are preserved.');
    updateMetrics(originalRawSvg, optimizedSvg);
  }

  function updateMetrics(orig, opt) {
    const origBytes = new Blob([orig]).size;
    const optBytes = new Blob([opt]).size;
    const saved = origBytes - optBytes;
    const pct = origBytes > 0 ? ((saved / origBytes) * 100).toFixed(1) : 0;

    origSizeText.textContent = formatBytes(origBytes);
    optSizeText.textContent = formatBytes(optBytes);
    const direction = saved > 0 ? 'smaller' : saved < 0 ? 'larger' : 'unchanged';
    savedBytesText.textContent = saved === 0 ? '0 B · unchanged' : `${formatBytes(Math.abs(saved))} ${direction}`;
    savingsBadge.textContent = saved === 0 ? 'Unchanged' : `${Math.abs(pct)}% ${direction}`;
    const color = saved < 0 ? 'var(--accent)' : saved > 0 ? '#638977' : 'var(--muted)';
    savingsBadge.style.color = color;
    savedBytesText.style.color = color;
  }

  function formatBytes(bytes) {
    if (bytes <= 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    return (bytes / 1024).toFixed(2) + ' KB';
  }

  // Event Listeners for Toggles & Precision
  [optComments, optEditor, optEmpty, optHidden, optPaths].forEach(el => {
    el.addEventListener('change', processOptimization);
  });
  precisionSelect.addEventListener('change', processOptimization);

  svgOutputArea.addEventListener('input', () => {
    ++svgOperation;
    try { validateSvg(svgOutputArea.value); optimizedSvg = svgOutputArea.value; renderOutput(); }
    catch(error) { svgReady=false; stageDisplay.replaceChildren(); svgButtons(); svgStatus(error.message); }
  });

  // Download Optimized SVG
  downloadSvgBtn.addEventListener('click', () => {
    const blob = new Blob([optimizedSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'optimized.svg';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  });

  // Copy SVG Code
  copySvgBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(optimizedSvg);
      copySvgText.textContent = "Copied!";
      setTimeout(() => { copySvgText.textContent = "Copy SVG Code"; }, 2000);
    } catch (err) {
      copySvgText.textContent = "Failed to copy";
    }
  });

  exportPngBtn.addEventListener('click', async () => {
    if(!svgReady || exportBusy) return;
    const op = svgOperation, text = optimizedSvg; exportBusy=true; svgButtons();
    const url=URL.createObjectURL(new Blob([text],{type:'image/svg+xml'}));
    try {
      const img = await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('Could not render this SVG. Check dimensions and supported elements.'));i.src=url;});
      const w=img.naturalWidth*2,h=img.naturalHeight*2; TangentMedia.checkSize(w,h);
      const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.getContext('2d').drawImage(img,0,0,w,h);
      const blob=await TangentMedia.encode(canvas,'image/png');
      if(op!==svgOperation) return;
      const link=document.createElement('a'),downloadUrl=URL.createObjectURL(blob);link.href=downloadUrl;link.download='vector-export.png';link.click();setTimeout(()=>URL.revokeObjectURL(downloadUrl),2000);
    } catch(error) {if(op===svgOperation) svgStatus(error.message);} finally {URL.revokeObjectURL(url);exportBusy=false;svgButtons();}
  });

  const status = document.createElement('p'); status.id='svgStatus'; status.setAttribute('role','status'); svgOutputArea.before(status);
  // Initial Run with Sample SVG
  processOptimization();
