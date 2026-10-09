(function(global) {
  'use strict';
  let current;
  const paint = () => new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
  function begin(from, to, host) {
    current?.finish('Replaced');
    const box = document.createElement('section'); box.id = 'transfer-diagnostics';
    box.setAttribute('aria-label', 'Transfer diagnostics');
    const heading = document.createElement('strong'); heading.textContent = 'Transfer diagnostics · ' + from + ' → ' + to;
    const status = document.createElement('div'), metrics = document.createElement('small'), log = document.createElement('pre');
    const close = document.createElement('button'); close.type = 'button'; close.className = 'btn'; close.textContent = 'Dismiss diagnostics'; close.hidden = true; close.onclick = () => box.remove();
    box.append(heading, status, metrics, log, close); document.getElementById('transfer-diagnostics')?.remove(); host.append(box);
    const started = performance.now(), entries = []; let stageStarted = started, label = 'Starting', timer, lastBeat = started, maxGap = 0, peakHeap = 0, done = false;
    const sample = () => {
      const now = performance.now(); maxGap = Math.max(maxGap, now - lastBeat); lastBeat = now;
      if (performance.memory) peakHeap = Math.max(peakHeap, performance.memory.usedJSHeapSize);
      status.textContent = label + ' · ' + ((now - started)/1000).toFixed(1) + 's total';
      metrics.textContent = 'Largest UI heartbeat gap: ' + (maxGap/1000).toFixed(2) + 's' + (peakHeap ? ' · Observed JS heap peak: ' + Math.round(peakHeap/1048576) + ' MB (not total app memory)' : ' · JS heap measurement unavailable');
    };
    function completeStage() {
      const now = performance.now(); maxGap = Math.max(maxGap, now - lastBeat);
      entries.push({stage:label, milliseconds:Math.round(now-stageStarted)});
      log.textContent = entries.map(entry => entry.stage + ': ' + (entry.milliseconds/1000).toFixed(2) + 's').join('\n');
    }
    const trace = {
      get running() { return !done; },
      async stage(next) { if(done)return; completeStage();label=next;stageStarted=performance.now();sample();await paint(); },
      note(text) { if(done)return;entries.push({stage:text,milliseconds:0});log.textContent=entries.map(entry=>entry.stage+': '+(entry.milliseconds/1000).toFixed(2)+'s').join('\n'); },
      measure(stage, milliseconds) { if(done)return;entries.push({stage,milliseconds:Math.round(milliseconds)});log.textContent=entries.map(entry=>entry.stage+': '+(entry.milliseconds/1000).toFixed(2)+'s').join('\n'); },
      detach() { document.body.append(box); },
      attach(host) { if(!done)host.append(box); },
      finish(result, error) { if(done)return;completeStage();done=true;clearInterval(timer);label=result;sample();close.hidden=false;box.dataset.result=result; if(error){const detail=document.createElement('pre');detail.textContent=error.stack||error.message||String(error);box.append(detail);} global.TangentTransferDiagnostics.last={result,entries:entries.slice(),heartbeatGapMs:Math.round(maxGap),observedJsHeapBytes:peakHeap,error:error?.stack||error?.message||null}; }
    };
    timer=setInterval(sample,100);sample();current=trace;return trace;
  }
  global.TangentTransferDiagnostics={begin,last:null,get active(){return current?.running ? current : null;}};
})(window);
