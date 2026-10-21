(()=>{
const drop=document.getElementById('vaultDropzone'),pwd=document.getElementById('vaultPassword'),confirm=document.getElementById('confirmPassword'),toggle=document.getElementById('togglePwdBtn'),clear=document.getElementById('clearSelection');
let estimatedPassword=null;
function strength(lock){
  document.getElementById('strengthPanel').hidden=!lock;
  if(!lock||pwd.value===estimatedPassword)return;
  estimatedPassword=pwd.value;
  const label=document.getElementById('strengthLabel'),hint=document.getElementById('strengthHint'),meter=document.getElementById('strengthMeter');
  const bars=[...meter.children];bars.forEach(b=>b.classList.remove('filled'));
  meter.setAttribute('aria-valuenow','0');meter.setAttribute('aria-valuetext','No estimate');meter.removeAttribute('data-score');
  if(!pwd.value){label.textContent='Enter a password';hint.textContent='Local estimate. No online breach lookup.';return;}
  if(typeof zxcvbn!=='function'){label.textContent='Estimate unavailable';hint.textContent='Use a long, unique password. No online lookup is used.';return;}
  const result=zxcvbn(pwd.value.slice(0,128)),labels=['Very weak','Weak','Fair','Strong estimate','Very strong estimate'];
  label.textContent=labels[result.score];meter.dataset.score=result.score;meter.setAttribute('aria-valuenow',String(result.score));meter.setAttribute('aria-valuetext',labels[result.score]);bars.forEach((b,i)=>b.classList.toggle('filled',i<=result.score));
  const feedback=[result.feedback.warning,...result.feedback.suggestions].filter(Boolean).slice(0,2).join(' ');
  hint.textContent=(feedback||'An estimate, not a guarantee. Use a unique password.')+(pwd.value.length>128?' Estimate uses the first 128 characters.':'')+' No online breach lookup.';
}
function sync(){const lock=document.getElementById('tabLockMode').getAttribute('aria-pressed')==='true';document.getElementById('matchNote').textContent=lock&&confirm.value&&pwd.value!==confirm.value?'The passwords do not match.':'';toggle.textContent=pwd.type==='password'?'Show':'Hide';toggle.setAttribute('aria-label',pwd.type==='password'?'Show password':'Hide password');toggle.setAttribute('aria-pressed',String(pwd.type==='text'));clear.disabled=drop.getAttribute('aria-busy')==='true';strength(lock);}
drop.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&drop.getAttribute('aria-busy')!=='true'){e.preventDefault();document.getElementById('fileInput').click();}});
[pwd,confirm].forEach(el=>el.addEventListener('input',sync));toggle.addEventListener('click',sync);new MutationObserver(sync).observe(drop,{attributes:true,attributeFilter:['aria-busy']});
document.getElementById('tabLockMode').addEventListener('click',()=>{estimatedPassword=null;sync()});document.getElementById('tabUnlockMode').addEventListener('click',sync);clear.addEventListener('click',()=>{setMode(activeMode);estimatedPassword=null;sync()});
document.querySelector('[data-workspace-return]').addEventListener('click',e=>{e.preventDefault();const w=document.getElementById('workspace');w.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});w.focus({preventScroll:true});});sync();
})();
