import { dirname } from "path";
import { mkdir } from "fs/promises";
import { pathExists } from "./utils";

export interface NewPageOptions {
  targetFile: string;
  title?: string;
  force?: boolean;
}

export interface NewPageResult {
  path: string;
  created: boolean;
  skipped?: "exists";
}

function titleFromFilename(file: string): string {
  const base = file.split("/").pop()?.replace(/\.md$/i, "") ?? "Untitled";
  return base
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function pageTemplate(title: string): string {
  return `# ${title}\n\nOne-sentence summary of what this page is.\n\n## Overview\n\nExplanatory prose here.\n\n\`\`\`python\nprint("plain code block — not runnable")\n\`\`\`\n\n[python]\nprint("runnable — click Run")\n[/python]\n`;
}

export async function newPage(opts: NewPageOptions): Promise<NewPageResult> {
  const file = opts.targetFile.endsWith(".md") ? opts.targetFile : opts.targetFile + ".md";

  if (await pathExists(file) && !opts.force) {
    return { path: file, created: false, skipped: "exists" };
  }

  const title = opts.title ?? titleFromFilename(file);
  await mkdir(dirname(file), { recursive: true });
  await Bun.write(file, pageTemplate(title));
  return { path: file, created: true };
}
