
  const snippetCard = document.getElementById('snippetCard');
  const windowContainer = document.getElementById('windowContainer');
  const windowHeader = document.getElementById('windowHeader');
  const windowControls = document.getElementById('windowControls');
  const windowTitleDisplay = document.getElementById('windowTitleDisplay');
  const fileNameInput = document.getElementById('fileNameInput');
  const chromeSelect = document.getElementById('chromeSelect');
  const widthSelect = document.getElementById('widthSelect');
  const paddingSlider = document.getElementById('paddingSlider');
  const paddingVal = document.getElementById('paddingVal');
  const fontSizeSlider = document.getElementById('fontSizeSlider');
  const fontSizeVal = document.getElementById('fontSizeVal');
  const lineNumbersToggle = document.getElementById('lineNumbersToggle');
  const lineNumbers = document.getElementById('lineNumbers');
  const codeEditor = document.getElementById('codeEditor');
  const downloadPngBtn = document.getElementById('downloadPngBtn');
  const copyPngBtn = document.getElementById('copyPngBtn');
  const copyBtnText = document.getElementById('copyBtnText');
  const renderCanvas = document.getElementById('renderCanvas');
  const paletteBtns = document.querySelectorAll('.palette-btn');

  let activeGradient = "linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)";

  // Palette Selector
  paletteBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      paletteBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeGradient = btn.dataset.gradient;
      if (activeGradient === 'transparent') {
        snippetCard.style.background = 'repeating-conic-gradient(#1a202c 0% 25%, #111827 0% 50%) 50% / 16px 16px';
      } else {
        snippetCard.style.background = activeGradient;
      }
    });
  });

  // Padding
  paddingSlider.addEventListener('input', (e) => {
    const val = e.target.value + 'px';
    paddingVal.textContent = val;
    snippetCard.style.padding = val;
  });

  // Width selector
  widthSelect.addEventListener('change', (e) => {
    const mode = e.target.value;
    if (mode === 'auto') {
      windowContainer.style.width = 'auto';
      windowContainer.style.minWidth = '520px';
    } else {
      windowContainer.style.width = mode;
      windowContainer.style.minWidth = mode;
    }
    syncEditorDimensions();
  });

  // Font Size
  fontSizeSlider.addEventListener('input', (e) => {
    const val = e.target.value + 'px';
    fontSizeVal.textContent = val;
    codeEditor.style.fontSize = val;
    lineNumbers.style.fontSize = val;
    syncEditorDimensions();
  });

  // Filename Sync
  fileNameInput.addEventListener('input', (e) => {
    windowTitleDisplay.textContent = e.target.value || 'untitled';
  });
  windowTitleDisplay.addEventListener('input', (e) => {
    fileNameInput.value = windowTitleDisplay.textContent;
  });

  // Window Chrome Selector
  chromeSelect.addEventListener('change', (e) => {
    const mode = e.target.value;
    if (mode === 'none') {
      windowHeader.style.display = 'none';
    } else {
      windowHeader.style.display = 'flex';
      if (mode === 'mac') {
        windowControls.innerHTML = '<span class="dot dot-red"></span><span class="dot dot-yellow"></span><span class="dot dot-green"></span>';
      } else if (mode === 'windows') {
        windowControls.innerHTML = '<span style="color: var(--text-muted); font-size:11px; font-family:monospace;">&#x2014; &#x25A1; &#x2715;</span>';
      } else if (mode === 'minimal') {
        windowControls.innerHTML = '';
      }
    }
  });

  // Auto-resize editor and line numbers with zero scrollbars
  function syncEditorDimensions() {
    const lines = codeEditor.value.split('\n');
    let numbersHtml = '';
    for (let i = 1; i <= lines.length; i++) {
      numbersHtml += i + '<br>';
    }
    lineNumbers.innerHTML = numbersHtml;

    // Reset height then set to scrollHeight to fit all content cleanly
    codeEditor.style.height = 'auto';
    codeEditor.style.height = (codeEditor.scrollHeight) + 'px';
  }

  codeEditor.addEventListener('input', syncEditorDimensions);

  // Line Numbers Toggle
  lineNumbersToggle.addEventListener('change', (e) => {
    lineNumbers.style.display = e.target.checked ? 'block' : 'none';
  });

  // Tab key handler in textarea
  codeEditor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = codeEditor.selectionStart;
      const end = codeEditor.selectionEnd;
      codeEditor.value = codeEditor.value.substring(0, start) + '    ' + codeEditor.value.substring(end);
      codeEditor.selectionStart = codeEditor.selectionEnd = start + 4;
      syncEditorDimensions();
    }
  });

  // Render native Canvas primitives, without SVG foreignObject or markup interpolation.
  function generateCanvasBlob() {
    const text=codeEditor.value,title=windowTitleDisplay.textContent,mode=chromeSelect.value;
    const fontSize=Number(fontSizeSlider.value),lineHeight=fontSize*1.65,padding=Number(paddingSlider.value),numbers=lineNumbersToggle.checked;
    const editorStyle=getComputedStyle(codeEditor),headerStyle=getComputedStyle(windowHeader),titleStyle=getComputedStyle(windowTitleDisplay);
    const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
    ctx.font=`${fontSize}px ${editorStyle.fontFamily}`;
    const lines=text.replace(/\r\n?/g,'\n').split('\n').map(line=>{let column=0;return [...line].map(character=>{if(character==='\t'){const count=4-column%4;column+=count;return ' '.repeat(count);}column++;return character;}).join('');});
    const gutter=numbers?ctx.measureText(String(lines.length)).width+33:0;
    let windowWidth=Math.max(windowContainer.getBoundingClientRect().width,48+gutter+Math.max(0,...lines.map(line=>ctx.measureText(line).width)));
    ctx.font=`13px ${titleStyle.fontFamily}`;
    if(mode!=='none')windowWidth=Math.max(windowWidth,ctx.measureText(title).width+200);
    const headerHeight=mode==='none'?0:Math.max(42,windowHeader.getBoundingClientRect().height);
    const windowHeight=headerHeight+44+lines.length*lineHeight,width=Math.ceil(windowWidth+padding*2),height=Math.ceil(windowHeight+padding*2);
    TangentMedia.checkSize(width*2,height*2);canvas.width=width*2;canvas.height=height*2;ctx.scale(2,2);ctx.beginPath();ctx.roundRect(0,0,width,height,16);ctx.clip();
    if(activeGradient!=='transparent'){
      if(activeGradient.startsWith('linear-gradient')){const delta=(width+height)/4,gradient=ctx.createLinearGradient(width/2-delta,height/2-delta,width/2+delta,height/2+delta);const colors=activeGradient.match(/#[0-9a-f]{6}/gi);colors.forEach((color,index)=>gradient.addColorStop(index/(colors.length-1),color));ctx.fillStyle=gradient;}
      else ctx.fillStyle=activeGradient;
      ctx.fillRect(0,0,width,height);
    }
    ctx.save();ctx.shadowColor='rgba(0,0,0,0.55)';ctx.shadowBlur=34;ctx.shadowOffsetY=10;ctx.fillStyle='#1e1e1e';ctx.beginPath();ctx.roundRect(padding,padding,windowWidth,windowHeight,10);ctx.fill();ctx.restore();
    ctx.save();ctx.beginPath();ctx.roundRect(padding,padding,windowWidth,windowHeight,10);ctx.clip();
    if(headerHeight){
      ctx.fillStyle=headerStyle.backgroundColor;ctx.fillRect(padding,padding,windowWidth,headerHeight);
      if(mode==='mac'){['#ff5f56','#ffbd2e','#27c93f'].forEach((color,index)=>{ctx.fillStyle=color;ctx.beginPath();ctx.arc(padding+24+index*20,padding+headerHeight/2,6,0,Math.PI*2);ctx.fill();});}
      else if(mode==='windows'){ctx.fillStyle=getComputedStyle(windowControls).color;ctx.font='13px monospace';ctx.textBaseline='middle';ctx.fillText('\u2014 \u25a1 \u00d7',padding+18,padding+headerHeight/2);}
      ctx.fillStyle=titleStyle.color;ctx.font=`500 13px ${titleStyle.fontFamily}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(title,padding+windowWidth/2,padding+headerHeight/2);
      ctx.strokeStyle='rgba(255,255,255,0.06)';ctx.beginPath();ctx.moveTo(padding,padding+headerHeight);ctx.lineTo(padding+windowWidth,padding+headerHeight);ctx.stroke();
    }
    ctx.font=`${fontSize}px ${editorStyle.fontFamily}`;ctx.textBaseline='top';
    lines.forEach((line,index)=>{const y=padding+headerHeight+22+index*lineHeight;
      if(numbers){ctx.fillStyle='#52525b';ctx.textAlign='right';ctx.fillText(String(index+1),padding+24+gutter-33,y);}
      ctx.fillStyle=editorStyle.color;ctx.textAlign='left';ctx.fillText(line,padding+24+gutter,y);
    });
    if(numbers){ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.beginPath();ctx.moveTo(padding+24+gutter-14,padding+headerHeight+22);ctx.lineTo(padding+24+gutter-14,padding+windowHeight-22);ctx.stroke();}
    ctx.restore();return TangentMedia.encode(canvas,'image/png');
  }
  let exportBusy=false;
  async function exportCode(copy){
    if(exportBusy)return;
    const status=document.getElementById('codeExportStatus'),name=fileNameInput.value||'code-snippet';
    exportBusy=true;downloadPngBtn.disabled=true;copyPngBtn.disabled=true;status.textContent='Rendering PNG...';
    try{
      const blob=await generateCanvasBlob();
      if(copy){if(!navigator.clipboard?.write||typeof ClipboardItem==='undefined')throw new Error('Clipboard image copying is unavailable. Use Download PNG.');await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);status.textContent='Image copied to clipboard.';}
      else{const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name.replace(/\.png$/i,'')+'.png';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);status.textContent='PNG download requested.';}
    }catch(error){status.textContent='Could not export image: '+error.message;}
    finally{exportBusy=false;downloadPngBtn.disabled=false;copyPngBtn.disabled=false;}
  }
  downloadPngBtn.addEventListener('click',()=>exportCode(false));copyPngBtn.addEventListener('click',()=>exportCode(true));
  syncEditorDimensions();window.addEventListener('load',syncEditorDimensions);
