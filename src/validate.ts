import { join } from "path";
import { readdir, stat } from "fs/promises";
import { pathExists } from "./utils";
import { getSiteIndex, invalidateSiteIndex } from "./siteIndex";
import { parseFrontmatter } from "./frontmatter";

export interface Issue {
  file: string;
  line?: number;
  message: string;
}

export interface ValidationResult {
  errors: Issue[];
  warnings: Issue[];
}

const VALID_READRUN_SUBDIRS = new Set(["images", "scripts", "files"]);


async function collectMdFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  async function walk(current: string) {
    let entries: string[];
    try { entries = await readdir(current); } catch { return; }
    for (const entry of entries) {
      if (entry.startsWith(".") || entry === "node_modules") continue;
      const full = join(current, entry);
      const s = await stat(full).catch(() => null);
      if (!s) continue;
      if (s.isDirectory()) await walk(full);
      else if (entry.endsWith(".md")) results.push(full);
    }
  }
  await walk(dir);
  return results;
}

function validateMdContent(
  relPath: string,
  content: string,
  errors: Issue[],
  warnings: Issue[],
  fileRefs: Set<string>,
  virtualPaths: Map<string, string>
) {
  const { fm, issues: fmIssues } = parseFrontmatter(content);
  for (const iss of fmIssues) {
    if (iss.kind === "parse_error") {
      errors.push({ file: relPath, line: iss.line, message: `frontmatter parse error: ${iss.message}` });
    } else if (iss.kind === "wrong_type") {
      errors.push({ file: relPath, message: `frontmatter "${iss.name}" must be ${iss.expected} (got ${iss.got})` });
    } else if (iss.kind === "unknown_field") {
      warnings.push({ file: relPath, message: `unknown frontmatter field "${iss.name}" (readrun ignores it)` });
    }
  }
  if (fm.virtualPath) {
    const prior = virtualPaths.get(fm.virtualPath);
    if (prior && prior !== relPath) {
      errors.push({
        file: relPath,
        message: `virtual_path "${fm.virtualPath}" collides with ${prior}`,
      });
    } else {
      virtualPaths.set(fm.virtualPath, relPath);
    }
  }

  const lines = content.split("\n");
  let inFence = false;
  let fenceLine = 0;
  const bracketStack: { name: string; line: number }[] = [];

  const VOID_BRACKET = new Set(["upload", "include"]);
  const bracketRe = /^\s*\[(?<close>\/)?(?<name>[A-Za-z][A-Za-z0-9-]*)(?<src>=\S+)?[^\]]*\]\s*$/;

  for (const [i, line] of lines.entries()) {
    const lineNum = i + 1;

    if (/^#{1,6}[^\s#]/.test(line)) {
      warnings.push({ file: relPath, line: lineNum, message: `malformed heading (missing space after #)` });
    }

    if (line.startsWith("```")) {
      inFence = !inFence;
      if (inFence) fenceLine = lineNum;
      continue;
    }

    if (inFence) continue;

    if (line.startsWith(":::")) {
      errors.push({ file: relPath, line: lineNum, message: `legacy ::: block syntax is no longer supported — use [name]/[/name] form` });
      continue;
    }

    const bracketMatch = line.match(bracketRe);
    if (bracketMatch) {
      const name = bracketMatch.groups!.name!;
      const isClose = !!bracketMatch.groups!.close;
      const isVoidSrc = !!bracketMatch.groups!.src;

      if (isClose) {
        const top = bracketStack[bracketStack.length - 1];
        if (!top) {
          errors.push({ file: relPath, line: lineNum, message: `unexpected [/${name}] with no open block` });
        } else if (top.name !== name) {
          errors.push({ file: relPath, line: lineNum, message: `[/${name}] closes [${top.name}] opened at line ${top.line} — mismatched` });
          bracketStack.pop();
        } else {
          bracketStack.pop();
        }
        continue;
      }

      if (isVoidSrc || VOID_BRACKET.has(name)) {
        // Track file refs for [lang=path] / [include=path]
        const srcPart = bracketMatch.groups!.src;
        if (srcPart) {
          const refPath = srcPart.slice(1);
          if (refPath.includes(".") && name !== "include") fileRefs.add(refPath);
        }
        continue;
      }

      bracketStack.push({ name, line: lineNum });
      continue;
    }
  }

  if (inFence) {
    errors.push({ file: relPath, line: fenceLine, message: `unclosed fenced code block (opened at line ${fenceLine})` });
  }
  if (bracketStack.length > 0) {
    const top = bracketStack[bracketStack.length - 1]!;
    errors.push({ file: relPath, line: top.line, message: `unclosed [${top.name}] block (opened at line ${top.line})` });
  }
}

export async function validateFolder(folderPath: string): Promise<ValidationResult> {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];

  const scriptsDir = join(folderPath, ".readrun", "scripts");
  const imagesDir = join(folderPath, ".readrun", "images");
  const readrunDir = join(folderPath, ".readrun");

  const allFileRefs = new Set<string>();
  const virtualPaths = new Map<string, string>();

  const mdFiles = await collectMdFiles(folderPath);
  for (const full of mdFiles) {
    const content = await Bun.file(full).text();
    const rel = full.slice(folderPath.length + 1);
    validateMdContent(rel, content, errors, warnings, allFileRefs, virtualPaths);
  }

  // Resolve file references
  for (const ref of allFileRefs) {
    const inScripts = join(scriptsDir, ref);
    const inImages = join(imagesDir, ref);
    if (!(await pathExists(inScripts)) && !(await pathExists(inImages))) {
      errors.push({ file: ref, message: `file reference "${ref}" not found in .readrun/scripts/ or .readrun/images/` });
    }
  }

  // Validate .readrun/ structure
  if (await pathExists(readrunDir)) {
    const entries = await readdir(readrunDir).catch(() => [] as string[]);
    for (const entry of entries) {
      if (entry === ".ignore") continue;
      const s = await stat(join(readrunDir, entry)).catch(() => null);
      if (s && s.isDirectory() && !VALID_READRUN_SUBDIRS.has(entry)) {
        warnings.push({ file: ".readrun/", message: `unexpected subdirectory ".readrun/${entry}/"` });
      }
    }
  }

  // Wikilink dangling-ref check via siteIndex.
  invalidateSiteIndex(folderPath);
  const siteIdx = await getSiteIndex(folderPath);
  const wikilinkRe = /\[\[([^\]\|#\n]+?)(\|[^\]\n]+)?(#[^\]\n]+)?\]\]/g;
  for (const page of siteIdx.pages) {
    if (!page.body) continue;
    for (const m of page.body.matchAll(wikilinkRe)) {
      const target = (m[1] ?? "").trim();
      if (!target) continue;
      if (resolves(target, siteIdx)) continue;
      warnings.push({ file: page.relPath, message: `unresolved wikilink [[${target}]]` });
    }
  }

  return { errors, warnings };
}

function resolves(target: string, idx: { byKey: Map<string, any>; all: { url: string }[] }): boolean {
  const slash = target.lastIndexOf("/");
  if (slash >= 0) {
    const lower = ("/" + target.replace(/^\/+/, "")).toLowerCase();
    return idx.all.some((c) => c.url.toLowerCase().endsWith(lower));
  }
  const norm = (s: string) => s.toLowerCase().replace(/^\d+[_-]/, "").replace(/_/g, "-").replace(/-+/g, "-");
  for (const v of [target, target.toLowerCase(), norm(target)]) {
    const hit = idx.byKey.get(v);
    if (hit && hit !== "ambiguous") return true;
  }
  return false;
}
