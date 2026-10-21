
  const escapeHtml=TangentStudio.escape;let draftHandle=null;
  let experiences = [
    {
      title: "Lead Infrastructure Architect",
      company: "Apex Cloud Networks",
      period: "2022 - Present",
      location: "Austin, TX",
      bullets: "Spearheaded zero-downtime migration of 140+ microservices to Kubernetes clusters.\nEngineered automated multi-region failover protocol reducing disaster recovery RTO from 45m to 90s.\nMentored team of 8 engineers and introduced infrastructure-as-code linting standards."
    },
    {
      title: "Systems Software Engineer",
      company: "DataForge Systems",
      period: "2019 - 2022",
      location: "Denver, CO",
      bullets: "Developed high-throughput telemetry ingestion service in Go processing 2.4B events/day.\nOptimized memory allocation patterns, cutting AWS container compute costs by 32%."
    }
  ];

  let educations = [
    {
      degree: "B.S. in Computer Science",
      school: "University of Colorado Boulder",
      year: "2015 - 2019",
      details: "Summa Cum Laude, Dean's List 8 Semesters"
    }
  ];

  const inName = document.getElementById('inName');
  const inTitle = document.getElementById('inTitle');
  const inEmail = document.getElementById('inEmail');
  const inPhone = document.getElementById('inPhone');
  const inLocation = document.getElementById('inLocation');
  const inWebsite = document.getElementById('inWebsite');
  const inSummary = document.getElementById('inSummary');
  const inSkills = document.getElementById('inSkills');
  const inPhoto = document.getElementById('inPhoto');
  const removePhotoBtn = document.getElementById('removePhotoBtn');
  let photoData = null;

  const photoMessage=TangentStudio.status(inPhoto,'photoStatus');
  const photoLoader=TangentStudio.imageLoader(()=>{photoData=null;updateSheet();photoMessage.textContent='Reading photo...';},data=>{photoData=data;removePhotoBtn.style.display='inline-block';photoMessage.textContent='Photo loaded.';updateSheet();},message=>{photoMessage.textContent=message;removePhotoBtn.style.display='none';});
  inPhoto.addEventListener('change',()=>{if(inPhoto.files[0])photoLoader.load(inPhoto.files[0]);inPhoto.value='';});

  removePhotoBtn.addEventListener('click', () => {
    photoLoader.cancel();photoMessage.textContent='';
    photoData = null;
    inPhoto.value = '';
    removePhotoBtn.style.display = 'none';
    updateSheet();
  });

  const experienceList = document.getElementById('experienceList');
  const educationList = document.getElementById('educationList');
  const addExpBtn = document.getElementById('addExpBtn');
  const addEduBtn = document.getElementById('addEduBtn');
  const resumeSheet = document.getElementById('resumeSheet');
  const downloadPdfBtn = document.getElementById('downloadPdfBtn');
  const loadSampleBtn = document.getElementById('loadSampleBtn');
  const clearAllBtn = document.getElementById('clearAllBtn');

  function renderExperienceInputs() {
    experienceList.innerHTML = '';
    experiences.forEach((exp, idx) => {
      const card = document.createElement('div');
      card.className = 'item-card';
      card.innerHTML = `
        <button type="button" class="btn-remove" title="Remove Experience" aria-label="Remove Experience"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
        <div class="input-grid">
          <div class="form-group">
            <label class="form-label">Job Title</label>
            <input type="text" class="form-input exp-title" value="${escapeHtml(exp.title)}">
          </div>
          <div class="form-group">
            <label class="form-label">Company</label>
            <input type="text" class="form-input exp-company" value="${escapeHtml(exp.company)}">
          </div>
        </div>
        <div class="input-grid">
          <div class="form-group">
            <label class="form-label">Date Range</label>
            <input type="text" class="form-input exp-period" value="${escapeHtml(exp.period)}">
          </div>
          <div class="form-group">
            <label class="form-label">Location</label>
            <input type="text" class="form-input exp-location" value="${escapeHtml(exp.location)}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Key Achievements (One per line)</label>
          <textarea class="form-textarea exp-bullets">${escapeHtml(exp.bullets)}</textarea>
        </div>
      `;

      card.querySelector('.btn-remove').addEventListener('click', () => {
        experiences.splice(idx, 1);
        renderExperienceInputs();
        updateSheet();
      });

      card.querySelectorAll('input, textarea').forEach(input => {
        input.addEventListener('input', () => {
          exp.title = card.querySelector('.exp-title').value;
          exp.company = card.querySelector('.exp-company').value;
          exp.period = card.querySelector('.exp-period').value;
          exp.location = card.querySelector('.exp-location').value;
          exp.bullets = card.querySelector('.exp-bullets').value;
          updateSheet();
        });
      });

      experienceList.appendChild(card);
    });
  }

  function renderEducationInputs() {
    educationList.innerHTML = '';
    educations.forEach((edu, idx) => {
      const card = document.createElement('div');
      card.className = 'item-card';
      card.innerHTML = `
        <button type="button" class="btn-remove" title="Remove Education" aria-label="Remove Education"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
        <div class="input-grid">
          <div class="form-group">
            <label class="form-label">Degree</label>
            <input type="text" class="form-input edu-degree" value="${escapeHtml(edu.degree)}">
          </div>
          <div class="form-group">
            <label class="form-label">School / Institution</label>
            <input type="text" class="form-input edu-school" value="${escapeHtml(edu.school)}">
          </div>
        </div>
        <div class="input-grid">
          <div class="form-group">
            <label class="form-label">Years</label>
            <input type="text" class="form-input edu-year" value="${escapeHtml(edu.year)}">
          </div>
          <div class="form-group">
            <label class="form-label">Honors / Details</label>
            <input type="text" class="form-input edu-details" value="${escapeHtml(edu.details)}">
          </div>
        </div>
      `;

      card.querySelector('.btn-remove').addEventListener('click', () => {
        educations.splice(idx, 1);
        renderEducationInputs();
        updateSheet();
      });

      card.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', () => {
          edu.degree = card.querySelector('.edu-degree').value;
          edu.school = card.querySelector('.edu-school').value;
          edu.year = card.querySelector('.edu-year').value;
          edu.details = card.querySelector('.edu-details').value;
          updateSheet();
        });
      });

      educationList.appendChild(card);
    });
  }

  addExpBtn.addEventListener('click', () => {
    if(experiences.length>=200)return;
    experiences.push({ title: "Job Title", company: "Company Name", period: "2021 - 2023", location: "City, State", bullets: "Key responsibility or achievement." });
    renderExperienceInputs();
    updateSheet();
  });

  addEduBtn.addEventListener('click', () => {
    if(educations.length>=200)return;
    educations.push({ degree: "Degree / Certificate", school: "University / Academy", year: "2018 - 2022", details: "Major / Honors" });
    renderEducationInputs();
    updateSheet();
  });

  const tplSelect = document.getElementById('tplSelect');
  let currentTemplate = 'modern';
  let currentAccent = '#0284c7';

  tplSelect.addEventListener('change', (e) => {
    currentTemplate = e.target.value;
    updateSheet();
  });

  document.querySelectorAll('[data-tpl-color]').forEach(dot => {
    dot.addEventListener('click', () => {
      document.querySelectorAll('[data-tpl-color]').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      currentAccent = dot.dataset.tplColor;
      resumeSheet.style.setProperty('--tpl-accent', currentAccent);
      updateSheet();
    });
  });

  function updateSheet() {
    resumeSheet.className = 'resume-sheet tpl-' + currentTemplate;
    resumeSheet.style.setProperty('--tpl-accent', currentAccent);

    let expHtml = '';
    experiences.forEach(exp => {
      const bulletsList = exp.bullets.split('\n')
        .map(b => b.trim())
        .filter(b => b.length > 0)
        .map(b => `<li>${escapeHtml(b)}</li>`)
        .join('');

      expHtml += `
        <div class="sheet-item">
          <div class="sheet-item-head">
            <span>${escapeHtml(exp.title)}</span>
            <span>${escapeHtml(exp.period)}</span>
          </div>
          <div class="sheet-item-sub">
            <span>${escapeHtml(exp.company)}</span>
            <span>${escapeHtml(exp.location)}</span>
          </div>
          ${bulletsList ? `<ul class="sheet-bullets">${bulletsList}</ul>` : ''}
        </div>
      `;
    });

    let eduHtml = '';
    educations.forEach(edu => {
      eduHtml += `
        <div class="sheet-item">
          <div class="sheet-item-head">
            <span>${escapeHtml(edu.degree)}</span>
            <span>${escapeHtml(edu.year)}</span>
          </div>
          <div class="sheet-item-sub">
            <span>${escapeHtml(edu.school)}</span>
            <span>${escapeHtml(edu.details)}</span>
          </div>
        </div>
      `;
    });

    const skillBadges = inSkills.value.split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => `<span class="skill-badge">${escapeHtml(s)}</span>`)
      .join('');

    const photoHtml = photoData ? `<img src="${photoData}" class="sheet-photo" alt="Profile">` : '';
    const sidebarArchetypes = ['sidebar', 'split', 'portfolio'];

    if (sidebarArchetypes.includes(currentTemplate)) {
      // 2-Column Sidebar Layouts
      resumeSheet.innerHTML = `
        <div class="sidebar-left">
          ${photoHtml ? `<div class="sheet-photo-container">${photoHtml}</div>` : ''}
          <div class="sheet-section" style="margin-bottom: 22px;">
            <div class="sheet-sec-title">Contact</div>
            <div style="font-size: 11.5px; color: var(--contact-text, #475569); display: flex; flex-direction: column; gap: 8px;">
              ${inEmail.value ? `<div style="word-break: break-all;"><strong>Email:</strong><br>${escapeHtml(inEmail.value)}</div>` : ''}
              ${inPhone.value ? `<div><strong>Phone:</strong><br>${escapeHtml(inPhone.value)}</div>` : ''}
              ${inLocation.value ? `<div><strong>Location:</strong><br>${escapeHtml(inLocation.value)}</div>` : ''}
              ${inWebsite.value ? `<div style="word-break: break-all;"><strong>Web:</strong><br>${escapeHtml(inWebsite.value)}</div>` : ''}
            </div>
          </div>

          ${skillBadges ? `
          <div class="sheet-section" style="margin-bottom: 22px;">
            <div class="sheet-sec-title">Skills</div>
            <div class="sheet-skills">${skillBadges}</div>
          </div>` : ''}

          ${eduHtml ? `
          <div class="sheet-section">
            <div class="sheet-sec-title">Education</div>
            ${eduHtml}
          </div>` : ''}
        </div>

        <div class="sidebar-right">
          <div class="sheet-header">
            <div class="sheet-name">${escapeHtml(inName.value || 'Your Name')}</div>
            <div class="sheet-title">${escapeHtml(inTitle.value || '')}</div>
          </div>

          ${inSummary.value ? `
          <div class="sheet-section">
            <div class="sheet-sec-title">About Me</div>
            <div class="sheet-body-text">${escapeHtml(inSummary.value)}</div>
          </div>` : ''}

          ${expHtml ? `
          <div class="sheet-section">
            <div class="sheet-sec-title">Work Experience</div>
            ${expHtml}
          </div>` : ''}
        </div>
      `;
    } else {
      // Standard / 1-Column Layouts
      resumeSheet.innerHTML = `
        <div class="sheet-header">
          <div class="header-content">
            <div class="sheet-name">${escapeHtml(inName.value || 'Your Name')}</div>
            <div class="sheet-title">${escapeHtml(inTitle.value || '')}</div>
            <div class="sheet-contact">
              ${inEmail.value ? `<span>${escapeHtml(inEmail.value)}</span>` : ''}
              ${inPhone.value ? `<span>•</span><span>${escapeHtml(inPhone.value)}</span>` : ''}
              ${inLocation.value ? `<span>•</span><span>${escapeHtml(inLocation.value)}</span>` : ''}
              ${inWebsite.value ? `<span>•</span><span>${escapeHtml(inWebsite.value)}</span>` : ''}
            </div>
          </div>
          ${photoHtml ? `<div class="sheet-photo-container">${photoHtml}</div>` : ''}
        </div>

        ${inSummary.value ? `
        <div class="sheet-section">
          <div class="sheet-sec-title">Summary</div>
          <div class="sheet-body-text">${escapeHtml(inSummary.value)}</div>
        </div>` : ''}

        ${expHtml ? `
        <div class="sheet-section">
          <div class="sheet-sec-title">Professional Experience</div>
          ${expHtml}
        </div>` : ''}

        ${eduHtml ? `
        <div class="sheet-section">
          <div class="sheet-sec-title">Education</div>
          ${eduHtml}
        </div>` : ''}

        ${skillBadges ? `
        <div class="sheet-section sheet-skills-section">
          <div class="sheet-sec-title">Core Competencies & Skills</div>
          <div class="sheet-skills">${skillBadges}</div>
        </div>` : ''}
      `;
    }

    // Re-scale to fit available space seamlessly
    draftHandle?.changed();requestAnimationFrame(fitResumeSheet);
  }


    // --- ZOOM & PAN LOGIC ---
    let currentZoom = 'fit';
    let isFullscreen = false;
    let wrapperInjected = false;

    function initZoomPan() {
      const stage = document.querySelector('.paper-stage');
      const sheet = document.getElementById('resumeSheet');
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

    function fitResumeSheet() {
      initZoomPan();
      const stage = document.querySelector('.paper-stage');
      const sheet = document.getElementById('resumeSheet');
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
      const stage = document.querySelector('.paper-stage');
      let z = currentZoom === 'fit' ? (stage.clientWidth - 40)/794 : currentZoom;
      currentZoom = Math.min(3.0, z + 0.25);
      fitResumeSheet();
    };
    window.zoomOut = function() {
      const stage = document.querySelector('.paper-stage');
      let z = currentZoom === 'fit' ? (stage.clientWidth - 40)/794 : currentZoom;
      currentZoom = Math.max(0.25, z - 0.25);
      fitResumeSheet();
    };
    window.resetZoom = function() {
      currentZoom = 'fit';
      fitResumeSheet();
    };
    window.toggleFullscreen = function() {
      const stage = document.querySelector('.paper-stage');
      isFullscreen = !isFullscreen;
      if (isFullscreen) {
        stage.classList.add('fullscreen-mode');
      } else {
        stage.classList.remove('fullscreen-mode');
      }
      setTimeout(fitResumeSheet, 10);
    };
    // --- END ZOOM & PAN ---


  // Observe canvas and stage to smoothly adapt when the toolkit sidebar opens or closes
  if (window.ResizeObserver) {
    let resizeTimer;
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => fitResumeSheet(), 50);
    });
    const stage = document.querySelector('.paper-stage');
    if (stage) ro.observe(stage);
    const canvas = document.querySelector('.app-canvas');
    if (canvas) ro.observe(canvas);
  }
  window.addEventListener('resize', fitResumeSheet);

  [inName, inTitle, inEmail, inPhone, inLocation, inWebsite, inSummary, inSkills].forEach(el => {
    el.addEventListener('input', updateSheet);
  });

  downloadPdfBtn.addEventListener('click', () => {
    window.print();

  });

  let replacementUndo=null;
  const undoReplacement=document.createElement('button');undoReplacement.type='button';undoReplacement.className='btn-aux';undoReplacement.id='undoReplacement';undoReplacement.textContent='Undo replacement';undoReplacement.hidden=true;clearAllBtn.parentElement.append(undoReplacement);
  const replacementStatus=TangentStudio.status(undoReplacement,'replacementStatus');
  function hasResumeContent(){return [inName,inTitle,inEmail,inPhone,inLocation,inWebsite,inSummary,inSkills].some(e=>e.value.trim())||experiences.some(e=>Object.values(e).some(v=>String(v).trim()))||educations.some(e=>Object.values(e).some(v=>String(v).trim()))||!!photoData;}
  function prepareReplacement(action){if(hasResumeContent()&&!window.confirm(action+' This replaces your current resume. You can undo this replacement until you replace or clear it again.'))return false;replacementUndo=JSON.parse(JSON.stringify(snapshotResume()));undoReplacement.hidden=false;return true;}
  undoReplacement.addEventListener('click',()=>{if(!replacementUndo)return;photoLoader.cancel();const previous=replacementUndo;replacementUndo=null;restoreResume(previous);renderExperienceInputs();renderEducationInputs();updateSheet();draftHandle?.save();undoReplacement.hidden=true;replacementStatus.textContent='Previous resume restored.';});

  loadSampleBtn.addEventListener('click', () => {
    if(JSON.stringify(snapshotResume())===JSON.stringify(sampleResume))return;
    if(!prepareReplacement('Replace with the sample?'))return;
    photoLoader.cancel();restoreResume(sampleResume);renderExperienceInputs();renderEducationInputs();updateSheet();draftHandle?.save();replacementStatus.textContent='Sample loaded. Undo replacement restores your previous resume.';
  });

  clearAllBtn.addEventListener('click', () => {
    if(!hasResumeContent())return;
    if(!prepareReplacement('Clear this resume?'))return;
    removePhotoBtn.click();
    inName.value = '';
    inTitle.value = '';
    inEmail.value = '';
    inPhone.value = '';
    inLocation.value = '';
    inWebsite.value = '';
    inSummary.value = '';
    inSkills.value = '';
    replacementStatus.textContent='Resume cleared. Undo replacement restores the previous content when available.';
    experiences = [];
    educations = [];
    renderExperienceInputs();
    renderEducationInputs();
    updateSheet();
  });

  const resumeFields=[inName,inTitle,inEmail,inPhone,inLocation,inWebsite,inSummary,inSkills,tplSelect];
  const snapshotResume=()=>({fields:TangentStudio.fields(resumeFields),experiences:experiences.map(e=>({...e})),educations:educations.map(e=>({...e})),photo:photoData,color:currentAccent});
  function restoreResume(data){if(!data||!Array.isArray(data.experiences)||!Array.isArray(data.educations)||data.experiences.length>200||data.educations.length>200)throw Error('Invalid resume draft');for(const [entries,keys] of [[data.experiences,['title','company','period','location','bullets']],[data.educations,['degree','school','year','details']]])for(const item of entries)for(const key of keys)if(typeof item[key]!=='string'||item[key].length>100000)throw Error('Invalid resume field');TangentStudio.restoreFields(resumeFields,data.fields);experiences=data.experiences.map(e=>({...e}));educations=data.educations.map(e=>({...e}));currentTemplate=tplSelect.value;photoData=typeof data.photo==='string'&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+\/]*={0,2}$/.test(data.photo)?data.photo:null;removePhotoBtn.style.display=photoData?'inline-block':'none';if(/^#[0-9a-f]{6}$/i.test(data.color))currentAccent=data.color;}
  const sampleResume=snapshotResume();draftHandle=TangentStudio.draft('tangent_resume_draft_v1',clearAllBtn,snapshotResume,restoreResume);
  // Initial Run
  renderExperienceInputs();
  renderEducationInputs();
  updateSheet();
  setTimeout(fitResumeSheet, 50);
