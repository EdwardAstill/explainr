import { join, resolve } from "path";
import { rm, readdir, readFile, stat } from "fs/promises";

export interface CleanOptions {
  contentDir: string;
  outDir?: string;
  orphans?: boolean;
  dryRun?: boolean;
}

export interface CleanResult {
  removedDist: string | null;
  orphanScripts: string[];
  orphanImages: string[];
}

async function dirExists(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isDirectory();
  } catch { return false; }
}

async function listFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir);
    const out: string[] = [];
    for (const e of entries) {
      const s = await stat(join(dir, e)).catch(() => null);
      if (s && s.isFile()) out.push(e);
    }
    return out;
  } catch { return []; }
}

async function listMarkdown(root: string): Promise<string[]> {
  const results: string[] = [];
  async function walk(dir: string) {
    const entries = await readdir(dir).catch(() => [] as string[]);
    for (const name of entries) {
      if (name === ".readrun" || name === "node_modules" || name === ".git" || name === "dist") continue;
      const full = join(dir, name);
      const s = await stat(full).catch(() => null);
      if (!s) continue;
      if (s.isDirectory()) await walk(full);
      else if (name.endsWith(".md")) results.push(full);
    }
  }
  await walk(root);
  return results;
}

export async function clean(opts: CleanOptions): Promise<CleanResult> {
  const result: CleanResult = {
    removedDist: null,
    orphanScripts: [],
    orphanImages: [],
  };

  const outDir = opts.outDir ?? resolve(opts.contentDir, "dist");
  if (await dirExists(outDir)) {
    if (!opts.dryRun) await rm(outDir, { recursive: true, force: true });
    result.removedDist = outDir;
  }

  if (opts.orphans) {
    const scriptsDir = join(opts.contentDir, ".readrun", "scripts");
    const imagesDir = join(opts.contentDir, ".readrun", "images");
    const scripts = await listFiles(scriptsDir);
    const images = await listFiles(imagesDir);

    const mdFiles = await listMarkdown(opts.contentDir);
    const allText = (await Promise.all(mdFiles.map((f) => readFile(f, "utf-8").catch(() => "")))).join("\n");

    const referenced = new Set<string>();
    for (const m of allText.matchAll(/:::([a-zA-Z0-9_./-]+\.[a-zA-Z0-9]+)/g)) {
      referenced.add((m[1] ?? "").split("/").pop() ?? "");
    }

    for (const f of scripts) if (!referenced.has(f)) result.orphanScripts.push(f);
    for (const f of images) if (!referenced.has(f)) result.orphanImages.push(f);

    if (!opts.dryRun) {
      for (const f of result.orphanScripts) await rm(join(scriptsDir, f), { force: true });
      for (const f of result.orphanImages) await rm(join(imagesDir, f), { force: true });
    }
  }

  return result;
}
