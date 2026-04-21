import { readdir } from "fs/promises";
import { join, relative } from "path";

export interface MigrateOptions {
  contentDir: string;
  dryRun?: boolean;
}

export interface MigrateResult {
  filesScanned: number;
  filesModified: string[];
  filesSkipped: string[];
}

function rewriteUpload(line: string): string {
  const rest = line.slice(":::upload ".length);
  const labelMatch = rest.match(/"([^"]+)"/);
  const label = labelMatch ? labelMatch[1] : "Upload";
  const acceptMatch = rest.match(/accept=([\S]+)/);
  const accept = acceptMatch ? `accept=${acceptMatch[1]}` : "";
  const multiple = /\bmultiple\b/.test(rest);
  const renameMatch = rest.match(/rename=([\S]+)/);
  const rename = renameMatch ? `rename=${renameMatch[1]}` : "";

  const parts = [`label="${label}"`];
  if (accept) parts.push(accept);
  if (multiple) parts.push("multiple");
  if (rename) parts.push(rename);

  return `[upload ${parts.join(" ")}]`;
}

function scriptExtToLang(filename: string): string {
  if (filename.endsWith(".jsx")) return "jsx";
  if (filename.endsWith(".py")) return "python";
  return filename.slice(filename.lastIndexOf(".") + 1);
}

export function migrateContent(source: string): string {
  const lines = source.split("\n");
  const output: string[] = [];
  const stack: string[] = [];

  let inFence = false;
  let fenceChar = "";

  for (const line of lines) {
    const trimmed = line.trimEnd();

    if (!inFence) {
      const fenceMatch = trimmed.match(/^(`{3,}|~{3,})/);
      if (fenceMatch) {
        inFence = true;
        fenceChar = (fenceMatch[1] ?? "")[0] ?? "`";
        output.push(line);
        continue;
      }
    } else {
      const closingMatch = trimmed.match(/^(`{3,}|~{3,})$/);
      const closingSeq = closingMatch?.[1] ?? "";
      if (closingMatch && closingSeq[0] === fenceChar && closingSeq.length >= fenceChar.length) {
        inFence = false;
        fenceChar = "";
      }
      output.push(line);
      continue;
    }

    if (trimmed.startsWith(":::upload ")) {
      output.push(rewriteUpload(trimmed));
      continue;
    }

    const scriptRef = trimmed.match(/^:::([\w./\\-]+\.\w+)(?:\s+(hidden))?$/);
    if (scriptRef) {
      const filename = scriptRef[1] ?? "";
      const hidden = scriptRef[2] === "hidden";
      const lang = scriptExtToLang(filename);
      output.push(`[${lang}=${filename}${hidden ? " hidden" : ""}]`);
      continue;
    }

    if (trimmed === ":::") {
      if (stack.length > 0) {
        const name = stack.pop()!;
        output.push(`[/${name}]`);
      } else {
        process.stderr.write(`migrate: warning: bare ::: closer with empty stack\n`);
        output.push(`[/unknown]`);
      }
      continue;
    }

    const blockOpen = trimmed.match(/^:::(jsx|python)(?:\s+(hidden))?$/);
    if (blockOpen) {
      const lang = blockOpen[1] ?? "python";
      const hidden = blockOpen[2] === "hidden";
      stack.push(lang);
      output.push(`[${lang}${hidden ? " hidden" : ""}]`);
      continue;
    }

    const hintMatch = trimmed.match(/^\?>\s?(.*)$/);
    if (hintMatch) {
      output.push(`[hint]${hintMatch[1]}[/hint]`);
      continue;
    }

    output.push(line);
  }

  return output.join("\n");
}

async function walkMdFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = await walkMdFiles(full);
      results.push(...sub);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(full);
    }
  }
  return results;
}

export async function migrate(opts: MigrateOptions): Promise<MigrateResult> {
  const { contentDir, dryRun = false } = opts;
  const files = await walkMdFiles(contentDir);
  const filesModified: string[] = [];
  const filesSkipped: string[] = [];

  for (const abs of files) {
    const source = await Bun.file(abs).text();
    const rewritten = migrateContent(source);
    const rel = relative(contentDir, abs);
    if (rewritten !== source) {
      if (!dryRun) {
        await Bun.write(abs, rewritten);
      }
      filesModified.push(rel);
    } else {
      filesSkipped.push(rel);
    }
  }

  return {
    filesScanned: files.length,
    filesModified,
    filesSkipped,
  };
}
