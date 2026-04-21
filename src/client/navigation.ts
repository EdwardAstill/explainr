export const navigationCode = `
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
    let savedMainHtml = mainContent ? mainContent.innerHTML : "";
    let activeTab = localStorage.getItem(TAB_KEY) || "content";

    function setActiveTab(tab) {
      activeTab = tab;
      localStorage.setItem(TAB_KEY, tab);
      document.querySelectorAll(".resource-switcher__item").forEach(el => {
        el.classList.toggle("resource-switcher__item--active", el.dataset.tab === tab);
      });
    }

    async function loadResourceTab(tab) {
      if (tab === "content") {
        const currentNav = sidebar.querySelector(".sidebar-nav");
        if (currentNav && savedNavHtml) {
          currentNav.outerHTML = savedNavHtml;
          if (mainContent && savedMainHtml) {
            mainContent.innerHTML = savedMainHtml;
          }
          setTimeout(applyEnteredFolder, 0);
        } else {
          window.location.reload();
        }
        return;
      }

      try {
        const res = await fetch("/api/resources/" + tab);
        const data = await res.json();
        let html = '<nav class="sidebar-nav nav-tree">';

        html += '<ul>';
        if (data.files && data.files.length > 0) {
          for (const f of data.files) {
            html += '<li class="nav-file"><a href="#" data-resource-tab="' + escapeHtml(tab) + '" data-resource-file="' + escapeHtml(f.name) + '">' + escapeHtml(f.name) + '</a></li>';
          }
        } else {
          html += '<li style="padding:3px 12px;color:var(--color-text-muted);font-family:var(--font-mono);font-size:12px;">(empty)</li>';
        }
        html += '</ul>';

        html += '</nav>';
        const currentNav = sidebar.querySelector(".sidebar-nav");
        if (currentNav) {
          currentNav.outerHTML = html;
        }
      } catch {}
    }

    async function previewResource(tab, fileName) {
      if (!mainContent) return;
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

    // --- Enter folder feature ---
    const ENTERED_FOLDER_KEY = "readrun-entered-folder";

    function getEnteredFolder() {
      return localStorage.getItem(ENTERED_FOLDER_KEY) || null;
    }

    function setEnteredFolder(path) {
      if (path) localStorage.setItem(ENTERED_FOLDER_KEY, path);
      else localStorage.removeItem(ENTERED_FOLDER_KEY);
    }

    // Sidebar context menu
    const sidebarCtxMenu = document.getElementById("sidebar-context-menu");
    let ctxFolderPath = null;

    function showSidebarCtxMenu(x, y) {
      sidebarCtxMenu.style.left = x + "px";
      sidebarCtxMenu.style.top = y + "px";
      sidebarCtxMenu.classList.add("open");
      const rect = sidebarCtxMenu.getBoundingClientRect();
      if (rect.right > window.innerWidth) sidebarCtxMenu.style.left = (window.innerWidth - rect.width - 4) + "px";
      if (rect.bottom > window.innerHeight) sidebarCtxMenu.style.top = (window.innerHeight - rect.height - 4) + "px";
    }

    function hideSidebarCtxMenu() {
      sidebarCtxMenu.classList.remove("open");
      ctxFolderPath = null;
    }

    const sidebarNavEl = document.querySelector(".sidebar-nav");
    if (sidebarNavEl) {
      sidebarNavEl.addEventListener("contextmenu", (e) => {
        const summary = e.target.closest("details[data-nav-path] > summary");
        if (!summary) return;
        e.preventDefault();
        e.stopPropagation();
        const details = summary.parentElement;
        ctxFolderPath = details.dataset.navPath;
        showSidebarCtxMenu(e.clientX, e.clientY);
      });
    }

    document.addEventListener("click", (e) => {
      if (sidebarCtxMenu && !sidebarCtxMenu.contains(e.target)) hideSidebarCtxMenu();
    });

    document.addEventListener("scroll", hideSidebarCtxMenu, { passive: true });

    if (sidebarCtxMenu) {
      sidebarCtxMenu.addEventListener("click", (e) => {
        const item = e.target.closest(".context-menu__item");
        if (!item) return;
        const folderPath = ctxFolderPath;
        hideSidebarCtxMenu();
        if (item.dataset.action === "enter-folder" && folderPath) {
          setEnteredFolder(folderPath);
          applyEnteredFolder();
        }
      });
    }

    function applyEnteredFolder() {
      const navEl = document.querySelector(".sidebar-nav");
      if (!navEl) return;

      // Remove any existing breadcrumb bar
      const existingBar = navEl.querySelector(".entered-folder-bar");
      if (existingBar) existingBar.remove();

      // Reset all hidden/promoted state
      navEl.querySelectorAll(".entered-folder-hidden").forEach(el => el.classList.remove("entered-folder-hidden"));
      navEl.querySelectorAll(".entered-folder-promoted").forEach(el => el.classList.remove("entered-folder-promoted"));

      const enteredPath = getEnteredFolder();
      if (!enteredPath) return;

      const targetDetails = navEl.querySelector('details[data-nav-path="' + CSS.escape(enteredPath) + '"]');
      if (!targetDetails) {
        setEnteredFolder(null);
        return;
      }

      // Force target open
      targetDetails.setAttribute("open", "");

      // Find all ancestor <li> elements from target up to nav root
      const ancestorLis = new Set();
      let el = targetDetails.closest("li");
      while (el && navEl.contains(el)) {
        ancestorLis.add(el);
        const parentUl = el.parentElement;
        if (!parentUl) break;
        el = parentUl.closest("li");
      }

      // At each level, hide siblings not in the ancestor chain
      for (const ancestorLi of ancestorLis) {
        const parentUl = ancestorLi.parentElement;
        if (!parentUl) continue;
        for (const sibling of parentUl.children) {
          if (sibling !== ancestorLi) {
            sibling.classList.add("entered-folder-hidden");
          }
        }
        // Force ancestor details open and hide their summaries
        const details = ancestorLi.querySelector(":scope > details");
        if (details) {
          details.setAttribute("open", "");
          details.querySelector(":scope > summary").classList.add("entered-folder-hidden");
        }
      }

      // Promote the target's inner <ul> (remove indentation)
      const innerUl = targetDetails.querySelector(":scope > ul");
      if (innerUl) innerUl.classList.add("entered-folder-promoted");

      // Build breadcrumb bar
      const segments = enteredPath.split("/").filter(Boolean);
      let breadcrumbHtml = '<div class="entered-folder-bar">';
      breadcrumbHtml += '<span class="entered-folder-bar__item" data-enter-path="">&#x2302;</span>';
      let accum = "";
      for (let i = 0; i < segments.length; i++) {
        accum += "/" + segments[i];
        const isLast = i === segments.length - 1;
        breadcrumbHtml += '<span class="entered-folder-bar__sep">/</span>';
        if (isLast) {
          breadcrumbHtml += '<span class="entered-folder-bar__current">' + escapeHtml(segments[i]) + '</span>';
        } else {
          breadcrumbHtml += '<span class="entered-folder-bar__item" data-enter-path="' + escapeHtml(accum) + '">' + escapeHtml(segments[i]) + '</span>';
        }
      }
      breadcrumbHtml += '</div>';
      navEl.insertAdjacentHTML("afterbegin", breadcrumbHtml);

      // Breadcrumb click handlers
      navEl.querySelector(".entered-folder-bar").addEventListener("click", (e) => {
        const item = e.target.closest("[data-enter-path]");
        if (!item) return;
        const path = item.dataset.enterPath;
        setEnteredFolder(path || null);
        applyEnteredFolder();
      });
    }

    // Apply on page load
    applyEnteredFolder();
`;
