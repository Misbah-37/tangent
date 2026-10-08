(function(root) {
  "use strict";
  const tools = [
    { id: "index.html", title: "Data Hygiene", desc: "Clean tabular datasets with reusable recipes.", formats: ["csv", "tsv", "xlsx"], maxFiles: 1, keywords: "clean deduplicate missing pipeline" },
    { id: "data-editor.html", title: "Tabular Editor", desc: "Inspect and edit dataset rows in a spreadsheet.", formats: ["csv", "tsv", "xlsx"], maxFiles: 1, keywords: "spreadsheet table edit" },
    { id: "csv-insights.html", title: "CSV Insights", desc: "Profile columns, build pivots, and explore charts.", formats: ["csv", "tsv", "xlsx"], maxFiles: 1, keywords: "profile pivot chart analysis" },
    { id: "sql-studio.html", title: "SQL Studio", desc: "Query local CSV, JSON, and Parquet files.", formats: ["csv", "tsv", "xlsx", "json", "parquet"], maxFiles: Infinity, keywords: "query database join duckdb" },
    { id: "correlation-matrix.html", title: "Correlation Matrix", desc: "Explore relationships between numeric columns.", formats: ["csv", "tsv", "xlsx"], maxFiles: 1, keywords: "pearson heatmap statistics" },
    { id: "finance-dashboard.html", title: "Finance Dashboard", desc: "Map statement columns and explore spending.", formats: ["csv", "tsv", "xlsx"], maxFiles: Infinity, keywords: "bank statement spending budget" },
    { id: "log-analyzer.html", title: "Log Analyzer", desc: "Analyze access logs and compressed log files.", formats: ["log", "txt", "gz"], maxFiles: Infinity, keywords: "apache nginx traffic errors" },
    { id: "data-extractor.html", title: "Data Extractor", desc: "Extract tables or selected fields from local HTML.", formats: ["html", "htm"], maxFiles: 1, keywords: "html extract scrape" }
  ];
  const filename = (path) => String(path).split(/[\\/]/).pop();
  function compatible(paths) {
    if (!Array.isArray(paths) || !paths.length || paths.some((p) => typeof p !== "string" || !p.trim())) return [];
    return tools.filter((t) => paths.length <= t.maxFiles && paths.every((p) => t.formats.includes(filename(p).split(".").pop().toLowerCase())));
  }
  function search(query) {
    const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return tools.filter((t) => words.every((w) => (t.title + " " + t.desc + " " + t.keywords + " " + t.formats.join(" ")).toLowerCase().includes(w)));
  }
  const icons = {"index.html": "<path d=\"m9 12 2 2 4-4\"/><path d=\"M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7z\"/>", "data-editor.html": "<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"3\"/><path d=\"M3 9h18M9 3v18M3 15h18\"/>", "csv-insights.html": "<path d=\"M4 20V10m8 10V4m8 16v-7M2 21h20\"/>", "sql-studio.html": "<ellipse cx=\"12\" cy=\"5\" rx=\"8\" ry=\"3\"/><path d=\"M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0\"/>", "correlation-matrix.html": "<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"3\"/><path d=\"M9 3v18M15 3v18M3 9h18M3 15h18\"/>", "finance-dashboard.html": "<path d=\"M12 2v20M17 6H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H6\"/>", "log-analyzer.html": "<path d=\"m4 5 6 7-6 7M13 19h7\"/>", "data-extractor.html": "<path d=\"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5\"/>"};
  const api = { icons, tools, compatible, filename, search, key: "tangent_launchpad_handoff" };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TangentRouting = api;
})(globalThis);
