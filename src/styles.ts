export const styles = `
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
      display: flex;
      flex-direction: column;
    }

    .sidebar-title {
      font-size: 14px;
      font-weight: 600;
      padding: 0 16px 12px;
      color: var(--color-text);
      border-bottom: 1px solid var(--color-border);
      margin-bottom: 8px;
    }

    .sidebar-nav ul { list-style: none; padding-left: 0; }
    .sidebar-nav > ul > li > ul { padding-left: 0; }
    .sidebar-nav ul ul { padding-left: 12px; }
    .sidebar-nav li { margin: 0; }

    .sidebar-nav a {
      display: block;
      padding: 4px 16px;
      color: var(--color-text);
      text-decoration: none;
      font-size: 14px;
      border-radius: 6px;
      margin: 1px 8px;
    }

    .sidebar-nav a:hover { background: var(--color-border); }

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

    .sidebar-nav details > summary:hover { background: var(--color-border); }

    .sidebar-nav details > summary::before {
      content: "\\25B6";
      font-size: 10px;
      margin-right: 6px;
      display: inline-block;
      transition: transform 0.15s;
    }

    .sidebar-nav details[open] > summary::before { transform: rotate(90deg); }

    /* Main content */
    .main {
      flex: 1;
      min-width: 0;
      max-width: 880px;
      margin: 0 auto;
      padding: 32px 40px;
    }

    /* Markdown styles */
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

    .markdown-body pre code { background: none; padding: 0; font-size: 85%; }

    .markdown-body table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
    .markdown-body th, .markdown-body td { border: 1px solid var(--color-border); padding: 6px 13px; }
    .markdown-body th { background: var(--color-sidebar-bg); font-weight: 600; }
    .markdown-body img { max-width: 100%; }
    .markdown-body hr { border: none; border-top: 1px solid var(--color-border); margin: 24px 0; }

    /* Executable code blocks */
    .exec-block { border: 1px solid var(--color-border); border-radius: 6px; margin-bottom: 16px; overflow: hidden; }

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
      background: #2da44e; color: #fff; border: none;
      padding: 2px 10px; border-radius: 4px; font-size: 12px;
      font-family: var(--font-body); cursor: pointer; font-weight: 500;
    }
    .exec-run-btn:hover { background: #218838; }
    .exec-run-btn:disabled { background: var(--color-text-muted); cursor: not-allowed; }

    .exec-output { font-family: var(--font-mono); font-size: 13px; line-height: 1.45; white-space: pre-wrap; word-break: break-word; }
    .exec-output:not(:empty) { padding: 12px 16px; border-top: 1px solid var(--color-border); background: #fff; }
    .exec-output .exec-stdout { color: var(--color-text); }
    .exec-output .exec-stderr { color: #cf222e; }
    .exec-loading { color: var(--color-text-muted); font-style: italic; }
    .exec-output img { max-width: 100%; margin-top: 8px; border-radius: 4px; }
    .exec-block pre { margin: 0; border-radius: 0; }

    /* Files panel (bottom of sidebar) */
    .files-panel {
      margin-top: auto;
      border-top: 1px solid var(--color-border);
      padding: 8px 0 0;
      position: relative;
    }

    .files-panel__toggle {
      display: flex; align-items: center; gap: 8px;
      width: 100%; padding: 6px 16px;
      background: none; border: none;
      font-size: 14px; font-weight: 500; font-family: var(--font-body);
      color: var(--color-text-muted); cursor: pointer;
      transition: color 0.12s;
    }
    .files-panel__toggle:hover { color: var(--color-text); }
    .files-panel__toggle svg { flex-shrink: 0; }

    .files-panel__dropdown {
      display: none; flex-direction: column;
      padding: 4px 0;
    }
    .files-panel__dropdown.open { display: flex; }

    .files-panel__header { display: none; }

    .files-panel__list {
      max-height: 200px; overflow-y: auto;
      padding: 0 4px;
    }

    .files-panel__item {
      display: flex; align-items: center; gap: 8px;
      padding: 4px 12px; border-radius: 6px; font-size: 13px;
      color: var(--color-text); cursor: default;
    }
    .files-panel__item:hover { background: var(--color-border); }

    .files-panel__item-icon {
      flex-shrink: 0; width: 14px; height: 14px;
      color: var(--color-text-muted);
    }

    .files-panel__item-name {
      flex: 1; min-width: 0; overflow: hidden;
      text-overflow: ellipsis; white-space: nowrap;
    }

    .files-panel__item-size {
      flex-shrink: 0; font-size: 11px; color: var(--color-text-muted);
      font-family: var(--font-mono);
    }

    .files-panel__empty {
      padding: 8px 16px;
      font-size: 13px; color: var(--color-text-muted);
    }

    .files-panel__add-btn {
      margin: 2px 8px 4px; padding: 4px 12px;
      background: none; border: 1px dashed var(--color-border);
      border-radius: 6px; font-size: 13px; font-family: var(--font-body);
      color: var(--color-text-muted); cursor: pointer; transition: all 0.12s;
      text-align: center;
    }
    .files-panel__add-btn:hover { border-color: var(--color-text-muted); color: var(--color-text); }
    .files-panel__add-btn:disabled { opacity: 0.5; cursor: not-allowed; }

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
    .settings { position: fixed; top: 12px; right: 12px; z-index: 100; }

    .settings__toggle {
      display: flex; align-items: center; justify-content: center;
      width: 36px; height: 36px; border-radius: 50%;
      border: 1px solid var(--color-border); background: var(--color-sidebar-bg);
      color: var(--color-text-muted); cursor: pointer; transition: all 0.15s ease;
    }
    .settings__toggle:hover { background: var(--color-border); color: var(--color-text); }

    .settings__panel {
      position: absolute; top: calc(100% + 8px); right: 0; width: 220px;
      background: var(--color-bg); border: 1px solid var(--color-border);
      border-radius: 8px; padding: 12px; display: none;
      flex-direction: column; gap: 12px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    }
    .settings__panel.open { display: flex; }

    .settings__section { display: flex; flex-direction: column; gap: 6px; }

    .settings__label {
      font-size: 11px; font-weight: 600; color: var(--color-text-muted);
      text-transform: uppercase; letter-spacing: 0.08em;
    }

    .settings__font-sizes { display: flex; gap: 6px; }

    .settings__font-btn {
      flex: 1; padding: 4px; background: var(--color-sidebar-bg);
      border: 1px solid var(--color-border); border-radius: 4px;
      cursor: pointer; font-family: var(--font-mono); font-size: 12px;
      color: var(--color-text-muted); transition: all 0.12s;
    }
    .settings__font-btn:hover { border-color: var(--color-text-muted); color: var(--color-text); }
    .settings__font-btn--active { border-color: var(--color-link); color: var(--color-link); }

    .settings__range { width: 100%; accent-color: var(--color-link); cursor: pointer; }

    .settings__toggle-row { display: flex; align-items: center; justify-content: space-between; cursor: pointer; }

    .settings__switch {
      position: relative; width: 36px; height: 20px; background: var(--color-border);
      border: none; border-radius: 10px; cursor: pointer; transition: background 0.2s; padding: 0;
    }
    .settings__switch--on { background: var(--color-link); }

    .settings__switch-thumb {
      position: absolute; top: 2px; left: 2px; width: 16px; height: 16px;
      background: white; border-radius: 50%; transition: transform 0.2s;
    }
    .settings__switch--on .settings__switch-thumb { transform: translateX(16px); }
`;
