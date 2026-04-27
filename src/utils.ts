import { resolve, normalize, join, relative } from "path";
import { access, readdir } from "fs/promises";
import type { NavNode } from "./nav";
import { parseFrontmatter } from "./frontmatter";

export const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".py": "text/x-python",
  ".ts": "text/typescript",
  ".csv": "text/csv",
  ".toml": "text/plain",
  ".md": "text/markdown",
  ".txt": "text/plain",
};

export async function pathExists(p: string): Promise<boolean> {
  try { await access(p); return true; } catch { return false; }
}

export async function isPortAvailable(port: number): Promise<boolean> {
  try {
    const { createServer } = await import("net");
    return new Promise((res) => {
      const server = createServer();
      server.once("error", () => res(false));
      server.listen(port, "localhost", () => {
        server.close(() => res(true));
      });
    });
  } catch {
    return false;
  }
}

export async function findAvailablePort(start: number, span = 20): Promise<number> {
  for (let port = start; port < start + span; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port found in range ${start}–${start + span - 1}`);
}

export const IGNORE_DIRS = new Set(["node_modules", "dist", "out", ".git", "__pycache__", ".venv", "venv"]);

async function loadIgnoreGlobs(contentDir: string): Promise<Bun.Glob[]> {
  try {
    const txt = await Bun.file(join(contentDir, ".readrun", ".ignore")).text();
    return txt.split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"))
      .map((p) => new Bun.Glob(p));
  } catch {
    return [];
  }
}

export interface WalkOpts {
  exts?: string[];           // e.g. [".md", ".jsx"] — undefined = no filter
  includeIgnored?: boolean;  // default false
  includeReadrun?: boolean;  // default false (skip .readrun, .git, etc.)
}

export interface WalkEntry { absPath: string; relPath: string; ext: string }

export async function* walkContent(contentDir: string, opts: WalkOpts = {}): AsyncIterable<WalkEntry> {
  const { exts, includeIgnored = false, includeReadrun = false } = opts;
  const globs = includeIgnored ? [] : await loadIgnoreGlobs(contentDir);

  async function* visit(dir: string): AsyncIterable<WalkEntry> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (!includeReadrun && e.name.startsWith(".")) continue;
      if (e.isDirectory() && IGNORE_DIRS.has(e.name)) continue;
      const abs = join(dir, e.name);
      const rel = relative(contentDir, abs).replace(/\\/g, "/");
      if (!includeIgnored && globs.length > 0) {
        let skip = false;
        for (const g of globs) if (g.match(rel)) { skip = true; break; }
        if (skip) continue;
      }
      if (e.isDirectory()) {
        yield* visit(abs);
        continue;
      }
      const dot = e.name.lastIndexOf(".");
      const ext = dot >= 0 ? e.name.slice(dot).toLowerCase() : "";
      if (exts && !exts.includes(ext)) continue;
      yield { absPath: abs, relPath: rel, ext };
    }
  }

  yield* visit(contentDir);
}

export interface EmbeddedFileEntry { name: string }

export async function listEmbeddedFiles(contentDir: string): Promise<EmbeddedFileEntry[]> {
  const filesDir = join(contentDir, ".readrun", "files");
  try {
    const entries = await readdir(filesDir);
    return entries.map((name) => ({ name }));
  } catch {
    return [];
  }
}

export function extractTitle(source: string, fallback: string): string {
  const { fm, body } = parseFrontmatter(source);
  if (fm.title) return fm.title;
  const match = body.match(/^#\s+(.+)$/m);
  return match?.[1] ?? fallback;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function isPathWithin(child: string, parent: string): boolean {
  const resolved = normalize(resolve(parent, child));
  const normalizedParent = normalize(resolve(parent));
  return resolved.startsWith(normalizedParent + "/") || resolved === normalizedParent;
}

export function findFirstFile(nodes: NavNode[]): string | null {
  // Prefer welcome/index/README at the root level
  const preferred = nodes.find(n => !n.isDir && /^\/(welcome|index|readme)$/i.test(n.path));
  if (preferred) return preferred.path;

  for (const node of nodes) {
    if (!node.isDir) return node.path;
    if (node.children) {
      const found = findFirstFile(node.children);
      if (found) return found;
    }
  }
  return null;
}

export function detectRepoName(cwd: string): string | undefined {
  try {
    const result = Bun.spawnSync(["git", "remote", "get-url", "origin"], { cwd });
    const url = result.stdout.toString().trim();
    if (url) {
      const match = url.match(/\/([^/]+?)(?:\.git)?$/);
      if (match?.[1]) {
        const name = match[1];
        if (name.endsWith(".github.io")) return undefined;
        return name;
      }
    }
  } catch {}
  return undefined;
}
