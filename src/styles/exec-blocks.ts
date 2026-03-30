export const execBlockStyles = `
    /* Image lightbox */
    .lightbox {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 10000;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(6px);
      cursor: zoom-out;
      align-items: center;
      justify-content: center;
    }
    .lightbox.open { display: flex; }
    .lightbox img {
      max-width: 92vw;
      max-height: 92vh;
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      cursor: zoom-out;
    }

    /* Executable code blocks */
    .exec-block { border: 1px solid var(--color-border); border-radius: 6px; margin-bottom: 16px; overflow: hidden; }

    .exec-block-header {
      background: var(--color-sidebar-bg);
      padding: 4px 12px;
      font-size: 12px;
      font-family: var(--font-mono);
      color: var(--color-text-muted);
      border-bottom: 1px solid var(--color-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .exec-run-btn {
      background: #2da44e; color: #fff; border: none;
      padding: 2px 10px; border-radius: 4px; font-size: 12px;
      font-family: var(--font-body); cursor: pointer; font-weight: 500;
    }
    .exec-run-btn:hover { background: #218838; }
    .exec-run-btn:disabled { background: var(--color-text-muted); cursor: not-allowed; }

    .exec-output { font-family: var(--font-mono); font-size: 13px; line-height: 1.45; white-space: pre-wrap; word-break: break-word; }
    .exec-output:not(:empty) { padding: 12px 16px; margin-top: 4px; }
    .exec-output .exec-stdout { color: var(--color-text); }
    .exec-output .exec-stderr { color: #cf222e; }
    .exec-loading { color: var(--color-text-muted); font-style: italic; }
    .exec-output img { max-width: 100%; margin-top: 8px; }
    .exec-block pre { margin: 0; border-radius: 0; }

    .exec-block-actions { display: flex; gap: 6px; align-items: center; }

    .exec-toggle-btn {
      background: none; color: var(--color-text-muted); border: 1px solid var(--color-border);
      padding: 2px 8px; border-radius: 4px; font-size: 11px;
      font-family: var(--font-mono); cursor: pointer; transition: all 0.12s;
    }
    .exec-toggle-btn:hover { border-color: var(--color-text-muted); color: var(--color-text); }

    .exec-block--collapsed > pre { display: none; }

    .exec-enlarge-btn {
      background: none; color: var(--color-text-muted); border: 1px solid var(--color-border);
      padding: 2px 8px; border-radius: 4px; font-size: 11px;
      font-family: var(--font-mono); cursor: pointer; transition: all 0.12s;
    }
    .exec-enlarge-btn:hover { border-color: var(--color-text-muted); color: var(--color-text); }

    /* File upload blocks */
    .upload-block { border: 1px solid var(--color-border); border-radius: 6px; margin-bottom: 16px; overflow: hidden; }

    .upload-block-header {
      background: var(--color-sidebar-bg);
      padding: 4px 12px;
      font-size: 12px;
      font-family: var(--font-mono);
      color: var(--color-text-muted);
      border-bottom: 1px solid var(--color-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .upload-block-body {
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .upload-btn {
      background: var(--color-link); color: #fff; border: none;
      padding: 6px 16px; border-radius: 4px; font-size: 13px;
      font-family: var(--font-body); cursor: pointer; font-weight: 500;
      display: inline-block;
    }
    .upload-btn:hover { filter: brightness(0.85); }

    .upload-block-status {
      font-size: 11px;
      color: var(--color-text-muted);
      font-family: var(--font-mono);
    }

    .upload-error { color: #cf222e; }

    .upload-file-list { display: flex; gap: 6px; flex-wrap: wrap; }

    .upload-file-tag {
      background: var(--color-code-bg);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-family: var(--font-mono);
      color: var(--color-text);
      border: 1px solid var(--color-border);
    }

    /* Code enlarge modal */
    .code-modal {
      position: fixed; inset: 0; z-index: 10000;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(6px);
      display: none; align-items: center; justify-content: center;
      animation: overlay-fade-in 0.15s ease;
    }
    .code-modal.open { display: flex; }

    .code-modal__card {
      background: var(--color-bg); border: 1px solid var(--color-border);
      border-radius: 12px; width: 92vw; max-width: 1100px;
      max-height: 90vh; display: flex; flex-direction: column;
      overflow: hidden; box-shadow: 0 24px 64px rgba(0, 0, 0, 0.4);
    }

    .code-modal__header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 16px; background: var(--color-sidebar-bg);
      border-bottom: 1px solid var(--color-border);
      font-family: var(--font-mono); font-size: 12px; color: var(--color-text-muted);
    }

    .code-modal__actions { display: flex; gap: 8px; align-items: center; }

    .code-modal__close {
      background: none; border: none; color: var(--color-text-muted);
      font-size: 22px; cursor: pointer; padding: 0 4px; line-height: 1;
    }
    .code-modal__close:hover { color: var(--color-text); }

    .code-modal__code {
      flex: 1; overflow: auto; margin: 0; border-radius: 0;
      font-size: 14px; line-height: 1.6;
    }

    .code-modal__output { max-height: 30vh; overflow-y: auto; border-top: 1px solid var(--color-border); }
`;
