import type { BlockAttr } from "../blocks";

function rejectPath(path: string, tag: string): string | null {
  if (path.startsWith("/") || path.includes("..")) {
    return `<p class="viewer-error"><em>[${tag}] rejects absolute or traversal paths: ${path}</em></p>`;
  }
  return null;
}

export function renderAudioViewer(src: string, attrs: BlockAttr[]): string {
  const err = rejectPath(src, "audio");
  if (err) return err;

  const loop = attrs.some(a => a.key === "loop" && (a.value === true || a.value === "true"));
  const autoplay = attrs.some(a => a.key === "autoplay" && (a.value === true || a.value === "true"));
  const url = `/_readrun/files/${src}`;

  const extra = [loop && "loop", autoplay && "autoplay"].filter(Boolean).join(" ");
  return `<div class="audio-viewer-wrap">` +
    `<audio class="audio-viewer" controls ${extra} src="${url}"></audio>` +
    `</div>`;
}

export function renderVideoViewer(src: string, attrs: BlockAttr[]): string {
  const err = rejectPath(src, "video");
  if (err) return err;

  const loop = attrs.some(a => a.key === "loop" && (a.value === true || a.value === "true"));
  const autoplay = attrs.some(a => a.key === "autoplay" && (a.value === true || a.value === "true"));
  const muted = attrs.some(a => a.key === "muted" && (a.value === true || a.value === "true"));
  const heightAttr = attrs.find(a => a.key === "height")?.value;
  const url = `/_readrun/files/${src}`;

  const style = heightAttr ? ` style="height:${heightAttr}px;width:100%"` : ` style="width:100%"`;
  const extra = [loop && "loop", autoplay && "autoplay", muted && "muted"].filter(Boolean).join(" ");

  return `<div class="video-viewer-wrap">` +
    `<video class="video-viewer" controls ${extra}${style} src="${url}"></video>` +
    `</div>`;
}
