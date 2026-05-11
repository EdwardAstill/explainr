import { join } from "path";
import { readdir, stat } from "fs/promises";
import { pathExists, walkContent } from "./utils";
import { getSiteIndex, invalidateSiteIndex } from "./siteIndex";
import { parseFrontmatter } from "./frontmatter";
import { loadManifest, shouldIncludeRelPath } from "./manifest";
import { KNOWN_BLOCKS, VOID_BLOCKS } from "./blocks";

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

const VIEWER_NAMES = new Set(["stl", "model", "csv", "audio", "video", "pdf"]);

const VIEWER_EXTENSIONS: Record<string, string[]> = {
  stl:   [".stl"],
  model: [".glb", ".gltf"],
  csv:   [".csv"],
  audio: [".mp3", ".wav", ".ogg", ".m4a"],
  video: [".mp4", ".webm", ".ogv"],
  pdf:   [".pdf"],
};

interface ViewerRef {
  name: string;
  path: string;
  line: number;
  file: string;
}


function validateMdContent(
  relPath: string,
  content: string,
  errors: Issue[],
  warnings: Issue[],
  fileRefs: Set<string>,
  virtualPaths: Map<string, string>,
  viewerRefs: ViewerRef[]
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

      if (isVoidSrc || VOID_BLOCKS.has(name)) {
        // Track file refs for [lang=path] / [include=path]
        const srcPart = bracketMatch.groups!.src;
        if (srcPart) {
          const refPath = srcPart.slice(1);
          if (refPath.includes(".") && name !== "include" && !VIEWER_NAMES.has(name)) fileRefs.add(refPath);
        }

        // Viewer block: collect ref + check autoplay
        if (VIEWER_NAMES.has(name) && srcPart) {
          const viewerPath = srcPart.slice(1);
          viewerRefs.push({ name, path: viewerPath, line: lineNum, file: relPath });

          if (name === "video") {
            const rawAttrs = line.replace(/^\s*\[[A-Za-z][\w-]*=[^\s\]"]+/, "").replace(/\]\s*$/, "");
            const hasAutoplay = /\bautoplay=true\b/.test(rawAttrs);
            const hasMuted = /\bmuted=true\b/.test(rawAttrs);
            if (hasAutoplay && !hasMuted) {
              warnings.push({
                file: relPath, line: lineNum,
                message: `[video] autoplay=true without muted=true — browsers block unmuted autoplay`,
              });
            }
          }
        }

        continue;
      }

      if (!KNOWN_BLOCKS.has(name)) {
        warnings.push({ file: relPath, line: lineNum, message: `unknown block "[${name}]" — readrun treats it as a passthrough container; check for typos` });
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
  const allViewerRefs: ViewerRef[] = [];

  const { config: manifestConfig, issues: manifestIssues } = await loadManifest(folderPath);

  for await (const file of walkContent(folderPath, { exts: [".md"] })) {
    if (!shouldIncludeRelPath(file.relPath, manifestConfig)) continue;
    const content = await Bun.file(file.absPath).text();
    const rel = file.relPath;
    validateMdContent(rel, content, errors, warnings, allFileRefs, virtualPaths, allViewerRefs);
  }

  // Resolve file references
  for (const ref of allFileRefs) {
    const inScripts = join(scriptsDir, ref);
    const inImages = join(imagesDir, ref);
    if (!(await pathExists(inScripts)) && !(await pathExists(inImages))) {
      errors.push({ file: ref, message: `file reference "${ref}" not found in .readrun/scripts/ or .readrun/images/` });
    }
  }

  // Resolve viewer file references
  const filesDir = join(folderPath, ".readrun", "files");

  for (const { name, path: refPath, line, file } of allViewerRefs) {
    if (refPath.startsWith("/") || refPath.includes("..")) continue;

    const dotIdx = refPath.lastIndexOf(".");
    const ext = dotIdx === -1 ? "" : refPath.slice(dotIdx).toLowerCase();
    const allowed = VIEWER_EXTENSIONS[name];
    if (allowed && !allowed.includes(ext)) {
      errors.push({ file, line,
        message: `[${name}=${refPath}] wrong extension "${ext}" — expected one of: ${allowed.join(", ")}` });
      continue;
    }

    const filePath = join(filesDir, refPath);
    try {
      await stat(filePath);
    } catch {
      errors.push({ file, line,
        message: `[${name}=${refPath}] file not found in .readrun/files/` });
    }
  }

  // Validate .readrun/virtual-paths.yaml if present.
  for (const issue of manifestIssues) {
    if (issue.kind === "parse_error" || issue.kind === "wrong_type") {
      errors.push({ file: ".readrun/virtual-paths.yaml", message: issue.message });
    } else if (issue.kind === "unknown_field") {
      warnings.push({ file: ".readrun/virtual-paths.yaml", message: issue.message });
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


  // Virtual path collision check across all pages (includes manifest-mapped ones).
  const allVirtualPaths = new Map<string, string>();
  for (const page of siteIdx.pages) {
    if (!page.virtualPath) continue;
    const prior = allVirtualPaths.get(page.virtualPath);
    if (prior && prior !== page.relPath) {
      errors.push({
        file: page.relPath,
        message: `virtual_path "${page.virtualPath}" collides with ${prior}`,
      });
    } else {
      allVirtualPaths.set(page.virtualPath, page.relPath);
    }
  }

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
