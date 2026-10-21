(() => {
  const configs = {
    'tab-img2pdf': {input:'imgInput',label:'Images to PDF',load:'Load images',clear:clearImgQueue,files:()=>imgSelectedFiles,download:'downloadBtn1'},
    'tab-merge': {input:'mergeInput',label:'Merge PDFs',load:'Load PDFs',clear:clearMergeQueue,files:()=>mergeSelectedFiles,download:'downloadBtn2'},
    'tab-split': {input:'splitInput',label:'Extract pages',load:'Load PDF',clear:resetSplitFile,files:()=>splitSelectedFile?[splitSelectedFile]:[],download:'downloadBtn3'},
    'tab-compress': {input:'compressInput',label:'Optimize PDF',load:'Load PDF',clear:resetCompressFile,files:()=>compressSelectedFile?[compressSelectedFile]:[],download:'downloadBtn5'},
    'tab-extract': {input:'textInput',label:'Extract text',load:'Load PDF',clear:resetExtractFile,files:()=>extractSelectedFile?[extractSelectedFile]:[],download:'downloadBtn4'}
  };
  const tabs=[...document.querySelectorAll('.tabs-container .tab-btn')];
  const fitNote=document.createElement('p');fitNote.className='pdf-limits';fitNote.hidden=true;fitNote.textContent='Image-sized pages follow each image’s shape. Orientation and margins do not apply.';
  document.querySelector('#tab-img2pdf .options-row').after(fitNote);
  function syncImageOptions(){const fit=document.getElementById('pageSize').value==='fit';document.getElementById('orientation').disabled=fit;document.getElementById('margins').disabled=fit;fitNote.hidden=!fit;}
  document.getElementById('pageSize').addEventListener('change',syncImageOptions);syncImageOptions();
  const workspace=document.getElementById('workspace');
  const layout=document.createElement('div');layout.className='document-workbench';
  const taskRail=document.createElement('aside');taskRail.className='task-rail';
  const railLabel=document.createElement('span');railLabel.className='eyebrow';railLabel.textContent='YOUR TASK';taskRail.append(railLabel,document.querySelector('.tabs-wrapper'));
  layout.append(taskRail,document.querySelector('.tool-wrapper'));workspace.append(layout);
  const copy={
    'tab-img2pdf':['A document starts here.','Bring your images together, one page at a time.','JPG, PNG and WebP · Click to choose images'],
    'tab-merge':['Separate files. One story.','Arrange your PDFs in the order you want to read them.','Add two or more PDFs · First-page previews'],
    'tab-split':['Keep the pages that matter.','Choose a PDF, then tell us which pages to keep.','PDF source · First-page preview'],
    'tab-compress':['A lighter document, considered.','Rewrite PDF structure and compare the result with your original.','PDF source · Smaller output is not guaranteed'],
    'tab-extract':['Let the words come through.','Read embedded text from the pages of your document.','PDF source · Scanned pages need Document OCR']
  };
  document.querySelectorAll('.tab-content').forEach(panel=>{
    const original=panel.querySelector('.tool-container');
    const canvas=document.createElement('div');canvas.className='document-canvas';
    const canvasTop=document.createElement('div');canvasTop.className='canvas-top';canvasTop.innerHTML='<span>SOURCE DOCUMENTS</span><span class="canvas-count"></span>';canvas.append(canvasTop);
    const settings=document.createElement('aside');settings.className='document-settings';
    const settingsLabel=document.createElement('span');settingsLabel.className='eyebrow';settingsLabel.textContent='FINISHING DETAILS';settings.append(settingsLabel);
    const title=panel.querySelector('h3'),desc=panel.querySelector('.tool-desc');settings.append(title,desc);
    const box=panel.querySelector('.upload-box');
    const input=box.querySelector('input');
    box.replaceChildren();
    const illustration=document.createElement('div');illustration.className='empty-paper';illustration.setAttribute('aria-hidden','true');illustration.innerHTML='<i></i><i></i><i><b></b><b></b><b></b></i>';
    const heading=document.createElement('h4');heading.textContent=copy[panel.id][0];
    const description=document.createElement('p');description.textContent=copy[panel.id][1];
    const hint=document.createElement('span');hint.className='canvas-file-hint';hint.textContent=copy[panel.id][2];box.append(illustration,heading,description,hint,input);
    [...original.children].forEach(child=>{
      if(child===box||child.matches('.sortable-list,.queue-header,.active-file-card,#outputArea'))canvas.append(child);
      else settings.append(child);
    });
    const output=panel.querySelector('#outputArea');if(output)canvas.append(output);
    const note=document.createElement('p');note.className='canvas-footnote';note.textContent='Your source stays separate. Download a new result when you are ready.';canvas.append(note);
    original.append(canvas,settings);
  });
  const previews=new Map();let nextFileId=0;
  function thumbnail(file,holder){
    let entry=previews.get(file);
    if(!entry){entry={id:String(++nextFileId),url:null};previews.set(file,entry);}
    if(holder.dataset.previewFile===entry.id)return;
    holder.dataset.previewFile=entry.id;
    holder.querySelector('.file-thumbnail')?.remove();
    const frame=document.createElement('div');frame.className='file-thumbnail';frame.setAttribute('aria-hidden','true');frame.textContent=file.type.startsWith('image/')?'IMAGE':'PDF';holder.prepend(frame);
    if(file.type.startsWith('image/')){
      entry.url ||= URL.createObjectURL(file);const image=document.createElement('img');image.src=entry.url;image.alt='';frame.replaceChildren(image);
    }else if(file.name.toLowerCase().endsWith('.pdf')){
      const id=entry.id;
      (async()=>{let doc;try{
        doc=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
        const page=await doc.getPage(1),initial=page.getViewport({scale:1}),viewport=page.getViewport({scale:Math.min(140/initial.width,190/initial.height)});
        const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
        await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
        if(holder.isConnected&&holder.dataset.previewFile===id)frame.replaceChildren(canvas);
      }catch(_){frame.textContent='PDF';}finally{await doc?.destroy();}})();
    }
  }
  const load=document.getElementById('pdfLoadFiles'),clear=document.getElementById('pdfClear'),download=document.getElementById('pdfDownload');
  function current(){return configs[document.querySelector('.tab-content.active').id];}
  function sync(){
    const config=current(),files=config.files(),result=document.getElementById(config.download);
    document.getElementById('pdfContext').textContent=config.label+' · '+(files.length===1?files[0].name:files.length+' files loaded');
    load.textContent=config.load;clear.textContent=config.input==='imgInput'||config.input==='mergeInput'?'Clear queue':'Close file';clear.disabled=!files.length;
    download.disabled=!(result.getAttribute('href')&&getComputedStyle(result).display!=='none');
    document.querySelectorAll('.tab-content').forEach(panel=>{
      const ownFiles=configs[panel.id].files();panel.classList.toggle('has-files',ownFiles.length>0);
      const counter=panel.querySelector('.canvas-count'),count=ownFiles.length?ownFiles.length+' file'+(ownFiles.length===1?'':'s'):'Nothing added yet';if(counter.textContent!==count)counter.textContent=count;
      panel.querySelectorAll('.sortable-item').forEach((li,index)=>{if(ownFiles[index])thumbnail(ownFiles[index],li);});
      const card=panel.querySelector('.active-file-card');if(card&&ownFiles[0])thumbnail(ownFiles[0],card);
    });
    const retained=new Set(Object.values(configs).flatMap(c=>c.files()));
    for(const [file,entry] of previews)if(!retained.has(file)){if(entry.url)URL.revokeObjectURL(entry.url);previews.delete(file);}
    tabs.forEach(tab=>{const active=tab.classList.contains('active');tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
  }
  document.querySelector('.tabs-container').setAttribute('role','tablist');
  document.querySelector('.tabs-container').setAttribute('aria-label','PDF operations');document.querySelector('.tabs-container').setAttribute('aria-orientation','horizontal');
  tabs.forEach((tab,i)=>{
    const id=tab.getAttribute('onclick').match(/'([^']+)'/)[1];
    tab.id='choose-'+id;tab.setAttribute('role','tab');tab.setAttribute('aria-controls',id);
    const panel=document.getElementById(id);panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',tab.id);
    tab.addEventListener('click',sync);
    tab.addEventListener('keydown',event=>{
      let next;if(event.key==='ArrowRight'||event.key==='ArrowDown')next=(i+1)%tabs.length;else if(event.key==='ArrowLeft'||event.key==='ArrowUp')next=(i+tabs.length-1)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;
      event.preventDefault();tabs[next].click();tabs[next].focus();
    });
  });
  load.addEventListener('click',()=>document.getElementById(current().input).click());
  clear.addEventListener('click',()=>{current().clear();sync();});
  download.addEventListener('click',()=>{if(!download.disabled)document.getElementById(current().download).click();});
  document.querySelectorAll('.upload-box').forEach(box=>{
    box.tabIndex=0;box.setAttribute('role','button');box.setAttribute('aria-label','Choose files for '+box.closest('.tab-content').querySelector('h3').textContent.trim());
    box.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();box.click();}});
  });
  document.querySelector('[data-workspace-return]').addEventListener('click',e=>{e.preventDefault();const workspace=document.getElementById('workspace');workspace.scrollIntoView({block:'start'});workspace.focus({preventScroll:true});});
  let scheduled=false;
  new MutationObserver(()=>{if(!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;sync();});}}).observe(document.getElementById('workspace'),{subtree:true,childList:true,attributes:true,attributeFilter:['style','href']});
  document.querySelectorAll('.status-text').forEach(el=>{el.setAttribute('role','status');el.setAttribute('aria-live','polite');});
  sync();
})();
