/* Bounded local document processing and cancellable job identity. */
window.TangentProcessing = (() => {
  function jobs() {
    let active=null,sequence=0;
    const cancel=()=>{if(active){active.cancelled=true;for(const stop of active.stops)Promise.resolve().then(stop).catch(()=>{});active=null;}};
    return {cancel,begin(){cancel();const job={id:++sequence,cancelled:false,stops:new Set(),current(){return active===job&&!job.cancelled;},check(){if(!job.current())throw Error('Cancelled');}};active=job;return job;}};
  }
  async function rasterPdf(file,job,{maxPages=20,scale=2}={}) {
    job.check();const bytes=await file.arrayBuffer();job.check();
    const task=pdfjsLib.getDocument({data:bytes});const stop=()=>task.destroy();job.stops.add(stop);
    try{const pdf=await task.promise;job.check();if(pdf.numPages>maxPages)throw Error(`Use a PDF with at most ${maxPages} pages.`);
      const canvases=[];let pixels=0;
      for(let n=1;n<=pdf.numPages;n++){job.check();const page=await pdf.getPage(n);try{const viewport=page.getViewport({scale}),w=Math.ceil(viewport.width),h=Math.ceil(viewport.height);TangentMedia.checkSize(w,h);pixels+=w*h;if(pixels>50000000)throw Error('PDF render exceeds 50 million pixels. Split the document into smaller files.');const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const render=page.render({canvasContext:canvas.getContext('2d'),viewport});const stopRender=()=>render.cancel();job.stops.add(stopRender);try{await render.promise;}finally{job.stops.delete(stopRender);}job.check();canvases.push(canvas);}finally{page.cleanup();}}
      return canvases;
    }finally{job.stops.delete(stop);await task.destroy().catch(()=>{});}
  }
  async function recognize(canvases,language,job,logger) {
    job.check();const worker=await Tesseract.createWorker(language,1,{logger:m=>{if(job.current())logger?.(m);}});let terminated=false;
    const stop=async()=>{if(!terminated){terminated=true;await worker.terminate();}};job.stops.add(stop);
    try{job.check();const results=[];for(let i=0;i<canvases.length;i++){job.check();const result=await worker.recognize(canvases[i]);job.check();results.push(result.data);}return results;}
    finally{job.stops.delete(stop);await stop().catch(()=>{});}
  }
  function checkFile(file){if(!file||file.size>50000000)throw Error('Choose a file smaller than 50 MB.');}
  return {jobs,rasterPdf,recognize,checkFile};
})();
