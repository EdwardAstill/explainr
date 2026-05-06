export const baseStyles = `
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
      --color-active-bg: #dcdcdc;
      --color-code-bg: #f6f8fa;
      --color-highlight-bg: rgba(9, 105, 218, 0.18);
      --font-body: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
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
      padding: 14px 0;
      overflow-y: auto;
      position: sticky;
      top: 0;
      height: 100vh;
      display: flex;
      flex-direction: column;
      font-family: var(--font-mono);
    }

    /* Shared tree nav styles (sidebar + TOC) */
    .nav-tree ul { list-style: none; padding-left: 0; }
    .nav-tree ul ul { padding-left: 12px; }
    .nav-tree li { margin: 0; padding: 0 0 0 4px; }

    .nav-tree a {
      display: inline-block;
      padding: 3px 12px;
      color: var(--color-text-muted);
      text-decoration: none;
      font-family: var(--font-mono);
      font-size: 12px;
    }

    .nav-tree a:hover { background: var(--color-border); }

    .nav-tree .active > a {
      background: var(--color-active-bg);
      color: var(--color-text);
    }

    .nav-tree details > summary {
      padding: 3px 12px;
      font-family: var(--font-mono);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      list-style: none;
      color: var(--color-text);
      display: flex;
      align-items: first baseline;
    }

    .nav-tree details > summary:hover { background: var(--color-border); }

    .nav-tree details > summary::before {
      content: "\\203A";
      font-size: 14px;
      line-height: 1;
      flex-shrink: 0;
      margin-right: 5px;
      color: var(--color-text-muted);
    }

    .nav-tree details[open] > summary::before { content: "\\2039"; transform: rotate(-90deg); }

    /* Links inside summaries (TOC headings with children) — summary provides the padding */
    .nav-tree details > summary > a {
      padding: 0;
      display: inline;
      color: inherit;
      font-weight: inherit;
    }

    /* Sidebar-specific */
    .sidebar-nav > ul > li > ul { padding-left: 0; }

    /* Focus mode: pinned search + breadcrumb above the nav-tree.
       When mounted, drop the sidebar's own vertical padding so the search
       sits flush at the top with symmetric padding inside the wrap. */
    .sidebar.rr-focus-active { padding-top: 0; padding-bottom: 0; }

    .rr-focus-search-wrap {
      padding: 8px;
      display: flex;
      align-items: stretch;
      gap: 6px;
      border-bottom: 1px solid var(--color-border);
    }
    .rr-focus-search-wrap input {
      flex: 1;
      min-width: 0;
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      color: var(--color-text);
      padding: 6px 9px;
      font-size: 12.5px;
      font-family: var(--font-body);
      outline: none;
    }
    .rr-focus-search-wrap input:focus { border-color: var(--color-link); }
    .rr-focus-toggle {
      flex: 0 0 auto;
      width: 30px;
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      color: var(--color-text-muted);
      cursor: pointer;
      font-family: var(--font-mono);
      font-size: 16px;
      line-height: 1;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .rr-focus-toggle:hover { color: var(--color-link); border-color: var(--color-link); }
    .rr-focus-toggle:active { background: var(--color-active-bg); }

    .rr-focus-crumbs {
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 6px 12px;
      flex-wrap: wrap;
      border-bottom: 1px solid var(--color-border);
      transition: background 0.12s;
    }
    .rr-focus-crumbs.empty { display: none; }
    .rr-focus-crumbs.has-focus { background: var(--color-highlight-bg); }
    .rr-crumb {
      font-size: 11.5px;
      color: var(--color-text-muted);
      cursor: pointer;
      padding: 2px 6px;
      background: transparent;
      border: none;
      font-family: var(--font-body);
    }
    .rr-crumb:hover { color: var(--color-text); background: var(--color-border); }
    .rr-crumb.current { color: var(--color-link); font-weight: 600; cursor: default; }
    .rr-crumb.current:hover { background: transparent; }
    .rr-crumb-sep { color: var(--color-text-muted); font-size: 11px; padding: 0 1px; opacity: 0.6; }
    .rr-crumb-clear {
      margin-left: auto;
      background: transparent;
      border: none;
      color: var(--color-text-muted);
      cursor: pointer;
      padding: 2px 6px;
      font-size: 14px;
      line-height: 1;
    }
    .rr-crumb-clear:hover { color: var(--color-link); background: var(--color-border); }

    /* Hide items outside focus scope; collapse the focused folder's own row
       so its children promote up one indent level. */
    .nav-tree li.rr-hidden { display: none; }
    .nav-tree li.rr-focus-self > details > summary { display: none; }
    .nav-tree li.rr-focus-self > details > ul { padding-left: 0; }
    .nav-tree li.rr-focus-self { padding-left: 0; }

    /* Search-reorder visual states (focus mode applies these to existing
       nav-tree items in place — no DOM reordering, just dim/highlight). */
    .nav-tree .rr-match { color: var(--color-text); }
    .nav-tree .rr-match-strong { color: var(--color-link); font-weight: 600; }
    .nav-tree .rr-dim { opacity: 0.45; }
    .nav-tree mark {
      background: var(--color-highlight-bg);
      color: inherit;
      padding: 0 1px;
    }

    /* Main content */
    .main {
      flex: 1;
      min-width: 0;
      max-width: 880px;
      margin: 0 auto;
      padding: 32px 40px;
    }

    /* Table of contents sidebar */
    .toc-sidebar {
      width: 200px;
      min-width: 200px;
      padding: 14px 0;
      position: sticky;
      top: 0;
      height: 100vh;
      overflow-y: auto;
      border-left: 1px solid var(--color-border);
      background: var(--color-sidebar-bg);
      font-family: var(--font-mono);
    }

    /* TOC-specific: active heading highlight */
    .toc-link--active {
      color: var(--color-text) !important;
      background: var(--color-active-bg);
    }

    /* Resize handles */
    .resize-handle {
      width: 4px;
      cursor: col-resize;
      background: transparent;
      flex-shrink: 0;
      position: relative;
      z-index: 10;
    }

    .resize-handle:hover,
    .resize-handle--active {
      background: var(--color-border);
    }

    [data-focus="true"] .toc-sidebar { display: none !important; }
    [data-focus="true"] .resize-handle--toc { display: none !important; }

    @media (max-width: 1100px) {
      .toc-sidebar { display: none; }
      .resize-handle--toc { display: none; }
    }

    /* Markdown styles */
    .markdown-body h1 { font-size: 2em; font-weight: 700; padding-bottom: 0.3em; border-bottom: 1px solid var(--color-border); margin-bottom: 16px; margin-top: 24px; }
    .markdown-body h2 { font-size: 1.5em; font-weight: 700; padding-bottom: 0.3em; border-bottom: 1px solid var(--color-border); margin-bottom: 16px; margin-top: 24px; }
    .markdown-body h3 { font-size: 1.25em; font-weight: 700; margin-bottom: 16px; margin-top: 24px; }
    .markdown-body h4 { font-size: 1em; font-weight: 700; margin-bottom: 16px; margin-top: 24px; }
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
      font-size: 85%;
      font-family: var(--font-mono);
    }

    .markdown-body pre {
      background: var(--color-code-bg);
      padding: 16px;
      overflow-x: auto;
      margin-bottom: 16px;
      line-height: 1.45;
    }

    .markdown-body pre code { background: none; padding: 0; font-size: 85%; }

    .markdown-body table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
    .markdown-body th, .markdown-body td { border: 1px solid var(--color-border); padding: 6px 13px; }
    .markdown-body th { background: var(--color-sidebar-bg); font-weight: 600; }
    .markdown-body img { max-width: 100%; cursor: zoom-in; }
    .markdown-body hr { border: none; border-top: 1px solid var(--color-border); margin: 24px 0; }

    .readrun-img { display: block; margin: 16px 0; max-width: 100%; cursor: zoom-in; }
`;
