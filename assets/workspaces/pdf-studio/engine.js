// --- Navigation Toggle (Mobile) ---
// --- Tab Switching Logic ---
function switchTab(evt, tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    evt.currentTarget.classList.add('active');
}

// Escapes a filename before dropping it into innerHTML
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Helper: Wire Drag and Drop on an upload-box
function setupDragAndDrop(boxId, inputId, onFiles) {
    const box = document.getElementById(boxId);
    const input = document.getElementById(inputId);
    if (!box || !input) return;

    ['dragenter', 'dragover'].forEach(eventName => {
        box.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            box.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        box.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            box.classList.remove('dragover');
        });
    });

    box.addEventListener('drop', (e) => {
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) onFiles(files);
    });

    input.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) onFiles(files);
    });
}

// SVG Icons for List Actions (100% Emoji Free)
const SVG_UP = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg>';
const SVG_DOWN = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>';
const SVG_DELETE = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

// --- TAB 1: Images to PDF Logic ---
let imgSelectedFiles = [];
let imageOperation = 0;
function discardPdfResult(id) {
    const link = document.getElementById(id);
    const previous = link.getAttribute('href');
    if (previous && previous.startsWith('blob:')) URL.revokeObjectURL(previous);
    link.removeAttribute('href');
    link.style.display = 'none';
}
const imgUploader = document.getElementById('imgInput');
const imgListContainer = document.getElementById('sortable-image-list');
const imgQueueHeader = document.getElementById('img-queue-header');
const imgQueueCount = document.getElementById('img-queue-count');

setupDragAndDrop('img-drop-zone', 'imgInput', (files) => {
    imgSelectedFiles = imgSelectedFiles.concat(files);
    imgUploader.value = '';
    renderImgList();
});

function clearImgQueue() {
    imgSelectedFiles = [];
    imgUploader.value = '';
    renderImgList();
    document.getElementById('status1').innerText = '';
    document.getElementById('downloadBtn1').style.display = 'none';
}

function renderImgList() {
    imageOperation++;
    discardPdfResult('downloadBtn1');
    imgListContainer.innerHTML = '';
    if (imgSelectedFiles.length > 0) {
        imgQueueHeader.style.display = 'flex';
        imgQueueCount.innerText = `${imgSelectedFiles.length} image${imgSelectedFiles.length > 1 ? 's' : ''} in queue`;
    } else {
        imgQueueHeader.style.display = 'none';
    }

    imgSelectedFiles.forEach((file, index) => {
        const li = document.createElement('li');
        li.className = 'sortable-item';
        li.dataset.index = index;
        const isFirst = index === 0;
        const isLast = index === imgSelectedFiles.length - 1;
        li.innerHTML = `
            <span class="item-name">${escapeHtml(file.name)}</span>
            <span class="item-actions">
                <button type="button" class="icon-btn" data-action="up" title="Move up" aria-label="Move up" ${isFirst ? 'disabled' : ''}>${SVG_UP}</button>
                <button type="button" class="icon-btn" data-action="down" title="Move down" aria-label="Move down" ${isLast ? 'disabled' : ''}>${SVG_DOWN}</button>
                <button type="button" class="icon-btn icon-btn-delete" data-action="remove" title="Remove" aria-label="Remove">${SVG_DELETE}</button>
            </span>`;
        imgListContainer.appendChild(li);
    });
}

imgListContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.icon-btn');
    if (!btn || btn.disabled) return;
    const index = +btn.closest('.sortable-item').dataset.index;
    const action = btn.dataset.action;
    if (action === 'up' && index > 0) {
        [imgSelectedFiles[index - 1], imgSelectedFiles[index]] = [imgSelectedFiles[index], imgSelectedFiles[index - 1]];
    } else if (action === 'down' && index < imgSelectedFiles.length - 1) {
        [imgSelectedFiles[index + 1], imgSelectedFiles[index]] = [imgSelectedFiles[index], imgSelectedFiles[index + 1]];
    } else if (action === 'remove') {
        imgSelectedFiles.splice(index, 1);
    }
    renderImgList();
});

const loadImage = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve({ img, dataUrl: e.target.result, type: file.type });
        img.onerror = reject;
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
});

async function convertImages() {
    const operation = ++imageOperation;
    const files = imgSelectedFiles.slice();
    const status = document.getElementById('status1');
    const btn = document.getElementById('downloadBtn1');
    const pageSize = document.getElementById('pageSize').value;
    const orientPref = document.getElementById('orientation').value;
    const margin = parseInt(document.getElementById('margins').value);

    discardPdfResult('downloadBtn1');
    if (files.length === 0) { alert('Please select at least one image.'); return; }

    status.innerText = "Processing images...";
    btn.style.display = "none";

    try {
        const { jsPDF } = window.jspdf;
        let pdf = null;
        const sizes = { 'a4': [595.28, 841.89], 'letter': [612, 792] };

        for (let i = 0; i < files.length; i++) {
            status.innerText = `Processing image ${i + 1} of ${files.length}...`;
            const { img, dataUrl, type } = await loadImage(files[i]);
            if (operation !== imageOperation) return;

            let isLand = false;
            if (orientPref === 'auto') isLand = img.width > img.height;
            else if (orientPref === 'l') isLand = true;

            let format = sizes[pageSize];
            let finalW, finalH;

            if (pageSize === 'fit') {
                format = [img.width, img.height];
                isLand = img.width > img.height;
                finalW = img.width;
                finalH = img.height;
            } else {
                const baseW = isLand ? format[1] : format[0];
                const baseH = isLand ? format[0] : format[1];
                format = [baseW, baseH];

                const availW = baseW - (margin * 2);
                const availH = baseH - (margin * 2);
                const imgAspect = img.width / img.height;
                const targetAspect = availW / availH;

                if (imgAspect > targetAspect) {
                    finalW = availW;
                    finalH = availW / imgAspect;
                } else {
                    finalH = availH;
                    finalW = availH * imgAspect;
                }
            }

            const orientation = isLand ? 'l' : 'p';
            if (i === 0) {
                pdf = new jsPDF({ orientation: orientation, unit: 'pt', format: format });
            } else {
                pdf.addPage(format, orientation);
            }

            let x = pageSize === 'fit' ? 0 : margin + ((format[0] - (margin * 2) - finalW) / 2);
            let y = pageSize === 'fit' ? 0 : margin + ((format[1] - (margin * 2) - finalH) / 2);

            const imgType = type === 'image/png' ? 'PNG' : (type === 'image/webp' ? 'WEBP' : 'JPEG');
            pdf.addImage(dataUrl, imgType, x, y, finalW, finalH);
        }

        // Zero metadata injection
        pdf.setProperties({ title: '', subject: '', author: '', keywords: '', creator: '' });

        const pdfBlob = pdf.output('blob');
        if (operation !== imageOperation) return;
        btn.href = URL.createObjectURL(pdfBlob);
        btn.download = "Tangent_Compiled_Images.pdf";
        btn.style.display = "inline-flex";
        status.innerText = `Successfully compiled ${files.length} image(s) into PDF.`;
        status.style.color = "#34d399";
    } catch (e) {
        if (operation !== imageOperation) return;
        status.innerText = "Error: " + e.message;
        status.style.color = "#f87171";
    }
}

// Invalidate generated output when the recipe changes, including an in-flight job.
['pageSize','orientation','margins'].forEach(id => document.getElementById(id).addEventListener('change', () => {
    imageOperation++;
    discardPdfResult('downloadBtn1');
    document.getElementById('status1').textContent = imgSelectedFiles.length ? 'Settings changed. Create the PDF again to apply them.' : '';
}));

// --- TAB 2: Merge PDFs Logic ---
let mergeSelectedFiles = [];
const mergeUploader = document.getElementById('mergeInput');
const mergeListContainer = document.getElementById('sortable-file-list');
const mergeQueueHeader = document.getElementById('merge-queue-header');
const mergeQueueCount = document.getElementById('merge-queue-count');

setupDragAndDrop('merge-drop-zone', 'mergeInput', (files) => {
    mergeSelectedFiles = mergeSelectedFiles.concat(files.filter(f => f.name.toLowerCase().endsWith('.pdf')));
    mergeUploader.value = '';
    renderMergeList();
});

function clearMergeQueue() {
    mergeSelectedFiles = [];
    mergeUploader.value = '';
    renderMergeList();
    document.getElementById('status2').innerText = '';
    document.getElementById('downloadBtn2').style.display = 'none';
}

function renderMergeList() {
    mergeOperation++;
    document.getElementById('downloadBtn2').style.display = 'none';
    mergeListContainer.innerHTML = '';
    if (mergeSelectedFiles.length > 0) {
        mergeQueueHeader.style.display = 'flex';
        mergeQueueCount.innerText = `${mergeSelectedFiles.length} file${mergeSelectedFiles.length > 1 ? 's' : ''} in queue`;
    } else {
        mergeQueueHeader.style.display = 'none';
    }

    mergeSelectedFiles.forEach((file, index) => {
        const li = document.createElement('li');
        li.className = 'sortable-item';
        li.dataset.index = index;
        const isFirst = index === 0;
        const isLast = index === mergeSelectedFiles.length - 1;
        li.innerHTML = `
            <span class="item-name">${escapeHtml(file.name)}</span>
            <span class="item-actions">
                <button type="button" class="icon-btn" data-action="up" title="Move up" aria-label="Move up" ${isFirst ? 'disabled' : ''}>${SVG_UP}</button>
                <button type="button" class="icon-btn" data-action="down" title="Move down" aria-label="Move down" ${isLast ? 'disabled' : ''}>${SVG_DOWN}</button>
                <button type="button" class="icon-btn icon-btn-delete" data-action="remove" title="Remove" aria-label="Remove">${SVG_DELETE}</button>
            </span>`;
        mergeListContainer.appendChild(li);
    });
}

mergeListContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.icon-btn');
    if (!btn || btn.disabled) return;
    const index = +btn.closest('.sortable-item').dataset.index;
    const action = btn.dataset.action;
    if (action === 'up' && index > 0) {
        [mergeSelectedFiles[index - 1], mergeSelectedFiles[index]] = [mergeSelectedFiles[index], mergeSelectedFiles[index - 1]];
    } else if (action === 'down' && index < mergeSelectedFiles.length - 1) {
        [mergeSelectedFiles[index + 1], mergeSelectedFiles[index]] = [mergeSelectedFiles[index], mergeSelectedFiles[index + 1]];
    } else if (action === 'remove') {
        mergeSelectedFiles.splice(index, 1);
    }
    renderMergeList();
});

let mergeOperation = 0;
async function mergePdfs() {
    const operation = ++mergeOperation;
    const files = mergeSelectedFiles.slice();
    const status = document.getElementById('status2');
    const btn = document.getElementById('downloadBtn2');

    if (files.length < 2) { alert('Please select at least 2 PDF files to merge.'); return; }

    status.innerText = "Merging documents in browser RAM...";
    btn.style.display = "none";

    try {
        const mergedPdf = await PDFLib.PDFDocument.create();
        for (let i = 0; i < files.length; i++) {
            status.innerText = `Merging document ${i + 1} of ${files.length}...`;
            const arrayBuffer = await files[i].arrayBuffer();
            if(operation!==mergeOperation) return;
            const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
        }

        // Zero metadata leak: delete Info, Metadata, and PieceInfo
        delete mergedPdf.context.trailerInfo.Info;
        try { mergedPdf.catalog.delete(PDFLib.PDFName.of('Metadata')); } catch (_) {}
        try { mergedPdf.catalog.delete(PDFLib.PDFName.of('PieceInfo')); } catch (_) {}

        const pdfBytes = await mergedPdf.save({ updateMetadata: false, useObjectStreams: false });
          let blob = new Blob([pdfBytes], { type: 'application/pdf' });
        if(operation !== mergeOperation) return;
        btn.href = URL.createObjectURL(blob);
        btn.download = "Tangent_Merged.pdf";
        btn.style.display = "inline-flex";
        status.innerText = `Successfully merged ${files.length} documents.`;
        status.style.color = "#34d399";
    } catch (e) {
        if(operation !== mergeOperation) return;
        status.innerText = "Error: " + e.message;
        status.style.color = "#f87171";
    }
}

// --- TAB 3: Split PDF Logic ---
let splitSelectedFile = null;
let splitOperation = 0;

setupDragAndDrop('split-drop-zone', 'splitInput', async (files) => {
    const f = files.find(file => file.name.toLowerCase().endsWith('.pdf'));
    if (!f) return;
    const operation=++splitOperation;
    splitSelectedFile = f;
    discardPdfResult('downloadBtn3');

    document.getElementById('split-drop-zone').style.display = 'none';
    const card = document.getElementById('split-file-card');
    card.style.display = 'flex';
    document.getElementById('split-file-name').innerText = f.name;
    document.getElementById('split-file-meta').innerText = `${(f.size / 1024).toFixed(1)} KB`;

    try {
        const buf = await f.arrayBuffer();
        const doc = await PDFLib.PDFDocument.load(buf);
        if(operation!==splitOperation) return;
        document.getElementById('split-file-meta').innerText = `${doc.getPageCount()} pages • ${(f.size / 1024).toFixed(1)} KB`;
    } catch (_) {}
});

document.getElementById('rangeInput').addEventListener('input', () => { splitOperation++; discardPdfResult('downloadBtn3'); document.getElementById('status3').textContent = ''; });

function resetSplitFile() {
    splitOperation++;
    splitSelectedFile = null;
    document.getElementById('splitInput').value = '';
    document.getElementById('split-file-card').style.display = 'none';
    document.getElementById('split-drop-zone').style.display = 'block';
    document.getElementById('status3').innerText = '';
    discardPdfResult('downloadBtn3');
}

async function splitPdf() {
    const operation = ++splitOperation;
    const file = splitSelectedFile;
    const rangeStr = document.getElementById('rangeInput').value;
    const status = document.getElementById('status3');
    const btn = document.getElementById('downloadBtn3');

    discardPdfResult('downloadBtn3');
    if (!file) { alert('Please select a PDF file first.'); return; }
    if (!rangeStr) { alert('Please enter a page range to extract (e.g. 1-3 or 1,4,7).'); return; }

    status.innerText = "Extracting pages in browser RAM...";
    btn.style.display = "none";

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
        const totalPages = pdf.getPageCount();

        const pagesToExtract = new Set();
        for (const token of rangeStr.split(',')) {
            const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(token.trim());
            if(!match) throw new Error('Invalid page range: '+token.trim());
            const start = Number(match[1]), end = match[2] ? Number(match[2]) : start;
            if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<1||end<start||end>totalPages) throw new Error('Page range must be between 1 and '+totalPages+'.');
            for(let p=start;p<=end;p++) pagesToExtract.add(p-1);
        }
        const newPdf = await PDFLib.PDFDocument.create();
        const indices = Array.from(pagesToExtract).sort((a,b) => a-b);
        const copiedPages = await newPdf.copyPages(pdf, indices);
        copiedPages.forEach((page) => newPdf.addPage(page));

        // Zero metadata leak
        delete newPdf.context.trailerInfo.Info;
        try { newPdf.catalog.delete(PDFLib.PDFName.of('Metadata')); } catch (_) {}
        try { newPdf.catalog.delete(PDFLib.PDFName.of('PieceInfo')); } catch (_) {}

        const pdfBytes = await newPdf.save({ updateMetadata: false, useObjectStreams: false });
          let blob = new Blob([pdfBytes], { type: 'application/pdf' });
        if(operation !== splitOperation) return;
        btn.href = URL.createObjectURL(blob);
        btn.download = "Extracted_" + file.name;
        btn.style.display = "inline-flex";
        status.innerText = `Extracted ${indices.length} page(s) successfully.`;
        status.style.color = "#34d399";
    } catch (e) {
        if(operation !== splitOperation) return;
        status.innerText = "Error: " + e.message;
        status.style.color = "#f87171";
    }
}

// --- TAB 4: Compress PDF Logic ---
let compressSelectedFile = null;
let compressOperation = 0;

setupDragAndDrop('compress-drop-zone', 'compressInput', (files) => {
    const f = files.find(file => file.name.toLowerCase().endsWith('.pdf'));
    if (!f) return;
    compressOperation++;
    discardPdfResult('downloadBtn5');
    document.getElementById('status5').textContent = '';
    compressSelectedFile = f;

    document.getElementById('compress-drop-zone').style.display = 'none';
    const card = document.getElementById('compress-file-card');
    card.style.display = 'flex';
    document.getElementById('compress-file-name').innerText = f.name;
    document.getElementById('compress-file-meta').innerText = `Current Size: ${(f.size / 1024).toFixed(1)} KB`;
});

function resetCompressFile() {
    compressOperation++;
    compressSelectedFile = null;
    document.getElementById('compressInput').value = '';
    document.getElementById('compress-file-card').style.display = 'none';
    document.getElementById('compress-drop-zone').style.display = 'block';
    document.getElementById('status5').innerText = '';
    discardPdfResult('downloadBtn5');
}

async function compressPdf() {
    const operation = ++compressOperation;
    const file = compressSelectedFile;
    const status = document.getElementById('status5');
    const btn = document.getElementById('downloadBtn5');

    discardPdfResult('downloadBtn5');
    if (!file) { alert('Please select a PDF file to optimize.'); return; }

    status.innerText = "Optimizing document structure...";
    btn.style.display = "none";

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
        if (operation !== compressOperation) return;
        const newPdf = await PDFLib.PDFDocument.create();
        const copiedPages = await newPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => newPdf.addPage(page));

        // Zero metadata leak
        delete newPdf.context.trailerInfo.Info;
        try { newPdf.catalog.delete(PDFLib.PDFName.of('Metadata')); } catch (_) {}
        try { newPdf.catalog.delete(PDFLib.PDFName.of('PieceInfo')); } catch (_) {}

        const pdfBytes = await newPdf.save({ updateMetadata: false, useObjectStreams: true });
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        if (operation !== compressOperation) return;
        btn.href = URL.createObjectURL(blob);
        btn.download = "Optimized_" + file.name;
        btn.style.display = "inline-flex";

        if (blob.size < file.size) {
            status.innerText = `Rewritten PDF is smaller: ${blob.size.toLocaleString()} bytes (source: ${file.size.toLocaleString()} bytes). Check the downloaded document.`;
        } else {
            status.innerText = `No size reduction: ${blob.size.toLocaleString()} bytes (source: ${file.size.toLocaleString()} bytes). ${blob.size > file.size ? 'The output is larger.' : 'The size is unchanged.'} Keep the original if it suits you better.`;
        }

        status.style.color = "#34d399";
    } catch (e) {
        if (operation !== compressOperation) return;
        status.innerText = "Error: " + e.message;
        status.style.color = "#f87171";
    }
}

// --- TAB 5: Extract Text Logic ---
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
let extractSelectedFile = null;
let extractOperation = 0;
let activeTextTask = null;
function cancelTextWork() {
    extractOperation++;
    if (activeTextTask) { activeTextTask.destroy().catch(() => {}); activeTextTask = null; }
    discardPdfResult('downloadBtn4');
    const area = document.getElementById('outputArea');
    area.value = ''; area.style.display = 'none';
}

setupDragAndDrop('extract-drop-zone', 'textInput', (files) => {
    const f = files.find(file => file.name.toLowerCase().endsWith('.pdf'));
    if (!f) return;
    cancelTextWork();
    document.getElementById('status4').textContent = '';
    extractSelectedFile = f;

    document.getElementById('extract-drop-zone').style.display = 'none';
    const card = document.getElementById('extract-file-card');
    card.style.display = 'flex';
    document.getElementById('extract-file-name').innerText = f.name;
    document.getElementById('extract-file-meta').innerText = `${(f.size / 1024).toFixed(1)} KB • Ready to read`;
});

function resetExtractFile() {
    cancelTextWork();
    extractSelectedFile = null;
    document.getElementById('textInput').value = '';
    document.getElementById('extract-file-card').style.display = 'none';
    document.getElementById('extract-drop-zone').style.display = 'block';
    document.getElementById('outputArea').style.display = 'none';
    document.getElementById('status4').innerText = '';
    document.getElementById('downloadBtn4').style.display = 'none';
}

async function extractText() {
    cancelTextWork();
    const operation = extractOperation;
    const file = extractSelectedFile;
    const status = document.getElementById('status4');
    const textArea = document.getElementById('outputArea');
    const btn = document.getElementById('downloadBtn4');

    if (!file) { alert('Please select a PDF file first.'); return; }

    status.innerText = "Reading document in browser memory...";
    textArea.style.display = "none";
    btn.style.display = "none";

    let loadingTask;
    try {
        const arrayBuffer = await file.arrayBuffer();
        if (operation !== extractOperation) return;
        loadingTask = pdfjsLib.getDocument({data: new Uint8Array(arrayBuffer)});
        activeTextTask = loadingTask;
        const pdf = await loadingTask.promise;
        if (operation !== extractOperation) return;
        let fullText = "";
        let hasText = false;

        for (let i = 1; i <= pdf.numPages; i++) {
            status.innerText = `Extracting page ${i} of ${pdf.numPages}...`;
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            if (operation !== extractOperation) return;
            const pageText = textContent.items.map(item => item.str).join(" ");
            if (pageText.trim()) hasText = true;
            fullText += `=== PAGE ${i} ===\n${pageText}\n\n`;
        }

        if (!hasText) {
            status.textContent = 'No embedded text found. Scanned pages may need Document OCR.';
            status.style.color = 'var(--muted)';
            return;
        }
        textArea.value = fullText;
        textArea.style.display = "block";

        const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
        btn.href = URL.createObjectURL(blob);
        btn.download = file.name.replace(/\.pdf$/i, '') + '_extracted.txt';
        btn.style.display = "inline-flex";

        status.innerText = `Successfully extracted text from ${pdf.numPages} page(s).`;
        status.style.color = "#34d399";
    } catch (e) {
        if (operation !== extractOperation) return;
        status.innerText = "Error reading PDF: " + e.message;
        status.style.color = "#f87171";
    } finally {
        if (activeTextTask === loadingTask) activeTextTask = null;
        if (loadingTask) { try { await loadingTask.destroy(); } catch (_) {} }
    }
}

// Kept as a defensive guard for callers using an older page interface.
async function encryptPdfBlob() {throw new Error('PDF password encryption is currently unavailable.');}
