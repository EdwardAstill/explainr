import { escapeHtml as escape } from "./utils";
import { bundleVersion } from "./clientBundle";
import { type ReadrunConfig, defaultConfig } from "./config";
import { type TocEntry } from "./markdown";

function resourceSwitcherHtml(): string {
  return `
  <div class="resource-switcher" id="resource-switcher">
    <div class="resource-switcher__item resource-switcher__item--active" data-tab="content">content</div>
    <div class="resource-switcher__item" data-tab="images">images</div>
    <div class="resource-switcher__item" data-tab="files">files</div>
    <div class="resource-switcher__item" data-tab="scripts">scripts</div>
  </div>`;
}

const settingsHtml = `
  <div class="settings" id="settings">
    <div class="settings__panel" id="settings-panel">
      <div class="settings__section">
        <span class="settings__label" id="font-label">Font size — 16px</span>
        <input class="settings__range" id="font-range" type="range" min="12" max="24" step="1" value="16">
      </div>
      <div class="settings__section">
        <span class="settings__label">Theme</span>
        <div class="settings__theme-row">
          <button class="settings__theme-arrow" id="theme-prev" aria-label="Previous theme">&#9664;</button>
          <span class="settings__theme-name" id="theme-name" title="Click to browse all themes">Light</span>
          <button class="settings__theme-arrow" id="theme-next" aria-label="Next theme">&#9654;</button>
        </div>
      </div>
      <div class="settings__section" id="width-section">
        <span class="settings__label" id="width-label">Content width \\u2014 880px</span>
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
      <div class="settings__section">
        <button class="settings__shortcuts-btn" id="open-shortcuts-btn">Keyboard Shortcuts</button>
      </div>
    </div>
  </div>`;

const themePickerOverlayHtml = `
  <div class="overlay" id="theme-picker-overlay">
    <div class="overlay__card">
      <div class="overlay__header">
        <span class="overlay__title">Choose Theme</span>
        <span class="overlay__close-hint">Esc to close</span>
      </div>
      <div class="theme-grid">
        <div class="theme-card" data-theme-choice="light">
          <div class="theme-card__preview" style="background:#fff;color:#1f2328;">
            <div class="theme-card__preview-heading" style="border-bottom:1px solid #d0d7de;">Heading</div>
            <div class="theme-card__preview-code" style="background:#f6f8fa;"><span style="color:#cf222e;">const</span> <span style="color:#8250df;">x</span> = <span style="color:#0550ae;">42</span>;</div>
            <div class="theme-card__preview-text">Text with <span style="color:#0969da;">a link</span></div>
          </div>
          <div class="theme-card__name">Light</div>
        </div>
        <div class="theme-card" data-theme-choice="dark">
          <div class="theme-card__preview" style="background:#0d1117;color:#e6edf3;">
            <div class="theme-card__preview-heading" style="border-bottom:1px solid #30363d;">Heading</div>
            <div class="theme-card__preview-code" style="background:#161b22;"><span style="color:#ff7b72;">const</span> <span style="color:#d2a8ff;">x</span> = <span style="color:#79c0ff;">42</span>;</div>
            <div class="theme-card__preview-text">Text with <span style="color:#58a6ff;">a link</span></div>
          </div>
          <div class="theme-card__name">Dark</div>
        </div>
        <div class="theme-card" data-theme-choice="solarized">
          <div class="theme-card__preview" style="background:#fdf6e3;color:#657b83;">
            <div class="theme-card__preview-heading" style="border-bottom:1px solid #eee8d5;color:#586e75;">Heading</div>
            <div class="theme-card__preview-code" style="background:#eee8d5;"><span style="color:#859900;">const</span> <span style="color:#268bd2;">x</span> = <span style="color:#d33682;">42</span>;</div>
            <div class="theme-card__preview-text">Text with <span style="color:#268bd2;">a link</span></div>
          </div>
          <div class="theme-card__name">Solarized</div>
        </div>
        <div class="theme-card" data-theme-choice="nord">
          <div class="theme-card__preview" style="background:#2e3440;color:#d8dee9;">
            <div class="theme-card__preview-heading" style="border-bottom:1px solid #3b4252;color:#eceff4;">Heading</div>
            <div class="theme-card__preview-code" style="background:#3b4252;"><span style="color:#81a1c1;">const</span> <span style="color:#88c0d0;">x</span> = <span style="color:#b48ead;">42</span>;</div>
            <div class="theme-card__preview-text">Text with <span style="color:#88c0d0;">a link</span></div>
          </div>
          <div class="theme-card__name">Nord</div>
        </div>
        <div class="theme-card" data-theme-choice="dracula">
          <div class="theme-card__preview" style="background:#282a36;color:#f8f8f2;">
            <div class="theme-card__preview-heading" style="border-bottom:1px solid #44475a;">Heading</div>
            <div class="theme-card__preview-code" style="background:#44475a;"><span style="color:#ff79c6;">const</span> <span style="color:#50fa7b;">x</span> = <span style="color:#bd93f9;">42</span>;</div>
            <div class="theme-card__preview-text">Text with <span style="color:#8be9fd;">a link</span></div>
          </div>
          <div class="theme-card__name">Dracula</div>
        </div>
        <div class="theme-card" data-theme-choice="monokai">
          <div class="theme-card__preview" style="background:#272822;color:#f8f8f2;">
            <div class="theme-card__preview-heading" style="border-bottom:1px solid #3e3d32;">Heading</div>
            <div class="theme-card__preview-code" style="background:#3e3d32;"><span style="color:#f92672;">const</span> <span style="color:#a6e22e;">x</span> = <span style="color:#ae81ff;">42</span>;</div>
            <div class="theme-card__preview-text">Text with <span style="color:#66d9ef;">a link</span></div>
          </div>
          <div class="theme-card__name">Monokai</div>
        </div>
        <div class="theme-card" data-theme-choice="gruvbox">
          <div class="theme-card__preview" style="background:#282828;color:#ebdbb2;">
            <div class="theme-card__preview-heading" style="border-bottom:1px solid #3c3836;">Heading</div>
            <div class="theme-card__preview-code" style="background:#3c3836;"><span style="color:#fb4934;">const</span> <span style="color:#b8bb26;">x</span> = <span style="color:#d3869b;">42</span>;</div>
            <div class="theme-card__preview-text">Text with <span style="color:#83a598;">a link</span></div>
          </div>
          <div class="theme-card__name">Gruvbox</div>
        </div>
        <div class="theme-card" data-theme-choice="catppuccin">
          <div class="theme-card__preview" style="background:#1e1e2e;color:#cdd6f4;">
            <div class="theme-card__preview-heading" style="border-bottom:1px solid #313244;">Heading</div>
            <div class="theme-card__preview-code" style="background:#313244;"><span style="color:#cba6f7;">const</span> <span style="color:#a6e3a1;">x</span> = <span style="color:#fab387;">42</span>;</div>
            <div class="theme-card__preview-text">Text with <span style="color:#89b4fa;">a link</span></div>
          </div>
          <div class="theme-card__name">Catppuccin</div>
        </div>
      </div>
    </div>
  </div>`;

function formatKey(binding: string): string {
  return binding.split(/(?:\s+)/).map(k => `<kbd>${escape(k)}</kbd>`).join(" ");
}

function shortcutsOverlay(config: ReadrunConfig): string {
  const s = config.shortcuts;
  const row = (label: string, binding: string) =>
    `<div class="shortcuts-grid__row"><span class="shortcuts-grid__label">${label}</span><span>${formatKey(binding)}</span></div>`;

  return `
  <div class="overlay" id="shortcuts-overlay">
    <div class="overlay__card">
      <div class="overlay__header">
        <span class="overlay__title">Keyboard Shortcuts</span>
        <span class="overlay__close-hint">Esc to close</span>
      </div>
      <div class="shortcuts-grid">
        <div>
          <div class="shortcuts-grid__category">Navigation</div>
          ${row("Next page", s.nextPage)}
          ${row("Previous page", s.prevPage)}
          ${row("Go home", s.goHome)}

          <div class="shortcuts-grid__category" style="margin-top:20px;">Scrolling</div>
          ${row("Page down", s.scrollDown)}
          ${row("Page up", s.scrollUp)}
          ${row("Scroll to top", s.scrollToTop)}
          ${row("Scroll to bottom", s.scrollToBottom)}
        </div>
        <div>
          <div class="shortcuts-grid__category">UI Controls</div>
          ${row("Toggle sidebar", s.toggleSidebar)}
          ${row("Focus mode", s.focusMode)}
          ${row("Next theme", s.nextTheme)}
          ${row("Previous theme", s.prevTheme)}
          ${row("Increase font", s.fontIncrease)}
          ${row("Decrease font", s.fontDecrease)}
        </div>
        <div>
          <div class="shortcuts-grid__category">Actions</div>
          ${row("Search", s.search)}
          ${row("Show shortcuts", s.showShortcuts)}
          ${row("Close overlay", s.closeOverlay)}
        </div>
      </div>
    </div>
  </div>`;
}

interface TocNode {
  entry: TocEntry;
  children: TocNode[];
}

function buildTocTree(entries: TocEntry[]): TocNode[] {
  const roots: TocNode[] = [];
  const stack: TocNode[] = [];
  for (const entry of entries) {
    const node: TocNode = { entry, children: [] };
    while (stack.length > 0 && stack[stack.length - 1]!.entry.level >= entry.level) {
      stack.pop();
    }
    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1]!.children.push(node);
    }
    stack.push(node);
  }
  return roots;
}

function renderTocNodes(nodes: TocNode[]): string {
  let html = "<ul>";
  for (const node of nodes) {
    if (node.children.length > 0) {
      html += `<li class="nav-dir"><details open>
        <summary><a class="toc-link" href="#${escape(node.entry.id)}">${escape(node.entry.text)}</a></summary>
        ${renderTocNodes(node.children)}
      </details></li>`;
    } else {
      html += `<li class="nav-file"><a class="toc-link" href="#${escape(node.entry.id)}">${escape(node.entry.text)}</a></li>`;
    }
  }
  html += "</ul>";
  return html;
}

function tocSidebar(toc: TocEntry[]): string {
  if (toc.length === 0) return "";
  const tree = buildTocTree(toc);
  return `
  <aside class="toc-sidebar" id="toc-sidebar">
    <nav class="sidebar-nav nav-tree">
      ${renderTocNodes(tree)}
    </nav>
  </aside>`;
}

export interface EmbeddedFile {
  name: string;
}

export interface BacklinkEntry {
  url: string;
  title: string;
}

export interface PageMeta {
  tags?: string[];
  backlinks?: BacklinkEntry[];
}

function tagPillsHtml(tags: string[] | undefined): string {
  if (!tags || tags.length === 0) return "";
  const items = tags.map((t) => `<a class="tag-pill" href="/tags/${escape(t)}">${escape(t)}</a>`).join("");
  return `<div class="tag-pills">${items}</div>`;
}

function backlinksHtml(entries: BacklinkEntry[] | undefined): string {
  if (!entries || entries.length === 0) return "";
  const items = entries.map((e) => `<li><a href="${escape(e.url)}">${escape(e.title)}</a></li>`).join("");
  return `<aside class="backlinks">
      <h2>Linked from</h2>
      <ul>${items}</ul>
    </aside>`;
}

export function htmlPage(nav: string, content: string, title: string, basePath?: string, config: ReadrunConfig = defaultConfig, embeddedFiles: EmbeddedFile[] = [], toc: TocEntry[] = [], pageMeta: PageMeta = {}): string {
  const baseTag = basePath ? `\n  <base href="${escape(basePath)}">` : "";
  const configJson = JSON.stringify(config.shortcuts).replace(/<\//g, "<\\/");
  const filesJson = JSON.stringify(embeddedFiles).replace(/<\//g, "<\\/");
  const tagsHtml = tagPillsHtml(pageMeta.tags);
  const backHtml = backlinksHtml(pageMeta.backlinks);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">${baseTag}
  <title>${escape(title)} - readrun</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.43/dist/katex.min.css" crossorigin="anonymous">
  <link rel="stylesheet" href="/_readrun/client.css?v=${bundleVersion()}">
</head>
<body>
  <script id="readrun-shortcuts" type="application/json">${configJson}</script>
  <script id="readrun-files" type="application/json">${filesJson}</script>
  <header class="mobile-topbar" id="mobile-topbar">
    <button class="mobile-topbar__btn" id="mobile-menu-btn" aria-label="Open menu">&#9776;</button>
    <span class="mobile-topbar__title">${escape(title)}</span>
    <button class="mobile-topbar__btn" id="mobile-search-btn" aria-label="Search">&#128269;</button>
  </header>
  <div class="drawer-scrim" id="drawer-scrim"></div>
  <aside class="sidebar" id="sidebar">
    ${nav}
${resourceSwitcherHtml()}
  </aside>
  <div class="resize-handle resize-handle--sidebar" id="resize-sidebar"></div>
  <main class="main" id="main-content">
    <div class="search-bar" id="search-bar">
      <input class="search-bar__input" id="search-input" type="text" placeholder="Search this page...">
      <span class="search-bar__count" id="search-count"></span>
      <button class="search-bar__btn" id="search-prev" aria-label="Previous match">&#9650;</button>
      <button class="search-bar__btn" id="search-next" aria-label="Next match">&#9660;</button>
      <button class="search-bar__close" id="search-close" aria-label="Close search">&times;</button>
    </div>
    <article class="markdown-body">
      ${tagsHtml}
      ${content}
      ${backHtml}
    </article>
  </main>
  <div class="resize-handle resize-handle--toc" id="resize-toc"></div>
${tocSidebar(toc)}
${settingsHtml}
${shortcutsOverlay(config)}
${themePickerOverlayHtml}
  <div class="context-menu" id="context-menu">
    <div class="context-menu__item" data-action="search">Search</div>
    <div class="context-menu__sep"></div>
    <div class="context-menu__item" data-action="settings">Settings</div>
  </div>
  <div class="context-menu" id="sidebar-context-menu">
    <div class="context-menu__item" data-action="enter-folder">Enter folder</div>
  </div>
  <div class="lightbox" id="lightbox"><img id="lightbox-img" alt=""></div>
  <div class="code-modal" id="code-modal">
    <div class="code-modal__card">
      <div class="code-modal__header">
        <span class="code-modal__lang" id="code-modal-lang"></span>
        <span class="code-modal__actions">
          <button class="exec-run-btn" id="code-modal-run">Run</button>
          <button class="code-modal__close" id="code-modal-close">&times;</button>
        </span>
      </div>
      <pre class="hljs code-modal__code" id="code-modal-code"><code></code></pre>
      <div class="exec-output code-modal__output" id="code-modal-output"></div>
    </div>
  </div>
  <script type="module" src="/_readrun/client.js?v=${bundleVersion()}"></script>
</body>
</html>`;
}
