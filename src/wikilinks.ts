import { readdir } from "fs/promises";
import { join, relative, extname, basename } from "path";
import { readFrontmatter } from "./frontmatter";

export interface WikilinkEntry {
  url: string;      // URL path, e.g. /notes/math/contour-integration
  title: string;    // preferred display label (frontmatter title or filename stem)
  filename: string; // file stem, for fallback / disambig
}

export type WikilinkIndex = Map<string, WikilinkEntry | "ambiguous">;

const IGNORE_DIRS = new Set(["node_modules", "dist", "out", ".git", "__pycache__", ".venv", "venv"]);

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/^\d+[_-]/, "") // strip leading 01_ / 01-
    .replace(/_/g, "-")
    .replace(/-+/g, "-");
}

function addKey(idx: WikilinkIndex, key: string, entry: WikilinkEntry): void {
  const existing = idx.get(key);
  if (existing === undefined) {
    idx.set(key, entry);
  } else if (existing !== "ambiguous" && existing.url !== entry.url) {
    idx.set(key, "ambiguous");
  }
}

export async function buildWikilinkIndex(contentDir: string): Promise<WikilinkIndex> {
  const idx: WikilinkIndex = new Map();

  async function walk(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.name.startsWith(".")) continue;
      if (e.isDirectory() && IGNORE_DIRS.has(e.name)) continue;
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        await walk(full);
        continue;
      }
      if (extname(e.name) !== ".md") continue;

      const rel = relative(contentDir, full).replace(/\\/g, "/");
      const stem = basename(e.name, ".md");
      const url = "/" + rel.replace(/\.md$/, "");
      const { fm } = await readFrontmatter(full);
      const title = fm.title ?? stem;

      const entry: WikilinkEntry = { url, title, filename: stem };
      // Register under multiple keys so fuzzy forms resolve.
      for (const key of new Set([stem, stem.toLowerCase(), normalize(stem)])) {
        addKey(idx, key, entry);
      }
    }
  }

  await walk(contentDir);
  return idx;
}

// In-process cache keyed by absolute contentDir.
const cache = new Map<string, WikilinkIndex>();

export async function getWikilinkIndex(contentDir: string): Promise<WikilinkIndex> {
  const cached = cache.get(contentDir);
  if (cached) return cached;
  const idx = await buildWikilinkIndex(contentDir);
  cache.set(contentDir, idx);
  return idx;
}

export function invalidateWikilinkCache(contentDir?: string): void {
  if (contentDir) cache.delete(contentDir);
  else cache.clear();
}

const WIKILINK_RE = /\[\[([^\]\|#\n]+?)(\|[^\]\n]+)?(#[^\]\n]+)?\]\]/g;

function resolveTarget(target: string, index: WikilinkIndex): WikilinkEntry | null {
  const key = target.split("/").pop() ?? target;
  for (const variant of [key, key.toLowerCase(), normalize(key)]) {
    const v = index.get(variant);
    if (v === "ambiguous") return null; // leave broken — don't guess
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
    if (!entry) return match; // unresolved — keep literal so the break is visible
    const label = alias || entry.title || entry.filename;
    // Output markdown link; markdown-it will turn it into <a>.
    return `[${label}](${entry.url}${anchor})`;
  });
}
