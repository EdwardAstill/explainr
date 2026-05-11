import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import { join } from "path";
import { splitFrontmatter } from "./frontmatter";
import { parse, getAttr, hasAttr, parseAttrs } from "./blocks";
import { renderPdfViewer } from "./viewers/pdf";
import { renderAudioViewer, renderVideoViewer } from "./viewers/media";
import { renderCsvViewer } from "./viewers/csv";
import { renderModelViewer } from "./viewers/model";
import type { Block, TextRun } from "./blocks";
import { parseQuizBlock } from "./quiz/parseQuizBlock";
import { renderQuizForClient } from "./quiz/renderQuizForClient";

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight(str: string, lang: string): string {
    if (lang && hljs.getLanguage(lang)) {
      return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang }).value}</code></pre>`;
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
  },
});

const TABLE_DISPLAY_MODES = new Set(["auto", "scroll", "sticky", "cards"]);

function addTokenClass(token: any, className: string): void {
  const idx = token.attrIndex("class");
  if (idx < 0) {
    token.attrPush(["class", className]);
    return;
  }
  const current = token.attrs[idx][1] || "";
  const classes = current.split(/\s+/).filter(Boolean);
  if (!classes.includes(className)) {
    token.attrs[idx][1] = [...classes, className].join(" ");
  }
}

function inlineText(token: any): string {
  if (!token) return "";
  if (!Array.isArray(token.children)) return String(token.content ?? "").trim();
  return token.children
    .filter((child: any) => child.type === "text" || child.type === "code_inline")
    .map((child: any) => child.content)
    .join("")
    .trim();
}

function tableModeDirective(token: any): string | null {
  if (token?.type !== "html_block") return null;
  const match = /^\s*<!--\s*rr-table:\s*([a-z-]+)\s*-->\s*$/i.exec(String(token.content ?? ""));
  if (!match) return null;

  const mode = match[1]!.toLowerCase();
  return TABLE_DISPLAY_MODES.has(mode) ? mode : null;
}

function enhanceTableTokens(tokens: any[]): void {
  for (let tableStart = 0; tableStart < tokens.length; tableStart++) {
    if (tokens[tableStart]?.type !== "table_open") continue;

    const tableEnd = tokens.findIndex((token, idx) => idx > tableStart && token.type === "table_close");
    if (tableEnd < 0) continue;

    addTokenClass(tokens[tableStart], "rr-table");
    const mode = tableModeDirective(tokens[tableStart - 1]);
    if (mode) {
      tokens[tableStart].meta = { ...(tokens[tableStart].meta || {}), readrunTableMode: mode };
    }

    const headers: string[] = [];
    let inHead = false;
    let inBody = false;
    let col = 0;

    for (let i = tableStart + 1; i < tableEnd; i++) {
      const token = tokens[i]!;
      if (token.type === "thead_open") inHead = true;
      if (token.type === "thead_close") inHead = false;
      if (token.type === "tbody_open") inBody = true;
      if (token.type === "tbody_close") inBody = false;
      if (inHead && token.type === "th_open") headers.push(inlineText(tokens[i + 1]));
      if (inBody && token.type === "tr_open") col = 0;
      if (inBody && token.type === "td_open") {
        token.attrSet("data-label", headers[col] || `Column ${col + 1}`);
        col++;
      }
    }

    tableStart = tableEnd;
  }
}

md.core.ruler.push("readrun_table_labels", (state: any) => {
  enhanceTableTokens(state.tokens);
});

const defaultTableOpen = md.renderer.rules.table_open || ((tokens: any, idx: any, options: any, _env: any, self: any) => self.renderToken(tokens, idx, options));
const defaultTableClose = md.renderer.rules.table_close || ((tokens: any, idx: any, options: any, _env: any, self: any) => self.renderToken(tokens, idx, options));

md.renderer.rules.table_open = (tokens: any, idx: any, options: any, env: any, self: any) => {
  addTokenClass(tokens[idx], "rr-table");
  const tableMode = tokens[idx].meta?.readrunTableMode;
  const modeAttr = tableMode ? ` data-table-mode="${tableMode}"` : "";
  return `<div class="rr-table-wrap"${modeAttr} tabindex="0">${defaultTableOpen(tokens, idx, options, env, self)}`;
};

md.renderer.rules.table_close = (tokens: any, idx: any, options: any, env: any, self: any) => {
  return `${defaultTableClose(tokens, idx, options, env, self)}</div>`;
};

let katexEnsured = false;
async function ensureKatex(): Promise<void> {
  if (katexEnsured) return;
  katexEnsured = true;
  try {
    const plugin = (await import("@vscode/markdown-it-katex")).default;
    md.use(plugin, { throwOnError: false });
  } catch (err) {
    console.warn("[readrun] KaTeX plugin not loaded:", (err as Error)?.message ?? err);
  }
}

// Block-level renderers (HTML emitted directly — no markdown-it custom rules).

function renderUploadHtml(ctx: RenderCtx, opts: { label: string; accept: string; multiple: boolean; rename: string }): string {
  const id = ctx.upload++;
  const escapedLabel = md.utils.escapeHtml(opts.label);
  const acceptAttr = opts.accept ? ` accept="${md.utils.escapeHtml(opts.accept)}"` : "";
  const multipleAttr = opts.multiple ? " multiple" : "";
  const renameAttr = opts.rename ? ` data-rename="${md.utils.escapeHtml(opts.rename)}"` : "";
  return `<div class="upload-block" data-upload-id="${id}">
    <div class="upload-block-header">
      <span>file upload</span>
      <span class="upload-block-status" data-upload-status="${id}"></span>
    </div>
    <div class="upload-block-body">
      <label class="upload-btn" for="upload-input-${id}">${escapedLabel}</label>
      <input type="file" id="upload-input-${id}" class="upload-input" data-upload-id="${id}"${acceptAttr}${multipleAttr}${renameAttr} style="display:none">
      <div class="upload-file-list" data-upload-files="${id}"></div>
    </div>
  </div>`;
}

function renderExecHtml(ctx: RenderCtx, opts: { lang: string; code: string; hidden: boolean; editable: boolean }): string {
  const id = ctx.exec++;
  const { lang, code, hidden, editable } = opts;
  let highlighted: string;
  if (hljs.getLanguage(lang)) {
    highlighted = hljs.highlight(code, { language: lang }).value;
  } else {
    highlighted = md.utils.escapeHtml(code);
  }
  const encoded = Buffer.from(code).toString("base64");

  if (lang === "jsx") {
    return `<div class="jsx-block" data-output="${id}" data-jsx-auto="${id}"></div>
<script type="text/plain" data-source="${id}">${encoded}</script>`;
  }

  const collapsedClass = hidden ? " exec-block--collapsed" : "";
  const toggleLabel = hidden ? "Show" : "Hide";
  const codeDisplay = editable
    ? `<textarea class="exec-editable" data-editable-source="${id}" spellcheck="false">${md.utils.escapeHtml(code)}</textarea>`
    : `<pre class="hljs"><code>${highlighted}</code></pre>
    <script type="text/plain" data-source="${id}">${encoded}</script>`;
  return `<div class="exec-block${collapsedClass}" data-lang="${md.utils.escapeHtml(lang)}" data-block-id="${id}">
    <div class="exec-block-header">
      <span>${md.utils.escapeHtml(lang)}</span>
      <span class="exec-block-actions">
        <button class="exec-toggle-btn" data-block-id="${id}">${toggleLabel}</button>
        <button class="exec-enlarge-btn" data-block-id="${id}">Enlarge</button>
        <button class="exec-run-btn" data-block-id="${id}">Run</button>
      </span>
    </div>
    ${codeDisplay}
    <div class="exec-output" data-output="${id}"></div>
  </div>`;
}

// Rewrite .md links to rendered paths (e.g., ./intro.md -> ./intro, ../notes/lecture-1.md -> ../notes/lecture-1)
const defaultLinkOpen = md.renderer.rules.link_open || ((tokens: any, idx: any, options: any, _env: any, self: any) => self.renderToken(tokens, idx, options));

md.renderer.rules.link_open = (tokens: any, idx: any, options: any, env: any, self: any) => {
  const hrefIndex = tokens[idx].attrIndex("href");
  if (hrefIndex >= 0) {
    const href = tokens[idx].attrs[hrefIndex][1];
    if (href.endsWith(".md") && !href.startsWith("http://") && !href.startsWith("https://")) {
      tokens[idx].attrs[hrefIndex][1] = href.replace(/\.md$/, "");
    }
  }
  return defaultLinkOpen(tokens, idx, options, env, self);
};

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w]+/g, "-").replace(/^-|-$/g, "");
}

// Add IDs to headings for TOC anchor links
md.renderer.rules.heading_open = (tokens: any, idx: any, options: any, _env: any, self: any) => {
  const token = tokens[idx]!
  // Get the text content from the inline token that follows
  const inlineToken = tokens[idx + 1];
  if (inlineToken && inlineToken.children) {
    const text = inlineToken.children
      .filter((t: any) => t.type === "text" || t.type === "code_inline")
      .map((t: any) => t.content)
      .join("");
    token.attrSet("id", slugify(text));
  }
  return self.renderToken(tokens, idx, options);
};

export interface TocEntry {
  level: number;
  text: string;
  id: string;
}

export function extractToc(source: string): TocEntry[] {
  // Walk the same bracket parser used for rendering so blocks stay opaque.
  const { tree } = parse(stripFrontmatter(source));
  const entries: TocEntry[] = [];

  for (const node of tree) {
    if (node.kind !== "text") continue;
    const tokens = md.parse(node.content, {});
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i]!;
      if (t.type !== "heading_open") continue;
      const inline = tokens[i + 1];
      if (!inline || !inline.children) continue;
      const text = inline.children
        .filter((c: any) => c.type === "text" || c.type === "code_inline")
        .map((c: any) => c.content)
        .join("")
        .trim();
      if (!text) continue;
      const level = parseInt(t.tag.slice(1), 10);
      entries.push({ level, text, id: slugify(text) });
    }
  }
  return entries;
}

const EXT_TO_LANG: Record<string, string> = {
  ".py": "python",
  ".jsx": "jsx",
};

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"]);

const EXT_TO_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const VIEWER_BLOCKS = new Set(["stl", "model", "csv", "audio", "video", "pdf"]);

const EXEC_LANG_NAMES = new Set(["python", "jsx"]);

export async function resolveFileReferences(
  source: string,
  scriptsDir: string,
  imagesDir: string,
  contentDir?: string,
): Promise<string> {
  const bracketPattern = /^[ \t]*\[([A-Za-z][\w-]*)=([^\s\]"]+)([^\]]*)\][ \t]*$/gm;

  type Replacement = { start: number; end: number; text: string };
  const replacements: Replacement[] = [];

  for (const match of source.matchAll(bracketPattern)) {
    const name = match[1]!;
    const path = match[2]!;
    const start = match.index!;
    const end = start + match[0].length;
    const flagStr = match[3] ?? "";
    const ext = path.substring(path.lastIndexOf(".")).toLowerCase();

    if (name === "include") {
      replacements.push({ start, end, text: await renderInclude(path, contentDir) });
      continue;
    }

    if (IMAGE_EXTENSIONS.has(ext)) {
      replacements.push({ start, end, text: await renderImageRef(path, imagesDir) });
      continue;
    }

    if (VIEWER_BLOCKS.has(name)) {
      const filePath = path.startsWith("/") || path.includes("..")
        ? null
        : contentDir ? join(contentDir, ".readrun", "files", path) : null;

      let viewerHtml: string;

      if (name === "csv") {
        if (!filePath) {
          viewerHtml = `<p class="viewer-error"><em>[csv] rejects invalid path: ${path}</em></p>`;
        } else {
          let content = "";
          try {
            content = await Bun.file(filePath).text();
          } catch {
            viewerHtml = `<p class="viewer-error"><em>[csv] file not found: ${path}</em></p>`;
            replacements.push({ start, end, text: viewerHtml });
            continue;
          }
          viewerHtml = renderCsvViewer(content, path, parseAttrs(flagStr));
        }
      } else if (name === "stl" || name === "model") {
        viewerHtml = renderModelViewer(path, name, parseAttrs(flagStr));
      } else if (name === "audio") {
        viewerHtml = renderAudioViewer(path, parseAttrs(flagStr));
      } else if (name === "video") {
        viewerHtml = renderVideoViewer(path, parseAttrs(flagStr));
      } else {
        viewerHtml = renderPdfViewer(path, parseAttrs(flagStr));
      }

      replacements.push({ start, end, text: viewerHtml });
      continue;
    }

    if (!EXEC_LANG_NAMES.has(name)) continue;
    replacements.push({
      start,
      end,
      text: await renderFileRef({ filename: path, ext, scriptsDir, imagesDir, lang: name, flagStr }),
    });
  }

  if (replacements.length === 0) return source;
  replacements.sort((a, b) => b.start - a.start);
  let result = source;
  for (const r of replacements) {
    result = result.slice(0, r.start) + r.text + result.slice(r.end);
  }
  return result;
}

async function renderImageRef(filename: string, imagesDir: string): Promise<string> {
  const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();
  const filePath = join(imagesDir, filename);
  try {
    const data = await Bun.file(filePath).bytes();
    const mime = EXT_TO_MIME[ext] || "application/octet-stream";
    const b64 = Buffer.from(data).toString("base64");
    const alt = filename.replace(/\.\w+$/, "").replace(/[-_]/g, " ");
    return `<img src="data:${mime};base64,${b64}" alt="${alt}" class="readrun-img">`;
  } catch {
    return `<p><em>Image not found: .readrun/images/${filename}</em></p>`;
  }
}

async function renderInclude(relPath: string, contentDir: string | undefined): Promise<string> {
  if (!contentDir) {
    return `<p><em>[include] not available in this context</em></p>`;
  }
  // Split off optional #section anchor.
  const hashIdx = relPath.indexOf("#");
  const filePart = hashIdx >= 0 ? relPath.slice(0, hashIdx) : relPath;
  const section = hashIdx >= 0 ? relPath.slice(hashIdx + 1) : "";

  if (filePart.startsWith("/") || filePart.includes("..")) {
    return `<p><em>[include] rejects absolute or traversal paths: ${relPath}</em></p>`;
  }
  const target = join(contentDir, filePart);
  let text: string;
  try {
    text = await Bun.file(target).text();
  } catch {
    return `<p><em>[include] target not found: ${relPath}</em></p>`;
  }

  // Strip frontmatter so it doesn't pollute the embedding page.
  text = splitFrontmatter(text).body;

  if (!section) return text;
  return extractSection(text, section) ?? `<p><em>[include] section #${section} not found in ${filePart}</em></p>`;
}

function extractSection(source: string, sectionSlug: string): string | null {
  const lines = source.split("\n");
  const want = sectionSlug.toLowerCase();
  let startIdx = -1;
  let startLevel = 0;
  for (let i = 0; i < lines.length; i++) {
    const m = /^(#{1,6})\s+(.+)$/.exec(lines[i]!);
    if (!m) continue;
    const text = m[2]!.replace(/\*\*(.+?)\*\*/g, "$1").replace(/`(.+?)`/g, "$1").trim();
    const slug = text.toLowerCase().replace(/[^\w]+/g, "-").replace(/^-|-$/g, "");
    if (slug === want) { startIdx = i; startLevel = m[1]!.length; break; }
  }
  if (startIdx < 0) return null;
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    const m = /^(#{1,6})\s/.exec(lines[i]!);
    if (m && m[1]!.length <= startLevel) { endIdx = i; break; }
  }
  return lines.slice(startIdx, endIdx).join("\n");
}

interface FileRefArgs {
  filename: string;
  ext: string;
  scriptsDir: string;
  imagesDir: string;
  lang: string | null;
  flagStr: string;
}

async function renderFileRef(args: FileRefArgs): Promise<string> {
  const { filename, ext, scriptsDir, imagesDir, lang: explicitLang, flagStr } = args;

  if (IMAGE_EXTENSIONS.has(ext)) {
    return await renderImageRef(filename, imagesDir);
  }

  const lang = explicitLang ?? EXT_TO_LANG[ext] ?? ext.slice(1);
  const flagAttrs = flagStr.trim() ? ` ${flagStr.trim()}` : "";
  const filePath = join(scriptsDir, filename);
  try {
    const content = await Bun.file(filePath).text();
    return `[${lang}${flagAttrs}]\n${content}\n[/${lang}]`;
  } catch {
    return `[${lang}${flagAttrs}]\n# Error: file not found: .readrun/scripts/${filename}\n[/${lang}]`;
  }
}

export function stripFrontmatter(source: string): string {
  return splitFrontmatter(source).body;
}

interface RenderCtx {
  exec: number;
  upload: number;
  quiz: number;
}

function newCtx(): RenderCtx { return { exec: 0, upload: 0, quiz: 0 }; }

function renderWithBlocks(source: string, ctx: RenderCtx): string {
  const { tree } = parse(stripFrontmatter(source));
  return tree.map(node => renderNode(node, ctx)).join("");
}

function renderNode(node: Block | TextRun, ctx: RenderCtx): string {
  if (node.kind === "text") {
    return md.render(node.content);
  }
  return renderBlock(node, ctx);
}

function renderBlock(block: Block, ctx: RenderCtx): string {
  switch (block.name) {
    case "jsx":
    case "python":
      return renderExecBlock(block, ctx);
    case "upload":
      return renderUploadBlock(block, ctx);
    case "quiz":
      return renderQuizBlock(block, ctx);
    case "raw":
      return renderRawBlock(block);
    case "include":
      return block.src
        ? `<p><em>[include=${block.src}] target not resolved (called outside resolveFileReferences?)</em></p>`
        : `<p><em>[include] requires a path: write [include=path/to/file.md]</em></p>`;
    default:
      return block.children.map(n => renderNode(n, ctx)).join("");
  }
}

function renderExecBlock(block: Block, ctx: RenderCtx): string {
  const lang = block.name;
  const hidden = hasAttr(block, "hidden");
  const editable = hasAttr(block, "editable");

  if (block.src) {
    return `<p><em>[${lang}=${block.src}] target not resolved (called outside resolveFileReferences?)</em></p>`;
  }

  const textRun = block.children.find(c => c.kind === "text") as TextRun | undefined;
  const code = (textRun?.content ?? "").replace(/^\n/, "").replace(/\n$/, "");
  return renderExecHtml(ctx, { lang, code, hidden, editable });
}

function renderUploadBlock(block: Block, ctx: RenderCtx): string {
  const label = getAttr(block, "label");
  const accept = getAttr(block, "accept");
  const multiple = hasAttr(block, "multiple");
  const rename = getAttr(block, "rename");
  return renderUploadHtml(ctx, {
    label: typeof label === "string" ? label : "Upload",
    accept: typeof accept === "string" ? accept : "",
    multiple,
    rename: typeof rename === "string" ? rename : "",
  });
}

function renderQuizBlock(block: Block, ctx: RenderCtx): string {
  const id = `inline-quiz-${++ctx.quiz}`;
  let quiz;
  try {
    quiz = parseQuizBlock(block);
  } catch (e: any) {
    return `<div class="quiz-error"><p>Quiz parse error: ${md.utils.escapeHtml(e?.message ?? String(e))}</p></div>`;
  }
  const clientData = renderQuizForClient(quiz);
  const json = JSON.stringify(clientData).replace(/<\/script/gi, "<\\/script");
  return `<div data-readrun-inline-quiz="${id}"></div>\n<script type="application/json" id="quiz-data-${id}">${json}</script>`;
}

function renderRawBlock(block: Block): string {
  const textRun = block.children.find(c => c.kind === "text") as TextRun | undefined;
  const code = md.utils.escapeHtml(textRun?.content ?? "");
  return `<pre class="hljs"><code>${code}</code></pre>`;
}

export async function ensureMarkdownReady(): Promise<void> {
  await ensureKatex();
}

export function renderMarkdown(source: string): string {
  return renderWithBlocks(source, newCtx());
}

export function renderMarkdownText(source: string): string {
  return renderWithBlocks(source, newCtx());
}

export function renderMarkdownInline(source: string): string {
  return md.renderInline(source);
}
