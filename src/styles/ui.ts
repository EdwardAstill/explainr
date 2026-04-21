export const uiStyles = `
    /* Files panel (bottom of sidebar) */
    .resource-switcher {
      margin-top: auto;
      border-top: 1px solid var(--color-border);
      padding: 6px 0;
    }

    .resource-switcher__item {
      display: block;
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

    /* Entered folder */
    .entered-folder-hidden { display: none !important; }
    .entered-folder-promoted { padding-left: 0 !important; }

    .entered-folder-bar {
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 6px 12px;
      margin-bottom: 4px;
      border-bottom: 1px solid var(--color-border);
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--color-text-muted);
      flex-wrap: wrap;
    }

    .entered-folder-bar__item {
      cursor: pointer;
      color: var(--color-link);
      padding: 1px 3px;
      border-radius: 3px;
    }

    .entered-folder-bar__item:hover {
      background: var(--color-border);
      text-decoration: underline;
    }

    .entered-folder-bar__sep {
      color: var(--color-text-muted);
      user-select: none;
    }

    .entered-folder-bar__current {
      color: var(--color-text);
      font-weight: 600;
    }

    /* Focus mode */
    [data-focus="true"] .sidebar { display: none !important; }
    [data-focus="true"] .settings { display: none !important; }

    /* Overlays */
    .overlay {
      position: fixed; inset: 0; z-index: 200;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(6px);
      display: none; align-items: center; justify-content: center;
      animation: overlay-fade-in 0.15s ease;
    }
    .overlay.open { display: flex; }
    @keyframes overlay-fade-in { from { opacity: 0; } to { opacity: 1; } }

    .overlay__card {
      background: var(--color-bg); border: 1px solid var(--color-border);
      border-radius: 16px; padding: 32px 48px; width: 94%; max-width: 1200px;
      max-height: 90vh; overflow-y: auto;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.3);
    }

    .overlay__header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--color-border);
    }

    .overlay__title { font-size: 18px; font-weight: 700; color: var(--color-text); }

    .overlay__close-hint {
      background: var(--color-code-bg); padding: 3px 10px; border-radius: 6px;
      font-size: 12px; font-family: var(--font-mono); color: var(--color-text-muted);
    }

    /* Shortcut overlay */
    .shortcuts-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 32px; }

    .shortcuts-grid__category {
      font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em;
      color: var(--color-link); margin-bottom: 12px; font-weight: 600;
    }

    .shortcuts-grid__row {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 8px;
    }

    .shortcuts-grid__label { color: var(--color-text); font-size: 14px; }

    kbd {
      font-family: var(--font-mono); background: var(--color-code-bg);
      padding: 2px 8px; border-radius: 4px; font-size: 12px;
      border: 1px solid var(--color-border); color: var(--color-text);
      display: inline-block; min-width: 22px; text-align: center;
    }

    /* Theme picker overlay */
    .theme-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
    }

    .theme-card {
      border: 2px solid var(--color-border); border-radius: 12px;
      overflow: hidden; cursor: pointer; transition: border-color 0.15s, transform 0.15s;
    }
    .theme-card:hover { transform: translateY(-2px); border-color: var(--color-link); }
    .theme-card--active { border-color: var(--color-link); box-shadow: 0 0 0 2px var(--color-link); }

    .theme-card__preview { padding: 16px; font-family: var(--font-body); font-size: 12px; min-height: 120px; }

    .theme-card__preview-heading {
      font-weight: 700; font-size: 14px; margin-bottom: 6px;
      padding-bottom: 4px;
    }

    .theme-card__preview-code {
      padding: 8px; border-radius: 4px; font-family: var(--font-mono);
      font-size: 11px; margin-bottom: 6px;
    }

    .theme-card__preview-text { font-size: 11px; }

    .theme-card__name {
      padding: 8px 16px; font-size: 13px; font-weight: 600;
      text-align: center; border-top: 1px solid var(--color-border);
      background: var(--color-sidebar-bg); color: var(--color-text);
    }

    /* Settings additions */
    .settings__theme-row {
      display: flex; align-items: center; gap: 8px;
    }

    .settings__theme-arrow {
      background: var(--color-sidebar-bg); border: 1px solid var(--color-border);
      border-radius: 4px; padding: 2px 8px; cursor: pointer; font-size: 14px;
      color: var(--color-text-muted); transition: all 0.12s; line-height: 1;
    }
    .settings__theme-arrow:hover { border-color: var(--color-text-muted); color: var(--color-text); }

    .settings__theme-name {
      flex: 1; text-align: center; font-size: 12px; font-weight: 500;
      color: var(--color-text-muted); cursor: pointer;
      background: var(--color-sidebar-bg); border: 1px solid var(--color-border);
      border-radius: 4px; padding: 4px 8px; font-family: var(--font-mono);
      transition: all 0.12s;
    }
    .settings__theme-name:hover { border-color: var(--color-text-muted); color: var(--color-text); }

    .settings__shortcuts-btn {
      width: 100%; padding: 6px; background: var(--color-sidebar-bg);
      border: 1px solid var(--color-border); border-radius: 6px;
      font-size: 12px; font-family: var(--font-body); color: var(--color-text-muted);
      cursor: pointer; transition: all 0.12s;
    }
    .settings__shortcuts-btn:hover { border-color: var(--color-text-muted); color: var(--color-text); }

    /* Settings */
    .settings { position: fixed; top: 12px; right: 12px; z-index: 100; }

    .settings__panel {
      position: absolute; top: 0; right: 0; width: 220px;
      background: var(--color-bg); border: 1px solid var(--color-border);
      border-radius: 8px; padding: 12px; display: none;
      flex-direction: column; gap: 12px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    }
    .settings__panel.open { display: flex; }

    .settings__section { display: flex; flex-direction: column; gap: 6px; }

    .settings__label {
      font-size: 11px; font-weight: 600; color: var(--color-text-muted);
      text-transform: uppercase; letter-spacing: 0.08em;
    }


    .settings__range { width: 100%; accent-color: var(--color-link); cursor: pointer; }

    .settings__toggle-row { display: flex; align-items: center; justify-content: space-between; cursor: pointer; }

    .settings__switch {
      position: relative; width: 36px; height: 20px; background: var(--color-border);
      border: none; border-radius: 10px; cursor: pointer; transition: background 0.2s; padding: 0;
    }
    .settings__switch--on { background: var(--color-link); }

    .settings__switch-thumb {
      position: absolute; top: 2px; left: 2px; width: 16px; height: 16px;
      background: white; border-radius: 50%; transition: transform 0.2s;
    }
    .settings__switch--on .settings__switch-thumb { transform: translateX(16px); }
`;
