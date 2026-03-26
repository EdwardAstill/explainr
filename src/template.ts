import { escapeHtml as escape } from "./utils";

export function htmlPage(nav: string, content: string, title: string, basePath?: string, liveMode = false): string {
  const baseTag = basePath ? `\n  <base href="${escape(basePath)}">` : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">${baseTag}
  <title>${escape(title)} - explainr</title>
  <style>
    /* Reset */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --sidebar-width: 260px;
      --color-bg: #ffffff;
      --color-sidebar-bg: #f6f8fa;
      --color-border: #d0d7de;
      --color-text: #1f2328;
      --color-text-muted: #656d76;
      --color-link: #0969da;
      --color-active-bg: #ddf4ff;
      --color-code-bg: #f6f8fa;
      --font-body: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
      --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
    }

    body {
      font-family: var(--font-body);
      font-size: 16px;
      line-height: 1.5;
      color: var(--color-text);
      background: var(--color-bg);
      display: flex;
      min-height: 100vh;
    }

    /* Sidebar */
    .sidebar {
      width: var(--sidebar-width);
      min-width: var(--sidebar-width);
      border-right: 1px solid var(--color-border);
      background: var(--color-sidebar-bg);
      padding: 16px 0;
      overflow-y: auto;
      position: sticky;
      top: 0;
      height: 100vh;
    }

    .sidebar-title {
      font-size: 14px;
      font-weight: 600;
      padding: 0 16px 12px;
      color: var(--color-text);
      border-bottom: 1px solid var(--color-border);
      margin-bottom: 8px;
    }

    .sidebar-nav ul {
      list-style: none;
      padding-left: 0;
    }

    .sidebar-nav > ul > li > ul {
      padding-left: 0;
    }

    .sidebar-nav ul ul {
      padding-left: 12px;
    }

    .sidebar-nav li {
      margin: 0;
    }

    .sidebar-nav a {
      display: block;
      padding: 4px 16px;
      color: var(--color-text);
      text-decoration: none;
      font-size: 14px;
      border-radius: 6px;
      margin: 1px 8px;
    }

    .sidebar-nav a:hover {
      background: var(--color-border);
    }

    .sidebar-nav .active > a {
      background: var(--color-active-bg);
      color: var(--color-link);
      font-weight: 500;
    }

    .sidebar-nav details > summary {
      padding: 4px 16px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      list-style: none;
      margin: 1px 8px;
      border-radius: 6px;
      color: var(--color-text);
    }

    .sidebar-nav details > summary:hover {
      background: var(--color-border);
    }

    .sidebar-nav details > summary::before {
      content: "\\25B6";
      font-size: 10px;
      margin-right: 6px;
      display: inline-block;
      transition: transform 0.15s;
    }

    .sidebar-nav details[open] > summary::before {
      transform: rotate(90deg);
    }

    /* Main content */
    .main {
      flex: 1;
      min-width: 0;
      max-width: 880px;
      margin: 0 auto;
      padding: 32px 40px;
    }

    /* GitHub Markdown styles */
    .markdown-body h1 { font-size: 2em; padding-bottom: 0.3em; border-bottom: 1px solid var(--color-border); margin-bottom: 16px; margin-top: 24px; }
    .markdown-body h2 { font-size: 1.5em; padding-bottom: 0.3em; border-bottom: 1px solid var(--color-border); margin-bottom: 16px; margin-top: 24px; }
    .markdown-body h3 { font-size: 1.25em; margin-bottom: 16px; margin-top: 24px; }
    .markdown-body h4 { font-size: 1em; margin-bottom: 16px; margin-top: 24px; }

    .markdown-body p { margin-bottom: 16px; }
    .markdown-body ul, .markdown-body ol { padding-left: 2em; margin-bottom: 16px; }
    .markdown-body li + li { margin-top: 4px; }
    .markdown-body blockquote {
      padding: 0 1em;
      color: var(--color-text-muted);
      border-left: 3px solid var(--color-border);
      margin-bottom: 16px;
    }

    .markdown-body a { color: var(--color-link); text-decoration: none; }
    .markdown-body a:hover { text-decoration: underline; }

    .markdown-body code {
      background: var(--color-code-bg);
      padding: 0.2em 0.4em;
      border-radius: 6px;
      font-size: 85%;
      font-family: var(--font-mono);
    }

    .markdown-body pre {
      background: var(--color-code-bg);
      padding: 16px;
      border-radius: 6px;
      overflow-x: auto;
      margin-bottom: 16px;
      line-height: 1.45;
    }

    .markdown-body pre code {
      background: none;
      padding: 0;
      font-size: 85%;
    }

    .markdown-body table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 16px;
    }

    .markdown-body th, .markdown-body td {
      border: 1px solid var(--color-border);
      padding: 6px 13px;
    }

    .markdown-body th {
      background: var(--color-sidebar-bg);
      font-weight: 600;
    }

    .markdown-body img {
      max-width: 100%;
    }

    .markdown-body hr {
      border: none;
      border-top: 1px solid var(--color-border);
      margin: 24px 0;
    }

    /* Executable code blocks */
    .exec-block {
      border: 1px solid var(--color-border);
      border-radius: 6px;
      margin-bottom: 16px;
      overflow: hidden;
    }

    .exec-block-header {
      background: var(--color-sidebar-bg);
      padding: 4px 12px;
      font-size: 12px;
      font-family: var(--font-mono);
      color: var(--color-text-muted);
      border-bottom: 1px solid var(--color-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .exec-run-btn {
      background: #2da44e;
      color: #fff;
      border: none;
      padding: 2px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-family: var(--font-body);
      cursor: pointer;
      font-weight: 500;
    }

    .exec-run-btn:hover {
      background: #218838;
    }

    .exec-run-btn:disabled {
      background: var(--color-text-muted);
      cursor: not-allowed;
    }

    .exec-output {
      font-family: var(--font-mono);
      font-size: 13px;
      line-height: 1.45;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .exec-output:not(:empty) {
      padding: 12px 16px;
      border-top: 1px solid var(--color-border);
      background: #fff;
    }

    .exec-output .exec-stdout {
      color: var(--color-text);
    }

    .exec-output .exec-stderr {
      color: #cf222e;
    }

    .exec-loading {
      color: var(--color-text-muted);
      font-style: italic;
    }

    .exec-output img {
      max-width: 100%;
      margin-top: 8px;
      border-radius: 4px;
    }

    .file-upload {
      position: fixed;
      top: 12px;
      right: 56px;
      z-index: 100;
    }

    .file-upload__btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 1px solid var(--color-border);
      background: var(--color-sidebar-bg);
      color: var(--color-text-muted);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .file-upload__btn:hover {
      background: var(--color-border);
      color: var(--color-text);
    }

    .file-upload__status {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      white-space: nowrap;
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 13px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      display: none;
    }

    .exec-block pre {
      margin: 0;
      border-radius: 0;
    }

    /* highlight.js GitHub theme */
    .hljs { background: var(--color-code-bg); color: var(--color-text); }
    .hljs-comment, .hljs-quote { color: #6e7781; }
    .hljs-keyword, .hljs-selector-tag, .hljs-type { color: #cf222e; }
    .hljs-string, .hljs-addition { color: #0a3069; }
    .hljs-number, .hljs-literal { color: #0550ae; }
    .hljs-built_in { color: #8250df; }
    .hljs-title, .hljs-section { color: #8250df; }
    .hljs-attr, .hljs-attribute { color: #0550ae; }
    .hljs-name, .hljs-tag { color: #116329; }
    .hljs-deletion { color: #82071e; background: #ffebe9; }

    /* Settings */
    .settings {
      position: fixed;
      top: 12px;
      right: 12px;
      z-index: 100;
    }

    .settings__toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 1px solid var(--color-border);
      background: var(--color-sidebar-bg);
      color: var(--color-text-muted);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .settings__toggle:hover {
      background: var(--color-border);
      color: var(--color-text);
    }

    .settings__panel {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 220px;
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 12px;
      display: none;
      flex-direction: column;
      gap: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    }

    .settings__panel.open { display: flex; }

    .settings__section {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .settings__label {
      font-size: 11px;
      font-weight: 600;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .settings__font-sizes {
      display: flex;
      gap: 6px;
    }

    .settings__font-btn {
      flex: 1;
      padding: 4px;
      background: var(--color-sidebar-bg);
      border: 1px solid var(--color-border);
      border-radius: 4px;
      cursor: pointer;
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--color-text-muted);
      transition: all 0.12s;
    }

    .settings__font-btn:hover {
      border-color: var(--color-text-muted);
      color: var(--color-text);
    }

    .settings__font-btn--active {
      border-color: var(--color-link);
      color: var(--color-link);
    }

    .settings__range {
      width: 100%;
      accent-color: var(--color-link);
      cursor: pointer;
    }

    .settings__toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
    }

    .settings__switch {
      position: relative;
      width: 36px;
      height: 20px;
      background: var(--color-border);
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.2s;
      padding: 0;
    }

    .settings__switch--on {
      background: var(--color-link);
    }

    .settings__switch-thumb {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 16px;
      height: 16px;
      background: white;
      border-radius: 50%;
      transition: transform 0.2s;
    }

    .settings__switch--on .settings__switch-thumb {
      transform: translateX(16px);
    }
  </style>
</head>
<body${liveMode ? ' data-live="true"' : ''}>
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-title">explainr</div>
    ${nav}
  </aside>
  <main class="main" id="main-content">
    <article class="markdown-body">
      ${content}
    </article>
  </main>

${liveMode ? `  <div class="file-upload" id="file-upload">
    <button class="file-upload__btn" id="file-upload-btn" aria-label="Upload file" title="Upload file">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
    </button>
    <input type="file" id="file-upload-input" style="display:none">
    <div class="file-upload__status" id="file-upload-status"></div>
  </div>` : ''}
  <div class="settings" id="settings">
    <button class="settings__toggle" id="settings-toggle" aria-label="Settings" title="Settings">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </button>
    <div class="settings__panel" id="settings-panel">
      <div class="settings__section">
        <span class="settings__label">Font size</span>
        <div class="settings__font-sizes">
          <button class="settings__font-btn" data-font="small">S</button>
          <button class="settings__font-btn settings__font-btn--active" data-font="medium">M</button>
          <button class="settings__font-btn" data-font="large">L</button>
        </div>
      </div>
      <div class="settings__section">
        <span class="settings__label" id="width-label">Content width — 880px</span>
        <input class="settings__range" id="width-range" type="range" min="500" max="1400" step="20" value="880">
      </div>
      <div class="settings__section">
        <div class="settings__toggle-row">
          <span class="settings__label">Show sidebar</span>
          <button class="settings__switch settings__switch--on" id="sidebar-toggle" role="switch" aria-checked="true">
            <span class="settings__switch-thumb"></span>
          </button>
        </div>
      </div>
    </div>
  </div>
  <script type="module">
    const isLiveMode = document.body.dataset.live === "true";

    let pyodide = null;
    let pyodideLoading = null;

    async function loadPyodideRuntime() {
      if (pyodide) return pyodide;
      if (pyodideLoading) return pyodideLoading;
      pyodideLoading = (async () => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js";
        document.head.appendChild(script);
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });
        pyodide = await globalThis.loadPyodide();
        return pyodide;
      })();
      return pyodideLoading;
    }

    async function runLive(code, btn, outputEl) {
      btn.disabled = true;
      btn.textContent = "Running...";
      outputEl.innerHTML = "";

      try {
        const res = await fetch("/api/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const data = await res.json();

        let html = "";
        if (data.stdout) html += \`<span class="exec-stdout">\${escapeHtml(data.stdout)}</span>\`;
        if (data.stderr) html += \`<span class="exec-stderr">\${escapeHtml(data.stderr)}</span>\`;
        if (data.images && data.images.length > 0) {
          for (const img of data.images) {
            html += \`<img src="data:\${img.mime};base64,\${img.data}" alt="\${escapeHtml(img.name)}">\`;
          }
        }
        outputEl.innerHTML = html || \`<span class="exec-stdout" style="color: var(--color-text-muted)">(no output)</span>\`;
      } catch (err) {
        outputEl.innerHTML = \`<span class="exec-stderr">Error: \${escapeHtml(err.message)}</span>\`;
      }

      btn.disabled = false;
      btn.textContent = "Run";
    }

    async function runPyodide(code, btn, outputEl) {
      btn.disabled = true;
      btn.textContent = pyodide ? "Running..." : "Loading Python...";
      outputEl.innerHTML = "";

      try {
        const py = await loadPyodideRuntime();
        btn.textContent = "Running...";

        py.runPython(\`
import sys, io
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
\`);

        try {
          const result = py.runPython(code);
          const stdout = py.runPython("sys.stdout.getvalue()");
          const stderr = py.runPython("sys.stderr.getvalue()");

          let html = "";
          if (stdout) html += \`<span class="exec-stdout">\${escapeHtml(stdout)}</span>\`;
          if (stderr) html += \`<span class="exec-stderr">\${escapeHtml(stderr)}</span>\`;
          if (result !== undefined && result !== null && !stdout && !stderr) {
            html += \`<span class="exec-stdout">\${escapeHtml(String(result))}</span>\`;
          }
          outputEl.innerHTML = html || \`<span class="exec-stdout" style="color: var(--color-text-muted)">(no output)</span>\`;
        } catch (pyErr) {
          const stderr = py.runPython("sys.stderr.getvalue()");
          outputEl.innerHTML = \`<span class="exec-stderr">\${escapeHtml(stderr || pyErr.message)}</span>\`;
        } finally {
          py.runPython(\`
sys.stdout = sys.__stdout__
sys.stderr = sys.__stderr__
\`);
        }
      } catch (loadErr) {
        outputEl.innerHTML = \`<span class="exec-stderr">Failed to load Python: \${escapeHtml(loadErr.message)}</span>\`;
      }

      btn.disabled = false;
      btn.textContent = "Run";
    }

    document.addEventListener("click", async (e) => {
      const btn = e.target.closest(".exec-run-btn");
      if (!btn) return;

      const blockId = btn.dataset.blockId;
      const sourceEl = document.querySelector(\`script[data-source="\${blockId}"]\`);
      const outputEl = document.querySelector(\`[data-output="\${blockId}"]\`);
      if (!sourceEl || !outputEl) return;

      const code = atob(sourceEl.textContent);

      if (isLiveMode) {
        await runLive(code, btn, outputEl);
      } else {
        await runPyodide(code, btn, outputEl);
      }
    });

    function escapeHtml(s) {
      const d = document.createElement("div");
      d.textContent = s;
      return d.innerHTML;
    }

    // File upload handler (live mode only)
    if (isLiveMode) {
      const uploadBtn = document.getElementById("file-upload-btn");
      const uploadInput = document.getElementById("file-upload-input");
      const uploadStatus = document.getElementById("file-upload-status");

      if (uploadBtn && uploadInput) {
        uploadBtn.addEventListener("click", () => uploadInput.click());

        uploadInput.addEventListener("change", async () => {
          const file = uploadInput.files[0];
          if (!file) return;

          uploadStatus.textContent = "Uploading...";
          uploadStatus.style.display = "block";

          try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/upload", {
              method: "POST",
              body: formData,
            });
            const data = await res.json();

            if (data.ok) {
              uploadStatus.textContent = \`Uploaded: \${data.name}\`;
            } else {
              uploadStatus.textContent = \`Error: \${data.error}\`;
            }
          } catch (err) {
            uploadStatus.textContent = \`Upload failed: \${err.message}\`;
          }

          setTimeout(() => {
            uploadStatus.style.display = "none";
          }, 3000);

          uploadInput.value = "";
        });
      }
    }
  </script>
  <script type="module">
    // Settings panel
    const STORAGE_KEY = "explainr-settings";
    const defaults = { fontSize: "medium", contentWidth: 880, showSidebar: true };
    const fontSizeMap = { small: "14px", medium: "16px", large: "18px" };

    function loadSettings() {
      try {
        return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
      } catch { return { ...defaults }; }
    }

    function saveSettings(s) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    }

    function applySettings(s) {
      document.body.style.fontSize = fontSizeMap[s.fontSize] || fontSizeMap.medium;
      document.getElementById("main-content").style.maxWidth = s.contentWidth + "px";
      document.getElementById("sidebar").style.display = s.showSidebar ? "" : "none";

      // Update UI controls
      document.querySelectorAll("[data-font]").forEach(btn => {
        btn.classList.toggle("settings__font-btn--active", btn.dataset.font === s.fontSize);
      });
      document.getElementById("width-range").value = s.contentWidth;
      document.getElementById("width-label").textContent = "Content width \\u2014 " + s.contentWidth + "px";
      const sw = document.getElementById("sidebar-toggle");
      sw.classList.toggle("settings__switch--on", s.showSidebar);
      sw.setAttribute("aria-checked", s.showSidebar);
    }

    const settings = loadSettings();
    applySettings(settings);

    // Toggle panel
    const panel = document.getElementById("settings-panel");
    document.getElementById("settings-toggle").addEventListener("click", () => {
      panel.classList.toggle("open");
    });

    // Close on outside click
    document.addEventListener("mousedown", (e) => {
      if (!document.getElementById("settings").contains(e.target)) {
        panel.classList.remove("open");
      }
    });

    // Close on Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") panel.classList.remove("open");
    });

    // Font size buttons
    document.querySelectorAll("[data-font]").forEach(btn => {
      btn.addEventListener("click", () => {
        settings.fontSize = btn.dataset.font;
        saveSettings(settings);
        applySettings(settings);
      });
    });

    // Content width slider
    document.getElementById("width-range").addEventListener("input", (e) => {
      settings.contentWidth = Number(e.target.value);
      saveSettings(settings);
      applySettings(settings);
    });

    // Sidebar toggle
    document.getElementById("sidebar-toggle").addEventListener("click", () => {
      settings.showSidebar = !settings.showSidebar;
      saveSettings(settings);
      applySettings(settings);
    });
  </script>
</body>
</html>`;
}
