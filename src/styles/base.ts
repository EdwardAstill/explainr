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
    .markdown-body img { max-width: 100%; cursor: zoom-in; border-radius: 6px; }
    .markdown-body hr { border: none; border-top: 1px solid var(--color-border); margin: 24px 0; }

    .readrun-img { display: block; margin: 16px 0; max-width: 100%; cursor: zoom-in; border-radius: 6px; }
`;
