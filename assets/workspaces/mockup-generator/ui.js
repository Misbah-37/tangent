const fileInput=document.getElementById('fileInput'),filename=document.getElementById('filename');
document.getElementById('loadImage').onclick=()=>fileInput.click();
document.getElementById('clearImage').onclick=()=>{++imageOperation;state.currentImage=null;mockupExportBusy=false;ctx.clearRect(0,0,canvas.width,canvas.height);setExportDisabled(true);fileInput.value='';filename.textContent='No image loaded';mockupStatus.textContent='Load an image or use the demo.';syncEmpty();};
document.getElementById('loadDemo').onclick=()=>{++imageOperation;createDefaultDemoImage();filename.textContent='Illustrative demo';mockupStatus.textContent='Illustrative demo. Replace it with your own image.';};
function syncEmpty(){canvas.hidden=!state.currentImage;document.getElementById('mockupEmpty').hidden=!!state.currentImage;}
new MutationObserver(syncEmpty).observe(document.getElementById('btnDownload'),{attributes:true,attributeFilter:['disabled']});syncEmpty();
fileInput.addEventListener('change',()=>{if(fileInput.files[0])filename.textContent=fileInput.files[0].name;});
window.addEventListener('drop',e=>{if(e.dataTransfer.files[0])filename.textContent=e.dataTransfer.files[0].name;});
window.addEventListener('paste',e=>{if([...e.clipboardData.items].some(i=>i.type.startsWith('image/')))filename.textContent='Pasted image';});
document.querySelector('[data-workspace-return]').onclick=e=>{e.preventDefault();const w=document.getElementById('workspace');w.scrollIntoView({behavior:'smooth'});w.focus({preventScroll:true});};
