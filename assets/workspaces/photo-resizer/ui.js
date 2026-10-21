document.getElementById('load-photo').onclick=()=>document.getElementById('imageInput').click();
const download=document.getElementById('downloadBtn');document.getElementById('export-action').append(download);download.style.display='none';
const card=document.getElementById('activeFileCard');const syncPhoto=()=>{document.getElementById('photo-context').textContent=card.style.display==='flex'?document.getElementById('activeFileName').textContent:'No photo loaded';document.getElementById('clear-photo').disabled=card.style.display!=='flex';};new MutationObserver(syncPhoto).observe(card,{attributes:true,attributeFilter:['style']});syncPhoto();
document.querySelector('[data-workspace-return]').onclick=e=>{e.preventDefault();const w=document.getElementById('workspace');w.focus({preventScroll:true});w.scrollIntoView({behavior:'smooth'})};
document.querySelectorAll('.input-group').forEach(g=>{const l=g.querySelector('label'),c=g.querySelector('input,select');if(l&&c)l.htmlFor=c.id;});document.getElementById('status').setAttribute('role','status');
['minKbInput','maxKbInput'].forEach(id=>document.getElementById(id).addEventListener('input',invalidateResizerOutput));
