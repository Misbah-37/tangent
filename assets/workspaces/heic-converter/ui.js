const input=document.getElementById('fileInput');document.getElementById('loadPhotos').onclick=()=>input.click();
document.getElementById('dropZone').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();input.click();}});
document.querySelector('[data-workspace-return]').onclick=e=>{e.preventDefault();const w=document.getElementById('workspace');w.scrollIntoView({behavior:'smooth'});w.focus({preventScroll:true});};
