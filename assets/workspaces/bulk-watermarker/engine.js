const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const fileCount = document.getElementById('fileCount');

  const wmText = document.getElementById('wmText');
  const wmPosition = document.getElementById('wmPosition');
  const wmOpacity = document.getElementById('wmOpacity');
  const wmScale = document.getElementById('wmScale');
  const wmColor = document.getElementById('wmColor');

  const opacityVal = document.getElementById('opacityVal');
  const scaleVal = document.getElementById('scaleVal');

  const previewCanvas = document.getElementById('previewCanvas');
  const noPreviewMsg = document.getElementById('noPreviewMsg');
  const btnProcess = document.getElementById('btnProcess');
  const btnClearWM = document.getElementById('btnClearWM');
  const statusText = document.getElementById('statusText');

  let imageFiles = [];
  let firstImageObj = null;
  let watermarkOperation = 0, watermarkBusy = false;

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if(e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  });
  fileInput.addEventListener('change', (e) => {
    if(e.target.files.length) handleFiles(e.target.files);
  });

  wmOpacity.addEventListener('input', (e) => {
    opacityVal.textContent = Math.round(e.target.value * 100) + '%';
    renderPreview();
  });
  wmScale.addEventListener('input', (e) => {
    scaleVal.textContent = Math.round(e.target.value * 100) + '%';
    renderPreview();
  });
  wmText.addEventListener('input', renderPreview);
  wmPosition.addEventListener('change', renderPreview);
  wmColor.addEventListener('input', renderPreview);

  function clearWatermarks() {
    watermarkOperation++;watermarkBusy=false;
    imageFiles=[];firstImageObj=null;fileInput.value='';fileCount.textContent='0 files selected';
    previewCanvas.style.display='none';noPreviewMsg.style.display='block';btnProcess.disabled=true;
    btnClearWM.style.display='none';statusText.textContent='Ready';
  }
  btnClearWM.addEventListener('click',clearWatermarks);
  async function handleFiles(files) {
    const selected=Array.from(files);
    clearWatermarks();const operation=watermarkOperation;
    imageFiles=selected.filter(file=>file.type.startsWith('image/'));
    if(!imageFiles.length){statusText.textContent='Choose supported image files.';return;}
    fileCount.textContent=`${imageFiles.length} files loaded`;btnClearWM.style.display='block';
    statusText.textContent='Loading preview...';
    try {
      const image=await TangentMedia.loadImage(imageFiles[0]);if(operation!==watermarkOperation)return;
      firstImageObj=image;noPreviewMsg.style.display='none';previewCanvas.style.display='block';
      renderPreview();
    } catch(error){if(operation===watermarkOperation)statusText.textContent=error.message;}
  }

  function applyWatermarkToCanvas(canvas, img, text, pos, opacity, scale, colorHex) {
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(img, 0, 0);

    if(!text.trim())throw new Error('Enter watermark text before exporting.');
    if([...text].length>200)throw new Error('Use at most 200 characters for the watermark.');
    if(!['bottom-right','bottom-left','top-right','top-left','center'].includes(pos)||!Number.isFinite(opacity)||opacity<0.1||opacity>1||!Number.isFinite(scale)||scale<0.01||scale>0.2)throw new Error('Choose valid watermark settings.');

    // Set opacity globally for both text and shadow
    ctx.globalAlpha = opacity;

    let fontSize = Math.max(20, Math.floor(img.width * scale));
    const setFont=()=>ctx.font=`bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
    setFont();
    while(fontSize>20&&(ctx.measureText(text).width+fontSize*2>img.width||fontSize*3>img.height)){fontSize--;setFont();}
    if(ctx.measureText(text).width+fontSize*2>img.width||fontSize*3>img.height)throw new Error('Watermark text does not fit this image at 20 pixels. Shorten the text or use a larger image.');
    ctx.fillStyle = colorHex;

    ctx.shadowColor = '#000000';
    ctx.shadowBlur = Math.max(4, fontSize * 0.1);
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const ascent=metrics.actualBoundingBoxAscent||fontSize*.8,descent=metrics.actualBoundingBoxDescent||0;
    const textHeight = ascent+descent;
    const padding = fontSize;

    let x = 0, y = 0;
    switch(pos) {
      case 'bottom-right': x = img.width - textWidth - padding; y = img.height - padding-descent; break;
      case 'bottom-left': x = padding; y = img.height - padding-descent; break;
      case 'top-right': x = img.width - textWidth - padding; y = padding + ascent; break;
      case 'top-left': x = padding; y = padding + ascent; break;
      case 'center': x = (img.width - textWidth) / 2; y = (img.height-textHeight)/2+ascent; break;
    }

    ctx.fillText(text, x, y);
    ctx.globalAlpha = 1.0; // Reset just in case
  }

  function renderPreview() {
    if(!firstImageObj) return;
    if(watermarkBusy){watermarkOperation++;watermarkBusy=false;}
    try{applyWatermarkToCanvas(
      previewCanvas,
      firstImageObj,
      wmText.value,
      wmPosition.value,
      parseFloat(wmOpacity.value),
      parseFloat(wmScale.value),
      wmColor.value
    );btnProcess.disabled=false;statusText.textContent='Ready. Text may shrink to fit; minimum size is 20 pixels.';}
    catch(error){btnProcess.disabled=true;statusText.textContent=error.message;}
  }

  btnProcess.addEventListener('click', async () => {
    if(!imageFiles.length||watermarkBusy||!firstImageObj)return;
    const operation=watermarkOperation,files=[...imageFiles];
    const settings={text:wmText.value,position:wmPosition.value,opacity:Number(wmOpacity.value),scale:Number(wmScale.value),color:wmColor.value};
    watermarkBusy=true;btnProcess.disabled=true;
    try {
      const zip=new JSZip(),canvas=document.createElement('canvas'),used=new Set();
      for(let i=0;i<files.length;i++) {
        if(operation!==watermarkOperation)return;
        statusText.textContent=`Processing ${i+1} / ${files.length}...`;
        const file=files[i],image=await TangentMedia.loadImage(file);if(operation!==watermarkOperation)return;
        try{applyWatermarkToCanvas(canvas,image,settings.text,settings.position,settings.opacity,settings.scale,settings.color);}catch(error){throw new Error(file.name+': '+error.message);}
        const blob=await TangentMedia.encode(canvas,file.type,0.92);if(operation!==watermarkOperation)return;
        zip.file(TangentMedia.uniqueName(used,file.name,'_watermarked',blob.type),blob);
      }
      statusText.textContent='Zipping files...';const content=await zip.generateAsync({type:'blob'});
      if(operation!==watermarkOperation)return;
      saveAs(content,'watermarked_images.zip');statusText.textContent=`ZIP download requested: ${files.length} images.`;
    } catch(error){if(operation===watermarkOperation)statusText.textContent='Could not export: '+error.message;}
    finally{if(operation===watermarkOperation){watermarkBusy=false;btnProcess.disabled=!imageFiles.length||!firstImageObj;}}
  });
