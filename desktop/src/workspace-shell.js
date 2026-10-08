(function() {
  "use strict";
  const routing = window.TangentRouting;
  const panels = /* @__PURE__ */ new Map();
  const serials = new Map();
  const container = document.getElementById("workspace-panels");
  const home = document.getElementById("home-panel");
  const status = document.getElementById("workspace-status");
  const dialog = document.getElementById("workspace-confirm");
  let active = null;
  let visit = 0;
  let decision = null;
  let allowNativeClose = false;
  function report(error) {
    const full = error?.stack || error?.message || String(error);
    status.replaceChildren(document.createTextNode(String(full).split('\n')[0]));
    if (String(full).includes('\n')) {
      const details = document.createElement('details');
      const summary = document.createElement('summary'); summary.textContent = 'Technical details';
      const trace = document.createElement('pre'); trace.textContent = full;
      details.append(summary, trace); status.append(details);
    }
    status.hidden = false;
  }
  function confirmAction(title, message, label) {
    if (decision) return Promise.resolve(false);
    document.getElementById("confirm-title").textContent = title;
    document.getElementById("confirm-message").textContent = message;
    document.getElementById("confirm-accept").textContent = label;
    return new Promise((resolve) => {
      const focus = document.activeElement;
      decision = (value) => {
        decision = null;
        dialog.close();
        if (focus?.isConnected) focus.focus();
        resolve(value);
      };
      dialog.showModal();
      document.getElementById("confirm-cancel").focus();
    });
  }
  document.getElementById("confirm-cancel").addEventListener("click", () => decision?.(false));
  document.getElementById("confirm-accept").addEventListener("click", () => decision?.(true));
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    decision?.(false);
  });
  const toolButtons = new Map();
  const workspaceMenu = document.createElement('button');
  workspaceMenu.id = 'workspace-menu'; workspaceMenu.type = 'button'; workspaceMenu.className = 'btn'; workspaceMenu.hidden = true;
  workspaceMenu.title = 'Create, switch, or close workspaces'; workspaceMenu.setAttribute('aria-haspopup', 'dialog');
  workspaceMenu.innerHTML = 'Workspaces <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m6 9 6 6 6-6"/></svg>';
  document.getElementById('workspace-export').before(workspaceMenu);
  workspaceMenu.onclick = () => { if (active) chooseToolWorkspace(panels.get(active).tool.id, true); };
  for (const tool of routing.tools) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'tool-nav'; button.dataset.tool = tool.id;
    button.innerHTML = '<svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' + routing.icons[tool.id] + '</svg>';
    const label = document.createElement('span'); label.className = 'nav-label'; label.textContent = tool.title;
    const count = document.createElement('span'); count.className = 'tool-open-count'; count.hidden = true;
    button.append(label, count); button.onclick = () => chooseToolWorkspace(tool.id);
    toolButtons.set(tool.id, button); document.getElementById('permanent-tools').append(button);
  }
  function chooseToolWorkspace(toolId, force = false) {
    const matches = [...panels.values()].filter(panel => panel.tool.id === toolId);
    if (matches.length < 2 && !force) return open(toolId);
    if (!matches.length) return;
    let picker = document.getElementById('workspace-picker');
    if (!picker) {
      picker = document.createElement('dialog'); picker.id = 'workspace-picker';
      document.body.append(picker);
    }
    picker.replaceChildren();
    const heading = document.createElement('h2'); heading.id = 'workspace-picker-title'; heading.textContent = matches[0].tool.title + ' workspaces';
    picker.setAttribute('aria-labelledby', heading.id); picker.append(heading);
    const choices = document.createElement('div'); choices.className = 'workspace-picker-choices';
    for (const panel of matches) {
      const choice = document.createElement('button'); choice.type = 'button'; choice.className = 'btn'; choice.dataset.pickWorkspace = panel.id;
      choice.textContent = (panel.sourceLabel || panel.tool.title) + ' · Workspace ' + panel.serial + (active === panel.id ? ' (current)' : '') + (panel.dirty ? ' · Unsaved changes' : '');
      choice.onclick = () => { picker.close(); show(panel.id); };
      const row = document.createElement('div'); row.className = 'workspace-picker-row';
      const close = document.createElement('button'); close.type = 'button'; close.className = 'btn'; close.dataset.pickClose = panel.id;
      close.setAttribute('aria-label', 'Close workspace ' + panel.serial); close.title = 'Close workspace'; close.disabled = panel.busy;
      close.innerHTML = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m6 6 12 12M6 18 18 6"/></svg>';
      close.onclick = async () => { picker.close(); await closeWorkspace(panel.id); if ([...panels.values()].some(p => p.tool.id === toolId)) chooseToolWorkspace(toolId, true); };
      row.append(choice, close); choices.append(row);
    }
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'btn'; cancel.textContent = 'Cancel'; cancel.onclick = () => picker.close();
    const create = document.createElement('button'); create.type = 'button'; create.className = 'btn primary'; create.id = 'workspace-new'; create.textContent = 'New workspace';
    create.onclick = () => { picker.close(); open(toolId, [], {newWorkspace:true}).catch(report); };
    const actions = document.createElement('div'); actions.className = 'workspace-picker-actions'; actions.append(create, cancel);
    picker.append(choices, actions); picker.showModal();
  }

  function renderWorkspaces() {
    refreshWorkspaceTitle();
    for (const [toolId, button] of toolButtons) {
      const count = [...panels.values()].filter(panel => panel.tool.id === toolId).length;
      const current = active !== null && panels.get(active)?.tool.id === toolId;
      button.setAttribute('aria-pressed', String(current));
      button.setAttribute('aria-label', button.querySelector('.nav-label').textContent + (count ? ', ' + count + ' open workspace' + (count > 1 ? 's' : '') : ''));
      button.title = button.getAttribute('aria-label');
      const badge = button.querySelector('.tool-open-count'); badge.textContent = count; badge.hidden = count === 0;
    }
  }
  function refreshWorkspaceTitle() {
    const panel = panels.get(active);
    const title = document.getElementById("active-workspace-title");
    title.textContent = panel ? panel.tool.title + " · Workspace " + panel.serial + (panel.sourceLabel ? " / " + panel.sourceLabel : "") + (panel.dirty ? " · Unsaved changes" : "") : "Launchpad";
    title.title = title.textContent;
    title.dataset.hasData = String(!!panel?.hasData);
  }
  function applyPanelTheme(panel) {
    try {
      const theme = document.documentElement.getAttribute("data-theme") || "dark";
      const child = panel.frame.contentWindow;
      if (child.TangentToolWorkspace) child.TangentToolWorkspace.applyTheme(theme);
      else child.document.documentElement.setAttribute("data-theme", theme);
    } catch (error) {
      report(error);
    }
  }
  function show(id = null) {
    if (id !== null && !panels.has(id)) return;
    active = id;
    if (id) panels.get(id).lastVisit = ++visit;
    if (id && window.innerWidth <= 760) {
      document.getElementById("shell-sidebar").classList.add("is-collapsed");
      document.getElementById("toolkit-toggle").setAttribute("aria-expanded", "false");
    }
    home.hidden = id !== null;
    document.querySelector('.shell-workspace-bar').hidden = id === null;
    container.hidden = id === null;
    for (const [key, panel] of panels) {
      panel.frame.hidden = key !== id;
      if (key === id) {
        applyPanelTheme(panel);
        panel.frame.contentWindow.dispatchEvent(new Event("resize"));
      }
    }
    document.getElementById("shell-home").setAttribute("aria-pressed", String(id === null));
    refreshWorkspaceTitle();
    status.hidden = true;
    document.getElementById("workspace-open-in").hidden = id === null;
    document.getElementById("workspace-export").hidden = id === null;
    workspaceMenu.hidden = id === null;
    if (id && panels.get(id).error) report(panels.get(id).error);
    renderWorkspaces();
  }
  function createPanel(tool, workspaceId = tool.id) {
    const frame = document.createElement("iframe");
    frame.id = "frame-" + workspaceId;
    frame.dataset.workspaceId = workspaceId;
    frame.title = tool.title + " workspace";
    frame.className = "tool-panel";
    frame.hidden = true;
    const panel = { tool, frame, hasData: false, dirty: false, busy: false, error: null };
    panel.id = workspaceId;
    panel.serial = (serials.get(tool.id) || 0) + 1;
    serials.set(tool.id, panel.serial);
    panels.set(workspaceId, panel);
    panel.ready = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(tool.title + " did not load within 30 seconds.")), 3e4);
      panel.cancelLoadTimer = () => clearTimeout(timer);
      frame.addEventListener("load", () => {
        clearTimeout(timer);
        applyPanelTheme(panel);
        resolve(panel);
      }, { once: true });
      frame.addEventListener("error", () => {
        clearTimeout(timer);
        reject(new Error("Could not open " + tool.title + "."));
      }, { once: true });
    });
    panel.ready.catch((error) => reportToolError(workspaceId, error));
    frame.src = tool.id;
    container.appendChild(frame);
    return panel;
  }
  async function open(id, paths = [], options = {}) {
    const tool = routing.tools.find((item) => item.id === id);
    if (!tool) {
      report("This tool is not available in Tangent Pro yet.");
      return false;
    }
    if (paths.length && !routing.compatible(paths).some((item) => item.id === id)) {
      report("This file selection is not supported by " + tool.title + ".");
      return false;
    }
    if (!paths.length && !options.newWorkspace) {
      const recent = [...panels.values()].filter(panel => panel.tool.id === id).sort((a, b) => (b.lastVisit || 0) - (a.lastVisit || 0))[0];
      if (recent) { show(recent.id); return true; }
    }
    const workspaceId = options.newWorkspace ? id + "::" + crypto.randomUUID() : id;
    let panel = panels.get(workspaceId);
    if (panel?.busy && paths.length) {
      report("Wait for this workspace to finish loading before replacing its data.");
      return false;
    }
    if (paths.length && panel && (panel.hasData || panel.dirty)) {
      const accepted = await confirmAction(
        "Replace data in " + tool.title + "?",
        "This workspace already contains data or changes. Loading these files will replace its current working data. Other tools will stay open.",
        "Replace data"
      );
      if (!accepted) return false;
      if (panel.busy) {
        report("This workspace is currently loading data.");
        return false;
      }
    }
    if (!panel) panel = createPanel(tool, workspaceId);
    show(workspaceId);
    if (!paths.length) return true;
    panel.busy = true;
    renderWorkspaces();
    try {
      await panel.ready;
      const child = panel.frame.contentWindow;
      if (typeof child.launchpadImport !== "function") throw new Error(tool.title + " did not initialize its file import handler.");
      child._tabularSnapshot = options.snapshot || null;
      await child.launchpadImport(paths);
      panel.datasetId = options.snapshot?.datasetId || window.TangentDatasets.registerSource(paths);
      panel.snapshot = options.snapshot || null;
      panel.sourceLabel = options.snapshot?.label || paths.map(routing.filename).join(", ");
      refreshWorkspaceTitle();
      panel.hasData = true;
      panel.dirty = false;
      panel.error = null;
      status.hidden = true;
      return true;
    } catch (error) {
      if (error?.name === "AbortError") { status.hidden = true; return false; }
      reportToolError(workspaceId, error);
      if (options.snapshot) throw error;
      return false;
    } finally {
      panel.busy = false;
      renderWorkspaces();
    }
  }
  async function closeWorkspace(id) {
    const panel = panels.get(id);
    if (!panel) return;
    if (panel.busy) {
      report("Wait for this workspace to finish loading before closing it.");
      return;
    }
    if (panel.hasData || panel.dirty) {
      const accepted = await confirmAction(
        "Close " + panel.tool.title + "?",
        "Closing this workspace discards its loaded data, settings, and unsaved work. Switching tools or returning to the launchpad keeps it open.",
        "Close workspace"
      );
      if (!accepted) return;
      if (panel.busy) {
        report("This workspace is currently loading data.");
        return;
      }
    }
    panel.cancelLoadTimer?.();
    panel.frame.remove();
    panels.delete(id);
    if (active === id) show();
    else renderWorkspaces();
  }
  function updateState(id, state) {
    const panel = panels.get(id);
    if (!panel) return;
    if ((typeof state.hasData !== "boolean" || panel.hasData === state.hasData) && (typeof state.dirty !== "boolean" || panel.dirty === state.dirty)) return;
    if (typeof state.hasData === "boolean") panel.hasData = state.hasData;
    if (typeof state.dirty === "boolean") panel.dirty = state.dirty;
    if (state.hasData === false) { panel.sourceLabel = null; panel.snapshot = null; panel.datasetId = null; }
    renderWorkspaces();
  }
  function reportToolError(id, error) {
    const panel = panels.get(id);
    if (panel) panel.error = error?.stack || error?.message || String(error);
    if (active === id) report(panel?.error || error);
  }
  async function mayCloseApp() {
    if ([...panels.values()].some((panel) => panel.busy)) {
      report("Wait for file loading to finish before closing Tangent Pro.");
      return false;
    }
    if (![...panels.values()].some((panel) => panel.hasData || panel.dirty)) return true;
    return confirmAction("Close Tangent Pro?", "Your open workspaces contain loaded data or changes. Save any results you need before closing the app.", "Close app");
  }
  async function closeApp() {
    if (!await mayCloseApp()) return;
    allowNativeClose = true;
    try {
      await window.__TAURI__?.core.invoke("close_window");
    } catch (error) {
      allowNativeClose = false;
      report(error);
    }
  }
  function synchronizeTheme() {
    for (const panel of panels.values()) applyPanelTheme(panel);
  }
  const transferDialog = document.getElementById("open-in-dialog");
  let transferSource = null;
  async function transfer(targetId) {
    const source = panels.get(transferSource);
    if (!source || source.busy) return;
    const mode = document.getElementById("open-in-mode").value;
    source.busy = true;
    renderWorkspaces();
    document.querySelectorAll("#open-in-choices button, #open-in-cancel, #open-in-mode").forEach(button => button.disabled = true);
    try {
      const child = source.frame.contentWindow;
      child.document.activeElement?.blur();
      if (typeof child.tangentCurrentResult !== "function") throw new Error("This tool has not initialized its current-result exporter.");
      const snapshot = await window.TangentDatasets.capture(child.tangentCurrentResult, source.datasetId, source.snapshot?.id || null);
      source.datasetId = snapshot.datasetId;
      // Close before opening the replacement confirmation: modal dialogs must not overlap.
      transferDialog.close();
      const accepted = await open(targetId, [snapshot.path], { newWorkspace: mode === "new" && panels.has(targetId), snapshot });
      if (!accepted) show(source.id);
    } catch (error) {
      show(source.id);
      document.getElementById("open-in-error").textContent = error?.message || String(error);
      if (!transferDialog.open) transferDialog.showModal();
    } finally {
      source.busy = false;
      document.querySelectorAll("#open-in-choices button, #open-in-cancel, #open-in-mode").forEach(button => button.disabled = false);
      renderWorkspaces();
    }
  }
  function openIn(id = active) {
    const source = panels.get(id);
    if (!source || source.busy) return;
    transferSource = id;
    document.getElementById("open-in-description").textContent = "From " + source.tool.title + ": current exported result. Analysis tools transfer their results, rather than the original input file.";
    document.getElementById("open-in-error").textContent = "";
    document.getElementById("open-in-mode").value = "new";
    const choices = document.getElementById("open-in-choices");
    choices.replaceChildren();
    for (const tool of routing.compatible(["result.csv"]).filter(tool => tool.id !== source.tool.id)) {
      const button = document.createElement("button");
      button.type = "button"; button.className = "btn"; button.dataset.transferTarget = tool.id;
      button.textContent = tool.title; button.onclick = () => transfer(tool.id);
      choices.append(button);
    }
    transferDialog.showModal();
  }
  document.getElementById('workspace-export').onclick = async () => {
    const source = panels.get(active);
    if (!source || source.busy) return;
    try {
      source.frame.contentWindow.document.activeElement?.blur();
      await window.TangentTabular.exportResult(await source.frame.contentWindow.tangentCurrentResult(), 'tangent_result.csv');
    } catch(error) { report(error); }
  };
  document.getElementById("workspace-open-in").onclick = () => openIn();
  document.getElementById("open-in-cancel").onclick = () => transferDialog.close();
  transferDialog.addEventListener("cancel", event => { if (panels.get(transferSource)?.busy) event.preventDefault(); });
  function registerSource(id, paths) {
    const panel = panels.get(id);
    // The shell attaches transferred lineage after its import completes.
    if (!panel || panel.busy) return;
    panel.datasetId = window.TangentDatasets.registerSource(paths);
    panel.snapshot = null;
    panel.sourceLabel = paths.map(routing.filename).join(", ");
    renderWorkspaces();
  }
  window.TangentShell = { open, openIn, registerSource, csv: rows => window.TangentDatasets.csv(rows), showHome: () => show(), closeWorkspace, closeApp, updateState, reportToolError, synchronizeTheme, getTheme: () => document.documentElement.getAttribute("data-theme") || "dark" };
  document.getElementById("shell-home").addEventListener("click", () => show());
  document.getElementById("brand-home").addEventListener("click", () => show());
  document.getElementById("toolkit-toggle").addEventListener("click", () => {
    const sidebar = document.getElementById("shell-sidebar");
    const collapsed = sidebar.classList.toggle("is-collapsed");
    document.getElementById("toolkit-toggle").setAttribute("aria-expanded", String(!collapsed));
  });
  window.addEventListener("beforeunload", (event) => {
    if (!allowNativeClose && [...panels.values()].some((panel) => panel.hasData || panel.dirty || panel.busy)) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  if (window.__TAURI__?.window) {
    window.__TAURI__.window.getCurrentWindow().onCloseRequested(async (event) => {
      if (allowNativeClose) return;
      if (!await mayCloseApp()) event.preventDefault();
      else allowNativeClose = true;
    }).catch(report);
  }
  if (window.innerWidth <= 760) {
    document.getElementById("shell-sidebar").classList.add("is-collapsed");
    document.getElementById("toolkit-toggle").setAttribute("aria-expanded", "false");
  }
  const smallScreen = matchMedia('(max-width:760px)');
  smallScreen.addEventListener('change', event => {
    if (event.matches) {
      document.getElementById('shell-sidebar').classList.add('is-collapsed');
      document.getElementById('toolkit-toggle').setAttribute('aria-expanded','false');
    }
  });
  show();
})();
