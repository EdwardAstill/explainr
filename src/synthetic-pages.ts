// Synthetic pages: /tags index, /tags/<tag>, /__stats. Rendered from siteIndex.

import type { SiteIndex, PageRecord } from "./siteIndex";
import { escapeHtml } from "./utils";

export function tagsIndexBody(idx: SiteIndex): { title: string; html: string } {
  const tags = [...idx.tags.entries()].sort((a, b) => b[1].length - a[1].length);
  const items = tags.length === 0
    ? `<p><em>No tags found. Add <code>tags: [foo, bar]</code> to a note's frontmatter to get started.</em></p>`
    : `<ul class="tags-index">${tags.map(([t, pages]) => `<li><a href="/tags/${escapeHtml(t)}">${escapeHtml(t)}</a> <span class="muted">${pages.length}</span></li>`).join("")}</ul>`;
  return {
    title: "Tags",
    html: `<h1>Tags</h1>${items}`,
  };
}

export function tagPageBody(idx: SiteIndex, tag: string): { title: string; html: string } | null {
  const pages = idx.tags.get(tag);
  if (!pages || pages.length === 0) return null;
  const sorted = [...pages].sort((a, b) => a.title.localeCompare(b.title));
  return {
    title: `Tag: ${tag}`,
    html: `<h1>Tag: ${escapeHtml(tag)}</h1>
      <p><a href="/tags">← all tags</a></p>
      <ul>${sorted.map((p) => `<li><a href="${escapeHtml(p.url)}">${escapeHtml(p.title)}</a></li>`).join("")}</ul>`,
  };
}

export function statsBody(idx: SiteIndex): { title: string; html: string } {
  const total = idx.pages.length;
  const orphans = idx.pages.filter((p) => p.ext === ".md" && !idx.backlinks.get(p.url));
  const tags = [...idx.tags.entries()].sort((a, b) => b[1].length - a[1].length);

  const danglingByPage = new Map<PageRecord, string[]>();
  for (const p of idx.pages) {
    for (const t of p.outboundLinks) {
      const slash = t.lastIndexOf("/");
      const folderHint = slash >= 0;
      const leaf = slash >= 0 ? t.slice(slash + 1) : t;
      let resolved = false;
      if (folderHint) {
        const lower = ("/" + t.replace(/^\/+/, "")).toLowerCase();
        resolved = idx.all.some((c) => c.url.toLowerCase().endsWith(lower));
      } else {
        const norm = (s: string) => s.toLowerCase().replace(/^\d+[_-]/, "").replace(/_/g, "-").replace(/-+/g, "-");
        for (const v of [leaf, leaf.toLowerCase(), norm(leaf)]) {
          const hit = idx.byKey.get(v);
          if (hit && hit !== "ambiguous") { resolved = true; break; }
        }
      }
      if (!resolved) {
        const arr = danglingByPage.get(p) ?? [];
        arr.push(t);
        danglingByPage.set(p, arr);
      }
    }
  }

  const longest = [...idx.pages]
    .filter((p) => p.ext === ".md")
    .sort((a, b) => b.body.length - a.body.length)
    .slice(0, 5);

  return {
    title: "Site stats",
    html: `<h1>Site stats</h1>
      <ul>
        <li><strong>${total}</strong> pages</li>
        <li><strong>${orphans.length}</strong> orphaned pages (no inbound links)</li>
        <li><strong>${[...danglingByPage.values()].reduce((n, a) => n + a.length, 0)}</strong> dangling wikilinks</li>
        <li><strong>${tags.length}</strong> tags</li>
      </ul>

      <h2>Tag distribution</h2>
      ${tags.length === 0 ? "<p><em>No tags.</em></p>" : `<ul>${tags.map(([t, ps]) => `<li><a href="/tags/${escapeHtml(t)}">${escapeHtml(t)}</a> — ${ps.length}</li>`).join("")}</ul>`}

      <h2>Orphans</h2>
      ${orphans.length === 0 ? "<p><em>None.</em></p>" : `<ul>${orphans.map((p) => `<li><a href="${escapeHtml(p.url)}">${escapeHtml(p.title)}</a></li>`).join("")}</ul>`}

      <h2>Dangling wikilinks</h2>
      ${danglingByPage.size === 0 ? "<p><em>None.</em></p>" : `<ul>${[...danglingByPage.entries()].map(([p, ts]) => `<li><a href="${escapeHtml(p.url)}">${escapeHtml(p.title)}</a> — ${ts.map((t) => `<code>[[${escapeHtml(t)}]]</code>`).join(", ")}</li>`).join("")}</ul>`}

      <h2>Longest pages</h2>
      <ol>${longest.map((p) => `<li><a href="${escapeHtml(p.url)}">${escapeHtml(p.title)}</a> — ${p.body.length} chars</li>`).join("")}</ol>`,
  };
}
