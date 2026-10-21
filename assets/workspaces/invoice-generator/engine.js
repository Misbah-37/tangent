
  const escapeHtml=TangentStudio.escape;let draftHandle=null;
  let items = [
    { desc: "Distributed Infrastructure Architecture & Cloud Migration", qty: 40, rate: 125 },
    { desc: "Kubernetes Cluster Hardening & CI/CD Pipeline Automation", qty: 25, rate: 110 },
    { desc: "High-Throughput Telemetry API Integration", qty: 15, rate: 95 }
  ];

  let logoBase64 = null;
  let activeInvColor = '#0284c7';

  // Form Elements
  const docTypeSelect = document.getElementById('docTypeSelect');
  const currencySelect = document.getElementById('currencySelect');
  const docNumber = document.getElementById('docNumber');
  const docStatus = document.getElementById('docStatus');
  const docDate = document.getElementById('docDate');
  const docDueDate = document.getElementById('docDueDate');
  const senderName = document.getElementById('senderName');
  const senderDetails = document.getElementById('senderDetails');
  const clientName = document.getElementById('clientName');
  const clientDetails = document.getElementById('clientDetails');
  const taxRate = document.getElementById('taxRate');
  const discountRate = document.getElementById('discountRate');
  const paymentNotes = document.getElementById('paymentNotes');
  const termsNotes = document.getElementById('termsNotes');

  const itemsListContainer = document.getElementById('itemsListContainer');
  const btnAddItem = document.getElementById('btnAddItem');

    const logoFileInput = document.getElementById('logoFileInput');
    const btnUploadLogo = document.getElementById('btnUploadLogo');
    const btnRemoveLogo = document.getElementById('btnRemoveLogo');
    const logoControls = document.getElementById('logoControls');
    const logoSize = document.getElementById('logoSize');
    const logoSizeVal = document.getElementById('logoSizeVal');
    const logoOpacity = document.getElementById('logoOpacity');
    const logoOpacityVal = document.getElementById('logoOpacityVal');

  const btnResetSample = document.getElementById('btnResetSample');
  const btnClearAll = document.getElementById('btnClearAll');
  const btnPrintInvoice = document.getElementById('btnPrintInvoice');
  const invoicePaper = document.getElementById('invoicePaper');

  // Paper Elements
  const paperLogo = document.getElementById('paperLogo');
  const paperSenderName = document.getElementById('paperSenderName');
  const paperSenderDetails = document.getElementById('paperSenderDetails');
  const paperDocType = document.getElementById('paperDocType');
  const paperDocNumber = document.getElementById('paperDocNumber');
  const paperDocDate = document.getElementById('paperDocDate');
  const paperDocDueDate = document.getElementById('paperDocDueDate');
  const paperDocStatus = document.getElementById('paperDocStatus');
  const paperClientName = document.getElementById('paperClientName');
  const paperClientDetails = document.getElementById('paperClientDetails');
  const paperItemsBody = document.getElementById('paperItemsBody');
  const paperPaymentNotes = document.getElementById('paperPaymentNotes');
  const paperTermsNotes = document.getElementById('paperTermsNotes');
  const paperSubtotal = document.getElementById('paperSubtotal');
  const paperDiscountRow = document.getElementById('paperDiscountRow');
  const paperDiscount = document.getElementById('paperDiscount');
  const paperTaxLabel = document.getElementById('paperTaxLabel');
  const paperTax = document.getElementById('paperTax');
  const paperGrandTotal = document.getElementById('paperGrandTotal');
  const paidAmount=document.getElementById("paidAmount"),paymentLink=document.getElementById("paymentLink");
  const invoiceFields=[paidAmount,paymentLink,docTypeSelect,currencySelect,docNumber,docStatus,docDate,docDueDate,senderName,senderDetails,clientName,clientDetails,taxRate,discountRate,paymentNotes,termsNotes];
  const invoiceStatus=TangentStudio.status(btnPrintInvoice,'invoiceStatus');
  const snapshotInvoice=()=>({fields:TangentStudio.fields(invoiceFields),items:items.map(i=>({...i})),logo:logoBase64,color:activeInvColor,logoSettings:{left:parseFloat(paperLogo.style.left)||40,top:parseFloat(paperLogo.style.top)||40,size:Number(logoSize.value),opacity:Number(logoOpacity.value)}});
  function restoreInvoice(data){if(!data||!Array.isArray(data.items)||data.items.length>200||data.items.some(i=>typeof i.desc!=='string'||i.desc.length>100000||!['string','number'].includes(typeof i.qty)||!['string','number'].includes(typeof i.rate)))throw Error('Invalid draft');TangentStudio.restoreFields(invoiceFields,{paidAmount:"0",paymentLink:"",...data.fields});items=data.items.map(i=>({...i}));if(/^#[0-9a-f]{6}$/i.test(data.color))activeInvColor=data.color;invoicePaper.style.setProperty('--inv-accent',activeInvColor);logoBase64=typeof data.logo==='string'&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+\/]*={0,2}$/.test(data.logo)?data.logo:null;paperLogo.src=logoBase64||'';paperLogo.style.display=logoBase64?'block':'none';paperLogo.style.position='absolute';paperLogo.style.left='40px';paperLogo.style.top='40px';paperLogo.style.maxHeight='60px';paperLogo.style.maxWidth='180px';btnRemoveLogo.style.display=logoBase64?'inline-flex':'none';if(logoControls)logoControls.style.display=logoBase64?'flex':'none';const settings=data.logoSettings||{};const bounded=(v,min,max,fallback)=>Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;const size=bounded(settings.size,20,250,100),opacity=bounded(settings.opacity,10,100,100);logoSize.value=size;logoOpacity.value=opacity;logoSizeVal.textContent=size+'%';logoOpacityVal.textContent=opacity+'%';Object.assign(paperLogo.style,{left:bounded(settings.left,0,600,40)+'px',top:bounded(settings.top,0,1000,40)+'px',maxHeight:(60*size/100)+'px',maxWidth:(180*size/100)+'px',opacity:String(opacity/100)});}
  const sampleInvoice=snapshotInvoice();


  // Theme Swatches
  document.querySelectorAll('[data-inv-color]').forEach(dot => {
    dot.addEventListener('click', () => {
      document.querySelectorAll('[data-inv-color]').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      activeInvColor = dot.dataset.invColor;
      invoicePaper.style.setProperty('--inv-accent', activeInvColor);draftHandle?.changed();
    });
  });

  // Logo Upload
  btnUploadLogo.addEventListener('click', () => logoFileInput.click());
  const logoLoader=TangentStudio.imageLoader(()=>{logoBase64=null;paperLogo.removeAttribute('src');paperLogo.style.display='none';invoiceStatus.textContent='Reading logo...';draftHandle?.changed();},data=>{logoBase64=data;paperLogo.src=data;Object.assign(paperLogo.style,{display:'block',position:'absolute',left:'40px',top:'40px',maxHeight:'60px',maxWidth:'180px',opacity:'1'});btnRemoveLogo.style.display='inline-flex';if(logoControls)logoControls.style.display='flex';invoiceStatus.textContent='Logo loaded.';draftHandle?.changed();},message=>{invoiceStatus.textContent=message;btnRemoveLogo.style.display='none';if(logoControls)logoControls.style.display='none';});
  logoFileInput.addEventListener('change',()=>{if(logoFileInput.files[0])logoLoader.load(logoFileInput.files[0]);logoFileInput.value='';});

  btnRemoveLogo.addEventListener('click', () => {
    logoLoader.cancel();draftHandle?.changed();
    logoBase64 = null;
    paperLogo.src = '';
    paperLogo.style.display = 'none';
    btnRemoveLogo.style.display = 'none';
    if (logoControls) logoControls.style.display = 'none';
    logoFileInput.value = '';
  });

  if (logoSize) {
    logoSize.addEventListener('input', (e) => {
      const val = e.target.value;
      logoSizeVal.textContent = val + '%';
      paperLogo.style.maxHeight = (60 * (val / 100)) + 'px';
      paperLogo.style.maxWidth = (180 * (val / 100)) + 'px';draftHandle?.changed();
    });
  }

  if (logoOpacity) {
    logoOpacity.addEventListener('input', (e) => {
      const val = e.target.value;
      logoOpacityVal.textContent = val + '%';
      paperLogo.style.opacity = (val / 100);draftHandle?.changed();
    });
  }


  // --- LOGO DRAG LOGIC ---
  let isDraggingLogo = false;
  let logoStartX, logoStartY, initialLogoLeft, initialLogoTop;

  paperLogo.addEventListener('mousedown', (e) => {
    isDraggingLogo = true;
    paperLogo.style.cursor = 'grabbing';

    const rect = document.getElementById('invoicePaper').getBoundingClientRect();
    const scale = rect.width / 794;

    logoStartX = e.clientX;
    logoStartY = e.clientY;
    initialLogoLeft = parseFloat(paperLogo.style.left) || 40;
    initialLogoTop = parseFloat(paperLogo.style.top) || 40;

    e.stopPropagation();
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDraggingLogo) return;

    const rect = document.getElementById('invoicePaper').getBoundingClientRect();
    const scale = rect.width / 794;

    const dx = (e.clientX - logoStartX) / scale;
    const dy = (e.clientY - logoStartY) / scale;

    paperLogo.style.left = Math.max(0,Math.min(invoicePaper.clientWidth-paperLogo.offsetWidth,initialLogoLeft+dx))+'px';
    paperLogo.style.top = Math.max(0,Math.min(invoicePaper.clientHeight-paperLogo.offsetHeight,initialLogoTop+dy))+'px';
  });

  window.addEventListener('mouseup', () => {
    if (isDraggingLogo) {
      isDraggingLogo = false;
      paperLogo.style.cursor = 'grab';draftHandle?.changed();
    }
  });
  // --- END LOGO DRAG LOGIC ---

  // Line Items Input Rendering
  function renderItemsInputs() {
    itemsListContainer.innerHTML = '';
    items.forEach((item, idx) => {
      const div = document.createElement('div');
      div.className = 'line-item-row';
      div.innerHTML = `
        <div class="line-item-top">
          <input type="text" class="text-input item-desc" placeholder="Service or product description..." value="${escapeHtml(item.desc)}">
          <button type="button" class="btn-remove-item" title="Remove item" aria-label="Remove item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div class="line-item-bottom">
          <div>
            <label class="input-label">Qty / Hrs</label>
            <input type="number" class="text-input item-qty" value="${escapeHtml(item.qty)}" min="0" step="any">
          </div>
          <div>
            <label class="input-label">Unit Rate</label>
            <input type="number" class="text-input item-rate" value="${escapeHtml(item.rate)}" min="0" step="any">
          </div>
          <div>
            <label class="input-label">Total</label>
            <div class="item-amount" style="font-size: 13px; font-weight: 700; color: var(--text-main); padding: 8px 4px;">--</div>
          </div>
        </div>
      `;

      div.querySelector('.btn-remove-item').addEventListener('click', () => {
        items.splice(idx, 1);
        renderItemsInputs();
        updatePaper();
      });

      div.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', () => {
          item.desc = div.querySelector('.item-desc').value;
          item.qty = div.querySelector('.item-qty').value;
          item.rate = div.querySelector('.item-rate').value;

          updatePaper();
        });
      });

      itemsListContainer.appendChild(div);
    });
  }

  btnAddItem.addEventListener('click', () => {
    if(items.length>=200){invoiceStatus.textContent='Use at most 200 line items.';return;}
    items.push({ desc: "Consulting / Engineering Service", qty: 1, rate: 100 });
    renderItemsInputs();
    updatePaper();
  });

  // Paper Update Logic
  function updatePaper() {
    const cur = currencySelect.value;
    paperDocType.textContent = docTypeSelect.value;
    paperDocNumber.textContent = docNumber.value || '—';
    paperDocDate.textContent = docDate.value || '—';
    paperDocDueDate.textContent = docDueDate.value || '—';
    paperDocStatus.textContent = docStatus.value || '—';
    paperSenderName.textContent = senderName.value || 'Your Business Name';
    paperSenderDetails.textContent = senderDetails.value;
    paperClientName.textContent = clientName.value || 'Client Name';
    paperClientDetails.textContent = clientDetails.value;
    paperPaymentNotes.textContent = paymentNotes.value;
    paperTermsNotes.textContent = termsNotes.value;

    let totals=null;
    try{totals=TangentInvoice.calculate(items,discountRate.value,taxRate.value,cur);invoiceStatus.textContent='Unit rates and line amounts are rounded half up to the currency precision. Discount applies before tax.';btnPrintInvoice.disabled=false;}
    catch(error){invoiceStatus.textContent=error.message;btnPrintInvoice.disabled=true;}
    const format=value=>TangentInvoice.format(value,totals.digits,cur);
    paperItemsBody.innerHTML=items.map((item,i)=>`<tr><td><strong>${escapeHtml(item.desc)}</strong></td><td class="num-col">${escapeHtml(item.qty)}</td><td class="num-col">${totals?format(totals.lines[i].unit):'--'}</td><td class="num-col">${totals?format(totals.lines[i].amount):'--'}</td></tr>`).join('')||'<tr><td colspan="4">No items added yet.</td></tr>';
    itemsListContainer.querySelectorAll('.item-amount').forEach((element,i)=>element.textContent=totals?format(totals.lines[i].amount):'--');
    paperSubtotal.textContent=totals?format(totals.subtotal):'--';paperDiscountRow.style.display=totals&&totals.discountAmount>0n?'table-row':'none';paperDiscount.textContent=totals?'-'+format(totals.discountAmount):'--';paperTaxLabel.textContent=`Tax (${taxRate.value}%):`;paperTax.textContent=totals?format(totals.taxAmount):'--';paperGrandTotal.textContent=totals?format(totals.total):'--';
    updateBalance(totals,cur);draftHandle?.changed();

  }

  // Event Listeners for Live Update
  [paidAmount,paymentLink,docTypeSelect, currencySelect, docNumber, docStatus, docDate, docDueDate, senderName, senderDetails, clientName, clientDetails, taxRate, discountRate, paymentNotes, termsNotes].forEach(el => {
    el.addEventListener('input', updatePaper);
    el.addEventListener('change', updatePaper);
  });

  btnPrintInvoice.addEventListener('click', () => {
    updatePaper();if(btnPrintInvoice.disabled)return;window.print();

  });

  let undoState=null;
  function replaceCurrent(next,message){if(!confirm(message+' This replaces the current document.'))return false;undoState=JSON.parse(JSON.stringify(snapshotInvoice()));logoLoader.cancel();restoreInvoice(next);renderItemsInputs();updatePaper();draftHandle?.save();document.getElementById('undoInvoice').hidden=false;return true;}
  btnResetSample.addEventListener('click',()=>replaceCurrent(sampleInvoice,'Replace with synthetic sample?'));
  btnClearAll.addEventListener('click',()=>{const blank=JSON.parse(JSON.stringify(sampleInvoice));for(const k of Object.keys(blank.fields))blank.fields[k]='';Object.assign(blank.fields,{docTypeSelect:'INVOICE',currencySelect:'$',taxRate:'0',discountRate:'0',paidAmount:'0'});blank.items=[];blank.logo=null;replaceCurrent(blank,'Clear this document?');});
  document.getElementById('undoInvoice').addEventListener('click',()=>{if(!undoState)return;logoLoader.cancel();restoreInvoice(undoState);undoState=null;renderItemsInputs();updatePaper();draftHandle?.save();document.getElementById('undoInvoice').hidden=true;});
  function updateBalance(totals,cur){const amount=document.getElementById('paperPaid'),balance=document.getElementById('paperBalance'),link=document.getElementById('paperPaymentLink');try{if(!totals)throw Error();const paid=TangentInvoice.calculate([{qty:'1',rate:paidAmount.value}],0,0,cur).total;amount.textContent=TangentInvoice.format(paid,totals.digits,cur);const delta=totals.total-paid;balance.textContent=TangentInvoice.format(delta<0n?-delta:delta,totals.digits,cur);document.getElementById('balanceLabel').textContent=delta<0n?'Credit / overpayment:':'Balance due:';}catch(e){amount.textContent='--';balance.textContent='--';btnPrintInvoice.disabled=true;if(totals)invoiceStatus.textContent='Enter a valid nonnegative payment amount (up to 6 decimal places).';}link.replaceChildren();if(paymentLink.value.trim()){try{const url=new URL(paymentLink.value.trim());if(!['https:','http:'].includes(url.protocol))throw Error();const a=document.createElement('a');a.href=url.href;a.textContent='Pay online: '+url.href;a.target='_blank';a.rel='noopener noreferrer';link.append(a);}catch(e){link.textContent='Payment link is invalid. Use a full https:// or http:// URL.';btnPrintInvoice.disabled=true;}}}
  draftHandle=TangentStudio.draft('tangent_invoice_draft_v1',btnClearAll,snapshotInvoice,restoreInvoice);
  // Initial Run
  renderItemsInputs();
  updatePaper();


    // --- ZOOM & PAN LOGIC ---
    let currentZoom = 'fit';
    let isFullscreen = false;
    let wrapperInjected = false;

    function initZoomPan() {
      const stage = document.querySelector('.paper-container');
      const sheet = document.getElementById('invoicePaper');
      if (!stage || !sheet || wrapperInjected) return;

      const wrapper = document.createElement('div');
      wrapper.className = 'sheet-transform-wrapper';
      wrapper.id = 'sheetWrapper';
      sheet.parentNode.insertBefore(wrapper, sheet);
      wrapper.appendChild(sheet);

      const toolbar = document.createElement('div');
      toolbar.className = 'zoom-toolbar';
      toolbar.id = 'zoomToolbar';
      toolbar.innerHTML = `
        <button type="button" class="zoom-btn" onclick="zoomOut()" title="Zoom Out"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line></svg></button>
        <div class="zoom-label" id="zoomLabel" onclick="resetZoom()" title="Reset to Fit">Fit</div>
        <button type="button" class="zoom-btn" onclick="zoomIn()" title="Zoom In"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></button>
        <div class="zoom-divider"></div>
        <button type="button" class="zoom-btn" onclick="toggleFullscreen()" title="Fullscreen"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg></button>
      `;
      stage.prepend(toolbar);

      let isDragging = false, startX, startY, scrollLeft, scrollTop;
      stage.addEventListener('mousedown', (e) => {
        if (e.target.closest('.zoom-toolbar')) return;
        isDragging = true;
        stage.classList.add('is-dragging');
        startX = e.pageX - stage.offsetLeft;
        startY = e.pageY - stage.offsetTop;
        scrollLeft = stage.scrollLeft;
        scrollTop = stage.scrollTop;
      });
      stage.addEventListener('mouseleave', () => { isDragging = false; stage.classList.remove('is-dragging'); });
      stage.addEventListener('mouseup', () => { isDragging = false; stage.classList.remove('is-dragging'); });
      stage.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - stage.offsetLeft;
        const y = e.pageY - stage.offsetTop;
        stage.scrollLeft = scrollLeft - (x - startX);
        stage.scrollTop = scrollTop - (y - startY);
      });

      wrapperInjected = true;
    }

    function fitInvoiceSheet() {
      initZoomPan();
      const stage = document.querySelector('.paper-container');
      const sheet = document.getElementById('invoicePaper');
      const wrapper = document.getElementById('sheetWrapper');
      const zoomLabel = document.getElementById('zoomLabel');
      if (!stage || !sheet || !wrapper) return;

      const sheetBaseWidth = 794;
      const sheetBaseHeight = sheet.offsetHeight || 1123;

      let scale;
      if (currentZoom === 'fit') {
        const availableWidth = stage.clientWidth - (isFullscreen ? 80 : 40);
        scale = Math.min(1.0, Math.max(0.1, availableWidth / sheetBaseWidth));
        zoomLabel.textContent = 'Fit';
      } else {
        scale = currentZoom;
        zoomLabel.textContent = Math.round(scale * 100) + '%';
      }

      sheet.style.transform = `scale(${scale})`;
      wrapper.style.width = (sheetBaseWidth * scale) + 'px';
      wrapper.style.height = (sheetBaseHeight * scale) + 'px';

      if (wrapper.offsetWidth < stage.clientWidth) {
        wrapper.style.marginLeft = 'auto';
        wrapper.style.marginRight = 'auto';
      } else {
        wrapper.style.marginLeft = '0';
        wrapper.style.marginRight = '0';
      }
    }

    window.zoomIn = function() {
      const stage = document.querySelector('.paper-container');
      let z = currentZoom === 'fit' ? (stage.clientWidth - 40)/794 : currentZoom;
      currentZoom = Math.min(3.0, z + 0.25);
      fitInvoiceSheet();
    };
    window.zoomOut = function() {
      const stage = document.querySelector('.paper-container');
      let z = currentZoom === 'fit' ? (stage.clientWidth - 40)/794 : currentZoom;
      currentZoom = Math.max(0.25, z - 0.25);
      fitInvoiceSheet();
    };
    window.resetZoom = function() {
      currentZoom = 'fit';
      fitInvoiceSheet();
    };
    window.toggleFullscreen = function() {
      const stage = document.querySelector('.paper-container');
      isFullscreen = !isFullscreen;
      if (isFullscreen) {
        stage.classList.add('fullscreen-mode');
      } else {
        stage.classList.remove('fullscreen-mode');
      }
      setTimeout(fitInvoiceSheet, 10);
    };
    // --- END ZOOM & PAN ---


  // Observe canvas and stage to smoothly adapt
  if (window.ResizeObserver) {
    let resizeTimer;
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => fitInvoiceSheet(), 50);
    });
    const stage = document.querySelector('.paper-container');
    if (stage) ro.observe(stage);
    const canvas = document.querySelector('.app-canvas');
    if (canvas) ro.observe(canvas);
  }
  window.addEventListener('resize', fitInvoiceSheet);

  setTimeout(fitInvoiceSheet, 50);

