export const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js";

export const executionScript = `
  <script type="module">
    const isLiveMode = document.body.dataset.live === "true";

    let pyodide = null;
    let pyodideLoading = null;

    async function loadPyodideRuntime() {
      if (pyodide) return pyodide;
      if (pyodideLoading) return pyodideLoading;
      pyodideLoading = (async () => {
        const script = document.createElement("script");
        script.src = "${PYODIDE_URL}";
        document.head.appendChild(script);
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });
        pyodide = await globalThis.loadPyodide();

        // Preload embedded files into Pyodide's virtual filesystem
        const filesEl = document.getElementById("readrun-files");
        if (filesEl) {
          try {
            const files = JSON.parse(filesEl.textContent);
            for (const f of files) {
              const bytes = Uint8Array.from(atob(f.data), c => c.charCodeAt(0));
              pyodide.FS.writeFile(f.name, bytes);
            }
          } catch {}
        }

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

    function runHtml(code, btn, outputEl) {
      outputEl.innerHTML = "";
      const iframe = document.createElement("iframe");
      iframe.sandbox = "allow-scripts";
      iframe.style.width = "100%";
      iframe.style.border = "none";
      iframe.style.background = "transparent";
      outputEl.appendChild(iframe);
      iframe.srcdoc = code;
      iframe.addEventListener("load", () => {
        try {
          const h = iframe.contentDocument.documentElement.scrollHeight;
          iframe.style.height = Math.min(Math.max(h, 60), 600) + "px";
        } catch {
          iframe.style.height = "200px";
        }
      });
    }

    document.addEventListener("click", async (e) => {
      const btn = e.target.closest(".exec-run-btn");
      if (!btn) return;

      const blockId = btn.dataset.blockId;
      const block = btn.closest(".exec-block");
      const sourceEl = document.querySelector(\`script[data-source="\${blockId}"]\`);
      const outputEl = document.querySelector(\`[data-output="\${blockId}"]\`);
      if (!sourceEl || !outputEl) return;

      const code = atob(sourceEl.textContent);
      const lang = block ? block.dataset.lang : "";

      if (lang === "html") {
        runHtml(code, btn, outputEl);
      } else if (isLiveMode) {
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

    // --- Image lightbox ---
    const lightbox = document.getElementById("lightbox");
    const lightboxImg = document.getElementById("lightbox-img");

    document.addEventListener("click", (e) => {
      const img = e.target.closest(".markdown-body img, .readrun-img, .exec-output img");
      if (img) {
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt || "";
        lightbox.classList.add("open");
      }
    });

    lightbox.addEventListener("click", () => {
      lightbox.classList.remove("open");
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && lightbox.classList.contains("open")) {
        lightbox.classList.remove("open");
      }
    });
  </script>`;

export const settingsScript = `
  <script type="module">
    const STORAGE_KEY = "readrun-settings";
    const THEMES = ["light", "dark", "solarized", "nord", "dracula", "monokai", "gruvbox", "catppuccin"];
    const THEME_LABELS = { light: "Light", dark: "Dark", solarized: "Solarized", nord: "Nord", dracula: "Dracula", monokai: "Monokai", gruvbox: "Gruvbox", catppuccin: "Catppuccin" };
    const FONT_SIZES = ["small", "medium", "large"];
    const fontSizeMap = { small: "14px", medium: "16px", large: "18px" };
    const defaults = { fontSize: "medium", contentWidth: 880, showSidebar: true, theme: "light", focusMode: false };

    function loadSettings() {
      try {
        return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
      } catch { return { ...defaults }; }
    }

    function saveSettings(s) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    }

    function applySettings(s) {
      // Font size
      document.body.style.fontSize = fontSizeMap[s.fontSize] || fontSizeMap.medium;
      document.querySelectorAll("[data-font]").forEach(btn => {
        btn.classList.toggle("settings__font-btn--active", btn.dataset.font === s.fontSize);
      });

      // Content width
      document.getElementById("main-content").style.maxWidth = s.contentWidth + "px";
      document.getElementById("width-range").value = s.contentWidth;
      document.getElementById("width-label").textContent = "Content width \\u2014 " + s.contentWidth + "px";

      // Sidebar
      const sidebar = document.getElementById("sidebar");
      sidebar.style.display = s.showSidebar && !s.focusMode ? "" : "none";
      const sw = document.getElementById("sidebar-toggle");
      sw.classList.toggle("settings__switch--on", s.showSidebar);
      sw.setAttribute("aria-checked", s.showSidebar);

      // Theme
      document.documentElement.dataset.theme = s.theme === "light" ? "" : s.theme;
      if (s.theme === "light") delete document.documentElement.dataset.theme;
      else document.documentElement.dataset.theme = s.theme;
      document.getElementById("theme-name").textContent = THEME_LABELS[s.theme] || s.theme;

      // Theme picker active state
      document.querySelectorAll("[data-theme-choice]").forEach(card => {
        card.classList.toggle("theme-card--active", card.dataset.themeChoice === s.theme);
      });

      // Focus mode
      if (s.focusMode) {
        document.body.dataset.focus = "true";
      } else {
        delete document.body.dataset.focus;
      }
    }

    const settings = loadSettings();
    applySettings(settings);

    // --- Settings panel (opened via Escape key) ---
    const panel = document.getElementById("settings-panel");

    document.addEventListener("mousedown", (e) => {
      const settingsEl = document.getElementById("settings");
      if (settingsEl && !settingsEl.contains(e.target)) {
        panel.classList.remove("open");
      }
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

    // --- Theme controls ---
    function cycleTheme(dir) {
      const idx = THEMES.indexOf(settings.theme);
      settings.theme = THEMES[(idx + dir + THEMES.length) % THEMES.length];
      saveSettings(settings);
      applySettings(settings);
    }

    document.getElementById("theme-prev").addEventListener("click", () => cycleTheme(-1));
    document.getElementById("theme-next").addEventListener("click", () => cycleTheme(1));

    // Click theme name to open picker
    document.getElementById("theme-name").addEventListener("click", () => {
      openOverlay("theme-picker-overlay");
      panel.classList.remove("open");
    });

    // Theme picker card clicks
    document.getElementById("theme-picker-overlay").addEventListener("click", (e) => {
      const card = e.target.closest("[data-theme-choice]");
      if (card) {
        settings.theme = card.dataset.themeChoice;
        saveSettings(settings);
        applySettings(settings);
        closeAllOverlays();
      }
    });

    // --- Shortcuts button ---
    document.getElementById("open-shortcuts-btn").addEventListener("click", () => {
      openOverlay("shortcuts-overlay");
      panel.classList.remove("open");
    });

    // --- Overlay management ---
    function openOverlay(id) {
      closeAllOverlays();
      document.getElementById(id).classList.add("open");
    }

    function closeAllOverlays() {
      document.querySelectorAll(".overlay.open").forEach(el => el.classList.remove("open"));
    }

    function isAnyOverlayOpen() {
      return !!document.querySelector(".overlay.open");
    }

    // Close overlay on backdrop click
    document.querySelectorAll(".overlay").forEach(overlay => {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeAllOverlays();
      });
    });

    // --- Page navigation helpers ---
    function getNavLinks() {
      return Array.from(document.querySelectorAll(".sidebar-nav a[href]"));
    }

    function getCurrentPageIndex() {
      const links = getNavLinks();
      const path = window.location.pathname;
      return links.findIndex(a => {
        const href = new URL(a.href, window.location.origin).pathname;
        return href === path;
      });
    }

    function navigateToPage(offset) {
      const links = getNavLinks();
      const idx = getCurrentPageIndex();
      if (idx < 0) return;
      const next = idx + offset;
      if (next >= 0 && next < links.length) {
        window.location.href = links[next].href;
      }
    }

    // --- Font size cycling ---
    function cycleFontSize(dir) {
      const idx = FONT_SIZES.indexOf(settings.fontSize);
      const next = idx + dir;
      if (next >= 0 && next < FONT_SIZES.length) {
        settings.fontSize = FONT_SIZES[next];
        saveSettings(settings);
        applySettings(settings);
      }
    }

    // --- Focus mode ---
    function toggleFocusMode() {
      settings.focusMode = !settings.focusMode;
      saveSettings(settings);
      applySettings(settings);
    }

    // --- TOC scroll spy ---
    const tocLinks = document.querySelectorAll(".toc-link");
    if (tocLinks.length > 0) {
      const headingEls = Array.from(tocLinks).map(link => {
        const id = decodeURIComponent(link.getAttribute("href").slice(1));
        return document.getElementById(id);
      }).filter(Boolean);

      function updateActiveToc() {
        let active = 0;
        const scrollY = window.scrollY + 80;
        for (let i = 0; i < headingEls.length; i++) {
          if (headingEls[i].offsetTop <= scrollY) active = i;
        }
        tocLinks.forEach((link, i) => {
          link.classList.toggle("toc-link--active", i === active);
        });
      }

      window.addEventListener("scroll", updateActiveToc, { passive: true });
      updateActiveToc();
    }

    // --- Resize handles ---
    function initResize(handleId, targetId, side) {
      const handle = document.getElementById(handleId);
      const target = document.getElementById(targetId);
      if (!handle || !target) return;

      let startX, startWidth;
      handle.addEventListener("mousedown", (e) => {
        e.preventDefault();
        startX = e.clientX;
        startWidth = target.offsetWidth;
        handle.classList.add("resize-handle--active");
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";

        function onMove(e) {
          const dx = e.clientX - startX;
          const newWidth = Math.max(120, side === "left" ? startWidth + dx : startWidth - dx);
          target.style.width = newWidth + "px";
          target.style.minWidth = newWidth + "px";
        }

        function onUp() {
          handle.classList.remove("resize-handle--active");
          document.body.style.cursor = "";
          document.body.style.userSelect = "";
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
        }

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      });
    }

    initResize("resize-sidebar", "sidebar", "left");
    initResize("resize-toc", "toc-sidebar", "right");

    // --- Nav folder state persistence ---
    const NAV_STATE_KEY = "readrun-nav-collapsed";
    function loadCollapsed() {
      try { return new Set(JSON.parse(localStorage.getItem(NAV_STATE_KEY) || "[]")); }
      catch { return new Set(); }
    }
    function saveCollapsed(collapsed) {
      localStorage.setItem(NAV_STATE_KEY, JSON.stringify([...collapsed]));
    }
    const collapsed = loadCollapsed();
    document.querySelectorAll(".sidebar-nav details[data-nav-path]").forEach(d => {
      if (collapsed.has(d.dataset.navPath)) d.removeAttribute("open");
      d.addEventListener("toggle", () => {
        if (d.open) collapsed.delete(d.dataset.navPath);
        else collapsed.add(d.dataset.navPath);
        saveCollapsed(collapsed);
      });
    });

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

        const currentNav = sidebar.querySelector(".sidebar-nav");
        if (currentNav) {
          currentNav.outerHTML = html;
        }
      } catch {}
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

    if (switcher) {
      switcher.addEventListener("click", (e) => {
        const item = e.target.closest(".resource-switcher__item");
        if (!item) return;
        const tab = item.dataset.tab;
        setActiveTab(tab);
        loadResourceTab(tab);
      });
    }

    document.addEventListener("click", (e) => {
      const link = e.target.closest("[data-resource-file]");
      if (!link) return;
      e.preventDefault();
      const tab = link.dataset.resourceTab;
      const fileName = link.dataset.resourceFile;
      document.querySelectorAll("[data-resource-file]").forEach(el => {
        el.parentElement.classList.toggle("active", el === link);
      });
      previewResource(tab, fileName);
    });

    if (activeTab !== "content") {
      setActiveTab(activeTab);
      loadResourceTab(activeTab);
    }

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

    // --- Context menu ---
    const contextMenu = document.getElementById("context-menu");

    function showContextMenu(x, y) {
      contextMenu.style.left = x + "px";
      contextMenu.style.top = y + "px";
      contextMenu.classList.add("open");
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

      if (!path) {
        if (currentResourceFile) {
          path = ".readrun/" + currentResourceFile.tab + "/" + currentResourceFile.fileName;
        } else {
          const urlPath = window.location.pathname.replace(/^\\//, "");
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

    // --- Keyboard shortcuts (configurable via ~/.config/readrun/settings.toml) ---
    const shortcuts = JSON.parse(document.getElementById("readrun-shortcuts").textContent);

    // Parse binding string into a matcher: "Shift+Space" => { shift: true, key: " " }
    // Chord bindings like "g h" are split into prefix + suffix
    function parseBinding(binding) {
      const parts = binding.split("+");
      const mods = { shift: false, ctrl: false, meta: false, alt: false };
      let key = parts.pop();
      for (const m of parts) {
        const ml = m.toLowerCase();
        if (ml === "shift") mods.shift = true;
        else if (ml === "ctrl" || ml === "control") mods.ctrl = true;
        else if (ml === "meta" || ml === "cmd") mods.meta = true;
        else if (ml === "alt") mods.alt = true;
      }
      if (key === "Space") key = " ";
      return { key, ...mods };
    }

    function matchesKey(e, parsed) {
      return e.key === parsed.key
        && e.shiftKey === parsed.shift
        && e.ctrlKey === parsed.ctrl
        && e.metaKey === parsed.meta
        && e.altKey === parsed.alt;
    }

    // Build action map: split chords (e.g. "g h") from simple bindings
    const actions = {
      nextPage:       () => navigateToPage(1),
      prevPage:       () => navigateToPage(-1),
      goHome:         () => { const links = getNavLinks(); if (links.length) window.location.href = links[0].href; },
      scrollDown:     () => window.scrollBy({ top: window.innerHeight * 0.85, behavior: "smooth" }),
      scrollUp:       () => window.scrollBy({ top: -window.innerHeight * 0.85, behavior: "smooth" }),
      scrollToTop:    () => window.scrollTo({ top: 0, behavior: "smooth" }),
      scrollToBottom: () => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }),
      toggleSidebar:  () => { settings.showSidebar = !settings.showSidebar; saveSettings(settings); applySettings(settings); },
      focusMode:      () => toggleFocusMode(),
      nextTheme:      () => cycleTheme(1),
      prevTheme:      () => cycleTheme(-1),
      fontIncrease:   () => cycleFontSize(1),
      fontDecrease:   () => cycleFontSize(-1),
      search:         () => openSearchBar(),
      edit:           () => enterEditMode(),
      showShortcuts:  () => openOverlay("shortcuts-overlay"),
      closeOverlay:   () => {
        if (isAnyOverlayOpen()) { closeAllOverlays(); return; }
        if (searchBar.classList.contains("open")) { closeSearchBar(); return; }
        if (editorContainer && editorContainer.classList.contains("open")) { exitEditMode(); return; }
        if (panel.classList.contains("open")) { panel.classList.remove("open"); return; }
        if (settings.focusMode) { toggleFocusMode(); return; }
        panel.classList.toggle("open");
      },
    };

    // Pre-parse all bindings into simple keys and chord sequences
    const simpleBindings = [];
    const chordBindings = {};

    for (const [action, binding] of Object.entries(shortcuts)) {
      const tokens = binding.split(/\\s+/);
      if (tokens.length === 2) {
        // Chord: "g h" => prefix "g", suffix "h"
        const prefix = tokens[0];
        const suffix = parseBinding(tokens[1]);
        if (!chordBindings[prefix]) chordBindings[prefix] = [];
        chordBindings[prefix].push({ suffix, action });
      } else {
        const parsed = parseBinding(binding);
        const needsPreventDefault = parsed.key === " " || parsed.key === "/";
        simpleBindings.push({ parsed, action, needsPreventDefault });
      }
    }

    let chordKey = null;
    let chordTimer = null;

    function clearChord() {
      chordKey = null;
      if (chordTimer) { clearTimeout(chordTimer); chordTimer = null; }
    }

    document.addEventListener("keydown", (e) => {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target.isContentEditable) {
        if (e.key === "Escape") e.target.blur();
        return;
      }

      // Close overlay always works with Escape
      if (e.key === "Escape") {
        actions.closeOverlay();
        return;
      }

      if (isAnyOverlayOpen()) return;

      // Handle chord second key
      if (chordKey) {
        const chords = chordBindings[chordKey] || [];
        clearChord();
        for (const { suffix, action } of chords) {
          if (matchesKey(e, suffix)) {
            if (actions[action]) actions[action]();
            return;
          }
        }
        return;
      }

      // Check if this key starts a chord
      if (!e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && chordBindings[e.key]) {
        // But only if it's not also a simple binding
        const isAlsoSimple = simpleBindings.some(b => matchesKey(e, b.parsed));
        if (!isAlsoSimple) {
          chordKey = e.key;
          chordTimer = setTimeout(clearChord, 1000);
          return;
        }
      }

      // Simple bindings
      for (const { parsed, action, needsPreventDefault } of simpleBindings) {
        if (matchesKey(e, parsed)) {
          if (needsPreventDefault) e.preventDefault();
          if (actions[action]) actions[action]();
          return;
        }
      }
    });
  </script>`;
