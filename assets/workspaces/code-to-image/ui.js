const example=codeEditor.value;codeEditor.setAttribute('aria-label','Code snippet');windowTitleDisplay.setAttribute('aria-label','Preview file title');windowTitleDisplay.setAttribute('role','textbox');
document.getElementById('resetExample').onclick=()=>{codeEditor.value=example;syncEditorDimensions();};
paletteBtns.forEach(b=>b.setAttribute('aria-label',b.title+' background'));
document.querySelector('[data-workspace-return]').onclick=e=>{e.preventDefault();const w=document.getElementById('workspace');w.scrollIntoView({behavior:'smooth'});w.focus({preventScroll:true});};
