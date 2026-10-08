(function() {
  "use strict";
  const shell = window.parent !== window ? window.parent.TangentShell : null;
  if (!shell) return;
  const id = window.frameElement?.dataset.workspaceId || location.pathname.split("/").pop();
  const root = document.documentElement;
  root.dataset.embedded = "true";
  root.dataset.tool = location.pathname.split("/").pop();
  const polish = document.createElement("link");
  polish.rel = "stylesheet"; polish.href = "suite-polish.css";
  document.head.appendChild(polish);
  root.setAttribute("data-theme", shell.getTheme());
  const style = document.createElement("style");
  style.textContent = "[data-embedded] body{background:var(--bg-base)!important}[data-embedded] [id^=open-in-menu],[data-embedded] #btn-open-in-toggle,[data-embedded] .titlebar,[data-embedded] .app-layout>.sidebar{display:none!important}[data-embedded] .app-layout{padding:0!important;height:100vh!important;gap:0!important}[data-embedded] .workspace{border:0!important;border-radius:0!important;box-shadow:none!important}";
  document.head.appendChild(style);
  const parentTauri = window.parent.__TAURI__;
  const loadedCommands = /* @__PURE__ */ new Set([
    "process_massive_csv",
    "read_file_to_string_native",
    "read_launchpad_file",
    "get_csv_headers",
    "extract_financial_headers",
    "parse_financial_statements",
    "parse_logs",
    "execute_db_query",
    "connect_db",
    "load_dashboard_native",
    "fetch_live_url"
  ]);
  const changedCommands = /* @__PURE__ */ new Set(["execute_recipe", "execute_recipe_bulk", "extract_tables", "extract_structured"]);
  if (parentTauri) {
    const originalInvoke = parentTauri.core.invoke;
    window.__TAURI__ = { ...parentTauri, core: { ...parentTauri.core, invoke: async function(command, args) {
      const result = await originalInvoke(command, args);
      if (loadedCommands.has(command) && result !== null && result !== void 0 && result !== "" && (!Array.isArray(result) || result.length)) shell.updateState(id, { hasData: true });
      if (changedCommands.has(command)) shell.updateState(id, { hasData: true, dirty: true });
      if (!window._launchpadImporting && result && args) {
        if (["read_file_to_string_native", "process_massive_csv", "get_csv_headers"].includes(command)) {
          const path = args.path || args.filePath || args.file_path;
          if (path) shell.registerSource(id, [path]);
        } else if (["extract_financial_headers", "parse_logs"].includes(command) && args.files?.length) shell.registerSource(id, args.files);
      }
      return result;
    } } };
  }
  function applyTheme(theme) {
    if (root.getAttribute("data-theme") !== theme) root.setAttribute("data-theme", theme);
    if (window.monaco && window.sqlEditorInstance) window.monaco.editor.setTheme(theme === "light" ? "vs" : "tangent-dark");
    if (window.reRenderTangentCharts) window.reRenderTangentCharts();
  }
  window.TangentToolWorkspace = {
    applyTheme,
    setState: (state) => shell.updateState(id, state),
    showHome: () => shell.showHome(),
    csv: rows => shell.csv(rows)
  };
  window.addEventListener("error", (event) => shell.reportToolError(id, event.error || event.message));
  window.addEventListener("unhandledrejection", (event) => shell.reportToolError(id, event.reason));
  document.addEventListener("input", () => shell.updateState(id, { dirty: true }));
  document.addEventListener("change", (event) => {
    if (event.target?.type === "file" && event.target.files?.length) shell.updateState(id, { hasData: true });
    else shell.updateState(id, { dirty: true });
  });
  document.addEventListener("drop", (event) => {
    if (event.dataTransfer?.files.length) shell.updateState(id, { hasData: true });
  });
  document.addEventListener("click", (event) => {
    const target = event.target.closest?.("[onclick], a[href]");
    if (!target) return;
    const inline = target.getAttribute("onclick") || "";
    if (inline.includes("_openInTarget(")) {
      event.preventDefault(); event.stopImmediatePropagation(); shell.openIn(id); return;
    }
    const navigation = inline.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/);
    const url = navigation?.[1] || target.getAttribute("href");
    if (!url || !/^(?:[a-z-]+|index|launchpad)\.html$/.test(url)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (url === "launchpad.html") shell.showHome();
    else shell.open(url);
  }, true);
  window.addEventListener('DOMContentLoaded', () => {
    document.head.appendChild(polish);
    document.querySelectorAll('label').forEach(label => {
      if (label.htmlFor) return;
      const input = label.parentElement.querySelector('input[id],select[id],textarea[id]');
      if (input && label.parentElement.querySelectorAll('input,select,textarea').length === 1) label.htmlFor = input.id;
    });
    document.querySelectorAll('.accordion-header[onclick]').forEach(header => {
      header.setAttribute('role','button'); header.tabIndex=0;
      const sync = () => header.setAttribute('aria-expanded',String(header.classList.contains('active')));
      sync(); header.addEventListener('click',()=>queueMicrotask(sync));
      header.addEventListener('keydown', event => { if (event.key==='Enter'||event.key===' ') { event.preventDefault();header.click(); } });
    });
    document.querySelectorAll('button').forEach(button => {
      if (button.textContent.trim()==='×') button.setAttribute('aria-label','Close dialog');
      if (!button.getAttribute('aria-label') && !button.textContent.trim() && button.title) button.setAttribute('aria-label',button.title);
    });
  });
  const observer = new MutationObserver(() => {
    const theme = shell.getTheme();
    if (root.getAttribute("data-theme") !== theme) applyTheme(theme);
  });
  observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
})();
