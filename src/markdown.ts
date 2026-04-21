import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import { join } from "path";
import { readFile } from "fs/promises";
import { splitFrontmatter } from "./frontmatter";
import { parse, getAttr, hasAttr } from "./blocks";
import type { Block, TextRun } from "./blocks";
import { parseQuizBlock } from "./quiz/parseQuizBlock";
import { renderQuizForClient } from "./quiz/renderQuizForClient";

let markdownItKatex: any;
try {
  markdownItKatex = (await import("@vscode/markdown-it-katex")).default;
} catch {
  // KaTeX plugin not installed — math rendering will be unavailable
}

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

if (markdownItKatex) {
  md.use(markdownItKatex, { throwOnError: false });
}

// Custom rule: :::upload "Label" accept=.csv multiple rename=data.csv
md.block.ruler.before("fence", "upload_button", (state: any, startLine: any, _endLine: any, silent: any) => {
  const pos = state.bMarks[startLine] + state.tShift[startLine];
  const max = state.eMarks[startLine];
  const line = state.src.slice(pos, max);

  if (!line.startsWith(":::upload ")) return false;
  if (silent) return true;

  const rest = line.slice(10); // after ":::upload "
  const labelMatch = rest.match(/"([^"]+)"/);
  const label = labelMatch ? labelMatch[1] : "Upload";
  const acceptMatch = rest.match(/accept=([\S]+)/);
  const accept = acceptMatch ? acceptMatch[1] : "";
  const multiple = /\bmultiple\b/.test(rest);
  const renameMatch = rest.match(/rename=([\S]+)/);
  const rename = renameMatch ? renameMatch[1] : "";

  const token = state.push("upload_button", "", 0);
  token.meta = { label, accept, multiple, rename };
  token.map = [startLine, startLine + 1];

  state.line = startLine + 1;
  return true;
});

let uploadBlockId = 0;

md.renderer.rules.upload_button = (tokens: any, idx: any) => {
  const { label, accept, multiple, rename } = tokens[idx].meta;
  const id = uploadBlockId++;
  const escapedLabel = md.utils.escapeHtml(label);
  const acceptAttr = accept ? ` accept="${md.utils.escapeHtml(accept)}"` : "";
  const multipleAttr = multiple ? " multiple" : "";
  const renameAttr = rename ? ` data-rename="${md.utils.escapeHtml(rename)}"` : "";
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
};

// Custom rule: treat :::lang ... ::: as executable code blocks with a Run button
md.block.ruler.before("fence", "exec_fence", (state: any, startLine: any, endLine: any, silent: any) => {
  const pos = state.bMarks[startLine] + state.tShift[startLine];
  const max = state.eMarks[startLine];
  const line = state.src.slice(pos, max);

  if (!line.startsWith(":::")) return false;

  const parts = line.slice(3).trim().split(/\s+/);
  const lang = parts[0];
  const hidden = parts.includes("hidden");
  const editable = parts.includes("editable");

  // Find closing :::
  let nextLine = startLine + 1;
  while (nextLine < endLine) {
    const nPos = state.bMarks[nextLine] + state.tShift[nextLine];
    const nMax = state.eMarks[nextLine];
    const nLine = state.src.slice(nPos, nMax);
    if (nLine.trimEnd() === ":::") break;
    nextLine++;
  }

  if (nextLine >= endLine) return false;
  if (silent) return true;

  if (lang !== "python" && lang !== "jsx") return false;

  const token = state.push("exec_fence", "code", 0);
  token.info = lang;
  token.meta = { hidden, editable };
  token.content = state.getLines(startLine + 1, nextLine, state.tShift[startLine], true);
  token.map = [startLine, nextLine + 1];

  state.line = nextLine + 1;
  return true;
});

let execBlockId = 0;

md.renderer.rules.exec_fence = (tokens: any, idx: any) => {
  const token = tokens[idx];
  const lang = token.info || "python";
  const hidden = token.meta?.hidden ?? false;
  const editable = token.meta?.editable ?? false;
  const id = execBlockId++;
  const rawCode = token.content;
  let highlighted: string;
  if (hljs.getLanguage(lang)) {
    highlighted = hljs.highlight(rawCode, { language: lang }).value;
  } else {
    highlighted = md.utils.escapeHtml(rawCode);
  }
  const encoded = Buffer.from(rawCode).toString("base64");

  if (lang === "jsx") {
    return `<div class="jsx-block" data-output="${id}" data-jsx-auto="${id}"></div>
<script type="text/plain" data-source="${id}">${encoded}</script>`;
  }

  const collapsedClass = hidden ? " exec-block--collapsed" : "";
  const toggleLabel = hidden ? "Show" : "Hide";
  const codeDisplay = editable
    ? `<textarea class="exec-editable" data-editable-source="${id}" spellcheck="false">${md.utils.escapeHtml(rawCode)}</textarea>`
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
};

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
    const id = text.toLowerCase().replace(/[^\w]+/g, "-").replace(/^-|-$/g, "");
    token.attrSet("id", id);
  }
  return self.renderToken(tokens, idx, options);
};

export interface TocEntry {
  level: number;
  text: string;
  id: string;
}

export function extractToc(source: string): TocEntry[] {
  // Strip frontmatter (YAML # comments aren't headings), fenced code blocks,
  // and inline code so we don't pick up # inside them.
  const stripped = splitFrontmatter(source).body
    .replace(/^```[\s\S]*?^```/gm, "")
    .replace(/^~~~[\s\S]*?^~~~/gm, "")
    .replace(/^:::\w[\s\S]*?^:::/gm, "")
    .replace(/`[^`\n]+`/g, "");
  const entries: TocEntry[] = [];
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  let match;
  while ((match = headingRegex.exec(stripped)) !== null) {
    const level = match[1]!.length;
    const text = match[2]!.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\[(.+?)\]\(.+?\)/g, "$1").replace(/`(.+?)`/g, "$1").trim();
    const id = text.toLowerCase().replace(/[^\w]+/g, "-").replace(/^-|-$/g, "");
    entries.push({ level, text, id });
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

export async function resolveFileReferences(source: string, scriptsDir: string, imagesDir: string): Promise<string> {
  const fileRefPattern = /^:::([\w.-]+\.\w+)(?:[^\S\n]+(hidden))?[^\S\n]*$/gm;
  const matches = [...source.matchAll(fileRefPattern)];
  if (matches.length === 0) return source;

  let result = source;
  // Process in reverse so indices stay valid
  for (const match of matches.reverse()) {
    const filename = match[1]!;
    const hidden = match[2] === "hidden";
    const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();

    let replacement: string;

    if (IMAGE_EXTENSIONS.has(ext)) {
      // Image reference — resolve from .readrun/images/
      const filePath = join(imagesDir, filename);
      try {
        const data = await readFile(filePath);
        const mime = EXT_TO_MIME[ext] || "application/octet-stream";
        const b64 = Buffer.from(data).toString("base64");
        const alt = filename.replace(/\.\w+$/, "").replace(/[-_]/g, " ");
        replacement = `<img src="data:${mime};base64,${b64}" alt="${alt}" class="readrun-img">`;
      } catch {
        replacement = `<p><em>Image not found: .readrun/images/${filename}</em></p>`;
      }
    } else {
      // Code reference — resolve from .readrun/scripts/
      const lang = EXT_TO_LANG[ext] || ext.slice(1);
      const hiddenFlag = hidden ? " hidden" : "";
      const filePath = join(scriptsDir, filename);
      try {
        const content = await readFile(filePath, "utf-8");
        replacement = `:::${lang}${hiddenFlag}\n${content}\n:::`;
      } catch {
        replacement = `:::${lang}${hiddenFlag}\n# Error: file not found: .readrun/scripts/${filename}\n:::`;
      }
    }

    const start = match.index!;
    const end = start + match[0].length;
    result = result.slice(0, start) + replacement + result.slice(end);
  }

  return result;
}

export function stripFrontmatter(source: string): string {
  return splitFrontmatter(source).body;
}

let inlineQuizCounter = 0;

function renderWithBlocks(source: string): string {
  inlineQuizCounter = 0;
  const { tree } = parse(stripFrontmatter(source));
  return tree.map(node => renderNode(node)).join("");
}

function renderNode(node: Block | TextRun): string {
  if (node.kind === "text") {
    return md.render(node.content);
  }
  return renderBlock(node);
}

function renderBlock(block: Block): string {
  switch (block.name) {
    case "jsx":
    case "python":
      return renderExecBlock(block);
    case "upload":
      return renderUploadBlock(block);
    case "quiz":
      return renderQuizBlock(block);
    case "raw":
      return renderRawBlock(block);
    case "include":
      return `<p><em>include blocks not yet supported inline</em></p>`;
    default:
      return block.children.map(renderNode).join("");
  }
}

function renderExecBlock(block: Block): string {
  const lang = block.name;
  const hidden = hasAttr(block, "hidden");
  const editable = hasAttr(block, "editable");

  if (block.src) {
    const flags = [hidden ? "hidden" : "", editable ? "editable" : ""].filter(Boolean).join(" ");
    const flagStr = flags ? ` ${flags}` : "";
    return md.render(`:::${lang}${flagStr}\n# [${lang}=${block.src}] — inline file ref not yet wired\n:::`);
  }

  const textRun = block.children.find(c => c.kind === "text") as TextRun | undefined;
  const code = textRun?.content ?? "";
  const flags = [hidden ? "hidden" : "", editable ? "editable" : ""].filter(Boolean).join(" ");
  const flagStr = flags ? ` ${flags}` : "";
  return md.render(`:::${lang}${flagStr}\n${code}\n:::`);
}

function renderUploadBlock(block: Block): string {
  const label = getAttr(block, "label") || "Upload";
  const accept = getAttr(block, "accept") || "";
  const multiple = hasAttr(block, "multiple");
  const rename = getAttr(block, "rename") || "";
  const labelStr = typeof label === "string" ? `"${label}"` : '"Upload"';
  const acceptStr = accept && typeof accept === "string" ? ` accept=${accept}` : "";
  const multipleStr = multiple ? " multiple" : "";
  const renameStr = rename && typeof rename === "string" ? ` rename=${rename}` : "";
  return md.render(`:::upload ${labelStr}${acceptStr}${multipleStr}${renameStr}`);
}

function renderQuizBlock(block: Block): string {
  const id = `inline-quiz-${++inlineQuizCounter}`;
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

export function renderMarkdown(source: string): string {
  execBlockId = 0;
  uploadBlockId = 0;
  return renderWithBlocks(source);
}

export function renderMarkdownText(source: string): string {
  return renderWithBlocks(source);
}

export function renderMarkdownInline(source: string): string {
  return md.renderInline(source);
}
