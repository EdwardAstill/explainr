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

const MANIFEST_CONTENT = `# Virtual paths manifest — controls which pages the site exposes.
# Uncomment and edit the sections you need.

# include:   # Show ONLY these folders (default: show everything)
#   - courses/**
#   - units/**

# exclude:   # Hide these folders from the site
#   - docs/**
#   - wiki/**
#   - preview/**

# mappings:  # Remap filesystem prefixes to cleaner sidebar names
#   courses: Courses
#   units: Units
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

  const manifestPath = join(readrunDir, "virtual-paths.yaml");
  if (await pathExists(manifestPath)) {
    existing.push(".readrun/virtual-paths.yaml");
  } else {
    await Bun.write(manifestPath, MANIFEST_CONTENT);
    created.push(".readrun/virtual-paths.yaml");
  }

  return { created, existing };
}
