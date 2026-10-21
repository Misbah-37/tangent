/* Shared website preference. Apply before paint; retain existing storage key. */
(() => {
  const root=document.documentElement;
  const media=window.matchMedia('(prefers-color-scheme: dark)');
  const valid=value=>['light','dark','system'].includes(value);
  let preference='system';
  try { const saved=localStorage.getItem('tangent_theme'); if(valid(saved))preference=saved; } catch(e) {}
  const resolved=()=>preference==='system'?(media.matches?'dark':'light'):preference;
  const apply=()=>{
    root.dataset.theme=resolved();
    root.dataset.themePreference=preference;
    document.querySelectorAll('[data-theme-choice]').forEach(select=>select.value=preference);
    window.dispatchEvent(new Event('themechange'));
  };
  const set=value=>{
    if(!valid(value))return;
    preference=value;
    try { localStorage.setItem('tangent_theme',value); } catch(e) {}
    apply();
  };
  window.TangentTheme={setPreference:set,getPreference:()=>preference,getResolved:resolved};
  media.addEventListener('change',()=>{if(preference==='system')apply();});
  window.addEventListener('storage',event=>{
    if(event.key==='tangent_theme'||event.key===null){preference=valid(event.newValue)?event.newValue:'system';apply();}
  });
  document.addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('[data-theme-choice]').forEach(select=>select.addEventListener('change',()=>set(select.value)));
    apply();
  });
  apply();
})();
