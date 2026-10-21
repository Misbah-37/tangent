
// Configure PDF.js worker
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// State
let documentPages = []; // Array of canvas elements
let currentPageIndex = 0;
let extractedPageTexts = [];
let averageConfidence = null;
const ocrJobs=TangentProcessing.jobs();
let isProcessing = false;
let currentFileName = "document";

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const dropZoneContainer = document.getElementById('dropZoneContainer');
const progressCard = document.getElementById('progressCard');
const progressStatusLabel = document.getElementById('progressStatusLabel');
const progressBarFill = document.getElementById('progressBarFill');
const workspaceGrid = document.getElementById('workspaceGrid');
const previewCanvas = document.getElementById('previewCanvas');
const previewFileName = document.getElementById('previewFileName');
const ocrOutputText = document.getElementById('ocrOutputText');
const statWords = document.getElementById('statWords');
const statChars = document.getElementById('statChars');
const statConfidence = document.getElementById('statConfidence');
const btnPrevPage = document.getElementById('btnPrevPage');
const btnNextPage = document.getElementById('btnNextPage');
const pageIndicator = document.getElementById('pageIndicator');
const pageNavControls = document.getElementById('pageNavControls');
const btnCopyText = document.getElementById('btnCopyText');
const btnDownloadTxt = document.getElementById('btnDownloadTxt');
const btnReset = document.getElementById('btnReset');
const copyToast = document.getElementById('copyToast');
const ocrLangSelect = document.getElementById('ocrLangSelect');
const chkEnhanceContrast = document.getElementById('chkEnhanceContrast');

// Click to select
dropZone.addEventListener('click', () => {
  if (!isProcessing) fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files.length > 0) {
    processFile(e.target.files[0]);
  }
});

// Drag & Drop
['dragenter', 'dragover'].forEach(name => {
  dropZone.addEventListener(name, (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
});

['dragleave', 'drop'].forEach(name => {
  dropZone.addEventListener(name, (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
  });
});

dropZone.addEventListener('drop', (e) => {
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    processFile(e.dataTransfer.files[0]);
  }
});

// Global Paste (Ctrl + V)
window.addEventListener('paste', (e) => {
  if (isProcessing) return;
  const items = e.clipboardData?.items;
  if (!items) return;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const blob = items[i].getAsFile();
      processFile(blob, "Pasted_Screenshot.png");
      break;
    }
  }
});

// Contrast and Grayscale Filter
function applyPreprocess(srcCanvas) {
  const c = document.createElement('canvas');
  c.width = srcCanvas.width;
  c.height = srcCanvas.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(srcCanvas, 0, 0);

  const imgData = ctx.getImageData(0, 0, c.width, c.height);
  const d = imgData.data;

  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    // Contrast enhancement factor
    const contrast = 1.35;
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    const val = Math.min(255, Math.max(0, factor * (gray - 128) + 128));
    d[i] = val;
    d[i + 1] = val;
    d[i + 2] = val;
  }
  ctx.putImageData(imgData, 0, 0);
  return c;
}

// Process Ingested File
async function processFile(file, overrideName = null) {
  if (!file) return;
  const job=ocrJobs.begin(),name=overrideName||file.name||'document',language=ocrLangSelect.value,enhance=chkEnhanceContrast.checked;
  fileInput.value='';
  isProcessing=true;ocrOutputText.value='';documentPages=[];extractedPageTexts=[];averageConfidence=null;
  dropZoneContainer.style.display='none';workspaceGrid.style.display='none';progressCard.style.display='block';ocrMessage.textContent='';updateProgress(5,'Reading '+name+'...');
  try{
    TangentProcessing.checkFile(file);
    let pages;
    if(file.type==='application/pdf'||name.toLowerCase().endsWith('.pdf')) pages=await TangentProcessing.rasterPdf(file,job);
    else {if(!/^image\/(png|jpeg|webp|bmp)$/.test(file.type))throw Error('Choose PNG, JPEG, WebP, BMP or PDF.');const image=await TangentMedia.loadImage(file);job.check();const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;canvas.getContext('2d').drawImage(image,0,0);pages=[canvas];}
    job.check();updateProgress(35,'Loading OCR engine. Language data may need downloading...');
    const targets=enhance?pages.map(applyPreprocess):pages;
    const data=await TangentProcessing.recognize(targets,language,job,m=>{if(m.status==='recognizing text')updateProgress(50,'Recognizing document...');});job.check();
    documentPages=pages;extractedPageTexts=data.map(d=>d.text||'');const confidence=data.map(d=>d.confidence).filter(Number.isFinite);averageConfidence=confidence.length?Math.round(confidence.reduce((a,b)=>a+b,0)/confidence.length):null;
    currentFileName=name;previewFileName.textContent=name;displayResults();ocrMessage.textContent=ocrOutputText.value.trim()?'Review the extracted text before exporting.':'No text was recognized. Try a clearer scan or another language.';
  }catch(error){if(job.current()){resetTool();ocrMessage.textContent=error.message||'Could not process this document.';}}
  finally{if(job.current())isProcessing=false;}
}

function updateProgress(percent, statusText) {
  if (statusText) progressStatusLabel.textContent = statusText;
  if (percent !== null) {
    progressBarFill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
  }
}

function displayResults() {
  progressCard.style.display = 'none';
  workspaceGrid.style.display = 'grid';

  // Format combined text
  let fullText = "";
  if (extractedPageTexts.length === 1) {
    fullText = extractedPageTexts[0].trim();
  } else {
    fullText = extractedPageTexts.map((txt, idx) => `--- [Page ${idx + 1}] ---\n\n${txt.trim()}\n`).join("\n\n");
  }

  ocrOutputText.value = fullText;
  updateStats(fullText);

  // Setup preview pane
  currentPageIndex = 0;
  renderPreviewPage(0);

  if (documentPages.length > 1) {
    pageNavControls.style.display = 'flex';
    updatePageNavUI();
  } else {
    pageNavControls.style.display = 'none';
  }
}

function renderPreviewPage(index) {
  if (!documentPages[index]) return;
  const src = documentPages[index];
  previewCanvas.width = src.width;
  previewCanvas.height = src.height;
  const ctx = previewCanvas.getContext('2d');
  ctx.drawImage(src, 0, 0);
}

function updatePageNavUI() {
  pageIndicator.textContent = `Page ${currentPageIndex + 1} / ${documentPages.length}`;
  btnPrevPage.disabled = (currentPageIndex === 0);
  btnNextPage.disabled = (currentPageIndex === documentPages.length - 1);
}

btnPrevPage.addEventListener('click', () => {
  if (currentPageIndex > 0) {
    currentPageIndex--;
    renderPreviewPage(currentPageIndex);
    updatePageNavUI();
  }
});

btnNextPage.addEventListener('click', () => {
  if (currentPageIndex < documentPages.length - 1) {
    currentPageIndex++;
    renderPreviewPage(currentPageIndex);
    updatePageNavUI();
  }
});

function updateStats(text) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;
  statWords.textContent = words.toLocaleString();
  statChars.textContent = chars.toLocaleString();
  statConfidence.textContent = averageConfidence===null ? "Unavailable" : `${averageConfidence}%`;
}

ocrOutputText.addEventListener('input', () => {
  updateStats(ocrOutputText.value);
});

// Copy to Clipboard
btnCopyText.addEventListener('click',async()=>{if(!ocrOutputText.value)return;try{await navigator.clipboard.writeText(ocrOutputText.value);ocrMessage.textContent='Text copied.';}catch(error){ocrMessage.textContent='Could not copy. Select the text and copy manually.';}});

// Download .txt file
btnDownloadTxt.addEventListener('click', () => {
  if (!ocrOutputText.value) return;
  const blob = new Blob([ocrOutputText.value], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const baseName = currentFileName.replace(/\.[^/.]+$/, "");
  a.href = url;
  a.download = `${baseName}_OCR.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),2000);
});

// Reset
function resetTool() {
  ocrJobs.cancel();isProcessing=false;averageConfidence=null;ocrMessage.textContent='';
  documentPages = [];
  extractedPageTexts = [];
  currentPageIndex = 0;
  ocrOutputText.value = "";
  fileInput.value = "";
  progressCard.style.display = 'none';
  workspaceGrid.style.display = 'none';
  dropZoneContainer.style.display = 'block';
  progressBarFill.style.width = '0%';
  currentFileName='document';previewFileName.textContent='Document Preview';pageNavControls.style.display='none';pageIndicator.textContent='Page 1 / 1';updateStats('');
}

const ocrMessage=document.createElement('p');ocrMessage.id='ocrMessage';ocrMessage.setAttribute('role','status');dropZoneContainer.before(ocrMessage);
const cancelOCR=document.createElement('button');cancelOCR.type='button';cancelOCR.textContent='Cancel processing';cancelOCR.className='btn';cancelOCR.addEventListener('click',resetTool);progressCard.append(cancelOCR);
btnReset.addEventListener('click', resetTool);
