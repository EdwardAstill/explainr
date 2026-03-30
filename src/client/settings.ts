export const settingsCode = `
    const STORAGE_KEY = "readrun-settings";
    const THEMES = ["light", "dark", "solarized", "nord", "dracula", "monokai", "gruvbox", "catppuccin"];
    const THEME_LABELS = { light: "Light", dark: "Dark", solarized: "Solarized", nord: "Nord", dracula: "Dracula", monokai: "Monokai", gruvbox: "Gruvbox", catppuccin: "Catppuccin" };
    const FONT_SIZES = ["small", "medium", "large"];
    const fontSizeMap = { small: "14px", medium: "16px", large: "18px" };
    const defaults = { fontSize: "medium", contentWidth: 880, showSidebar: true, theme: "light", focusMode: false };

    function escapeHtml(s) {
      const d = document.createElement("div");
      d.textContent = s;
      return d.innerHTML;
    }

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
`;
