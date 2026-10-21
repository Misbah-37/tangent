
  // Category Extension Mappings
  const CATEGORIES = {
    "Documents": [".pdf", ".docx", ".doc", ".txt", ".rtf", ".md", ".odt"],
    "Data & Spreadsheets": [".csv", ".xlsx", ".xls", ".json", ".xml", ".sql"],
    "Images": [".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp", ".bmp", ".raw", ".tiff"],
    "Videos": [".mp4", ".mov", ".avi", ".mkv", ".webm", ".flv", ".wmv"],
    "Audio": [".mp3", ".wav", ".aac", ".flac", ".ogg", ".m4a"],
    "Presentations": [".pptx", ".ppt", ".key", ".odp"],
    "Design Files": [".psd", ".ai", ".xd", ".fig", ".sketch"],
    "Archives & Zips": [".zip", ".rar", ".7z", ".tar", ".gz"],
    "Programming": [".py", ".js", ".ts", ".html", ".css", ".cpp", ".c", ".java", ".sh", ".rs", ".go"],
    "Applications": [".exe", ".msi", ".dmg", ".apk", ".pkg", ".appimage"],
    "Disc Images": [".iso", ".img", ".vmdk"],
    "Fonts": [".ttf", ".otf", ".woff", ".woff2"]
  };

  function getCategoryForFilename(name) {
    const ext = "." + name.split('.').pop().toLowerCase();
    for (const [category, extensions] of Object.entries(CATEGORIES)) {
      if (extensions.includes(ext)) {
        return category;
      }
    }
    return "Other Files";
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // State
  let scannedFiles = []; // Array of { name, size, category, fileRef, handle }
  let currentDirHandle = null;
  let isDirectoryPickerMode = false;

  // Tab Switching
  function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    if (tabId === 'tab-browser') {
      document.getElementById('btnTabBrowser').classList.add('active');
      document.getElementById('tab-browser').classList.add('active');
    } else {
      document.getElementById('btnTabDesktop').classList.add('active');
      document.getElementById('tab-desktop').classList.add('active');
    }
  }

  // In-Browser Directory Picker (File System Access API)
  // Guarded folder scanning is implemented in file-organizer-engine.js.
  function pickLocalDirectory() {}

  // Fallback File Input Listener
  const batchFileInput = document.getElementById('batchFileInput');
  batchFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      isDirectoryPickerMode = false;
      scannedFiles = [];
      const files = Array.from(e.target.files);
      for (const file of files) {
        scannedFiles.push({
          name: file.name,
          size: file.size,
          category: getCategoryForFilename(file.name),
          fileRef: file,
          handle: null
        });
      }
      displayScannedPreview("Selected Files (" + files.length + ")", false);
    }
  });

  // Drag and drop onto upload box
  const dropZone = document.getElementById('dropZone');
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      isDirectoryPickerMode = false;
      scannedFiles = [];
      const files = Array.from(e.dataTransfer.files);
      for (const file of files) {
        scannedFiles.push({
          name: file.name,
          size: file.size,
          category: getCategoryForFilename(file.name),
          fileRef: file,
          handle: null
        });
      }
      displayScannedPreview("Dropped Files (" + files.length + ")", false);
    }
  });

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function displayScannedPreview(title, isDirectDisk) {
    if (scannedFiles.length === 0) {
      alert("No files found to organize!");
      return;
    }

    document.getElementById('dropZone').style.display = 'none';
    document.getElementById('previewCard').style.display = 'block';
    document.getElementById('folderTitle').textContent = title;

    // Count categories
    const catCounts = {};
    for (const f of scannedFiles) {
      catCounts[f.category] = (catCounts[f.category] || 0) + 1;
    }

    const totalCats = Object.keys(catCounts).length;
    document.getElementById('previewStats').textContent = `Detected ${scannedFiles.length} files across ${totalCats} categories`;

    // Render badges
    const badgesContainer = document.getElementById('categoryBadges');
    badgesContainer.innerHTML = '';
    for (const [cat, count] of Object.entries(catCounts)) {
      const badge = document.createElement('div');
      badge.className = 'cat-badge';
      badge.innerHTML = `<span>${escapeHtml(cat)}:</span> <strong>${count}</strong>`;
      badgesContainer.appendChild(badge);
    }

    // Render table
    const tbody = document.getElementById('filesTableBody');
    tbody.innerHTML = '';
    for (const f of scannedFiles) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 500;">${escapeHtml(f.sourceName||f.name)}</td>
        <td style="color: var(--text-muted);">${formatBytes(f.size)}</td>
        <td><span class="target-folder-tag">${escapeHtml(f.category)}/${escapeHtml(f.name)}</span></td>
      `;
      tbody.appendChild(tr);
    }

    // Update Action Button label
    const btnExecute = document.getElementById('btnExecuteOrganize');
    if (isDirectDisk) {
      btnExecute.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 11 12 14 22 4"></polyline>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
        </svg>
        Copy into category folders
      `;
    } else {
      btnExecute.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        Package & Download Organized ZIP
      `;
    }

    document.getElementById('organizeStatus').innerHTML = '';
  }

  function resetOrganizer() {
    scannedFiles = [];
    currentDirHandle = null;
    isDirectoryPickerMode = false;
    document.getElementById('batchFileInput').value = '';
    document.getElementById('previewCard').style.display = 'none';
    document.getElementById('dropZone').style.display = 'block';
    document.getElementById('organizeStatus').innerHTML = '';
  }

