
document.addEventListener('DOMContentLoaded', () => {
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const emptyState = document.getElementById('emptyState');
  const consentState = document.getElementById('consentState');
  const activeState = document.getElementById('activeState');

  const statusSection = document.getElementById('statusSection');
  const statusText = document.getElementById('statusText');
  const statusPercent = document.getElementById('statusPercent');
  const progressBarContainer = document.getElementById('progressBarContainer');
  const progressBarFill = document.getElementById('progressBarFill');

  const receiptPreview = document.getElementById('receiptPreview');
  const previewSection = document.getElementById('previewSection');

  const btnConsentDownload = document.getElementById('btnConsentDownload');
  const btnConsentCancel = document.getElementById('btnConsentCancel');

  const outTotal = document.getElementById('outTotal');
  const outDate = document.getElementById('outDate');
  const outRawText = document.getElementById('outRawText');

  const btnCopyJSON = document.getElementById('btnCopyJSON');
  const btnCopyText = document.getElementById('btnCopyText');

  const jobs=TangentProcessing.jobs();let pendingFile=null,permission=false,ready=false,previewUrl=null;
  const buttons=[btnCopyJSON,btnCopyText];const controls=()=>buttons.forEach(b=>b.disabled=!ready);
  const resetBtn=document.createElement('button');resetBtn.textContent='Clear / Cancel';resetBtn.type='button';resetBtn.className='btn btn-secondary';dropZone.after(resetBtn);
  const review=document.createElement('p');review.id='receiptReview';review.setAttribute('role','status');outRawText.before(review);
  function clear(){ready=false;controls();outTotal.value='';outDate.value='';outRawText.value='';review.textContent='';if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=null;receiptPreview.removeAttribute('src');previewSection.style.display='none';}
  function reset(){jobs.cancel();pendingFile=null;clear();consentState.style.display='none';activeState.style.display='none';emptyState.style.display='flex';fileInput.value='';statusSection.style.display='none';}
  resetBtn.addEventListener('click',reset);btnConsentCancel.addEventListener('click',reset);
  async function handleFileSelect(file){const job=jobs.begin();clear();statusSection.style.display='none';progressBarFill.style.width='0%';pendingFile={file,job};emptyState.style.display='none';activeState.style.display='none';
    try{TangentProcessing.checkFile(file);if(!file.type.startsWith('image/')&&file.type!=='application/pdf'&&!/\.pdf$/i.test(file.name))throw Error('Choose an image or PDF receipt.');
      if(!permission){consentState.style.display='flex';return;}await processReceipt(file,job);
    }catch(error){if(job.current()){consentState.style.display='none';activeState.style.display='flex';statusSection.style.display='block';statusText.textContent=error.message;}}
  }
  btnConsentDownload.addEventListener('click',()=>{permission=true;const request=pendingFile;pendingFile=null;if(request?.job.current())processReceipt(request.file,request.job);});
  async function processReceipt(file,job){consentState.style.display='none';activeState.style.display='flex';statusSection.style.display='block';statusText.textContent='Preparing '+file.name+'...';progressBarContainer.style.display='block';statusPercent.textContent='';
    try{let canvas;if(file.type==='application/pdf'||/\.pdf$/i.test(file.name)){const pages=await TangentProcessing.rasterPdf(file,job,{maxPages:1,scale:2});canvas=pages[0];}
      else{const image=await TangentMedia.loadImage(file);job.check();canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;canvas.getContext('2d').drawImage(image,0,0);}
      job.check();const blob=await TangentMedia.encode(canvas,'image/png');job.check();previewUrl=URL.createObjectURL(blob);receiptPreview.src=previewUrl;previewSection.style.display='block';
      const data=await TangentProcessing.recognize([canvas],'eng',job,m=>{statusText.textContent=m.status==='recognizing text'?'Scanning receipt...':'Loading OCR engine...';progressBarFill.style.width=Math.round((m.progress||0)*100)+'%';});job.check();
      const parsed=TangentReceipt.parse(data[0].text||'');outTotal.value=parsed.total;outDate.value=parsed.date;outRawText.value=parsed.text;review.textContent=parsed.warning;ready=!!parsed.text.trim();controls();statusText.textContent=ready?'Extraction complete. Review the fields.':'No text was recognized. Try a clearer receipt image.';
    }catch(error){if(job.current()){clear();statusText.textContent=error.message||'Could not scan receipt.';}}
    finally{if(job.current()){progressBarContainer.style.display='none';statusPercent.textContent='';}}
  }
  dropZone.addEventListener('click',()=>fileInput.click());dropZone.addEventListener('dragover',e=>e.preventDefault());dropZone.addEventListener('drop',e=>{e.preventDefault();if(e.dataTransfer.files[0])handleFileSelect(e.dataTransfer.files[0]);});fileInput.addEventListener('change',()=>{if(fileInput.files[0])handleFileSelect(fileInput.files[0]);fileInput.value='';});
  async function copy(json){if(!ready)return;const text=outRawText.value;try{await navigator.clipboard.writeText(json?JSON.stringify({total:outTotal.value,date:outDate.value,text},null,2):text);review.textContent='Copied reviewed '+(json?'fields.':'text.');}catch(error){review.textContent='Could not copy. Select the text and copy manually.';}}
  btnCopyJSON.addEventListener('click',()=>copy(true));btnCopyText.addEventListener('click',()=>copy(false));controls();

});
