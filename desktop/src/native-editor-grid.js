(function(global) {
  'use strict';
  class NativeEditorGrid {
    constructor(metadata, options) {
      Object.assign(this, options);
      this.id = metadata.tabularId; this.columns = metadata.columns; this.rowCount = metadata.rowCount;
      this.pages = new Map(); this.requests = new Map(); this.pageSize = Math.max(1,Math.min(128,Math.floor(32768/this.columns.length))); this.version = 0; this.disposed = false;
      this.pendingEdits = new Set(); this.editErrors = new Map(); this.commit = null;
    }
    async page(offset) {
      if (this.pages.has(offset)) return this.pages.get(offset);
      if (!this.requests.has(offset)) {
        const request = this.invoke('read_editor_page', {id:this.id, offset, limit:this.pageSize}).then(result => {
          if (result.offset !== offset || !Array.isArray(result.rows) || result.rows.length > this.pageSize) throw new Error('Invalid native grid page');
          if (!this.disposed) {
            this.pages.set(offset, result.rows);
            while (this.pages.size > 8) this.pages.delete(this.pages.keys().next().value);
          }
          return result.rows;
        }).finally(() => this.requests.delete(offset));
        this.requests.set(offset, request);
      }
      return this.requests.get(offset);
    }
    render() {
      ++this.version;
      if (this.rendering) { this.needsRender = true; return this.rendering; }
      this.rendering = this.paint(this.version).finally(() => {
        this.rendering = null;
        if (this.needsRender && !this.disposed) { this.needsRender = false; this.render(); }
      });
      return this.rendering;
    }
    async paint(version) {
      if (this.disposed) return;
      const start = Math.min(Math.floor(this.container.scrollTop / this.rowHeight), Math.max(0,this.rowCount-1));
      const end = Math.min(this.rowCount, start + Math.ceil(this.container.clientHeight / this.rowHeight) + 2);
      const offsets = [];
      for (let offset = Math.floor(start/this.pageSize)*this.pageSize; offset < end; offset += this.pageSize) offsets.push(offset);
      try {
        const batches = await Promise.all(offsets.map(offset => this.page(offset)));
        if (this.disposed || version !== this.version) return;
        const fragment = document.createDocumentFragment();
        for (let rowIndex = start; rowIndex < end; rowIndex++) {
          const offset = Math.floor(rowIndex/this.pageSize)*this.pageSize;
          const values = batches[offsets.indexOf(offset)][rowIndex-offset];
          const row = document.createElement('div'); row.className = 'grid-row'; row.style.top = (rowIndex*this.rowHeight+this.rowHeight)+'px';
          const gutter = document.createElement('div'); gutter.className = 'grid-cell grid-gutter'; gutter.textContent = rowIndex+1; row.append(gutter);
          values.forEach((typed,column) => {
            const cell = document.createElement('div'); cell.className = 'grid-cell'; cell.style.width = this.widths[column]+'px';
            cell.textContent = typed.kind === 'null' ? '' : String(typed.value); cell.title = cell.textContent;
            cell.ondblclick = () => this.edit(cell,typed,rowIndex,column,offset,values);
            row.append(cell);
          });
          fragment.append(row);
        }
        this.viewport.replaceChildren(fragment);
      } catch (error) { if (!this.disposed && version === this.version) this.report(error); }
    }
    edit(cell, original, row, column, offset, values) {
      if (this.disposed || this.pendingEdits.size || cell.querySelector('input')) return;
      this.commit?.();
      const input = document.createElement('input'); input.value = original.kind === 'null' ? '' : String(original.value);
      cell.classList.add('editing'); cell.replaceChildren(input);
      let committed = false;
      const commit = () => {
        if (committed) return;
        committed = true;
        if (input.value === (original.kind === 'null' ? '' : String(original.value))) { this.commit = null; this.render(); return; }
        let value = {kind:'text',value:input.value};
        if (original.kind === 'number' && /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(input.value) && Number.isFinite(Number(input.value))) value = {kind:'number',value:Number(input.value)};
        if (original.kind === 'boolean' && /^(true|false)$/.test(input.value)) value = {kind:'boolean',value:input.value === 'true'};
        input.disabled = true;
        const pending = this.invoke('edit_editor_cell',{id:this.id,row,column,value}).then(() => {
          values[column] = value; this.editErrors.delete(row+':'+column); this.changed();
          if (this.commit === commit) this.commit = null;
          if (!this.disposed) this.render();
        }).catch(error => {
          this.editErrors.set(row+':'+column,error); committed = false; input.disabled = false; input.setAttribute('aria-invalid','true'); this.report(error);
        }).finally(() => this.pendingEdits.delete(pending));
        this.pendingEdits.add(pending);
      };
      this.commit = commit;
      input.onblur = commit;
      input.onkeydown = event => {
        if (event.key === 'Enter') { event.preventDefault(); commit(); }
        if (event.key === 'Escape' && !input.disabled) { committed = true; this.commit = null; this.editErrors.delete(row+':'+column); this.render(); }
      };
      input.focus(); input.select();
    }
    async flush() {
      this.commit?.();
      await Promise.all([...this.pendingEdits]);
      if (this.editErrors.size) throw this.editErrors.values().next().value;
    }
    async release() {
      this.disposed = true; this.commit = null; ++this.version; this.pages.clear();
      await Promise.all([...this.pendingEdits]);
      await this.invoke('release_editor_dataset',{id:this.id});
    }
  }
  global.NativeEditorGrid = NativeEditorGrid;
})(window);
