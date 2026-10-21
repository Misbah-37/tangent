
// --- Navigation menu & dropdown handler ---
(function initNavigation() {
})();

// --- Screenshot Beautifier Engine ---
const GRADIENTS = [
  { id: 'cosmic', type: 'gradient', colors: ['#00d2ff', '#3a7bd5'] },
  { id: 'sunset', type: 'gradient', colors: ['#7928ca', '#ff0080'] },
  { id: 'aurora', type: 'gradient', colors: ['#10b981', '#06b6d4'] },
  { id: 'midnight', type: 'gradient', colors: ['#0f172a', '#1e293b'] },
  { id: 'orange', type: 'gradient', colors: ['#f97316', '#ec4899'] },
  { id: 'cyberpunk', type: 'gradient', colors: ['#8b5cf6', '#ec4899'] },
  { id: 'emerald', type: 'gradient', colors: ['#059669', '#34d399'] },
  { id: 'amber', type: 'gradient', colors: ['#d97706', '#f59e0b'] },
  { id: 'ocean', type: 'gradient', colors: ['#0284c7', '#38bdf8'] },
  { id: 'plum', type: 'gradient', colors: ['#581c87', '#3b82f6'] },
  { id: 'dark-solid', type: 'solid', color: '#090b10' },
  { id: 'transparent', type: 'transparent' }
];

let state = {
  currentImage: null,
  frameStyle: 'macos-dark',
  backgroundIndex: 0,
  aspectRatio: 'auto',
  padding: 48,
  radius: 12,
  shadowLevel: 2,
  scale: 100
};

const canvas = document.getElementById('mockupCanvas');
const ctx = canvas.getContext('2d');
let imageOperation=0,mockupExportBusy=false;
const mockupStatus=document.getElementById('mockupStatus');
function setExportDisabled(disabled){document.getElementById('btnDownload').disabled=disabled;document.getElementById('btnCopyClipboard').disabled=disabled;}

// Build Gradient Palette
function initPalette() {
  const grid = document.getElementById('gradientGrid');
  grid.innerHTML = '';
  GRADIENTS.forEach((g, idx) => {
    const div = document.createElement('button');div.type='button';div.setAttribute('aria-label',g.id+' background');
    div.className = 'grad-swatch' + (idx === state.backgroundIndex ? ' active' : '');
    if (g.type === 'gradient') {
      div.style.background = `linear-gradient(135deg, ${g.colors[0]}, ${g.colors[1]})`;
    } else if (g.type === 'solid') {
      div.style.background = g.color;
    } else if (g.type === 'transparent') {
      div.className += ' transparent-swatch';
    }
    div.onclick = () => {
      document.querySelectorAll('.grad-swatch').forEach(s => s.classList.remove('active'));
      div.classList.add('active');
      state.backgroundIndex = idx;
      render();
    };
    grid.appendChild(div);
  });
}

// Frame options selector
document.querySelectorAll('[data-frame]').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('[data-frame]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.frameStyle = btn.dataset.frame;
    render();
  };
});

// Aspect Ratio selector
document.querySelectorAll('[data-ratio]').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('[data-ratio]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.aspectRatio = btn.dataset.ratio;
    render();
  };
});

// Slider bindings
const sliderPadding = document.getElementById('sliderPadding');
sliderPadding.oninput = (e) => {
  state.padding = parseInt(e.target.value, 10);
  document.getElementById('valPadding').textContent = state.padding + 'px';
  render();
};

const sliderRadius = document.getElementById('sliderRadius');
sliderRadius.oninput = (e) => {
  state.radius = parseInt(e.target.value, 10);
  document.getElementById('valRadius').textContent = state.radius + 'px';
  render();
};

const sliderShadow = document.getElementById('sliderShadow');
const shadowLabels = ['None', 'Subtle', 'Medium', 'Deep 3D', 'Cyan Glow'];
sliderShadow.oninput = (e) => {
  state.shadowLevel = parseInt(e.target.value, 10);
  document.getElementById('valShadow').textContent = shadowLabels[state.shadowLevel];
  render();
};

const sliderScale = document.getElementById('sliderScale');
sliderScale.oninput = (e) => {
  state.scale = parseInt(e.target.value, 10);
  document.getElementById('valScale').textContent = state.scale + '%';
  render();
};

// Create a high-tech sleek default demo screenshot
function createDefaultDemoImage() {
  const operation=imageOperation;
  const demo = document.createElement('canvas');
  demo.width = 960;
  demo.height = 580;
  const dctx = demo.getContext('2d');

  // Background
  dctx.fillStyle = '#0f141f';
  dctx.fillRect(0, 0, 960, 580);

  // Subtle grid
  dctx.strokeStyle = '#182030';
  dctx.lineWidth = 1;
  for (let x = 0; x < 960; x += 40) {
    dctx.beginPath(); dctx.moveTo(x, 0); dctx.lineTo(x, 580); dctx.stroke();
  }
  for (let y = 0; y < 580; y += 40) {
    dctx.beginPath(); dctx.moveTo(0, y); dctx.lineTo(960, y); dctx.stroke();
  }

  // Header mockup
  dctx.fillStyle = '#171d2b';
  dctx.fillRect(40, 40, 880, 60);
  dctx.fillStyle = '#00d2ff';
  dctx.beginPath(); dctx.arc(70, 70, 12, 0, Math.PI * 2); dctx.fill();
  dctx.fillStyle = '#ffffff';
  dctx.font = 'bold 18px sans-serif';
  dctx.fillText('A small project, taking shape', 100, 76);

  // Cards
  const cards = [
    { title: 'Ideas collected', val: '24', color: '#00d2ff', x: 40, y: 130, w: 270 },
    { title: 'Drafts reviewed', val: '08', color: '#10b981', x: 345, y: 130, w: 270 },
    { title: 'Next steps', val: '03', color: '#a855f7', x: 650, y: 130, w: 270 }
  ];
  cards.forEach(c => {
    dctx.fillStyle = '#141a27';
    dctx.strokeStyle = '#1f2738';
    dctx.lineWidth = 1.5;
    dctx.beginPath(); dctx.roundRect(c.x, c.y, c.w, 110, 10); dctx.fill(); dctx.stroke();

    dctx.fillStyle = '#94a3b8';
    dctx.font = '13px sans-serif';
    dctx.fillText(c.title, c.x + 20, c.y + 36);

    dctx.fillStyle = c.color;
    dctx.font = 'bold 28px sans-serif';
    dctx.fillText(c.val, c.x + 20, c.y + 78);
  });

  // Chart area
  dctx.fillStyle = '#141a27';
  dctx.strokeStyle = '#1f2738';
  dctx.beginPath(); dctx.roundRect(40, 270, 880, 260, 10); dctx.fill(); dctx.stroke();

  // Wave line
  dctx.strokeStyle = '#00d2ff';
  dctx.lineWidth = 3;
  dctx.beginPath();
  const points = [[70, 480], [180, 420], [300, 450], [420, 360], [540, 400], [660, 320], [780, 350], [890, 300]];
  points.forEach((pt, i) => {
    if (i === 0) dctx.moveTo(pt[0], pt[1]);
    else dctx.lineTo(pt[0], pt[1]);
  });
  dctx.stroke();

  // Area fill under wave
  dctx.lineTo(890, 500);
  dctx.lineTo(70, 500);
  dctx.closePath();
  const grad = dctx.createLinearGradient(0, 300, 0, 500);
  grad.addColorStop(0, 'rgba(0, 210, 255, 0.25)');
  grad.addColorStop(1, 'rgba(0, 210, 255, 0.0)');
  dctx.fillStyle = grad;
  dctx.fill();

  const img = new Image();
  img.onload = () => {
    if(operation!==imageOperation)return;
    state.currentImage = img;setExportDisabled(false);render();
  };
  img.src = demo.toDataURL();
}

// Render Engine (High-DPI Retina 2x)
function render() {
  if (!state.currentImage) return;

  const img = state.currentImage;
  const scaleRatio = state.scale / 100;
  const padding = state.padding * 2;
  let radius = state.radius * 2;
  let headerHeight = (state.frameStyle === 'macos-dark' || state.frameStyle === 'macos-light') ? 68 : (state.frameStyle === 'windows-dark' ? 60 : 0);

  let contentW = img.width * scaleRatio;
  let contentH = (img.height * scaleRatio) + headerHeight;

  let canvasW = contentW + (padding * 2);
  let canvasH = contentH + (padding * 2);

  // Aspect ratio adjustments
  if (state.aspectRatio === '16:9') {
    const targetRatio = 16 / 9;
    if (canvasW / canvasH < targetRatio) canvasW = canvasH * targetRatio;
    else canvasH = canvasW / targetRatio;
  } else if (state.aspectRatio === '1:1') {
    const maxDim = Math.max(canvasW, canvasH);
    canvasW = maxDim;
    canvasH = maxDim;
  } else if (state.aspectRatio === '4:3') {
    const targetRatio = 4 / 3;
    if (canvasW / canvasH < targetRatio) canvasW = canvasH * targetRatio;
    else canvasH = canvasW / targetRatio;
  } else if (state.aspectRatio === '9:16') {
    const targetRatio = 9 / 16;
    if (canvasW / canvasH < targetRatio) canvasW = canvasH * targetRatio;
    else canvasH = canvasW / targetRatio;
  }

  // Safety Rail: Cap maximum canvas dimension at 4096px to prevent GPU texture / OOM spikes
  const MAX_CANVAS_DIM = 4096;
  if (canvasW > MAX_CANVAS_DIM || canvasH > MAX_CANVAS_DIM) {
    const downscale = MAX_CANVAS_DIM / Math.max(canvasW, canvasH);
    canvasW *= downscale;
    canvasH *= downscale;
    contentW *= downscale;
    contentH *= downscale;
    headerHeight *= downscale;
    radius *= downscale;
  }

  // Set physical canvas size
  canvas.width = Math.round(canvasW);
  canvas.height = Math.round(canvasH);

  // Clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Draw Canvas Background
  const bg = GRADIENTS[state.backgroundIndex];
  if (bg.type === 'gradient') {
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, bg.colors[0]);
    grad.addColorStop(1, bg.colors[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (bg.type === 'solid') {
    ctx.fillStyle = bg.color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // 2. Position Content Centered
  const drawX = Math.round((canvas.width - contentW) / 2);
  const drawY = Math.round((canvas.height - contentH) / 2);

  // 3. Draw Shadow
  ctx.save();
  if (state.shadowLevel > 0) {
    if (state.shadowLevel === 1) { // Subtle
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 14;
    } else if (state.shadowLevel === 2) { // Medium
      ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
      ctx.shadowBlur = 60;
      ctx.shadowOffsetY = 24;
    } else if (state.shadowLevel === 3) { // Deep 3D
      ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
      ctx.shadowBlur = 90;
      ctx.shadowOffsetY = 38;
    } else if (state.shadowLevel === 4) { // Cyan Glow
      ctx.shadowColor = 'rgba(0, 210, 255, 0.45)';
      ctx.shadowBlur = 70;
      ctx.shadowOffsetY = 16;
    }
  }

  // Fill base rectangle under shadow
  ctx.fillStyle = '#08090d';
  ctx.beginPath();
  ctx.roundRect(drawX, drawY, contentW, contentH, radius);
  ctx.fill();
  ctx.restore();

  // 4. Clip Window & Draw Header + Content
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(drawX, drawY, contentW, contentH, radius);
  ctx.clip();

  // Draw Window Titlebar
  if (state.frameStyle === 'macos-dark' || state.frameStyle === 'macos-light') {
    const isDark = state.frameStyle === 'macos-dark';
    ctx.fillStyle = isDark ? '#1a1f2c' : '#f1f5f9';
    ctx.fillRect(drawX, drawY, contentW, headerHeight);

    // Titlebar bottom border
    ctx.fillStyle = isDark ? '#262d3d' : '#e2e8f0';
    ctx.fillRect(drawX, drawY + headerHeight - 1, contentW, 1);

    // macOS Traffic Light dots
    const dotY = drawY + (headerHeight / 2);
    const dotRadius = 7;
    const startDotX = drawX + 24;
    const spacing = 22;

    const dots = ['#ff5f56', '#ffbd2e', '#27c93f'];
    dots.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(startDotX + (i * spacing), dotY, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (state.frameStyle === 'windows-dark') {
    ctx.fillStyle = '#141822';
    ctx.fillRect(drawX, drawY, contentW, headerHeight);

    // Windows glyphs on top right
    const iconY = drawY + (headerHeight / 2);
    const rightX = drawX + contentW - 24;

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;

    // Close 'X'
    ctx.beginPath();
    ctx.moveTo(rightX - 6, iconY - 6); ctx.lineTo(rightX + 6, iconY + 6);
    ctx.moveTo(rightX + 6, iconY - 6); ctx.lineTo(rightX - 6, iconY + 6);
    ctx.stroke();

    // Maximize box
    ctx.strokeRect(rightX - 36, iconY - 6, 12, 12);

    // Minimize line
    ctx.beginPath();
    ctx.moveTo(rightX - 66, iconY); ctx.lineTo(rightX - 54, iconY);
    ctx.stroke();
  } else if (state.frameStyle === 'glass') {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.strokeRect(drawX, drawY, contentW, contentH);
  }

  // Draw Screenshot Image
  const imgY = drawY + headerHeight;
  ctx.drawImage(img, drawX, imgY, contentW, contentH - headerHeight);

  ctx.restore();
}

// Image Loader Helper
async function loadImageFromFile(file) {
  const operation=++imageOperation;mockupExportBusy=false;state.currentImage=null;ctx.clearRect(0,0,canvas.width,canvas.height);setExportDisabled(true);mockupStatus.textContent='Loading image...';
  try{
    if(!file||!file.type.startsWith('image/'))throw new Error('Choose a supported image.');
    const image=await TangentMedia.loadImage(file);if(operation!==imageOperation)return;
    state.currentImage=image;render();setExportDisabled(false);mockupStatus.textContent='Loaded '+(file.name||'pasted image')+'.';
  }catch(error){if(operation===imageOperation)mockupStatus.textContent='Could not load image: '+error.message;}
}

// File Input
document.getElementById('fileInput').addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) {
    loadImageFromFile(e.target.files[0]);
  }
});

// Drag and Drop
const stage = document.getElementById('canvasStage');
const dropOverlay = document.getElementById('dropOverlay');

['dragenter', 'dragover'].forEach(name => {
  window.addEventListener(name, (e) => {
    e.preventDefault();
    dropOverlay.classList.add('dragover');
  });
});

['dragleave', 'drop'].forEach(name => {
  window.addEventListener(name, (e) => {
    e.preventDefault();
    dropOverlay.classList.remove('dragover');
  });
});

window.addEventListener('drop', (e) => {
  e.preventDefault();
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    loadImageFromFile(e.dataTransfer.files[0]);
  }
});

// Clipboard Paste Listener (Ctrl+V / âŒ˜V anywhere on document)
window.addEventListener('paste', (e) => {
  const items = e.clipboardData ? e.clipboardData.items : [];
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const blob = items[i].getAsFile();
      loadImageFromFile(blob);
      break;
    }
  }
});

async function exportMockup(copy){
  if(!state.currentImage||mockupExportBusy)return;
  const operation=imageOperation,snapshot=document.createElement('canvas');snapshot.width=canvas.width;snapshot.height=canvas.height;snapshot.getContext('2d').drawImage(canvas,0,0);
  mockupExportBusy=true;setExportDisabled(true);mockupStatus.textContent='Preparing image...';
  try{
    const blob=await TangentMedia.encode(snapshot,'image/png');if(operation!==imageOperation)return;
    if(copy){if(!navigator.clipboard?.write||typeof ClipboardItem==='undefined')throw new Error('Clipboard copying is unavailable. Use Download.');await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);if(operation===imageOperation)mockupStatus.textContent='Image copied to clipboard.';}
    else{const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='Tangent_Mockup.png';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);mockupStatus.textContent='PNG download requested.';}
  }catch(error){if(operation===imageOperation)mockupStatus.textContent='Could not export image: '+error.message;}
  finally{if(operation===imageOperation){mockupExportBusy=false;setExportDisabled(false);}}
}
document.getElementById('btnDownload').addEventListener('click',()=>exportMockup(false));
document.getElementById('btnCopyClipboard').addEventListener('click',()=>exportMockup(true));

// Initialize on page load
initPalette();
createDefaultDemoImage();
