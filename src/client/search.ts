// @ts-nocheck
// In-page search, context menu, keyboard shortcut dispatch.
import { settings, saveSettings, applySettings, THEMES } from "./settings";
import { openOverlay, closeAllOverlays, isAnyOverlayOpen } from "./dom-utils";
import { navigateToPage, getNavLinks, cycleFontSize, toggleFocusMode } from "./navigation";

const searchBar = document.getElementById("search-bar");
const searchInput = document.getElementById("search-input");
const searchCount = document.getElementById("search-count");
const searchPrev = document.getElementById("search-prev");
const searchNext = document.getElementById("search-next");
const searchClose = document.getElementById("search-close");
let markdownBody = document.querySelector(".markdown-body");
document.addEventListener("readrun:remount", () => {
  markdownBody = document.querySelector(".markdown-body");
});
let searchMarks = [];
let searchActiveIdx = -1;

function clearSearch() {
  searchMarks.forEach((mark) => {
    const parent = mark.parentNode;
    parent.replaceChild(document.createTextNode(mark.textContent), mark);
    parent.normalize();
  });
  searchMarks = [];
  searchActiveIdx = -1;
  if (searchCount) searchCount.textContent = "";
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

  if (searchCount) searchCount.textContent = searchMarks.length > 0 ? "1/" + searchMarks.length : "0";
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
  if (searchCount) searchCount.textContent = (searchActiveIdx + 1) + "/" + searchMarks.length;
}

export function openSearchBar() {
  searchBar?.classList.add("open");
  searchInput?.focus();
  searchInput?.select();
}

export function closeSearchBar() {
  searchBar?.classList.remove("open");
  clearSearch();
  if (searchInput) searchInput.value = "";
}

searchInput?.addEventListener("input", () => highlightMatches(searchInput.value));
searchPrev?.addEventListener("click", () => navigateSearch(-1));
searchNext?.addEventListener("click", () => navigateSearch(1));
searchClose?.addEventListener("click", closeSearchBar);
searchInput?.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeSearchBar();
  if (e.key === "Enter") navigateSearch(e.shiftKey ? -1 : 1);
});

const contextMenu = document.getElementById("context-menu");
const panel = document.getElementById("settings-panel");

function showContextMenu(x, y) {
  if (!contextMenu) return;
  contextMenu.style.left = x + "px";
  contextMenu.style.top = y + "px";
  contextMenu.classList.add("open");
  const rect = contextMenu.getBoundingClientRect();
  if (rect.right > window.innerWidth) contextMenu.style.left = (window.innerWidth - rect.width - 4) + "px";
  if (rect.bottom > window.innerHeight) contextMenu.style.top = (window.innerHeight - rect.height - 4) + "px";
}

function hideContextMenu() {
  contextMenu?.classList.remove("open");
}

document.querySelector(".main")?.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  showContextMenu(e.clientX, e.clientY);
});

document.addEventListener("click", (e) => {
  if (contextMenu && !contextMenu.contains(e.target)) hideContextMenu();
});

document.addEventListener("scroll", hideContextMenu, { passive: true });

contextMenu?.addEventListener("click", (e) => {
  const item = e.target.closest(".context-menu__item");
  if (!item) return;
  hideContextMenu();
  const action = item.dataset.action;
  if (action === "settings") panel?.classList.toggle("open");
  if (action === "search") openSearchBar();
});

const shortcutsEl = document.getElementById("readrun-shortcuts");
const shortcuts = shortcutsEl ? JSON.parse(shortcutsEl.textContent) : {};

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

function cycleTheme(dir) {
  const idx = THEMES.indexOf(settings.theme);
  settings.theme = THEMES[(idx + dir + THEMES.length) % THEMES.length];
  saveSettings(settings);
  applySettings(settings);
}

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
    if (searchBar?.classList.contains("open")) { closeSearchBar(); return; }
    if (panel?.classList.contains("open")) { panel.classList.remove("open"); return; }
    if (settings.focusMode) { toggleFocusMode(); return; }
    panel?.classList.toggle("open");
  },
};

const simpleBindings = [];
const chordBindings = {};

for (const [action, binding] of Object.entries(shortcuts)) {
  const tokens = binding.split(/\s+/);
  if (tokens.length === 2) {
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

  if (e.key === "Escape") {
    actions.closeOverlay();
    return;
  }

  if (isAnyOverlayOpen()) return;

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

  if (!e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && chordBindings[e.key]) {
    const isAlsoSimple = simpleBindings.some((b) => matchesKey(e, b.parsed));
    if (!isAlsoSimple) {
      chordKey = e.key;
      chordTimer = setTimeout(clearChord, 1000);
      return;
    }
  }

  for (const { parsed, action, needsPreventDefault } of simpleBindings) {
    if (matchesKey(e, parsed)) {
      if (needsPreventDefault) e.preventDefault();
      if (actions[action]) actions[action]();
      return;
    }
  }
});
