export const viewerStyles = /* css */`
  /* ── Shared viewer chrome ── */
  .viewer-error {
    padding: 0.75rem 1rem;
    background: var(--error-bg, #3a1a1a);
    color: var(--error-text, #f87171);
    border-left: 3px solid var(--error-text, #f87171);
    font-size: 0.875rem;
  }

  /* ── PDF ── */
  .pdf-viewer-wrap {
    width: 100%;
    border: 1px solid var(--border, #2d3148);
    overflow: hidden;
    margin: 1rem 0;
  }
  .pdf-viewer {
    width: 100%;
    height: 100%;
    border: none;
    display: block;
  }

  /* ── Audio / Video ── */
  .audio-viewer-wrap,
  .video-viewer-wrap {
    margin: 1rem 0;
  }
  .audio-viewer {
    width: 100%;
  }
  .video-viewer {
    display: block;
    max-width: 100%;
  }

  /* ── CSV table ── */
  .csv-viewer {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--border, #2d3148);
    overflow: hidden;
    margin: 1rem 0;
    font-size: 0.875rem;
  }
  .csv-toolbar {
    padding: 6px 10px;
    background: var(--surface-2, #161824);
    border-bottom: 1px solid var(--border, #2d3148);
  }
  .csv-filter {
    width: 100%;
    background: var(--surface-1, #1e2130);
    border: 1px solid var(--border, #2d3148);
    color: var(--text, #e2e8f0);
    padding: 4px 8px;
    font-size: 0.8rem;
  }
  .csv-table-wrap {
    flex: 1;
    overflow: auto;
  }
  .csv-table {
    width: 100%;
    border-collapse: collapse;
  }
  .csv-table th {
    background: var(--surface-2, #161824);
    color: var(--text-muted, #94a3b8);
    padding: 5px 10px;
    text-align: left;
    border-bottom: 1px solid var(--border, #2d3148);
    white-space: nowrap;
    font-weight: 600;
    font-size: 0.8rem;
  }
  .csv-table th:hover { background: var(--surface-3, #1a1f30); }
  .csv-table td {
    padding: 4px 10px;
    border-bottom: 1px solid var(--border-subtle, #1a1f30);
    color: var(--text, #e2e8f0);
  }
  .csv-table tr:hover td { background: var(--surface-hover, #161824); }
  .csv-pagination {
    display: flex;
    gap: 6px;
    align-items: center;
    padding: 6px 10px;
    background: var(--surface-2, #161824);
    border-top: 1px solid var(--border, #2d3148);
    font-size: 0.75rem;
  }
  .csv-pagination button {
    background: var(--surface-3, #2d3148);
    border: none;
    color: var(--text, #e2e8f0);
    padding: 2px 8px;
    cursor: pointer;
  }
  .csv-pagination button:disabled { opacity: 0.4; cursor: default; }

  /* ── 3D model ── */
  .model-viewer {
    position: relative;
    width: 100%;
    border: 1px solid var(--border, #2d3148);
    overflow: hidden;
    margin: 1rem 0;
    background: var(--surface-1, #1e2130);
  }
  .model-canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
  .model-error {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    color: var(--error-text, #f87171);
    background: var(--surface-1, #1e2130);
    font-size: 0.875rem;
  }
`;
