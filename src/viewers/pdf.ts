import type { BlockAttr } from "../blocks";

function escAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function clampHeight(raw: string | true | undefined, def: number, min: number, max: number): number {
  if (typeof raw !== "string") return def;
  const n = parseInt(raw, 10);
  return isNaN(n) ? def : Math.max(min, Math.min(max, n));
}

function rejectPath(path: string): string | null {
  if (path.startsWith("/") || path.includes("..")) {
    return `<p class="viewer-error"><em>[pdf] rejects absolute or traversal paths: ${escAttr(path)}</em></p>`;
  }
  return null;
}

export function renderPdfViewer(src: string, attrs: BlockAttr[]): string {
  const err = rejectPath(src);
  if (err) return err;

  const heightAttr = attrs.find(a => a.key === "height")?.value;
  const height = clampHeight(heightAttr, 600, 300, 1200);
  const url = `/_readrun/files/${escAttr(src)}`;

  return `<div class="pdf-viewer-wrap" style="height:${height}px">` +
    `<iframe class="pdf-viewer" src="${url}" ` +
    `sandbox="allow-same-origin" ` +
    `style="width:100%;height:100%;border:none" ` +
    `title="${escAttr(src)}"></iframe>` +
    `</div>`;
}
