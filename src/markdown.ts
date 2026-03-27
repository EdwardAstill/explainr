import MarkdownIt from "markdown-it";
import hljs from "highlight.js";

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

export function renderMarkdown(source: string): string {
  execBlockId = 0;
  return md.render(source);
}
