import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import { join } from "path";
import { readFile, stat } from "fs/promises";

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
  highlight(str, lang) {
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
md.block.ruler.before("fence", "upload_button", (state, startLine, _endLine, silent) => {
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

md.renderer.rules.upload_button = (tokens, idx) => {
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
md.block.ruler.before("fence", "exec_fence", (state, startLine, endLine, silent) => {
  const pos = state.bMarks[startLine] + state.tShift[startLine];
  const max = state.eMarks[startLine];
  const line = state.src.slice(pos, max);

  if (!line.startsWith(":::")) return false;

  const parts = line.slice(3).trim().split(/\s+/);
  const lang = parts[0];
  const hidden = parts.includes("hidden");

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
  token.meta = { hidden };
  token.content = state.getLines(startLine + 1, nextLine, state.tShift[startLine], true);
  token.map = [startLine, nextLine + 1];

  state.line = nextLine + 1;
  return true;
});

let execBlockId = 0;

md.renderer.rules.exec_fence = (tokens, idx) => {
  const token = tokens[idx];
  const lang = token.info || "python";
  const hidden = token.meta?.hidden ?? false;
  const id = execBlockId++;
  const rawCode = token.content;
  let highlighted: string;
  if (hljs.getLanguage(lang)) {
    highlighted = hljs.highlight(rawCode, { language: lang }).value;
  } else {
    highlighted = md.utils.escapeHtml(rawCode);
  }
  // Embed raw source in a hidden script tag for Pyodide to read
  const encoded = Buffer.from(rawCode).toString("base64");

  // JSX blocks auto-render as seamless visualisations — no header, no code display
  if (lang === "jsx") {
    return `<div class="jsx-block" data-output="${id}" data-jsx-auto="${id}"></div>
<script type="text/plain" data-source="${id}">${encoded}</script>`;
  }

  const collapsedClass = hidden ? " exec-block--collapsed" : "";
  const toggleLabel = hidden ? "Show" : "Hide";
  return `<div class="exec-block${collapsedClass}" data-lang="${md.utils.escapeHtml(lang)}" data-block-id="${id}">
    <div class="exec-block-header">
      <span>${md.utils.escapeHtml(lang)}</span>
      <span class="exec-block-actions">
        <button class="exec-toggle-btn" data-block-id="${id}">${toggleLabel}</button>
        <button class="exec-enlarge-btn" data-block-id="${id}">Enlarge</button>
        <button class="exec-run-btn" data-block-id="${id}">Run</button>
      </span>
    </div>
    <pre class="hljs"><code>${highlighted}</code></pre>
    <script type="text/plain" data-source="${id}">${encoded}</script>
    <div class="exec-output" data-output="${id}"></div>
  </div>`;
};

// Rewrite .md links to rendered paths (e.g., ./intro.md -> ./intro, ../notes/lecture-1.md -> ../notes/lecture-1)
const defaultLinkOpen = md.renderer.rules.link_open || ((tokens: any, idx: any, options: any, _env: any, self: any) => self.renderToken(tokens, idx, options));

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const hrefIndex = tokens[idx].attrIndex("href");
  if (hrefIndex >= 0) {
    const href = tokens[idx].attrs![hrefIndex][1];
    // Only rewrite relative .md links, not external URLs
    if (href.endsWith(".md") && !href.startsWith("http://") && !href.startsWith("https://")) {
      tokens[idx].attrs![hrefIndex][1] = href.replace(/\.md$/, "");
    }
  }
  return defaultLinkOpen(tokens, idx, options, env, self);
};

// Add IDs to headings for TOC anchor links
md.renderer.rules.heading_open = (tokens, idx, options, _env, self) => {
  const token = tokens[idx];
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
  // Strip fenced code blocks and inline code so we don't pick up # inside them
  const stripped = source
    .replace(/^```[\s\S]*?^```/gm, "")
    .replace(/^~~~[\s\S]*?^~~~/gm, "")
    .replace(/^:::\w[\s\S]*?^:::/gm, "")
    .replace(/`[^`\n]+`/g, "");
  const entries: TocEntry[] = [];
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  let match;
  while ((match = headingRegex.exec(stripped)) !== null) {
    const level = match[1].length;
    const text = match[2].replace(/\*\*(.+?)\*\*/g, "$1").replace(/\[(.+?)\]\(.+?\)/g, "$1").replace(/`(.+?)`/g, "$1").trim();
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
    const filename = match[1];
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

const FRONTMATTER_STRIP_RE = /^---\n[\s\S]*?\n---\n?/;

export function stripFrontmatter(source: string): string {
  return source.replace(FRONTMATTER_STRIP_RE, "");
}

export function renderMarkdown(source: string): string {
  execBlockId = 0;
  uploadBlockId = 0;
  return md.render(stripFrontmatter(source));
}

export function renderMarkdownText(source: string): string {
  return md.render(stripFrontmatter(source));
}

export function renderMarkdownInline(source: string): string {
  return md.renderInline(source);
}
