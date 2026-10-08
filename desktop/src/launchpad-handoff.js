(function() {
  "use strict";
  const routing = window.TangentRouting;
  function showError(error) {
    let box = document.getElementById("launchpad-import-error");
    if (!box) {
      box = document.createElement("div");
      box.id = "launchpad-import-error";
      box.setAttribute("role", "alert");
      box.style.cssText = "position:fixed;bottom:20px;left:20px;right:20px;padding:16px;background:var(--bg-surface);color:var(--text-main);border:1px solid var(--danger);border-radius:8px;z-index:10000";
      document.body.appendChild(box);
    }
    box.replaceChildren(document.createTextNode("Launchpad import failed: " + (error?.message || error) + ". "));
    const retry = document.createElement("button");
    retry.className = "btn";
    retry.textContent = "Retry";
    retry.onclick = () => receive();
    const dismiss = document.createElement("button");
    dismiss.className = "btn";
    dismiss.textContent = "Dismiss";
    dismiss.onclick = () => {
      sessionStorage.removeItem(routing.key);
      box.remove();
    };
    box.append(retry, dismiss);
  }
  let receiving = false;
  async function receive() {
    if (receiving) return;
    receiving = true;
    try {
      const raw = sessionStorage.getItem(routing.key);
      if (!raw) return;
      const handoff = JSON.parse(raw), page = location.pathname.split("/").pop();
      if (handoff.target !== page || Date.now() - handoff.createdAt > 3e5) {
        sessionStorage.removeItem(routing.key);
        return;
      }
      if (!Number.isFinite(handoff.createdAt) || handoff.createdAt > Date.now() || !routing.compatible(handoff.paths).some((t) => t.id === page)) throw Error("Invalid file selection. Return to Launchpad and choose your files again.");
      if (typeof window.launchpadImport !== "function") throw Error("This tool did not finish initializing.");
      await window.launchpadImport(handoff.paths);
      sessionStorage.removeItem(routing.key);
      document.getElementById("launchpad-import-error")?.remove();
    } catch (error) {
      showError(error);
    } finally {
      receiving = false;
    }
  }
  async function nativeFile(path) {
    const original = path;
    if (/\.(tsv|xlsx)$/i.test(path)) path = (await window.TangentTabular.prepare(path)).path;
    const bytes = await window.__TAURI__.core.invoke("read_launchpad_file", { path });
    const file = new File([new Uint8Array(bytes)], routing.filename(original).replace(/\.(tsv|xlsx)$/i, ".csv"));
    file.tabularId = (window._launchpadImporting ? window._tabularSnapshot?.tabularId : null) || window.TangentTabular?.metadata(path)?.tabularId;
    return file;
  }
  window.TangentLaunchpad = { nativeFile, showError };
  window.addEventListener("DOMContentLoaded", () => {
    if (window.TangentToolWorkspace) return;
    const home = document.createElement("a");
    home.href = "launchpad.html";
    home.className = "btn";
    home.textContent = "Launchpad";
    home.style.cssText = "text-decoration:none;flex-shrink:0;margin-right:12px";
    const target = document.querySelector(".title-left");
    if (target && getComputedStyle(target.closest(".titlebar")).display !== "none") target.prepend(home);
    else {
      home.style.cssText += ";position:fixed;top:8px;right:16px;z-index:9999";
      document.body.appendChild(home);
    }
    receive();
  });
})();
