# Resource Browser, Edit Mode & Context Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a resource browser (sidebar tabs for content/images/files/scripts), in-browser file editing with CodeMirror, and a right-click context menu with search/edit/settings.

**Architecture:** The sidebar's current files panel is replaced by a four-item tab switcher at the bottom. Clicking a non-content tab fetches file listings from new server API routes and renders them in the sidebar using the existing `nav-tree` CSS class. The main content area can switch between rendered markdown, file previews, and a CodeMirror editor. A custom context menu on right-click provides Search, Edit, and Settings actions.

**Tech Stack:** Bun server, CodeMirror 6 (CDN), existing nav-tree CSS patterns, localStorage for persistence.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/server.ts` | Modify | Add API routes: `/api/resources/`, `/api/source/`, `/api/save` |
| `src/template.ts` | Modify | Replace files panel HTML with resource switcher, add context menu + editor container HTML |
| `src/client-scripts.ts` | Modify | Resource tab switching, context menu handler, search bar, edit mode + CodeMirror init |
| `src/styles.ts` | Modify | Resource switcher styles, context menu styles, search bar styles, editor styles |
| `src/config.ts` | Modify | Add `edit` shortcut to `ShortcutConfig` and defaults |

---

## Task 1: Server API routes for resource browsing

**Files:**
- Modify: `src/server.ts` (insert new routes before the `if (pathname === "/")` block at line 315)

- [ ] **Step 1: Add GET /api/resources/:tab route**

Add this block in `src/server.ts` right after the closing `}` of the `if (liveMode)` block (line 313), before the `if (pathname === "/")` check. These routes work in both live and view mode.

```typescript
      // Resource browser API (works in both modes)
      if (pathname.startsWith("/api/resources/") && req.method === "GET") {
        const parts = pathname.slice("/api/resources/".length).split("/");
        const tab = parts[0]; // "images" | "files" | "scripts"
        const tabDirs: Record<string, string> = {
          images: imagesDir,
          files: filesDir,
          scripts: scriptsDir,
        };
        const dir = tabDirs[tab];
        if (!dir) return Response.json({ error: "Invalid tab" }, { status: 400 });

        if (parts.length === 1) {
          // List files in tab directory
          try {
            const entries = await readdir(dir).catch(() => [] as string[]);
            const files: { name: string; size: number }[] = [];
            for (const name of entries) {
              const s = await stat(join(dir, name)).catch(() => null);
              if (s && s.isFile()) {
                files.push({ name, size: s.size });
              }
            }
            return Response.json({ files });
          } catch {
            return Response.json({ files: [] });
          }
        } else {
          // Serve individual file
          const fileName = parts.slice(1).join("/");
          const filePath = normalize(resolve(dir, fileName));
          if (!filePath.startsWith(dir)) {
            return new Response("Forbidden", { status: 403 });
          }
          try {
            const fileData = await readFile(filePath);
            const ext = filePath.substring(filePath.lastIndexOf(".")).toLowerCase();
            return new Response(fileData, {
              headers: { "Content-Type": getMimeType(ext) },
            });
          } catch {
            return new Response("Not found", { status: 404 });
          }
        }
      }
```

- [ ] **Step 2: Update getMimeType to handle text file types**

In `src/server.ts`, extend the `getMimeType` function (line 64) to also handle text-based types used by scripts/files tabs:

```typescript
function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".css": "text/css",
    ".js": "text/javascript",
    ".ts": "text/typescript",
    ".py": "text/x-python",
    ".json": "application/json",
    ".csv": "text/csv",
    ".toml": "text/plain",
    ".md": "text/markdown",
    ".txt": "text/plain",
  };
  return mimeTypes[ext] || "application/octet-stream";
}
```

- [ ] **Step 3: Verify routes work**

Run: `bun src/cli.ts`, select Demo → Standard, then in another terminal:

```bash
curl http://localhost:3001/api/resources/scripts
curl http://localhost:3001/api/resources/images
curl http://localhost:3001/api/resources/files
```

Expected: JSON responses with `{ files: [...] }` (may be empty arrays if no files in demo).

- [ ] **Step 4: Commit**

```bash
git add src/server.ts
git commit -m "feat: add resource browser API routes for images/files/scripts"
```

---

## Task 2: Resource switcher HTML and styles

**Files:**
- Modify: `src/template.ts` (replace `filesPanelHtml` function, lines 11-25)
- Modify: `src/styles.ts` (replace `.files-panel` styles with `.resource-switcher` styles)

- [ ] **Step 1: Replace filesPanelHtml with resourceSwitcherHtml**

In `src/template.ts`, replace the `filesPanelHtml` function and the `filesIcon` const above it with:

```typescript
function resourceSwitcherHtml(): string {
  return `
  <div class="resource-switcher" id="resource-switcher">
    <div class="resource-switcher__item resource-switcher__item--active" data-tab="content">content</div>
    <div class="resource-switcher__item" data-tab="images">images</div>
    <div class="resource-switcher__item" data-tab="files">files</div>
    <div class="resource-switcher__item" data-tab="scripts">scripts</div>
  </div>`;
}
```

- [ ] **Step 2: Update htmlPage to use resourceSwitcherHtml**

In the `htmlPage` function in `src/template.ts`, replace `${filesPanelHtml(liveMode)}` with `${resourceSwitcherHtml()}`. Also remove the `liveMode` parameter check since the switcher is always visible. Remove the `filesIcon` const (lines 7-9) entirely since it's no longer used.

The sidebar section becomes:

```html
  <aside class="sidebar" id="sidebar">
    ${nav}
${resourceSwitcherHtml()}
  </aside>
```

- [ ] **Step 3: Replace files-panel styles with resource-switcher styles**

In `src/styles.ts`, replace all `.files-panel*` styles (the block starting with `.files-panel {` through `.files-panel__add-btn:disabled`) with:

```css
    .resource-switcher {
      margin-top: auto;
      border-top: 1px solid var(--color-border);
      padding: 6px 0;
    }

    .resource-switcher__item {
      display: inline-block;
      padding: 3px 12px;
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--color-text-muted);
      cursor: pointer;
    }

    .resource-switcher__item:hover {
      background: var(--color-border);
    }

    .resource-switcher__item--active {
      background: var(--color-active-bg);
      color: var(--color-text);
    }
```

- [ ] **Step 4: Verify the switcher renders**

Run: `bun src/cli.ts`, select Demo, open browser. The bottom of the sidebar should show four stacked labels: content, images, files, scripts. "content" should be highlighted.

- [ ] **Step 5: Commit**

```bash
git add src/template.ts src/styles.ts
git commit -m "feat: replace files panel with resource switcher UI"
```

---

## Task 3: Resource tab switching client logic

**Files:**
- Modify: `src/client-scripts.ts` (replace files panel code with tab switching logic)

- [ ] **Step 1: Remove old files panel client code**

In `src/client-scripts.ts`, remove the entire `if (isLiveMode)` block that handles the files panel (the block starting with `// Files panel (live mode only)` through its closing `}` — lines 162-234). Also remove the `filesIcon` template string within that block.

- [ ] **Step 2: Add resource tab switching logic**

Insert the following after the nav folder persistence section (after the `});` that closes the `data-nav-path` forEach, around line 528):

```javascript
    // --- Resource browser tab switching ---
    const TAB_KEY = "readrun-active-tab";
    const switcher = document.getElementById("resource-switcher");
    const sidebar = document.getElementById("sidebar");
    const sidebarNav = sidebar ? sidebar.querySelector(".sidebar-nav") : null;
    const mainContent = document.getElementById("main-content");
    let savedNavHtml = sidebarNav ? sidebarNav.outerHTML : "";
    let activeTab = localStorage.getItem(TAB_KEY) || "content";
    let currentResourceFile = null;

    function setActiveTab(tab) {
      activeTab = tab;
      localStorage.setItem(TAB_KEY, tab);
      document.querySelectorAll(".resource-switcher__item").forEach(el => {
        el.classList.toggle("resource-switcher__item--active", el.dataset.tab === tab);
      });
    }

    async function loadResourceTab(tab) {
      if (tab === "content") {
        if (sidebarNav && savedNavHtml) {
          sidebarNav.outerHTML = savedNavHtml;
        } else {
          window.location.reload();
        }
        return;
      }

      try {
        const res = await fetch("/api/resources/" + tab);
        const data = await res.json();
        let html = '<nav class="sidebar-nav nav-tree"><ul>';
        if (data.files && data.files.length > 0) {
          for (const f of data.files) {
            html += '<li class="nav-file"><a href="#" data-resource-tab="' + escapeHtml(tab) + '" data-resource-file="' + escapeHtml(f.name) + '">' + escapeHtml(f.name) + '</a></li>';
          }
        } else {
          html += '<li style="padding:3px 12px;color:var(--color-text-muted);font-family:var(--font-mono);font-size:12px;">(empty)</li>';
        }
        html += '</ul></nav>';

        if (sidebarNav) {
          sidebarNav.outerHTML = html;
        }
      } catch {
        // silently fail
      }
    }

    async function previewResource(tab, fileName) {
      if (!mainContent) return;
      currentResourceFile = { tab, fileName };
      const url = "/api/resources/" + encodeURIComponent(tab) + "/" + encodeURIComponent(fileName);

      if (tab === "images") {
        mainContent.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:60vh;flex-direction:column;gap:12px;"><img src="' + escapeHtml(url) + '" alt="' + escapeHtml(fileName) + '" style="max-width:100%;max-height:70vh;"><div style="font-family:var(--font-mono);font-size:12px;color:var(--color-text-muted);">' + escapeHtml(fileName) + '</div></div>';
      } else {
        try {
          const res = await fetch(url);
          const text = await res.text();
          mainContent.innerHTML = '<article class="markdown-body"><pre><code>' + escapeHtml(text) + '</code></pre></article>';
        } catch {
          mainContent.innerHTML = '<article class="markdown-body"><p>Failed to load file.</p></article>';
        }
      }
    }

    // Tab click handler
    if (switcher) {
      switcher.addEventListener("click", (e) => {
        const item = e.target.closest(".resource-switcher__item");
        if (!item) return;
        const tab = item.dataset.tab;
        setActiveTab(tab);
        loadResourceTab(tab);
      });
    }

    // Resource file click handler (delegated)
    document.addEventListener("click", (e) => {
      const link = e.target.closest("[data-resource-file]");
      if (!link) return;
      e.preventDefault();
      const tab = link.dataset.resourceTab;
      const fileName = link.dataset.resourceFile;
      // highlight active
      document.querySelectorAll("[data-resource-file]").forEach(el => {
        el.parentElement.classList.toggle("active", el === link);
      });
      previewResource(tab, fileName);
    });

    // Restore active tab on page load
    if (activeTab !== "content") {
      setActiveTab(activeTab);
      loadResourceTab(activeTab);
    }
```

- [ ] **Step 3: Verify tab switching works**

Run the app with Demo content. Click "scripts" in the bottom switcher — the sidebar should show file listings from `.readrun/scripts/`. Click "content" to restore the nav tree. Click an image file to see a preview in the main area.

- [ ] **Step 4: Commit**

```bash
git add src/client-scripts.ts
git commit -m "feat: add resource tab switching with file preview"
```

---

## Task 4: Context menu HTML, styles, and handler

**Files:**
- Modify: `src/template.ts` (add context menu HTML)
- Modify: `src/styles.ts` (add context menu styles)
- Modify: `src/client-scripts.ts` (add context menu event handler)

- [ ] **Step 1: Add context menu HTML to template**

In `src/template.ts`, add a `contextMenuHtml` constant and include it in the `htmlPage` body, right before the `${executionScript}` line:

```typescript
const contextMenuHtml = `
  <div class="context-menu" id="context-menu">
    <div class="context-menu__item" data-action="search">Search</div>
    <div class="context-menu__sep"></div>
    <div class="context-menu__item context-menu__item--live-only" data-action="edit">Edit</div>
    <div class="context-menu__sep context-menu__item--live-only"></div>
    <div class="context-menu__item" data-action="settings">Settings</div>
  </div>`;
```

In `htmlPage`, add `${contextMenuHtml}` right before `${executionScript}`.

- [ ] **Step 2: Add context menu styles**

In `src/styles.ts`, add before the `/* Themes */` comment:

```css
    /* Context menu */
    .context-menu {
      position: fixed;
      z-index: 300;
      display: none;
      background: var(--color-sidebar-bg);
      border: 1px solid var(--color-border);
      min-width: 140px;
      font-family: var(--font-mono);
      font-size: 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    }

    .context-menu.open { display: block; }

    .context-menu__item {
      padding: 6px 12px;
      color: var(--color-text);
      cursor: pointer;
    }

    .context-menu__item:hover {
      background: var(--color-border);
    }

    .context-menu__sep {
      height: 1px;
      background: var(--color-border);
      margin: 2px 0;
    }

    body:not([data-live="true"]) .context-menu__item--live-only { display: none; }
    body:not([data-live="true"]) .context-menu__item--live-only + .context-menu__sep { display: none; }
```

- [ ] **Step 3: Add context menu event handler**

In `src/client-scripts.ts`, add at the end of the `settingsScript` block, before the closing `</script>` tag:

```javascript
    // --- Context menu ---
    const contextMenu = document.getElementById("context-menu");

    function showContextMenu(x, y) {
      contextMenu.style.left = x + "px";
      contextMenu.style.top = y + "px";
      contextMenu.classList.add("open");
      // Keep within viewport
      const rect = contextMenu.getBoundingClientRect();
      if (rect.right > window.innerWidth) contextMenu.style.left = (window.innerWidth - rect.width - 4) + "px";
      if (rect.bottom > window.innerHeight) contextMenu.style.top = (window.innerHeight - rect.height - 4) + "px";
    }

    function hideContextMenu() {
      contextMenu.classList.remove("open");
    }

    document.querySelector(".main").addEventListener("contextmenu", (e) => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY);
    });

    document.addEventListener("click", (e) => {
      if (!contextMenu.contains(e.target)) hideContextMenu();
    });

    document.addEventListener("scroll", hideContextMenu, { passive: true });

    contextMenu.addEventListener("click", (e) => {
      const item = e.target.closest(".context-menu__item");
      if (!item) return;
      hideContextMenu();
      const action = item.dataset.action;
      if (action === "settings") panel.classList.toggle("open");
      if (action === "search") openSearchBar();
      if (action === "edit") enterEditMode();
    });
```

- [ ] **Step 4: Verify context menu appears**

Run the app, right-click in the main content area. A menu should appear with Search, Edit (only in live mode), and Settings. Clicking outside or pressing Escape should dismiss it. Clicking Settings should open the settings panel.

- [ ] **Step 5: Commit**

```bash
git add src/template.ts src/styles.ts src/client-scripts.ts
git commit -m "feat: add right-click context menu with search/edit/settings"
```

---

## Task 5: Search bar

**Files:**
- Modify: `src/template.ts` (add search bar HTML)
- Modify: `src/styles.ts` (add search bar styles)
- Modify: `src/client-scripts.ts` (add search logic)

- [ ] **Step 1: Add search bar HTML**

In `src/template.ts`, add a search bar element inside the `<main>` tag, before the `<article>`:

Change the main content section in `htmlPage` from:

```html
  <main class="main" id="main-content">
    <article class="markdown-body">
      ${content}
    </article>
  </main>
```

to:

```html
  <main class="main" id="main-content">
    <div class="search-bar" id="search-bar">
      <input class="search-bar__input" id="search-input" type="text" placeholder="Search this page...">
      <span class="search-bar__count" id="search-count"></span>
      <button class="search-bar__btn" id="search-prev" aria-label="Previous match">&#9650;</button>
      <button class="search-bar__btn" id="search-next" aria-label="Next match">&#9660;</button>
      <button class="search-bar__close" id="search-close" aria-label="Close search">&times;</button>
    </div>
    <article class="markdown-body">
      ${content}
    </article>
  </main>
```

- [ ] **Step 2: Add search bar styles**

In `src/styles.ts`, add before `/* Context menu */`:

```css
    /* Search bar */
    .search-bar {
      display: none;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: var(--color-sidebar-bg);
      border-bottom: 1px solid var(--color-border);
      font-family: var(--font-mono);
      font-size: 12px;
      position: sticky;
      top: 0;
      z-index: 50;
    }

    .search-bar.open { display: flex; }

    .search-bar__input {
      flex: 1;
      padding: 4px 8px;
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      color: var(--color-text);
      font-family: var(--font-mono);
      font-size: 12px;
      outline: none;
    }

    .search-bar__input:focus { border-color: var(--color-text-muted); }

    .search-bar__count {
      color: var(--color-text-muted);
      font-size: 11px;
      min-width: 40px;
      text-align: center;
    }

    .search-bar__btn {
      background: none;
      border: 1px solid var(--color-border);
      color: var(--color-text-muted);
      cursor: pointer;
      padding: 2px 6px;
      font-size: 10px;
      font-family: var(--font-mono);
    }

    .search-bar__btn:hover { border-color: var(--color-text-muted); color: var(--color-text); }

    .search-bar__close {
      background: none;
      border: none;
      color: var(--color-text-muted);
      cursor: pointer;
      font-size: 16px;
      padding: 0 4px;
    }

    .search-bar__close:hover { color: var(--color-text); }

    mark.search-highlight {
      background: rgba(255, 200, 0, 0.3);
      color: inherit;
      padding: 0;
    }

    mark.search-highlight--active {
      background: rgba(255, 200, 0, 0.7);
    }
```

- [ ] **Step 3: Add search logic**

In `src/client-scripts.ts`, add the `openSearchBar` function and search logic. Place this before the context menu section:

```javascript
    // --- Page search ---
    const searchBar = document.getElementById("search-bar");
    const searchInput = document.getElementById("search-input");
    const searchCount = document.getElementById("search-count");
    const searchPrev = document.getElementById("search-prev");
    const searchNext = document.getElementById("search-next");
    const searchClose = document.getElementById("search-close");
    const markdownBody = document.querySelector(".markdown-body");
    let searchMarks = [];
    let searchActiveIdx = -1;

    function clearSearch() {
      searchMarks.forEach(mark => {
        const parent = mark.parentNode;
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
        parent.normalize();
      });
      searchMarks = [];
      searchActiveIdx = -1;
      searchCount.textContent = "";
    }

    function highlightMatches(query) {
      clearSearch();
      if (!query || !markdownBody) return;
      const walker = document.createTreeWalker(markdownBody, NodeFilter.SHOW_TEXT);
      const textNodes = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode);

      const lowerQuery = query.toLowerCase();
      for (const node of textNodes) {
        const text = node.textContent;
        const lower = text.toLowerCase();
        let idx = lower.indexOf(lowerQuery);
        if (idx === -1) continue;

        const frag = document.createDocumentFragment();
        let lastIdx = 0;
        while (idx !== -1) {
          if (idx > lastIdx) frag.appendChild(document.createTextNode(text.slice(lastIdx, idx)));
          const mark = document.createElement("mark");
          mark.className = "search-highlight";
          mark.textContent = text.slice(idx, idx + query.length);
          frag.appendChild(mark);
          searchMarks.push(mark);
          lastIdx = idx + query.length;
          idx = lower.indexOf(lowerQuery, lastIdx);
        }
        if (lastIdx < text.length) frag.appendChild(document.createTextNode(text.slice(lastIdx)));
        node.parentNode.replaceChild(frag, node);
      }

      searchCount.textContent = searchMarks.length > 0 ? "1/" + searchMarks.length : "0";
      if (searchMarks.length > 0) {
        searchActiveIdx = 0;
        searchMarks[0].classList.add("search-highlight--active");
        searchMarks[0].scrollIntoView({ block: "center" });
      }
    }

    function navigateSearch(dir) {
      if (searchMarks.length === 0) return;
      searchMarks[searchActiveIdx].classList.remove("search-highlight--active");
      searchActiveIdx = (searchActiveIdx + dir + searchMarks.length) % searchMarks.length;
      searchMarks[searchActiveIdx].classList.add("search-highlight--active");
      searchMarks[searchActiveIdx].scrollIntoView({ block: "center" });
      searchCount.textContent = (searchActiveIdx + 1) + "/" + searchMarks.length;
    }

    function openSearchBar() {
      searchBar.classList.add("open");
      searchInput.focus();
      searchInput.select();
    }

    function closeSearchBar() {
      searchBar.classList.remove("open");
      clearSearch();
      searchInput.value = "";
    }

    searchInput.addEventListener("input", () => highlightMatches(searchInput.value));
    searchPrev.addEventListener("click", () => navigateSearch(-1));
    searchNext.addEventListener("click", () => navigateSearch(1));
    searchClose.addEventListener("click", closeSearchBar);
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeSearchBar();
      if (e.key === "Enter") navigateSearch(e.shiftKey ? -1 : 1);
    });
```

- [ ] **Step 4: Wire up the `/` keyboard shortcut**

In the `actions` object in `src/client-scripts.ts`, update the search action from a no-op to:

```javascript
      search:         () => openSearchBar(),
```

- [ ] **Step 5: Verify search works**

Run the app, press `/` or right-click → Search. Type a query — matching text should highlight yellow. Arrow buttons navigate between matches. Escape closes the bar.

- [ ] **Step 6: Commit**

```bash
git add src/template.ts src/styles.ts src/client-scripts.ts
git commit -m "feat: add in-page search with highlight navigation"
```

---

## Task 6: Edit mode — server routes

**Files:**
- Modify: `src/server.ts` (add `/api/source/` and `/api/save` routes)

- [ ] **Step 1: Add GET /api/source route**

In `src/server.ts`, add inside the `if (liveMode)` block, after the existing API routes (before the closing `}` of the liveMode block):

```typescript
        // GET /api/source/* — read raw file for editing
        if (pathname.startsWith("/api/source/") && req.method === "GET") {
          const requestedPath = decodeURIComponent(pathname.slice("/api/source/".length));
          const filePath = normalize(resolve(normalizedContentDir, requestedPath));
          if (!filePath.startsWith(normalizedContentDir)) {
            return new Response("Forbidden", { status: 403 });
          }
          try {
            const content = await readFile(filePath, "utf-8");
            return new Response(content, {
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            });
          } catch {
            return new Response("Not found", { status: 404 });
          }
        }

        // POST /api/save — write file content
        if (pathname === "/api/save" && req.method === "POST") {
          try {
            const body = await req.json() as { path: string; content: string };
            if (typeof body.path !== "string" || typeof body.content !== "string") {
              return Response.json({ error: "Missing path or content" }, { status: 400 });
            }
            const filePath = normalize(resolve(normalizedContentDir, body.path));
            if (!filePath.startsWith(normalizedContentDir)) {
              return Response.json({ error: "Path outside content directory" }, { status: 403 });
            }
            await writeFile(filePath, body.content);
            return Response.json({ ok: true });
          } catch (err) {
            return Response.json({ error: String(err) }, { status: 500 });
          }
        }
```

- [ ] **Step 2: Verify routes work**

Run in live demo mode. Test:

```bash
curl http://localhost:3001/api/source/welcome.md
curl -X POST http://localhost:3001/api/save -H "Content-Type: application/json" -d '{"path":"welcome.md","content":"# Test"}'
```

Expected: First returns file content, second returns `{"ok":true}`.

- [ ] **Step 3: Commit**

```bash
git add src/server.ts
git commit -m "feat: add source read and save API routes for edit mode"
```

---

## Task 7: Edit mode — config shortcut

**Files:**
- Modify: `src/config.ts` (add `edit` to ShortcutConfig)

- [ ] **Step 1: Add edit shortcut**

In `src/config.ts`, add `edit: string;` to the `ShortcutConfig` interface (after `closeOverlay`):

```typescript
export interface ShortcutConfig {
  nextPage: string;
  prevPage: string;
  goHome: string;
  scrollDown: string;
  scrollUp: string;
  scrollToTop: string;
  scrollToBottom: string;
  toggleSidebar: string;
  focusMode: string;
  nextTheme: string;
  prevTheme: string;
  fontIncrease: string;
  fontDecrease: string;
  search: string;
  showShortcuts: string;
  closeOverlay: string;
  edit: string;
}
```

Add the default in `defaultShortcuts`:

```typescript
  closeOverlay: "Escape",
  edit: "e",
```

- [ ] **Step 2: Add edit to shortcuts overlay**

In `src/template.ts`, in the `shortcutsOverlay` function, add a row for edit in the "Actions" section:

```typescript
          ${row("Edit file", s.edit)}
```

Add it after the `${row("Show shortcuts", s.showShortcuts)}` line.

- [ ] **Step 3: Commit**

```bash
git add src/config.ts src/template.ts
git commit -m "feat: add configurable edit shortcut"
```

---

## Task 8: Edit mode — client-side editor

**Files:**
- Modify: `src/template.ts` (add editor container HTML)
- Modify: `src/styles.ts` (add editor styles)
- Modify: `src/client-scripts.ts` (add edit mode logic with CodeMirror)

- [ ] **Step 1: Add editor container HTML**

In `src/template.ts`, add an editor container element. Add this constant:

```typescript
const editorHtml = `
  <div class="editor-container" id="editor-container">
    <div class="editor-toolbar" id="editor-toolbar">
      <span class="editor-toolbar__path" id="editor-path"></span>
      <div class="editor-toolbar__actions">
        <button class="editor-toolbar__btn editor-toolbar__btn--save" id="editor-save">Save</button>
        <button class="editor-toolbar__btn editor-toolbar__btn--cancel" id="editor-cancel">Cancel</button>
      </div>
    </div>
    <div class="editor-area" id="editor-area"></div>
  </div>`;
```

Add `${editorHtml}` in the `htmlPage` body, right after the `</main>` closing tag and before the toc resize handle.

- [ ] **Step 2: Add editor styles**

In `src/styles.ts`, add before `/* Search bar */`:

```css
    /* Editor */
    .editor-container {
      display: none;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    }

    .editor-container.open {
      display: flex;
    }

    .editor-container.open ~ .main { display: none; }
    .editor-container.open ~ .resize-handle--toc { display: none; }
    .editor-container.open ~ .toc-sidebar { display: none; }

    .editor-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 12px;
      background: var(--color-sidebar-bg);
      border-bottom: 1px solid var(--color-border);
      font-family: var(--font-mono);
      font-size: 12px;
    }

    .editor-toolbar__path {
      color: var(--color-text-muted);
    }

    .editor-toolbar__actions {
      display: flex;
      gap: 8px;
    }

    .editor-toolbar__btn {
      background: none;
      border: 1px solid var(--color-border);
      padding: 3px 12px;
      font-family: var(--font-mono);
      font-size: 12px;
      cursor: pointer;
      color: var(--color-text-muted);
    }

    .editor-toolbar__btn:hover { border-color: var(--color-text-muted); color: var(--color-text); }

    .editor-toolbar__btn--save { color: var(--color-link); border-color: var(--color-link); }
    .editor-toolbar__btn--save:hover { background: var(--color-link); color: var(--color-bg); }

    .editor-area {
      flex: 1;
      overflow: auto;
    }

    .editor-area .cm-editor {
      height: 100%;
    }

    .editor-area .cm-editor .cm-scroller {
      font-family: var(--font-mono);
      font-size: 14px;
    }
```

- [ ] **Step 3: Add edit mode client logic**

In `src/client-scripts.ts`, add the edit mode controller in the `settingsScript`. Place this before the context menu section:

```javascript
    // --- Edit mode (live mode only) ---
    const editorContainer = document.getElementById("editor-container");
    const editorArea = document.getElementById("editor-area");
    const editorPath = document.getElementById("editor-path");
    const editorSave = document.getElementById("editor-save");
    const editorCancel = document.getElementById("editor-cancel");
    let cmView = null;
    let cmLoaded = false;
    let editingPath = null;

    async function loadCodeMirror() {
      if (cmLoaded) return;
      const [
        { EditorView, basicSetup },
        { EditorState },
        { markdown: markdownLang },
        { python },
        { oneDark }
      ] = await Promise.all([
        import("https://esm.sh/@codemirror/basic-setup@0.20.0"),
        import("https://esm.sh/@codemirror/state@6.5.2"),
        import("https://esm.sh/@codemirror/lang-markdown@6.3.2"),
        import("https://esm.sh/@codemirror/lang-python@6.1.7"),
        import("https://esm.sh/@codemirror/theme-one-dark@6.1.2"),
      ]);
      window._cm = { EditorView, EditorState, basicSetup, markdownLang, python, oneDark };
      cmLoaded = true;
    }

    function getLangExtension(path) {
      if (!window._cm) return null;
      if (path.endsWith(".md")) return window._cm.markdownLang();
      if (path.endsWith(".py")) return window._cm.python();
      return null;
    }

    async function enterEditMode(path) {
      if (!isLiveMode || !editorContainer) return;

      // Determine path to edit
      if (!path) {
        if (currentResourceFile) {
          path = ".readrun/" + currentResourceFile.tab + "/" + currentResourceFile.fileName;
        } else {
          // Current page — derive from URL
          const urlPath = window.location.pathname.replace(/^\//, "");
          path = urlPath + ".md";
        }
      }

      editingPath = path;
      editorPath.textContent = "editing: " + path;

      try {
        await loadCodeMirror();
        const res = await fetch("/api/source/" + encodeURIComponent(path));
        if (!res.ok) throw new Error("Failed to load file");
        const content = await res.text();

        // Destroy previous editor
        if (cmView) { cmView.destroy(); cmView = null; }

        const cm = window._cm;
        const extensions = [cm.basicSetup];
        const isDark = document.documentElement.dataset.theme && document.documentElement.dataset.theme !== "light";
        if (isDark) extensions.push(cm.oneDark);
        const langExt = getLangExtension(path);
        if (langExt) extensions.push(langExt);

        cmView = new cm.EditorView({
          state: cm.EditorState.create({ doc: content, extensions }),
          parent: editorArea,
        });

        editorContainer.classList.add("open");
      } catch (err) {
        editorPath.textContent = "Error: " + err.message;
      }
    }

    async function saveEdit() {
      if (!cmView || !editingPath) return;
      editorSave.textContent = "Saving...";
      editorSave.disabled = true;
      try {
        const content = cmView.state.doc.toString();
        const res = await fetch("/api/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: editingPath, content }),
        });
        const data = await res.json();
        if (data.ok) {
          exitEditMode();
          window.location.reload();
        } else {
          editorPath.textContent = "Save failed: " + (data.error || "unknown error");
        }
      } catch (err) {
        editorPath.textContent = "Save failed: " + err.message;
      }
      editorSave.textContent = "Save";
      editorSave.disabled = false;
    }

    function exitEditMode() {
      editorContainer.classList.remove("open");
      if (cmView) { cmView.destroy(); cmView = null; }
      editingPath = null;
    }

    if (editorSave) editorSave.addEventListener("click", saveEdit);
    if (editorCancel) editorCancel.addEventListener("click", exitEditMode);
```

- [ ] **Step 4: Wire up the edit shortcut and context menu action**

In the `actions` object, add the edit action:

```javascript
      edit:           () => enterEditMode(),
```

Add `edit` to the keyboard shortcut binding loop (it will be automatically picked up since it's in the config JSON).

In the context menu click handler, the `if (action === "edit") enterEditMode();` line is already there from Task 4.

- [ ] **Step 5: Handle Escape in edit mode**

Update the `closeOverlay` action to also exit edit mode:

```javascript
      closeOverlay:   () => {
        if (isAnyOverlayOpen()) { closeAllOverlays(); return; }
        if (panel.classList.contains("open")) { panel.classList.remove("open"); return; }
        if (editorContainer && editorContainer.classList.contains("open")) { exitEditMode(); return; }
        if (settings.focusMode) { toggleFocusMode(); return; }
        panel.classList.toggle("open");
      },
```

- [ ] **Step 6: Verify edit mode works**

Run in live demo mode. Press `e` or right-click → Edit. CodeMirror editor should load with the current file's content. Edit text, click Save — file should update and page reload with changes. Click Cancel to discard.

- [ ] **Step 7: Commit**

```bash
git add src/template.ts src/styles.ts src/client-scripts.ts
git commit -m "feat: add in-browser edit mode with CodeMirror"
```

---

## Task 9: Final integration and cleanup

**Files:**
- Modify: `src/template.ts` (remove unused imports)
- Modify: `src/client-scripts.ts` (ensure no dead code)

- [ ] **Step 1: Remove filesIcon and filesPanelHtml references**

Verify `filesPanelHtml` function and `filesIcon` constant have been removed from `src/template.ts`. Check for any remaining references to `files-panel`, `files-toggle`, `files-dropdown`, `files-list`, `files-add-btn`, `files-input` in both `template.ts` and `client-scripts.ts`. Remove any found.

- [ ] **Step 2: Verify the complete flow end-to-end**

Run `bun src/cli.ts`, select Demo → Live:

1. **Resource browser**: Click each tab (content/images/files/scripts) in the bottom switcher. Verify nav tree swaps, file previews load.
2. **Context menu**: Right-click in main area. Verify Search, Edit, Settings appear. Edit should be visible in live mode.
3. **Search**: Right-click → Search or press `/`. Type a query, verify highlights, navigate with arrows, close with Escape.
4. **Edit mode**: Press `e` or right-click → Edit. Verify CodeMirror loads, edit a file, save, verify changes persist.
5. **Non-live mode**: Select Demo → Standard. Verify Edit is hidden in context menu, `e` shortcut does nothing, resource tabs still work.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete resource browser, edit mode, and context menu integration"
```
