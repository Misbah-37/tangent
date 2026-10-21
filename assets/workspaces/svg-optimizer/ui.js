document.getElementById('loadSvg').onclick=()=>fileInput.click();
dropZone.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fileInput.click();}});
document.querySelector('[data-workspace-return]').onclick=e=>{e.preventDefault();const w=document.getElementById('workspace');w.scrollIntoView({behavior:'smooth'});w.focus({preventScroll:true});};
