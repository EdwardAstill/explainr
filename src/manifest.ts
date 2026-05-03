import { join } from "path";
import { parse as parseYaml, YAMLParseError } from "yaml";
import type { PageRecord } from "./siteIndex";

export interface ManifestConfig {
  include: string[];
  exclude: string[];
  mappings: Record<string, string>;
}

export interface ManifestIssue {
  kind: "parse_error" | "unknown_field" | "wrong_type";
  field?: string;
  message: string;
}

export interface ManifestLoad {
  config: ManifestConfig;
  issues: ManifestIssue[];
}

const EMPTY_CONFIG: ManifestConfig = { include: [], exclude: [], mappings: {} };
const KNOWN_FIELDS = new Set(["include", "exclude", "mappings"]);

export function parseManifest(text: string): ManifestLoad {
  const issues: ManifestIssue[] = [];

  if (!text.trim()) return { config: { ...EMPTY_CONFIG }, issues };

  let parsed: unknown;
  try {
    parsed = parseYaml(text);
  } catch (err) {
    const msg = err instanceof YAMLParseError ? err.message : String(err);
    issues.push({ kind: "parse_error", message: msg });
    return { config: { ...EMPTY_CONFIG }, issues };
  }

  if (parsed === null || parsed === undefined) return { config: { ...EMPTY_CONFIG }, issues };
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    issues.push({ kind: "parse_error", message: "virtual-paths.yaml root must be a mapping" });
    return { config: { ...EMPTY_CONFIG }, issues };
  }

  const raw = parsed as Record<string, unknown>;
  const config: ManifestConfig = { include: [], exclude: [], mappings: {} };

  if ("include" in raw) {
    const v = raw.include;
    if (Array.isArray(v) && v.every((t) => typeof t === "string")) {
      config.include = v.filter(Boolean);
    } else {
      issues.push({ kind: "wrong_type", field: "include", message: "include must be a list of strings" });
    }
  }

  if ("exclude" in raw) {
    const v = raw.exclude;
    if (Array.isArray(v) && v.every((t) => typeof t === "string")) {
      config.exclude = v.filter(Boolean);
    } else {
      issues.push({ kind: "wrong_type", field: "exclude", message: "exclude must be a list of strings" });
    }
  }

  if ("mappings" in raw) {
    const v = raw.mappings;
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        if (typeof val === "string") {
          config.mappings[k] = val;
        } else {
          issues.push({ kind: "wrong_type", field: `mappings.${k}`, message: `mappings.${k} must be a string` });
        }
      }
    } else {
      issues.push({ kind: "wrong_type", field: "mappings", message: "mappings must be a key-value mapping" });
    }
  }

  for (const key of Object.keys(raw)) {
    if (!KNOWN_FIELDS.has(key)) {
      issues.push({ kind: "unknown_field", field: key, message: `unknown field "${key}"` });
    }
  }

  return { config, issues };
}

export async function loadManifest(contentDir: string): Promise<ManifestLoad> {
  const manifestPath = join(contentDir, ".readrun", "virtual-paths.yaml");
  try {
    const text = await Bun.file(manifestPath).text();
    return parseManifest(text);
  } catch {
    return { config: { ...EMPTY_CONFIG }, issues: [] };
  }
}

export function applyManifestFilter(pages: PageRecord[], config: ManifestConfig): PageRecord[] {
  if (config.include.length === 0 && config.exclude.length === 0) return pages;

  const includeGlobs = config.include.map((p) => new Bun.Glob(p));
  const excludeGlobs = config.exclude.map((p) => new Bun.Glob(p));

  return pages.filter((page) => {
    const rel = page.relPath;
    if (includeGlobs.length > 0 && !includeGlobs.some((g) => g.match(rel))) return false;
    if (excludeGlobs.length > 0 && excludeGlobs.some((g) => g.match(rel))) return false;
    return true;
  });
}
