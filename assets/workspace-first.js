(() => {
  const directory = document.getElementById('wfDirectory');
  if (directory) {
    const original = [...directory.children];
    const search = document.getElementById('wfSearch');
    const sort = document.getElementById('wfSort');
    let group = 'All';
    const render = () => {
      const query = search.value.trim().toLowerCase();
      const ordered = [...original];
      if (sort.value === 'name') ordered.sort((a,b) => a.querySelector('h3').textContent.localeCompare(b.querySelector('h3').textContent));
      let count = 0;
      ordered.forEach(card => {
        card.hidden = !((group === 'All' || card.dataset.group === group) && card.dataset.search.toLowerCase().includes(query));
        if (!card.hidden) count++;
        directory.append(card);
      });
      document.getElementById('wfCount').textContent = `${count} ${count === 1 ? 'tool' : 'tools'}`;
      document.getElementById('wfEmpty').hidden = count > 0;
    };
    search.addEventListener('input', render);
    sort.addEventListener('change', render);
    document.getElementById('wfSearchForm').addEventListener('submit', event => { event.preventDefault(); render(); });
    document.querySelectorAll('[data-wf-group]').forEach(button => button.addEventListener('click', () => {
      group = button.dataset.wfGroup;
      document.querySelectorAll('[data-wf-group]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.wfGroup === group)));
      render();
    }));
  }
  const workspace = document.querySelector('.hygiene-workspace');
  if (workspace) {
    const panel = workspace.children[1];
    panel.classList.add('wf-preview-panel');
    workspace.children[0].classList.add('wf-recipe-panel');
    const wrapper = panel.querySelector('.table-wrapper');
    wrapper.tabIndex = 0;
    wrapper.setAttribute('aria-label', 'Scrollable data preview');
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'btn btn-outline';
    button.id = 'wfExpand'; button.textContent = 'Expand table';
    panel.querySelector('.panel-header > div').prepend(button);
    const dialog = document.createElement('dialog'); dialog.className = 'wf-table-dialog';
    dialog.setAttribute('aria-label', 'Expanded data preview');
    const close = document.createElement('button'); close.type = 'button';
    close.className = 'btn btn-outline'; close.textContent = 'Close expanded view';
    dialog.append(close); document.body.append(dialog);
    const anchor = document.createComment('preview position'); wrapper.before(anchor);
    button.addEventListener('click', () => { dialog.append(wrapper); dialog.showModal(); });
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => { anchor.after(wrapper); button.focus(); });
  }
})();
