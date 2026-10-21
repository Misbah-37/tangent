


document.addEventListener('DOMContentLoaded', () => {
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const emptyState = document.getElementById('emptyState');
  const consentState = document.getElementById('consentState');
  const activeState = document.getElementById('activeState');

  const statusSection = document.getElementById('statusSection');
  const statusText = document.getElementById('statusText');
  const statusPercent = document.getElementById('statusPercent');
  const progressBarContainer = document.getElementById('progressBarContainer');
  const progressBarFill = document.getElementById('progressBarFill');

  const btnConsentDownload = document.getElementById('btnConsentDownload');
  const btnConsentCancel = document.getElementById('btnConsentCancel');

  const transcriptOutput = document.getElementById('transcriptOutput');
  const btnCopy = document.getElementById('btnCopy');
  const btnDownloadTxt = document.getElementById('btnDownloadTxt');

  const jobs=TangentProcessing.jobs();let pending=null,permission=false,modelPromise=null,inferenceQueue=Promise.resolve(),ready=false,currentName='transcript';
  const resetBtn=document.createElement('button');resetBtn.type='button';resetBtn.className='btn btn-secondary';resetBtn.textContent='Clear / Cancel';resetBtn.dataset.clearAudio='';dropZone.after(resetBtn);
  function controls(){btnCopy.disabled=btnDownloadTxt.disabled=!ready;}
  function reset(){jobs.cancel();pending=null;ready=false;transcriptOutput.value='';controls();consentState.style.display='none';activeState.style.display='none';emptyState.style.display='flex';statusSection.style.display='none';fileInput.value='';}
  resetBtn.addEventListener('click',reset);btnConsentCancel.addEventListener('click',reset);
  async function decode(file,job){if(!file||file.size>100000000)throw Error('Choose audio smaller than 100 MB.');
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('Audio decoding is unavailable in this browser.');const context=new Audio();
    try{const bytes=await file.arrayBuffer();job.check();const buffer=await context.decodeAudioData(bytes);job.check();if(!buffer.duration||buffer.duration>1800)throw Error('Choose audio up to 30 minutes long.');if(buffer.length*buffer.numberOfChannels>100000000)throw Error('Audio exceeds the decoded sample limit. Choose a shorter file.');
      const offline=new OfflineAudioContext(1,Math.ceil(buffer.duration*16000),16000),source=offline.createBufferSource();source.buffer=buffer;source.connect(offline.destination);source.start();const rendered=await offline.startRendering();job.check();return rendered.getChannelData(0);
    }finally{await context.close().catch(()=>{});}
  }
  async function handleFileSelect(file){const job=jobs.begin();ready=false;controls();transcriptOutput.value='';pending=null;consentState.style.display='none';emptyState.style.display='none';activeState.style.display='flex';statusSection.style.display='block';statusPercent.textContent='';progressBarContainer.style.display='none';progressBarFill.style.width='0%';statusText.textContent='Checking '+file.name+'...';
    try{const audio=await decode(file,job);job.check();
      // Reject only exact digital silence. No loudness threshold: quiet speech must pass.
      if(!audio.some(sample=>sample!==0)){statusText.textContent='No audible signal detected. This recording decodes to digital silence.';return;}
      pending={file,audio,job};if(!permission){activeState.style.display='none';consentState.style.display='flex';return;}await transcribe(pending);}
    catch(error){if(job.current())statusText.textContent='Could not process audio: '+(error.message||'Choose a supported, undamaged file.');}
  }
  btnConsentDownload.addEventListener('click',()=>{permission=true;const request=pending;pending=null;if(request?.job.current())transcribe(request);});
  function getModel(job){if(!modelPromise){modelPromise=import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1').then(({pipeline,env})=>{env.allowLocalModels=false;return pipeline('automatic-speech-recognition','Xenova/whisper-tiny.en',{progress_callback:data=>{if(job.current()){statusText.textContent='Loading speech model...';if(data.status==='progress')progressBarFill.style.width=Math.round(data.progress||0)+'%';}}});}).catch(error=>{modelPromise=null;throw error;});}return modelPromise;}
  async function transcribe(request){const {file,audio,job}=request;consentState.style.display='none';activeState.style.display='flex';statusSection.style.display='block';statusText.textContent='Waiting for speech engine...';progressBarContainer.style.display='block';
    const run=async()=>{job.check();const engine=await getModel(job);job.check();statusText.textContent='Transcribing '+file.name+'...';progressBarContainer.style.display='none';const output=await engine(audio,{chunk_length_s:30,stride_length_s:5});job.check();transcriptOutput.value=output.text||'';currentName=file.name.replace(/\.[^/.]+$/,'');ready=!!transcriptOutput.value.trim();controls();statusText.textContent=ready?'Transcription complete. Review before exporting.':'No speech recognized. Try a clearer recording.';};
    const task=inferenceQueue.then(run);inferenceQueue=task.catch(()=>{});
    try{await task;}catch(error){if(job.current()){ready=false;controls();statusText.textContent='Could not transcribe: '+error.message;}}finally{if(job.current()){pending=null;progressBarContainer.style.display='none';statusPercent.textContent='';}}
  }
  dropZone.addEventListener('click',()=>fileInput.click());dropZone.addEventListener('dragover',e=>e.preventDefault());dropZone.addEventListener('drop',e=>{e.preventDefault();if(e.dataTransfer.files[0])handleFileSelect(e.dataTransfer.files[0]);});fileInput.addEventListener('change',()=>{if(fileInput.files[0])handleFileSelect(fileInput.files[0]);fileInput.value='';});
  btnCopy.addEventListener('click',async()=>{if(!ready)return;try{await navigator.clipboard.writeText(transcriptOutput.value);statusText.textContent='Transcript copied.';}catch(error){statusText.textContent='Could not copy. Select the transcript and copy manually.';}});
  btnDownloadTxt.addEventListener('click',()=>{if(!ready)return;const url=URL.createObjectURL(new Blob([transcriptOutput.value],{type:'text/plain;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download=currentName+'_transcript.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);});controls();

});
