document.getElementById('loadImage').onclick=()=>fileInput.click();
dropZone.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fileInput.click();}});
const filename=document.getElementById('filename');
fileInput.addEventListener('change',()=>{filename.textContent=fileInput.files[0]?.name||'No image loaded';});
dropZone.addEventListener('drop',e=>{filename.textContent=e.dataTransfer.files[0]?.name||'No image loaded';});
btnReset.addEventListener('click',()=>{filename.textContent='No image loaded';document.getElementById('downloadCss').disabled=true;});
document.getElementById('downloadCss').onclick=()=>{if(!cssOutput.value)return;const url=URL.createObjectURL(new Blob([cssOutput.value+'\n'],{type:'text/css;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='tangent-palette.css';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);paletteStatus.textContent='CSS download requested.';};
document.querySelector('[data-workspace-return]').addEventListener('click',e=>{e.preventDefault();const w=document.getElementById('workspace');w.scrollIntoView({behavior:'smooth',block:'start'});w.focus({preventScroll:true});});
