import { join } from "path";
import { readdir, readFile, stat, access } from "fs/promises";

export interface Issue {
  file: string;
  line?: number;
  message: string;
}

export interface ValidationResult {
  errors: Issue[];
  warnings: Issue[];
}

const VALID_IDENTIFIERS = new Set(["python", "jsx", "upload"]);
const VALID_READRUN_SUBDIRS = new Set(["images", "scripts", "files", "quizzes"]);

async function exists(p: string): Promise<boolean> {
  try { await access(p); return true; } catch { return false; }
}

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
  fileRefs: Set<string>
) {
  const lines = content.split("\n");
  let inFence = false;
  let inColonBlock = false;
  let fenceLine = 0;
  let colonLine = 0;

  for (const [i, line] of lines.entries()) {
    const lineNum = i + 1;

    // Malformed headings (e.g. #NoSpace)
    if (/^#{1,6}[^\s#]/.test(line)) {
      warnings.push({ file: relPath, line: lineNum, message: `malformed heading (missing space after #)` });
    }

    // Fenced code blocks
    if (!inColonBlock && line.startsWith("```")) {
      inFence = !inFence;
      if (inFence) fenceLine = lineNum;
      continue;
    }

    if (inFence) continue;

    // ::: blocks
    if (line.startsWith(":::")) {
      if (inColonBlock) {
        inColonBlock = false;
        continue;
      }
      const rest = line.slice(3).trim();
      if (!rest) continue; // bare ::: closer when not in block

      const parts = rest.split(/\s+/);
      const identifier = parts[0];
      if (!identifier) continue;
      const modifiers = parts.slice(1);

      for (const m of modifiers) {
        if (m !== "hidden") {
          warnings.push({ file: relPath, line: lineNum, message: `unknown block modifier "${m}"` });
        }
      }

      if (identifier === "upload") {
        // upload is self-closing — no block body
      } else if (VALID_IDENTIFIERS.has(identifier)) {
        inColonBlock = true;
        colonLine = lineNum;
      } else if (identifier.includes(".")) {
        fileRefs.add(identifier);
        inColonBlock = true;
        colonLine = lineNum;
      } else {
        warnings.push({ file: relPath, line: lineNum, message: `unknown block identifier "${identifier}"` });
        inColonBlock = true;
        colonLine = lineNum;
      }
    }
  }

  if (inFence) {
    errors.push({ file: relPath, line: fenceLine, message: `unclosed fenced code block (opened at line ${fenceLine})` });
  }
  if (inColonBlock) {
    errors.push({ file: relPath, line: colonLine, message: `unclosed ::: block (opened at line ${colonLine})` });
  }
}

export async function validateFolder(folderPath: string): Promise<ValidationResult> {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];

  const scriptsDir = join(folderPath, ".readrun", "scripts");
  const imagesDir = join(folderPath, ".readrun", "images");
  const readrunDir = join(folderPath, ".readrun");

  const allFileRefs = new Set<string>();

  const mdFiles = await collectMdFiles(folderPath);
  for (const full of mdFiles) {
    const content = await readFile(full, "utf-8");
    const rel = full.slice(folderPath.length + 1);
    validateMdContent(rel, content, errors, warnings, allFileRefs);
  }

  // Resolve file references
  for (const ref of allFileRefs) {
    const inScripts = join(scriptsDir, ref);
    const inImages = join(imagesDir, ref);
    if (!(await exists(inScripts)) && !(await exists(inImages))) {
      errors.push({ file: ref, message: `file reference "${ref}" not found in .readrun/scripts/ or .readrun/images/` });
    }
  }

  // Validate .readrun/ structure
  if (await exists(readrunDir)) {
    const entries = await readdir(readrunDir).catch(() => [] as string[]);
    for (const entry of entries) {
      if (entry === ".ignore") continue;
      const s = await stat(join(readrunDir, entry)).catch(() => null);
      if (s && s.isDirectory() && !VALID_READRUN_SUBDIRS.has(entry)) {
        warnings.push({ file: ".readrun/", message: `unexpected subdirectory ".readrun/${entry}/"` });
      }
    }
  }

  return { errors, warnings };
}
