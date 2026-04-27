// Pre-render expansion of [query attrs] blocks. Replaces each with a
// markdown bullet list of matching pages from the site index.

import type { SiteIndex, PageRecord } from "./siteIndex";

const QUERY_RE = /^[ \t]*\[query\b([^\]\n]*)\][ \t]*$/gm;

interface Attrs {
  tag?: string;
  folder?: string;
  sort?: "title" | "updated";
  limit?: number;
}

function parseQueryAttrs(s: string): Attrs {
  const out: Attrs = {};
  const re = /(\w+)\s*=\s*"([^"]*)"|(\w+)\s*=\s*(\S+)|(\w+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const key = (m[1] || m[3] || m[5] || "").toLowerCase();
    const val = (m[2] ?? m[4] ?? "");
    if (key === "tag") out.tag = val;
    else if (key === "folder") out.folder = val.startsWith("/") ? val : "/" + val;
    else if (key === "sort") out.sort = val === "updated" ? "updated" : "title";
    else if (key === "limit") out.limit = Math.max(1, Math.min(500, parseInt(val, 10) || 50));
  }
  return out;
}

function applyQuery(idx: SiteIndex, attrs: Attrs): PageRecord[] {
  let pages: PageRecord[] = idx.pages.filter((p) => p.ext === ".md");
  if (attrs.tag) pages = pages.filter((p) => p.tags.includes(attrs.tag!));
  if (attrs.folder) {
    const prefix = attrs.folder.endsWith("/") ? attrs.folder : attrs.folder + "/";
    pages = pages.filter((p) => p.url === attrs.folder || p.url.startsWith(prefix));
  }
  if (attrs.sort === "updated") pages.sort((a, b) => b.mtimeMs - a.mtimeMs);
  else pages.sort((a, b) => a.title.localeCompare(b.title));
  return pages.slice(0, attrs.limit ?? 50);
}

export function expandQueryBlocks(source: string, idx: SiteIndex): string {
  return source.replace(QUERY_RE, (_match, rawAttrs: string) => {
    const attrs = parseQueryAttrs(rawAttrs ?? "");
    const results = applyQuery(idx, attrs);
    if (results.length === 0) return `*(no pages matched query)*`;
    return results.map((p) => `- [${p.title}](${p.url})`).join("\n");
  });
}
