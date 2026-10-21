
  let activeMode = 'url';
  const qrCanvas = document.getElementById('qrCanvas');
  const fgColorInput = document.getElementById('fgColor');
  const bgColorInput = document.getElementById('bgColor');
  const sizeSelect = document.getElementById('sizeSelect');
  let qrReady=false,qrBusy=false,qrRevision=0;
let qrLogo=null,qrLogoLoading=false,qrLogoJob=0;
  const qrStatus=document.createElement('p');qrStatus.id='qrStatus';qrStatus.setAttribute('role','status');qrCanvas.parentElement.after(qrStatus);
  function qrButtons(){['downloadPngBtn','copyImgBtn'].forEach(id=>document.getElementById(id).disabled=!qrReady||qrBusy||qrLogoLoading);}
  const wifiEscape=value=>value.replace(/[\\;,:"]/g,'\\$&');
  const cardEscape=value=>value.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/[;,]/g,'\\$&');




  function setMode(mode) {
    activeMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`mode-${mode}`).classList.add('active');

    document.querySelectorAll('.mode-fields').forEach(f => f.style.display = 'none');
    document.getElementById(`fields-${mode}`).style.display = 'block';

    generateQR();
  }

  function getPayload() {
    if (activeMode === 'url') {
      const value=document.getElementById('urlInput').value.trim();if(!value)throw Error('Enter a link to generate a QR code.');return value;
    } else if (activeMode === 'wifi') {
      const ssid = document.getElementById('wifiSsid').value;
      const pass = document.getElementById('wifiPassword').value;
      const enc = document.getElementById('wifiEncryption').value;
      if (!ssid) throw Error('Enter a Wi-Fi network name.');
      return `WIFI:S:${wifiEscape(ssid)};T:${enc};P:${enc === 'nopass' ? '' : wifiEscape(pass)};;`;
    } else if (activeMode === 'vcard') {
      const name = document.getElementById('vcardName').value.trim();
      const phone = document.getElementById('vcardPhone').value.trim();
      const email = document.getElementById('vcardEmail').value.trim();
      if(!name) throw Error('Enter a contact name.');
      return `BEGIN:VCARD\r\nVERSION:3.0\r\nFN:${cardEscape(name)}\r\nTEL:${cardEscape(phone)}\r\nEMAIL:${cardEscape(email)}\r\nEND:VCARD`;
    } else {
      return document.getElementById('rawTextInput').value;
    }
  }

  function generateQR() {
    ++qrRevision;qrReady=false;qrCanvas.replaceChildren();document.getElementById('colourWarning').hidden=true;
    document.getElementById('fgHex').textContent=fgColorInput.value.toUpperCase();document.getElementById('bgHex').textContent=bgColorInput.value.toUpperCase();
    try {
      const payload=getPayload(),size=parseInt(sizeSelect.value)||600,fg=fgColorInput.value,bg=bgColorInput.value;
      if(!payload) throw Error('Enter text to generate a QR code.');
      if(new TextEncoder().encode(payload).length>1200) throw Error('Use at most 1,200 UTF-8 bytes at this error-correction level.');
      const luminance=hex=>{const c=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);return c[0]*0.2126+c[1]*0.7152+c[2]*0.0722;};
      const dark=luminance(fg),light=luminance(bg);
      if(light<=dark || (light+0.05)/(dark+0.05)<4.5) document.getElementById('colourWarning').hidden=false;
      if(typeof QRCode!=='function')throw Error('QR library unavailable. Reload the page and try again.');
      const holder=document.createElement('div');const qr=new QRCode(holder,{text:payload,width:size,height:size,colorDark:fg,colorLight:bg,correctLevel:QRCode.CorrectLevel.H});
      const count=qr._oQRCode.getModuleCount(),canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
      const ctx=canvas.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,size,size);ctx.fillStyle=fg;
      for(let y=0;y<count;y++)for(let x=0;x<count;x++)if(qr._oQRCode.isDark(y,x)){const x1=Math.round((x+4)*size/(count+8)),y1=Math.round((y+4)*size/(count+8));ctx.fillRect(x1,y1,Math.round((x+5)*size/(count+8))-x1,Math.round((y+5)*size/(count+8))-y1);}
      if(qrLogo){
        const percent=Math.min(20,Math.max(10,Number(document.getElementById('logoSize').value)||15));
        // A circular badge frames the uploaded mark without changing its proportions.
        const diameter=Math.round(count*size/(count+8)*percent/100),cx=size/2,cy=size/2,radius=diameter/2;
        ctx.save();
        ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.fillStyle='#ffffff';ctx.fill();
        const border=Math.max(1,size/600*1.5);
        ctx.beginPath();ctx.arc(cx,cy,radius-border/2,0,Math.PI*2);ctx.strokeStyle='#cbd0d5';ctx.lineWidth=border;ctx.stroke();
        // Keep every logo corner inside the badge with a consistent white margin.
        const inner=diameter*0.62,scale=Math.min(inner/qrLogo.naturalWidth,inner/qrLogo.naturalHeight),w=qrLogo.naturalWidth*scale,h=qrLogo.naturalHeight*scale;
        ctx.drawImage(qrLogo,cx-w/2,cy-h/2,w,h);
        ctx.restore();
      }
      qrCanvas.append(canvas);qrReady=true;qrStatus.textContent='Ready. Test the downloaded code with your scanner before sharing.';
    } catch(error){qrCanvas.replaceChildren();qrStatus.textContent=error.message.startsWith('Use')||error.message.startsWith('Enter')||error.message.startsWith('QR library')?error.message:'Could not generate this code. Shorten the content and try again.';}
    qrButtons();
  }

  function applyPalette(fg, bg) {
    fgColorInput.value = fg;
    bgColorInput.value = bg;
    generateQR();
  }

  function downloadPNG() {
    if(!qrReady||qrBusy||qrLogoLoading)return;
    const link = document.createElement('a');
    link.download = `Tangent_QR_${activeMode}.png`;
    const canvas = qrCanvas.querySelector('canvas');
    if (canvas) {
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  async function copyQRImage() {
    if(!qrReady||qrBusy||qrLogoLoading)return;const revision=qrRevision;qrBusy=true;qrButtons();
    const snapshot=document.createElement('canvas'),source=qrCanvas.querySelector('canvas');snapshot.width=source.width;snapshot.height=source.height;snapshot.getContext('2d').drawImage(source,0,0);
    try{const blob=await TangentMedia.encode(snapshot,'image/png');await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);if(revision===qrRevision)qrStatus.textContent='QR image copied.';}
    catch(error){if(revision===qrRevision)qrStatus.textContent='Could not copy the image. Download the PNG instead.';}
    finally{qrBusy=false;qrButtons();}
  }

  // Real-time Event Listeners
  ['urlInput', 'wifiSsid', 'wifiPassword', 'wifiEncryption', 'vcardName', 'vcardPhone', 'vcardEmail', 'rawTextInput'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', generateQR);
      el.addEventListener('change', generateQR);
    }
  });

  fgColorInput.addEventListener('input', generateQR);
  bgColorInput.addEventListener('input', generateQR);

  // Initial Generation
  generateQR();

async function loadQRLogo(file){
  const job=++qrLogoJob;qrLogo=null;qrLogoLoading=!!file;
  const status=document.getElementById('logoStatus');status.textContent=file?'Loading logo…':'';
  document.getElementById('removeLogo').disabled=!file;generateQR();
  if(!file)return;
  try{
    if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Choose a PNG, JPEG or WebP logo.');
    if(file.size>5*1048576)throw Error('Choose a logo no larger than 5 MB.');
    const image=await TangentMedia.loadImage(file);
    if(job!==qrLogoJob)return;
    if(image.naturalWidth>4096||image.naturalHeight>4096)throw Error('Use a logo no larger than 4,096 pixels per side.');
    qrLogo=image;status.textContent=file.name+' · Logo added. Test the final code with your scanner.';
  }catch(error){if(job!==qrLogoJob)return;status.textContent=error.message+' No logo was added.';}
  finally{if(job===qrLogoJob){qrLogoLoading=false;document.getElementById('removeLogo').disabled=!qrLogo;generateQR();}}
}
function removeQRLogo(){++qrLogoJob;qrLogo=null;qrLogoLoading=false;document.getElementById('logoInput').value='';document.getElementById('logoStatus').textContent='No logo added.';document.getElementById('removeLogo').disabled=true;generateQR();}
