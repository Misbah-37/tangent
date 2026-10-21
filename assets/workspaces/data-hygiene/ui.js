(() => {
  document.querySelector('[data-workspace-return]')?.addEventListener('click',event=>{event.preventDefault();const main=document.getElementById('main');main.scrollIntoView({block:'start'});main.setAttribute('tabindex','-1');main.focus({preventScroll:true});});
  const actions=document.querySelector('.file-context');
  for(const id of ['wfExpand','btnClear','btnExport']){
    const button=document.getElementById(id);
    if(button)actions.append(button);
  }
  document.getElementById('loadFile').addEventListener('click',()=>document.getElementById('fileInput').click());
  document.getElementById('missing-custom').addEventListener('input',()=>window.HygieneReview?.settingsChanged());
  const dashboard=document.getElementById('dashboardArea');
  const sync=()=>{
    const loaded=dashboard.style.display!=='none';
    document.getElementById('workspaceFileName').textContent=loaded?originalFileName:'No file loaded';
    document.body.classList.toggle('has-dataset',loaded);
  };
  new MutationObserver(sync).observe(dashboard,{attributes:true,attributeFilter:['style']});
  sync();
  document.querySelectorAll('.accordion-header').forEach((header,i)=>{
    const content=header.nextElementSibling;
    const button=document.createElement('button');
    button.type='button';button.className=header.className;button.innerHTML=header.innerHTML;
    content.id=`recipe-section-${i}`;
    button.setAttribute('aria-controls',content.id);
    button.setAttribute('aria-expanded',String(content.classList.contains('active')));
    button.addEventListener('click',()=>{
      toggleAccordion(button);
      button.setAttribute('aria-expanded',String(content.classList.contains('active')));
    });
    header.replaceWith(button);
  });
  document.querySelector('.wf-recipe-panel .panel-header').textContent='Cleaning recipe';
  document.querySelector('.wf-preview-panel .panel-header').textContent='Dataset preview';
})();
