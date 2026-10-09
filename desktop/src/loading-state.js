(function () {
  'use strict';
  const pending = new Map();
  let overlay, title, elapsed, legacy, started = 0, timer;
  function refresh() {
    if (!overlay) return;
    const legacyActive = legacy && legacy.style.display !== 'none' && (legacy.style.display === 'flex' || legacy.style.opacity === '1');
    const active = legacyActive || pending.size > 0;
    if (active && overlay.hidden) {
      started = performance.now();
      elapsed.textContent = 'Elapsed: 0s';
      timer = setInterval(() => { elapsed.textContent = `Elapsed: ${Math.floor((performance.now() - started) / 1000)}s`; }, 1000);
    } else if (!active) { clearInterval(timer); timer = undefined; }
    overlay.hidden = !active;
    overlay.setAttribute('aria-hidden', String(!active));
    const operation = [...pending.values()].at(-1);
    overlay.classList.toggle('tangent-loading-pass-through', !legacyActive && operation?.blocking === false);
    const message = legacyActive ? document.getElementById('global-loader-text')?.textContent : operation?.message;
    const clean = (message || 'Processing data').trim().replace(/\.{3}$/, '');
    title.textContent = clean === clean.toUpperCase() ? clean.charAt(0) + clean.slice(1).toLowerCase() : clean;
  }
  window.TangentLoading = {
    begin(message, options = {}) { const token = Symbol(); pending.set(token, {message, blocking: options.blocking !== false}); refresh(); return token; },
    end(token) { pending.delete(token); refresh(); }
  };
  function init() {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'loading-state.css'; document.head.appendChild(css);
    overlay = document.createElement('div'); overlay.className = 'tangent-loading'; overlay.hidden = true; overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = '<div class="tangent-loading-card" role="status" aria-live="polite"><span class="tangent-loading-spinner" aria-hidden="true"></span><div><div class="tangent-loading-title"></div><p>Your data is being processed on this device.</p><span class="tangent-loading-elapsed" aria-live="off">Elapsed: 0s</span></div></div>';
    title = overlay.querySelector('.tangent-loading-title'); elapsed = overlay.querySelector('.tangent-loading-elapsed'); document.body.appendChild(overlay);
    legacy = document.getElementById('global-loader');
    if (legacy) new MutationObserver(refresh).observe(legacy, { attributes: true, childList: true, characterData: true, subtree: true });
    refresh();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
