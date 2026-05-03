// Single shared in-memory index of every page in a content folder.
// Source of truth for: nav input, wikilink resolution, backlinks, tags,
// search-index export, [query]/[embed] block expansion, and rr stats.

import { basename } from "path";
import { walkContent } from "./utils";
import { loadManifest, applyManifestFilter, applyManifestMappings } from "./manifest";

export interface PageRecord {
  url: string;          // /notes/intro
  filePath: string;     // absolute on-disk path
  relPath: string;      // notes/intro.md, with forward slashes
  ext: string;          // .md or .jsx
  title: string;
  filename: string;     // file stem (no ext)
  virtualPath: string | null;
  tags: string[];
  body: string;         // post-frontmatter content (cached for search/backlinks/embed)
  outboundLinks: string[]; // wikilink targets seen in this page
  mtimeMs: number;
}

export interface WikilinkEntry {
  url: string;
  title: string;
  filename: string;
}

export interface SiteIndex {
  contentDir: string;
  pages: PageRecord[];
  byUrl: Map<string, PageRecord>;
  byKey: Map<string, WikilinkEntry | "ambiguous">;
  all: WikilinkEntry[];
  backlinks: Map<string, PageRecord[]>; // url -> pages that link to it
  tags: Map<string, PageRecord[]>;      // tag -> pages
  builtAt: number;
}

const WIKILINK_RE = /\[\[([^\]\|#\n]+?)(\|[^\]\n]+)?(#[^\]\n]+)?\]\]/g;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/^\d+[_-]/, "")
    .replace(/_/g, "-")
    .replace(/-+/g, "-");
}

function addKey(byKey: Map<string, WikilinkEntry | "ambiguous">, key: string, entry: WikilinkEntry): void {
  const existing = byKey.get(key);
  if (existing === undefined) byKey.set(key, entry);
  else if (existing !== "ambiguous" && existing.url !== entry.url) byKey.set(key, "ambiguous");
}

export async function buildSiteIndex(contentDir: string): Promise<SiteIndex> {
  const pages: PageRecord[] = [];

  for await (const f of walkContent(contentDir, { exts: [".md", ".jsx"] })) {
    const stem = basename(f.absPath, f.ext);
    const url = "/" + f.relPath.replace(new RegExp(`\\${f.ext}$`), "");

    if (f.ext === ".jsx") {
      pages.push({
        url, filePath: f.absPath, relPath: f.relPath, ext: f.ext,
        title: stem, filename: stem, virtualPath: null, tags: [], body: "",
        outboundLinks: [], mtimeMs: 0,
      });
      continue;
    }

    const stat = await Bun.file(f.absPath).stat().catch(() => null);
    const text = await Bun.file(f.absPath).text();
    const { fm, body } = (await import("./frontmatter")).parseFrontmatter(text);
    const title = fm.title ?? stem;
    const tags = fm.tags ?? [];
    const virtualPath = fm.virtualPath ?? null;

    const outboundLinks: string[] = [];
    for (const m of body.matchAll(WIKILINK_RE)) {
      outboundLinks.push((m[1] ?? "").trim());
    }

    pages.push({
      url, filePath: f.absPath, relPath: f.relPath, ext: f.ext,
      title, filename: stem, virtualPath, tags, body,
      outboundLinks, mtimeMs: stat?.mtimeMs ?? 0,
    });
  }

  const { config: manifestConfig } = await loadManifest(contentDir);
  const sitePages = applyManifestMappings(
    applyManifestFilter(pages, manifestConfig),
    manifestConfig,
  );

  const byUrl = new Map<string, PageRecord>();
  const byKey = new Map<string, WikilinkEntry | "ambiguous">();
  const all: WikilinkEntry[] = [];
  const tags = new Map<string, PageRecord[]>();

  for (const p of sitePages) {
    byUrl.set(p.url, p);
    const entry: WikilinkEntry = { url: p.url, title: p.title, filename: p.filename };
    all.push(entry);
    for (const key of new Set([p.filename, p.filename.toLowerCase(), normalize(p.filename)])) {
      addKey(byKey, key, entry);
    }
    for (const tag of p.tags) {
      const arr = tags.get(tag) ?? [];
      arr.push(p);
      tags.set(tag, arr);
    }
  }

  // Resolve backlinks now that the URL/key indices exist.
  const backlinks = new Map<string, PageRecord[]>();
  for (const src of sitePages) {
    for (const target of src.outboundLinks) {
      const resolved = resolveLink(target, byUrl, byKey, all);
      if (!resolved) continue;
      const arr = backlinks.get(resolved.url) ?? [];
      if (!arr.includes(src)) arr.push(src);
      backlinks.set(resolved.url, arr);
    }
  }

  return { contentDir, pages: sitePages, byUrl, byKey, all, backlinks, tags, builtAt: Date.now() };
}

function resolveLink(
  target: string,
  _byUrl: Map<string, PageRecord>,
  byKey: Map<string, WikilinkEntry | "ambiguous">,
  all: WikilinkEntry[],
): WikilinkEntry | null {
  const slash = target.lastIndexOf("/");
  const folderHint = slash >= 0 ? target.slice(0, slash) : "";
  const leaf = slash >= 0 ? target.slice(slash + 1) : target;

  if (folderHint) {
    const wantSuffix = "/" + target.replace(/^\/+/, "");
    const lower = wantSuffix.toLowerCase();
    return all.find((c) => c.url.toLowerCase().endsWith(lower)) ?? null;
  }
  for (const variant of [leaf, leaf.toLowerCase(), normalize(leaf)]) {
    const v = byKey.get(variant);
    if (v === "ambiguous") return null;
    if (v) return v;
  }
  return null;
}

// Cache keyed by absolute contentDir.
const cache = new Map<string, SiteIndex>();

export async function getSiteIndex(contentDir: string): Promise<SiteIndex> {
  const hit = cache.get(contentDir);
  if (hit) return hit;
  const idx = await buildSiteIndex(contentDir);
  cache.set(contentDir, idx);
  return idx;
}

export function invalidateSiteIndex(contentDir?: string): void {
  if (contentDir) cache.delete(contentDir);
  else cache.clear();
}
