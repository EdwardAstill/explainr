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
`;
