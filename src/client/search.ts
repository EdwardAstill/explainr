export const searchCode = `
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
    });

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
      showShortcuts:  () => openOverlay("shortcuts-overlay"),
      closeOverlay:   () => {
        if (isAnyOverlayOpen()) { closeAllOverlays(); return; }
        if (searchBar.classList.contains("open")) { closeSearchBar(); return; }
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
`;
