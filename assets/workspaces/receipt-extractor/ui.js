document.addEventListener('DOMContentLoaded',()=>{
 const copyJSON=document.getElementById('btnCopyJSON'),preview=document.getElementById('previewSection'),drop=document.getElementById('dropZone'),file=document.getElementById('fileInput'),download=document.getElementById('download-json');let name='receipt';
 const sourcePanel=document.querySelector('.editor-panel'),reviewPanel=document.querySelector('.preview-panel');
 sourcePanel.querySelector('h3')?.remove();
 const sourceHeading=document.createElement('div');sourceHeading.className='receipt-pane-header';sourceHeading.textContent='Receipt preview';sourcePanel.prepend(sourceHeading);
 const reviewHeading=document.createElement('div');reviewHeading.className='receipt-pane-header';reviewHeading.innerHTML='<span>Review extracted details</span><small>Suggestions / verify against the receipt</small>';reviewPanel.prepend(reviewHeading);
 const reset=drop.nextElementSibling;reset.textContent='Clear / cancel';reset.className='';document.getElementById('file-actions').append(reset);
 document.getElementById('load-receipt').onclick=()=>file.click();file.addEventListener('change',()=>{if(file.files[0])name=file.files[0].name},true);drop.addEventListener('drop',e=>{if(e.dataTransfer.files[0])name=e.dataTransfer.files[0].name},true);
 const sync=()=>{download.disabled=copyJSON.disabled;const hasPreview=preview.style.display!=='none';drop.parentElement.hidden=hasPreview;document.getElementById('file-context').textContent=hasPreview?name:'No receipt loaded';};new MutationObserver(sync).observe(copyJSON,{attributes:true,attributeFilter:['disabled']});new MutationObserver(sync).observe(preview,{attributes:true,attributeFilter:['style']});sync();
 document.getElementById('receiptPreview').alt='Source receipt for comparison';document.getElementById('outRawText').setAttribute('aria-label','Reviewed receipt text');
 download.onclick=()=>{if(download.disabled)return;const data={total:document.getElementById('outTotal').value,date:document.getElementById('outDate').value,text:document.getElementById('outRawText').value};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name.replace(/\.[^.]+$/,'')+'-reviewed.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);};
 document.querySelector('[data-workspace-return]').onclick=e=>{e.preventDefault();const w=document.getElementById('workspace');w.focus({preventScroll:true});w.scrollIntoView({behavior:'smooth'})};
});
