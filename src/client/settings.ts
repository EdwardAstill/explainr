// @ts-nocheck
// Settings state, persistence, theme cycling, settings panel.
import { openOverlay, closeAllOverlays } from "./dom-utils";

const STORAGE_KEY = "readrun-settings";
export const THEMES = ["light", "dark", "solarized", "nord", "dracula", "monokai", "gruvbox", "catppuccin"];
const THEME_LABELS = { light: "Light", dark: "Dark", solarized: "Solarized", nord: "Nord", dracula: "Dracula", monokai: "Monokai", gruvbox: "Gruvbox", catppuccin: "Catppuccin" };
const defaults = { fontSize: 16, contentWidth: 880, showSidebar: true, theme: "light", focusMode: false };

export const FONT_SIZES = [12, 14, 16, 18, 20, 24];

export function loadSettings() {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return { ...defaults };
  }
}

export function saveSettings(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function applySettings(s) {
  document.body.style.fontSize = s.fontSize + "px";
  const fontRange = document.getElementById("font-range");
  if (fontRange) fontRange.value = s.fontSize;
  const fontLabel = document.getElementById("font-label");
  if (fontLabel) fontLabel.textContent = "Font size — " + s.fontSize + "px";

  const main = document.getElementById("main-content");
  if (main) main.style.maxWidth = s.contentWidth + "px";
  const widthRange = document.getElementById("width-range");
  if (widthRange) widthRange.value = s.contentWidth;
  const widthLabel = document.getElementById("width-label");
  if (widthLabel) widthLabel.textContent = "Content width — " + s.contentWidth + "px";

  const sidebar = document.getElementById("sidebar");
  if (sidebar) sidebar.style.display = s.showSidebar && !s.focusMode ? "" : "none";
  const sw = document.getElementById("sidebar-toggle");
  if (sw) {
    sw.classList.toggle("settings__switch--on", s.showSidebar);
    sw.setAttribute("aria-checked", s.showSidebar);
  }

  if (s.theme === "light") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = s.theme;
  const themeName = document.getElementById("theme-name");
  if (themeName) themeName.textContent = THEME_LABELS[s.theme] || s.theme;

  document.querySelectorAll("[data-theme-choice]").forEach((card) => {
    card.classList.toggle("theme-card--active", card.dataset.themeChoice === s.theme);
  });

  if (s.focusMode) document.body.dataset.focus = "true";
  else delete document.body.dataset.focus;
}

export const settings = loadSettings();
applySettings(settings);

const panel = document.getElementById("settings-panel");

document.addEventListener("mousedown", (e) => {
  const settingsEl = document.getElementById("settings");
  if (settingsEl && !settingsEl.contains(e.target) && panel) {
    panel.classList.remove("open");
  }
});

document.getElementById("font-range")?.addEventListener("input", (e) => {
  settings.fontSize = Number(e.target.value);
  saveSettings(settings);
  applySettings(settings);
});

document.getElementById("width-range")?.addEventListener("input", (e) => {
  settings.contentWidth = Number(e.target.value);
  saveSettings(settings);
  applySettings(settings);
});

document.getElementById("sidebar-toggle")?.addEventListener("click", () => {
  settings.showSidebar = !settings.showSidebar;
  saveSettings(settings);
  applySettings(settings);
});

function cycleTheme(dir) {
  const idx = THEMES.indexOf(settings.theme);
  settings.theme = THEMES[(idx + dir + THEMES.length) % THEMES.length];
  saveSettings(settings);
  applySettings(settings);
}

document.getElementById("theme-prev")?.addEventListener("click", () => cycleTheme(-1));
document.getElementById("theme-next")?.addEventListener("click", () => cycleTheme(1));

document.getElementById("theme-name")?.addEventListener("click", () => {
  openOverlay("theme-picker-overlay");
  panel?.classList.remove("open");
});

document.getElementById("theme-picker-overlay")?.addEventListener("click", (e) => {
  const card = e.target.closest("[data-theme-choice]");
  if (card) {
    settings.theme = card.dataset.themeChoice;
    saveSettings(settings);
    applySettings(settings);
    closeAllOverlays();
  }
});

document.getElementById("open-shortcuts-btn")?.addEventListener("click", () => {
  openOverlay("shortcuts-overlay");
  panel?.classList.remove("open");
});

document.querySelectorAll(".overlay").forEach((overlay) => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeAllOverlays();
  });
});
