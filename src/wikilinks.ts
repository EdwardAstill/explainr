// Public wikilink API. Delegates to siteIndex for the underlying lookup tables;
// this module owns only the source-text rewriting.

import { getSiteIndex, invalidateSiteIndex, type SiteIndex, type WikilinkEntry } from "./siteIndex";

export type { WikilinkEntry };
export type WikilinkIndex = Pick<SiteIndex, "byKey" | "all">;

export async function getWikilinkIndex(contentDir: string): Promise<WikilinkIndex> {
  const idx = await getSiteIndex(contentDir);
  return { byKey: idx.byKey, all: idx.all };
}

export function invalidateWikilinkCache(contentDir?: string): void {
  invalidateSiteIndex(contentDir);
}

const WIKILINK_RE = /\[\[([^\]\|#\n]+?)(\|[^\]\n]+)?(#[^\]\n]+)?\]\]/g;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/^\d+[_-]/, "")
    .replace(/_/g, "-")
    .replace(/-+/g, "-");
}

function resolveTarget(target: string, index: WikilinkIndex): WikilinkEntry | null {
  const slash = target.lastIndexOf("/");
  const folderHint = slash >= 0 ? target.slice(0, slash) : "";
  const leaf = slash >= 0 ? target.slice(slash + 1) : target;

  if (folderHint) {
    const wantSuffix = "/" + target.replace(/^\/+/, "");
    const lower = wantSuffix.toLowerCase();
    return index.all.find((c) => c.url.toLowerCase().endsWith(lower)) ?? null;
  }

  for (const variant of [leaf, leaf.toLowerCase(), normalize(leaf)]) {
    const v = index.byKey.get(variant);
    if (v === "ambiguous") return null;
    if (v) return v;
  }
  return null;
}

export function rewriteWikilinks(source: string, index: WikilinkIndex): string {
  return source.replace(WIKILINK_RE, (match, rawTarget: string, rawAlias?: string, rawAnchor?: string) => {
    const target = rawTarget.trim();
    const alias = rawAlias ? rawAlias.slice(1).trim() : null;
    const anchor = rawAnchor ?? "";
    const entry = resolveTarget(target, index);
    if (!entry) return match;
    const label = alias || entry.title || entry.filename;
    return `[${label}](${entry.url}${anchor})`;
  });
}
