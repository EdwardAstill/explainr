import { join } from "path";
import { mkdir } from "fs/promises";
import { pathExists } from "./utils";

export interface InitResult {
  created: string[];
  existing: string[];
}

const IGNORE_CONTENT = `# Files and folders to exclude from navigation (one pattern per line)
# Supports glob patterns, e.g.: drafts/, *.tmp
`;

export async function initReadrun(targetDir: string): Promise<InitResult> {
  const created: string[] = [];
  const existing: string[] = [];

  const readrunDir = join(targetDir, ".readrun");

  for (const subdir of ["images", "scripts", "files"]) {
    const full = join(readrunDir, subdir);
    if (await pathExists(full)) {
      existing.push(`.readrun/${subdir}`);
    } else {
      await mkdir(full, { recursive: true });
      created.push(`.readrun/${subdir}`);
    }
  }

  const ignorePath = join(readrunDir, ".ignore");
  if (await pathExists(ignorePath)) {
    existing.push(".readrun/.ignore");
  } else {
    await Bun.write(ignorePath, IGNORE_CONTENT);
    created.push(".readrun/.ignore");
  }

  return { created, existing };
}
