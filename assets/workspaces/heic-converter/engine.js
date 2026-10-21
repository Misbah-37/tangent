
document.addEventListener('DOMContentLoaded',()=>{
  const dropZone=document.getElementById('dropZone'),fileInput=document.getElementById('fileInput'),grid=document.getElementById('outputGrid'),empty=document.getElementById('emptyState'),badge=document.getElementById('statusBadge'),quality=document.getElementById('qualitySlider'),zipButton=document.getElementById('btnDownloadZip'),controls=document.getElementById('batchControls');
  let operation=0,converted=[],urls=[],zipBusy=false,processing=false;
  function clear(){operation++;urls.forEach(url=>URL.revokeObjectURL(url));urls=[];converted=[];zipBusy=false;processing=false;grid.replaceChildren(empty);empty.style.display='flex';controls.style.display='inline-flex';badge.textContent='0 files';zipButton.textContent='Download All as ZIP';zipButton.disabled=true;fileInput.value='';}
  document.getElementById('btnClearHEIC').addEventListener('click',clear);
  quality.addEventListener('input',()=>document.getElementById('qualityVal').textContent=Number(quality.value).toFixed(1));
  ['dragenter','dragover','dragleave','drop'].forEach(name=>dropZone.addEventListener(name,event=>{event.preventDefault();event.stopPropagation();}));
  dropZone.addEventListener('click',()=>fileInput.click());
  dropZone.addEventListener('drop',event=>processFiles(Array.from(event.dataTransfer.files)));
  fileInput.addEventListener('change',event=>{const files=Array.from(event.target.files);if(files.length)processFiles(files);fileInput.value='';});
  async function processFiles(files){
    clear();const current=operation,setting=Number(quality.value),used=new Set();let failed=0;
    if(files.reduce((total,file)=>total+file.size,0)>100*1024*1024){badge.textContent='Choose a batch below 100 MB.';return;}
    processing=true;empty.style.display='none';zipButton.disabled=true;
    for(let index=0;index<files.length;index++){
      if(current!==operation)return;
      const file=files[index],card=document.createElement('div');card.style.cssText='border:1px solid var(--border-color);border-radius:8px;padding:12px;min-width:0;overflow-wrap:anywhere;';
      const label=document.createElement('div');label.textContent='Processing: '+file.name;card.append(label);grid.append(card);badge.textContent=`Processing ${index+1} / ${files.length}...`;
      try{
        if(!/\.hei[cf]$/i.test(file.name))throw new Error('Choose a .heic or .heif file.');
        if(file.size>50*1024*1024)throw new Error('This file exceeds the 50 MB input limit.');
        const result=await heic2any({blob:file,toType:'image/jpeg',quality:setting});if(current!==operation)return;
        const blob=Array.isArray(result)?result[0]:result;
        if(!(blob instanceof Blob)||!blob.size||blob.type!=='image/jpeg')throw new Error('The decoder did not return a JPEG.');
        await TangentMedia.loadImage(new File([blob],'converted.jpg',{type:blob.type}));if(current!==operation)return;
        const name=TangentMedia.uniqueName(used,file.name,'',blob.type),url=URL.createObjectURL(blob);urls.push(url);converted.push({name,blob});
        const image=document.createElement('img');image.src=url;image.alt='Converted photo';image.style.cssText='width:100%;aspect-ratio:1;object-fit:contain;';
        const link=document.createElement('a');link.href=url;link.download=name;link.textContent='Download '+name;link.style.display='block';link.title=name;
        card.replaceChildren(image,link);
      }catch(error){if(current!==operation)return;failed++;label.textContent=`${file.name}: ${error.message||String(error)}`;label.style.color='var(--danger, #ef4444)';}
    }
    if(current!==operation)return;processing=false;badge.textContent=`${converted.length} ready · ${failed} failed`;controls.style.display='inline-flex';zipButton.disabled=!converted.length;
  }
  zipButton.addEventListener('click',async()=>{
    if(zipBusy||processing||!converted.length)return;
    const current=operation,files=[...converted];zipBusy=true;zipButton.disabled=true;zipButton.textContent='Zipping...';
    try{const zip=new JSZip();files.forEach(file=>zip.file(file.name,file.blob));const blob=await zip.generateAsync({type:'blob'});if(current===operation)saveAs(blob,'tangent_converted_photos.zip');}
    catch(error){if(current===operation)badge.textContent='Could not create ZIP: '+error.message;}
    finally{if(current===operation){zipBusy=false;zipButton.disabled=false;zipButton.textContent='Download All as ZIP';}}
  });
});
