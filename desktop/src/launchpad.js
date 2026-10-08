(async function() {
  "use strict";
  const routing = window.TangentRouting, grid = document.getElementById("tool-grid"), status = document.getElementById("launchpad-status"), chooser = document.getElementById("route-dialog"), choices = document.getElementById("route-choices"), dropzone = document.getElementById("global-dropzone");
  const invoke = window.__TAURI__?.core.invoke;
  let unlisten;
  try {
    sessionStorage.removeItem(routing.key);
  } catch (error) {
    report(error);
  }
  function report(error) {
    status.textContent = error?.message || String(error);
    status.setAttribute("role", "alert");
  }
  async function navigate(tool, paths = []) {
    try {
      if (chooser.open) chooser.close();
      await window.TangentShell.open(tool.id, paths);
    } catch (error) { report(error); }
  }
  function makeCard(tool, paths = []) {
    const card = document.createElement("a");
    card.className = "tool-card";
    card.href = tool.id;
    const icon = document.createElement("span");
    icon.className = "tool-icon";
    icon.innerHTML = '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' + routing.icons[tool.id] + '</svg>';
    const title = document.createElement("h2");
    title.textContent = tool.title;
    const desc = document.createElement("p");
    desc.textContent = tool.desc;
    const formats = document.createElement("span");
    formats.className = "formats";
    formats.textContent = tool.formats.join(" / ").toUpperCase();
    card.append(icon, title, desc, formats);
    card.addEventListener("click", (event) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      navigate(tool, paths);
    });
    return card;
  }
  function render() {
    grid.replaceChildren(...routing.tools.map(tool => makeCard(tool)));
  }
  function route(paths) {
    dropzone.classList.remove("dragover");
    const matches = routing.compatible(paths);
    if (!matches.length) {
      report("No tool can open this selection. Use CSV, TSV, XLSX, JSON, Parquet, LOG, TXT, GZ, or HTML files; all selected files must be supported by the same tool.");
      return;
    }
    status.textContent = "";
    if (matches.length === 1) {
      navigate(matches[0], paths);
      return;
    }
    document.getElementById("route-files").textContent = paths.map(routing.filename).join(", ");
    choices.replaceChildren(...matches.map((t) => makeCard(t, paths)));
    if (!chooser.open) chooser.showModal();
  }
  render();
  document.getElementById("cancel-route").addEventListener("click", () => chooser.close());
  chooser.addEventListener("close", () => {
    choices.replaceChildren();
    dropzone.focus();
  });
  document.getElementById("browse-files").addEventListener("click", async () => {
    if (!invoke) {
      report("Open Tangent Pro to choose or drop local files.");
      return;
    }
    try {
      const paths = await invoke("pick_launchpad_files");
      if (paths.length) route(paths);
    } catch (error) {
      report(error);
    }
  });
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const toggle = document.getElementById("theme-toggle");
    const label = theme === "light" ? "Switch to dark theme" : "Switch to light theme";
    toggle.title = label;
    toggle.setAttribute("aria-label", label);
    toggle.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (theme === "light" ? '<path d="M20.9 13a9 9 0 0 1-9.9-9.9A9 9 0 1 0 20.9 13Z"/>' : '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>') + '</svg>';
    window.TangentShell.synchronizeTheme();
  }
  try {
    applyTheme(localStorage.getItem("tangent_pro_theme") || "dark");
  } catch {
    applyTheme("dark");
  }
  document.getElementById("theme-toggle").addEventListener("click", () => {
    const theme = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    applyTheme(theme);
    try {
      localStorage.setItem("tangent_pro_theme", theme);
    } catch (error) {
      report(error);
    }
  });
  document.querySelectorAll("[data-command]").forEach((button) => button.addEventListener("click", async () => {
    try {
      if (button.dataset.command === 'close_window') await window.TangentShell.closeApp();
      else if (invoke) await invoke(button.dataset.command);
    } catch (error) {
      report(error);
    }
  }));
  document.addEventListener("dragover", (e) => e.preventDefault());
  document.addEventListener("drop", (e) => {
    e.preventDefault();
    if (!invoke) report("File routing is available inside Tangent Pro.");
  });
  if (invoke) {
    try {
      unlisten = await window.__TAURI__.webviewWindow.getCurrentWebviewWindow().onDragDropEvent((e) => {
        dropzone.classList.toggle("dragover", e.payload.type === "enter" || e.payload.type === "over");
        if (e.payload.type === "drop") route(e.payload.paths);
      });
    } catch (error) {
      report("Native drop could not start: " + (error?.message || error) + ". You can still use Choose files.");
    }
  }
  window.addEventListener("pagehide", () => {
    if (unlisten) unlisten();
  });
})();
