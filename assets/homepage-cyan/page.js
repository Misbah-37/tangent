(() => {
  const input = document.querySelector('#tool-search');
  const results = document.querySelector('#search-results');
  const status = document.querySelector('#search-status');
  const menu = document.querySelector('.menu-button');
  const navigation = document.querySelector('#navigation');
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    navigation.classList.toggle('open', open);
    menu.querySelector('span').textContent = open ? '−' : '+';
  });
  navigation.addEventListener('click', e => {
    if (!e.target.closest('a')) return;
    navigation.classList.remove('open');
    menu.setAttribute('aria-expanded', 'false');
    menu.querySelector('span').textContent = '+';
  });
  function showMatches() {
    const query = input.value.trim().toLowerCase();
    results.replaceChildren();
    if (!query) { results.hidden = true; status.textContent = ''; return; }
    const words = query.split(/\s+/);
    const matches = window.RunTangentCatalog.filter(tool => words.every(word => tool.search.includes(word)));
    for (const tool of matches.slice(0, 6)) {
      const link = document.createElement('a');
      link.className = 'result-link';
      link.href = '/' + tool.filename.replace(/\.html$/, '');
      const text = document.createElement('span');
      text.textContent = tool.title;
      const category = document.createElement('small');
      category.textContent = tool.category;
      text.append(category);
      const arrow = document.createElement('span');
      arrow.textContent = '↗'; arrow.setAttribute('aria-hidden', 'true');
      link.append(text, arrow); results.append(link);
    }
    if (!matches.length) {
      const note = document.createElement('p'); note.className = 'no-results';
      note.textContent = 'No matching tools. Try “PDF”, “CSV” or “image”.'; results.append(note);
    }
    status.textContent = matches.length ? `${matches.length} matching tools${matches.length > 6 ? ', showing the first 6' : ''}.` : 'No matching tools.';
    results.hidden = false;
  }
  input.addEventListener('input', showMatches);
  input.addEventListener('focus', showMatches);
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    results.hidden = true;
    if (navigation.classList.contains('open')) { menu.click(); menu.focus(); }
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.search-area')) results.hidden = true;
  });
})();
