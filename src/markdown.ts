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

// Custom rule: treat :::lang ... ::: as executable code blocks with a Run button
md.block.ruler.before("fence", "exec_fence", (state, startLine, endLine, silent) => {
  const pos = state.bMarks[startLine] + state.tShift[startLine];
  const max = state.eMarks[startLine];
  const line = state.src.slice(pos, max);

  if (!line.startsWith(":::")) return false;

  const lang = line.slice(3).trim();

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

  const token = state.push("exec_fence", "code", 0);
  token.info = lang;
  token.content = state.getLines(startLine + 1, nextLine, state.tShift[startLine], true);
  token.map = [startLine, nextLine + 1];

  state.line = nextLine + 1;
  return true;
});

let execBlockId = 0;

md.renderer.rules.exec_fence = (tokens, idx) => {
  const token = tokens[idx];
  const lang = token.info || "python";
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
  return `<div class="exec-block" data-lang="${md.utils.escapeHtml(lang)}" data-block-id="${id}">
    <div class="exec-block-header">
      <span>${md.utils.escapeHtml(lang)}</span>
      <button class="exec-run-btn" data-block-id="${id}">Run</button>
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
  ".js": "javascript",
  ".ts": "typescript",
  ".rb": "ruby",
  ".rs": "rust",
  ".go": "go",
  ".java": "java",
  ".c": "c",
  ".cpp": "cpp",
  ".html": "html",
  ".sh": "bash",
  ".sql": "sql",
  ".r": "r",
  ".jl": "julia",
  ".lua": "lua",
  ".php": "php",
  ".swift": "swift",
  ".kt": "kotlin",
  ".scala": "scala",
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
  const fileRefPattern = /^:::([\w.-]+\.\w+)\s*$/gm;
  const matches = [...source.matchAll(fileRefPattern)];
  if (matches.length === 0) return source;

  let result = source;
  // Process in reverse so indices stay valid
  for (const match of matches.reverse()) {
    const filename = match[1];
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
      const filePath = join(scriptsDir, filename);
      try {
        const content = await readFile(filePath, "utf-8");
        replacement = `:::${lang}\n${content}\n:::`;
      } catch {
        replacement = `:::${lang}\n# Error: file not found: .readrun/scripts/${filename}\n:::`;
      }
    }

    const start = match.index!;
    const end = start + match[0].length;
    result = result.slice(0, start) + replacement + result.slice(end);
  }

  return result;
}

export function renderMarkdown(source: string): string {
  execBlockId = 0;
  return md.render(source);
}
