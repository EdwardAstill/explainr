// Panes-mode nav layout.
// .rr-panes is a flex column: search input on top, .rr-panes-row below
// (injected by client/panes.ts). .rr-pane-wrapper children flex side-by-side.
export const panesStyles = `
    /* ── Panes outer container ── */
    .rr-panes {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-width: 0;
      overflow: hidden;
    }

    /* ── Pinned search input ── */
    .rr-pane-search {
      flex-shrink: 0;
      width: calc(100% - 16px);
      margin: 8px;
      padding: 6px 10px;
      border: 1px solid var(--color-border);
      background: var(--color-bg);
      color: var(--color-text);
      border-radius: 6px;
      font-size: 13px;
      font-family: var(--font-body);
    }
    .rr-pane-search:focus { outline: none; border-color: var(--color-link); }

    /* ── Row of pane columns (injected by client) ── */
    .rr-panes-row {
      display: flex;
      flex: 1;
      min-height: 0;
      min-width: 0;
    }

    /* ── Individual pane wrapper ── */
    .rr-pane-wrapper {
      flex: 1;
      border-right: 1px solid var(--color-border);
      overflow: auto;
      min-width: 0;
    }
    .rr-pane-wrapper:last-of-type { border-right: none; }

    /* Fixed widths by depth (matching 2/3/4-pane designs) */
    .rr-pane-wrapper[data-pane-depth="0"] { flex: 0 0 90px; min-width: 90px; }

    /* 2-pane: depth 0 gets wider */
    [data-panes="2"] .rr-pane-wrapper[data-pane-depth="0"] { flex: 0 0 140px; min-width: 140px; }

    /* 4-pane: shrink depths 0 and 1 to fit four columns */
    [data-panes="4"] .rr-pane-wrapper[data-pane-depth="0"] { flex: 0 0 80px; min-width: 80px; }
    [data-panes="4"] .rr-pane-wrapper[data-pane-depth="1"] { flex: 0 0 130px; min-width: 130px; }
    [data-panes="4"] .rr-pane-wrapper[data-pane-depth="2"] { flex: 0 0 160px; min-width: 160px; }

    /* 3-pane (default): depth 1 fixed */
    [data-panes="3"] .rr-pane-wrapper[data-pane-depth="1"],
    .rr-pane-wrapper[data-pane-depth="1"] { flex: 0 0 150px; min-width: 150px; }

    /* ── Pane list ── */
    .rr-pane {
      list-style: none;
      padding: 4px 0;
      margin: 0;
    }

    /* ── Pane row ── */
    .rr-pane-row {
      padding: 5px 12px;
      cursor: pointer;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--color-text-muted);
      border-left: 2px solid transparent;
      font-size: 12.5px;
    }
    .rr-pane-row:hover { background: var(--color-border); color: var(--color-text); }

    .rr-pane-row.is-active,
    .rr-pane-row[aria-current="page"],
    .rr-pane-row[aria-current="true"] {
      background: var(--color-active-bg);
      color: var(--color-text);
      border-left-color: var(--color-link);
    }

    .rr-pane-row a,
    .rr-pane-row span {
      color: inherit;
      text-decoration: none;
      display: block;
    }

    /* ── Search states ── */
    .rr-pane-row.match { color: var(--color-text); }
    .rr-pane-row.match-strong { color: var(--color-link); font-weight: 600; }
    .rr-pane-row.dim { opacity: 0.5; }

    .rr-pane-row mark {
      background: rgba(9, 105, 218, 0.18);
      color: inherit;
      padding: 0 1px;
      border-radius: 2px;
    }

    /* ── Optional section label ── */
    .rr-pane-label {
      padding: 6px 12px 2px;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: var(--color-text-muted);
      border-bottom: 1px solid var(--color-border);
    }
`;
