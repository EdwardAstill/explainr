import type { BlockAttr } from "../blocks";

type ModelFormat = "stl" | "glb" | "gltf";

function escAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function detectFormat(filename: string): ModelFormat {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  if (ext === ".glb") return "glb";
  if (ext === ".gltf") return "gltf";
  return "stl";
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function renderModelViewer(src: string, _blockName: string, attrs: BlockAttr[]): string {
  if (src.startsWith("/") || src.includes("..")) {
    return `<p class="viewer-error"><em>[model/stl] rejects absolute or traversal paths: ${escAttr(src)}</em></p>`;
  }

  const format = detectFormat(src);
  const heightAttr = attrs.find(a => a.key === "height")?.value;
  const height = typeof heightAttr === "string" ? clamp(parseInt(heightAttr, 10) || 480, 240, 1200) : 480;
  const controls = attrs.find(a => a.key === "controls")?.value !== "false";
  const url = `/_readrun/files/${escAttr(src)}`;

  return `<div class="model-viewer" ` +
    `data-src="${url}" ` +
    `data-format="${format}" ` +
    `data-controls="${controls}" ` +
    `style="height:${height}px">` +
    `<canvas class="model-canvas" style="width:100%;height:100%"></canvas>` +
    `<div class="model-error" hidden></div>` +
    `</div>`;
}
