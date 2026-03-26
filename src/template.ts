import { escapeHtml as escape } from "./utils";
import { styles } from "./styles";
import { executionScript, settingsScript } from "./client-scripts";

const settingsIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
  <circle cx="12" cy="12" r="3" />
</svg>`;

const filesIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
</svg>`;

function filesPanelHtml(liveMode: boolean): string {
  if (!liveMode) return "";
  return `
  <div class="files-panel" id="files-panel">
    <button class="files-panel__toggle" id="files-toggle" aria-label="Files" title="Files">${filesIcon} Files</button>
    <div class="files-panel__dropdown" id="files-dropdown">
      <div class="files-panel__header">Files</div>
      <div class="files-panel__list" id="files-list">
        <div class="files-panel__empty">Loading...</div>
      </div>
      <button class="files-panel__add-btn" id="files-add-btn">+ Add file</button>
    </div>
    <input type="file" id="files-input" style="display:none">
  </div>`;
}

const settingsHtml = `
  <div class="settings" id="settings">
    <button class="settings__toggle" id="settings-toggle" aria-label="Settings" title="Settings">${settingsIcon}</button>
    <div class="settings__panel" id="settings-panel">
      <div class="settings__section">
        <span class="settings__label">Font size</span>
        <div class="settings__font-sizes">
          <button class="settings__font-btn" data-font="small">S</button>
          <button class="settings__font-btn settings__font-btn--active" data-font="medium">M</button>
          <button class="settings__font-btn" data-font="large">L</button>
        </div>
      </div>
      <div class="settings__section">
        <span class="settings__label" id="width-label">Content width — 880px</span>
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
    </div>
  </div>`;

export function htmlPage(nav: string, content: string, title: string, basePath?: string, liveMode = false): string {
  const baseTag = basePath ? `\n  <base href="${escape(basePath)}">` : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">${baseTag}
  <title>${escape(title)} - explainr</title>
  <style>${styles}</style>
</head>
<body${liveMode ? ' data-live="true"' : ''}>
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-title">explainr</div>
    ${nav}
${filesPanelHtml(liveMode)}
  </aside>
  <main class="main" id="main-content">
    <article class="markdown-body">
      ${content}
    </article>
  </main>
${settingsHtml}
${executionScript}
${settingsScript}
</body>
</html>`;
}
