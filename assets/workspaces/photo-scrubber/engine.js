// --- Tab Switching Logic ---
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(p => p.classList.remove('active'));

  if (tabId === 'tab-inspect') {
    document.getElementById('tabBtnInspect').classList.add('active');
    document.getElementById('tab-inspect').classList.add('active');
  } else {
    document.getElementById('tabBtnBatch').classList.add('active');
    document.getElementById('tab-batch').classList.add('active');
  }
}

// --- Drag and Drop Helper ---
function setupDragAndDrop(boxId, inputId, onFiles) {
  const box = document.getElementById(boxId);
  const input = document.getElementById(inputId);
  if (!box || !input) return;

  ['dragenter', 'dragover'].forEach(eName => {
    box.addEventListener(eName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      box.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eName => {
    box.addEventListener(eName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      box.classList.remove('dragover');
    });
  });

  box.addEventListener('drop', (e) => {
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) onFiles(files);
  });

  input.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) onFiles(files);
  });
}

// Convert GPS rational coords to Decimal Degrees
function convertDMSToDD(degrees, minutes, seconds, direction) {
  let dd = degrees + (minutes / 60) + (seconds / 3600);
  if (direction === 'S' || direction === 'W') {
    dd = dd * -1;
  }
  return dd;
}

// --- TAB 1: Single Photo Inspector & Cleaner ---
let singleSelectedFile = null;
let singleImageElement = null;
let singleDetectedTagsCount = 0;
let singleOperation=0,singleBusy=false;

setupDragAndDrop('inspectDropZone', 'inspectInput', (files) => {
  const imgFile = files.find(f => f.type.startsWith('image/'));
  if (files.length) handleSinglePhoto(imgFile||files[0]);
});

function resetSingleFile() {
  singleOperation++;singleBusy=false;document.getElementById('btnScrubSingle').disabled=false;
  TangentMedia.clearLink(document.getElementById('downloadBtnSingle'));
  singleSelectedFile = null;
  singleImageElement = null;
  document.getElementById('inspectThumb').removeAttribute('src');
  singleDetectedTagsCount = 0;
  document.getElementById('inspectInput').value = '';
  document.getElementById('inspectFileCard').style.display = 'none';
  document.getElementById('inspectDropZone').style.display = 'block';
  document.getElementById('gpsBanner').style.display = 'none';
  document.getElementById('metadataGrid').style.display = 'none';
  document.getElementById('inspectActionArea').style.display = 'none';
  document.getElementById('statusSingle').innerText = '';
  document.getElementById('downloadBtnSingle').style.display = 'none';
}

async function handleSinglePhoto(file) {
  resetSingleFile();const operation=singleOperation;singleSelectedFile=file;
  document.getElementById('inspectDropZone').style.display='none';document.getElementById('inspectFileCard').style.display='flex';
  document.getElementById('inspectFileName').textContent=file.name;
  document.getElementById('inspectFileMeta').textContent='Reading image...';
  if(!file.type.startsWith('image/')){document.getElementById('inspectFileMeta').textContent='Choose a JPEG, PNG or WebP image.';return;}
  try {
    const image=await TangentMedia.loadImage(file);if(operation!==singleOperation)return;
    singleImageElement=image;document.getElementById('inspectThumb').src=image.src;
    document.getElementById('inspectFileMeta').textContent=`${image.naturalWidth} x ${image.naturalHeight} px • ${(file.size/1024).toFixed(1)} KB`;
    inspectExifData(image,file,operation);
  } catch(error){if(operation===singleOperation)document.getElementById('inspectFileMeta').textContent=error.message;}
}

function inspectExifData(img, file, operation=singleOperation) {
  EXIF.getData(img, function() {
    if(operation!==singleOperation)return;
    const allTags = EXIF.getAllTags(this);
    const tagKeys = Object.keys(allTags);
    singleDetectedTagsCount = tagKeys.length;

    // GPS Parsing
    const lat = EXIF.getTag(this, 'GPSLatitude');
    const latRef = EXIF.getTag(this, 'GPSLatitudeRef');
    const lon = EXIF.getTag(this, 'GPSLongitude');
    const lonRef = EXIF.getTag(this, 'GPSLongitudeRef');
    const alt = EXIF.getTag(this, 'GPSAltitude');
    const gpsTime = EXIF.getTag(this, 'GPSTimeStamp');
    const gpsDate = EXIF.getTag(this, 'GPSDateStamp');

    let decimalLat = null;
    let decimalLon = null;

    if (lat && latRef && lon && lonRef) {
      decimalLat = convertDMSToDD(lat[0], lat[1], lat[2], latRef);
      decimalLon = convertDMSToDD(lon[0], lon[1], lon[2], lonRef);
    }

    renderGpsBanner(decimalLat, decimalLon);
    renderMetadataFields(this, decimalLat, decimalLon, alt, gpsDate, gpsTime);

    document.getElementById('metadataGrid').style.display = 'grid';
    document.getElementById('inspectActionArea').style.display = 'block';
  });
}

function renderGpsBanner(lat, lon) {
  const banner = document.getElementById('gpsBanner');
  banner.style.display = 'flex';

  if (lat !== null && lon !== null) {
    const osmUrl = `https://www.openstreetmap.org/?mlat=${lat.toFixed(5)}&mlon=${lon.toFixed(5)}#map=16/${lat.toFixed(5)}/${lon.toFixed(5)}`;
    banner.className = 'gps-banner danger';
    banner.innerHTML = `
      <div class="gps-banner-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
      </div>
      <div style="flex:1;">
        <h4>Sensitive GPS Location Detected</h4>
        <p>This photo contains exact geographic coordinates: <strong>${lat.toFixed(6)}°, ${lon.toFixed(6)}°</strong>. These tags may reveal where this photo was taken.</p>
        <div class="gps-banner-actions">
          <a href="${osmUrl}" target="_blank" rel="noopener noreferrer" class="btn-osm-link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <span>View on OpenStreetMap</span>
          </a>
        </div>
      </div>`;
  } else {
    banner.className = 'gps-banner clean';
    banner.innerHTML = `
      <div class="gps-banner-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
      </div>
      <div>
        <h4>No GPS Coordinates Found</h4>
        <p>No GPS coordinates were found by this EXIF inspector. Other metadata may still be present; this is not a complete metadata inventory.</p>
      </div>`;
  }
}

function renderMetadataFields(img, lat, lon, alt, gpsDate, gpsTime) {
  // GPS
  document.getElementById('metaLat').innerText = lat !== null ? `${lat.toFixed(6)}°` : 'None';
  document.getElementById('metaLon').innerText = lon !== null ? `${lon.toFixed(6)}°` : 'None';
  if (lat !== null) {
    document.getElementById('metaLat').classList.add('highlight');
    document.getElementById('metaLon').classList.add('highlight');
  } else {
    document.getElementById('metaLat').classList.remove('highlight');
    document.getElementById('metaLon').classList.remove('highlight');
  }

  document.getElementById('metaAlt').innerText = alt ? `${Math.round(alt)} meters` : 'None';
  let formattedGpsTime = 'None';
  if (gpsTime && gpsTime.length === 3) {
    formattedGpsTime = `${gpsTime[0]}:${gpsTime[1]}:${Math.round(gpsTime[2])} UTC`;
    if (gpsDate) formattedGpsTime = `${gpsDate} ${formattedGpsTime}`;
  }
  document.getElementById('metaGpsTime').innerText = formattedGpsTime;

  // Hardware
  document.getElementById('metaMake').innerText = EXIF.getTag(img, 'Make') || 'Unknown';
  document.getElementById('metaModel').innerText = EXIF.getTag(img, 'Model') || 'Unknown';
  document.getElementById('metaLens').innerText = EXIF.getTag(img, 'LensModel') || EXIF.getTag(img, 'LensInfo') || 'Unknown';
  document.getElementById('metaSoftware').innerText = EXIF.getTag(img, 'Software') || 'Unknown';

  // Date
  document.getElementById('metaDateOrig').innerText = EXIF.getTag(img, 'DateTimeOriginal') || 'Unknown';
  document.getElementById('metaDateDig').innerText = EXIF.getTag(img, 'DateTimeDigitized') || 'Unknown';
  const orientation = EXIF.getTag(img, 'Orientation');
  document.getElementById('metaOrientation').innerText = orientation ? `Orientation ${orientation}` : 'Normal (1)';

  // Shooting
  const exp = EXIF.getTag(img, 'ExposureTime');
  document.getElementById('metaExposure').innerText = exp ? (exp.numerator ? `${exp.numerator}/${exp.denominator}s` : `${exp}s`) : 'Unknown';
  const fnum = EXIF.getTag(img, 'FNumber');
  document.getElementById('metaFNumber').innerText = fnum ? `f/${fnum}` : 'Unknown';
  document.getElementById('metaIso').innerText = EXIF.getTag(img, 'ISOSpeedRatings') || 'Unknown';
  const focal = EXIF.getTag(img, 'FocalLength');
  document.getElementById('metaFocal').innerText = focal ? `${focal}mm` : 'Unknown';
}

function cleanImageWithCanvas(img,mimeType,quality) {
  const canvas=document.createElement('canvas');TangentMedia.checkSize(img.naturalWidth,img.naturalHeight);
  canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const ctx=canvas.getContext('2d');
  if(TangentMedia.mime(mimeType)==='image/jpeg'){ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);}
  ctx.drawImage(img,0,0);return TangentMedia.encode(canvas,mimeType,quality);
}

async function scrubSinglePhoto() {
  if(!singleSelectedFile||!singleImageElement||singleBusy)return;
  const operation=singleOperation,file=singleSelectedFile,image=singleImageElement;
  const btn=document.getElementById('btnScrubSingle'),status=document.getElementById('statusSingle'),link=document.getElementById('downloadBtnSingle');
  singleBusy=true;btn.disabled=true;status.textContent='Creating a new image from the decoded pixels...';TangentMedia.clearLink(link);
  try {
    let mime=document.getElementById('outputFormat').value;if(mime==='keep')mime=file.type;
    const quality=Number(document.getElementById('outputQuality').value)/100;
    const blob=await cleanImageWithCanvas(image,mime,quality);if(operation!==singleOperation)return;
    TangentMedia.setLink(link,blob,TangentMedia.uniqueName(new Set(),file.name,'_clean',blob.type));
    status.textContent=`Cleaned copy ready. Source EXIF and GPS tags are not copied. ${(file.size/1024).toFixed(1)} KB → ${(blob.size/1024).toFixed(1)} KB.`;
  } catch(error){if(operation===singleOperation)status.textContent='Could not scrub image: '+error.message;}
  finally{if(operation===singleOperation){singleBusy=false;btn.disabled=false;}}
}

// --- TAB 2: Batch Scrubber ---
let batchFiles = [];
let batchOperation=0,batchBusy=false;
function invalidateBatch(){batchOperation++;batchBusy=false;document.getElementById("btnScrubBatch").disabled=false;TangentMedia.clearLink(document.getElementById("downloadBtnBatch"));document.getElementById("statusBatch").textContent="";}

setupDragAndDrop('batchDropZone', 'batchInput', (files) => {
  const imgFiles = files.filter(f => f.type.startsWith('image/'));
  if (imgFiles.length > 0) {
    invalidateBatch();batchFiles = batchFiles.concat(imgFiles);
    document.getElementById('batchInput').value = '';
    renderBatchList();
  }
});

function clearBatchQueue() {
  invalidateBatch();
  batchFiles = [];
  document.getElementById('batchInput').value = '';
  renderBatchList();
  document.getElementById('statusBatch').innerText = '';
  document.getElementById('downloadBtnBatch').style.display = 'none';
}

function removeBatchFile(index) {
  invalidateBatch();
  batchFiles.splice(index, 1);
  renderBatchList();
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderBatchList() {
  const header = document.getElementById('batchQueueHeader');
  const countSpan = document.getElementById('batchQueueCount');
  const list = document.getElementById('batchFileList');
  const actionArea = document.getElementById('batchActionArea');

  list.innerHTML = '';

  if (batchFiles.length === 0) {
    header.style.display = 'none';
    actionArea.style.display = 'none';
    return;
  }

  header.style.display = 'flex';
  countSpan.innerText = `${batchFiles.length} photo${batchFiles.length > 1 ? 's' : ''} in queue`;
  actionArea.style.display = 'block';

  batchFiles.forEach((file, index) => {
    const li = document.createElement('li');
    li.className = 'batch-item';
    li.innerHTML = `
      <div class="batch-item-left">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
        <span class="batch-item-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
        <span style="font-size:0.8rem; color: var(--text-subtle); flex-shrink:0;">(${(file.size / 1024).toFixed(1)} KB)</span>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <button type="button" class="btn-item-delete" onclick="removeBatchFile(${index})" title="Remove photo" aria-label="Remove photo">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>`;
    list.appendChild(li);
  });
}

async function scrubBatchPhotos() {
  if(!batchFiles.length||batchBusy)return;
  const operation=batchOperation,files=[...batchFiles],btn=document.getElementById('btnScrubBatch'),status=document.getElementById('statusBatch'),link=document.getElementById('downloadBtnBatch');
  batchBusy=true;btn.disabled=true;TangentMedia.clearLink(link);
  try {
    const zip=new JSZip(),used=new Set();
    for(let i=0;i<files.length;i++) {
      if(operation!==batchOperation)return;
      const file=files[i];status.textContent=`Sanitizing photo ${i+1} of ${files.length}: ${file.name}...`;
      const image=await TangentMedia.loadImage(file);if(operation!==batchOperation)return;
      const blob=await cleanImageWithCanvas(image,file.type,0.95);if(operation!==batchOperation)return;
      zip.file(TangentMedia.uniqueName(used,file.name,'_clean',blob.type),blob);
    }
    status.textContent='Compressing sanitized photos into ZIP...';const blob=await zip.generateAsync({type:'blob'});
    if(operation!==batchOperation)return;
    TangentMedia.setLink(link,blob,'Tangent_Cleaned_Photos.zip');status.textContent=`Batch sanitization complete. Cleaned ${files.length} photos. Source EXIF and GPS tags are not copied.`;
  } catch(error){if(operation===batchOperation)status.textContent='Could not process batch: '+error.message;}
  finally{if(operation===batchOperation){batchBusy=false;btn.disabled=false;}}
}
