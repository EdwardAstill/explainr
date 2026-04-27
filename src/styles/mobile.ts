// Mobile-only rules. Desktop rules in base/ui drive the layout at all
// widths by default; this file scopes its overrides to <=768px so it
// never has to fight desktop styles outside that range — meaning no
// !important markers needed. Source order in styles/index.ts also
// keeps this concatenated last, so equal-specificity ties go to mobile
// inside the media query.
export const mobileStyles = `
    /* Mobile topbar (hamburger + search) — hidden on desktop */
    .mobile-topbar { display: none; }

    .drawer-scrim {
      position: fixed; inset: 0; z-index: 240;
      background: rgba(0, 0, 0, 0.45);
      display: none;
    }
    .drawer-scrim.open { display: block; }

    @media (max-width: 768px) {
      :root { --sidebar-width: 80vw; }

      body {
        display: block;
        min-height: 100vh;
      }

      /* Mobile topbar */
      .mobile-topbar {
        display: flex;
        position: fixed;
        top: 0; left: 0; right: 0;
        height: 44px;
        align-items: center;
        padding: 0 8px;
        gap: 6px;
        background: var(--color-sidebar-bg);
        border-bottom: 1px solid var(--color-border);
        z-index: 220;
      }

      .mobile-topbar__btn {
        background: transparent;
        border: none;
        color: var(--color-text);
        font-size: 22px;
        line-height: 1;
        padding: 8px 10px;
        min-width: 44px;
        min-height: 44px;
        cursor: pointer;
        font-family: inherit;
      }
      .mobile-topbar__btn:active { background: var(--color-border); }

      .mobile-topbar__title {
        flex: 1;
        text-align: center;
        font-size: 13px;
        font-weight: 600;
        color: var(--color-text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        padding: 0 4px;
      }

      /* Sidebar -> off-canvas drawer */
      .sidebar {
        position: fixed;
        top: 0; left: 0;
        width: var(--sidebar-width);
        min-width: var(--sidebar-width);
        max-width: 320px;
        height: 100vh;
        transform: translateX(-100%);
        transition: transform 0.22s ease;
        z-index: 250;
        display: flex;
        padding-top: 14px;
        box-shadow: 2px 0 16px rgba(0, 0, 0, 0.2);
      }
      .sidebar.open { transform: translateX(0); }

      /* Main content full-width, leave room for fixed topbar */
      .main {
        flex: 1 1 auto;
        max-width: 100%;
        margin: 0;
        padding: 56px 16px 24px 16px;
      }

      /* Resize handles: useless on touch */
      .resize-handle { display: none; }

      /* TOC already hidden < 1100; keep it hidden */
      .toc-sidebar { display: none; }

      /* Larger tap targets in nav */
      .nav-tree a {
        padding: 10px 14px;
        font-size: 14px;
      }
      .nav-tree details > summary {
        padding: 10px 14px;
        font-size: 14px;
      }
      .nav-tree ul ul { padding-left: 14px; }

      /* Search bar full-width below topbar */
      .search-bar {
        position: fixed;
        top: 44px; left: 0; right: 0;
        z-index: 215;
        padding: 8px 12px;
      }
      .search-bar.open ~ .main { padding-top: 92px; }

      /* Settings panel: anchor below mobile topbar, sized for thumb */
      .settings { top: 48px; right: 6px; z-index: 230; }
      .settings__panel {
        width: min(92vw, 280px);
      }

      /* Hide content-width slider on mobile (always full width) */
      #width-section { display: none; }

      /* Overlays: shrink padding, allow more height */
      .overlay__card {
        padding: 16px;
        border-radius: 10px;
        width: 96%;
        max-height: 92vh;
      }
      .overlay__header {
        margin-bottom: 14px;
        padding-bottom: 10px;
      }
      .overlay__title { font-size: 15px; }

      /* Theme grid: 2 columns */
      .theme-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
      }
      .theme-card__preview { padding: 10px; min-height: 90px; }
      .theme-card__name { padding: 6px 8px; font-size: 12px; }

      /* Shortcuts grid: single column, smaller gap */
      .shortcuts-grid {
        grid-template-columns: 1fr;
        gap: 18px;
      }

      /* Code modal: full-screen on mobile */
      .code-modal__card {
        width: 100%;
        height: 100%;
        max-width: none;
        max-height: none;
        border-radius: 0;
      }

      /* Context menu disabled on touch (use long-press tools, etc.) */
      .context-menu { display: none; }

      /* Markdown body: slightly tighter padding & no horizontal jitter */
      .markdown-body pre { font-size: 90%; }
      .markdown-body table { font-size: 14px; }

      /* Entered-folder bar more touch-friendly */
      .entered-folder-bar { padding: 10px 12px; font-size: 13px; }
      .entered-folder-bar__item { padding: 4px 6px; }
    }

    @media (max-width: 480px) {
      .theme-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
      .overlay__card { padding: 12px; }
    }
`;
