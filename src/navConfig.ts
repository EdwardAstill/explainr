import { join } from "path";
import { parse as parseYaml, YAMLParseError } from "yaml";

export interface NavConfig {
  mode: "tree" | "panes";
  panes?: number;         // 2-4 when mode === "panes"
  labels?: string[];      // optional; length should match panes
  search: { enabled: boolean };
  hide: string[];         // glob patterns
}

export interface NavConfigIssue {
  kind: "parse_error" | "unknown_field" | "wrong_type" | "out_of_range";
  field?: string;
  message: string;
}

export interface NavConfigLoad {
  config: NavConfig;
  issues: NavConfigIssue[];
}

export const DEFAULT_NAV_CONFIG: NavConfig = {
  mode: "tree",
  search: { enabled: true },
  hide: ["**/plan.md", "**/glossary.md"],
};

const KNOWN_FIELDS = new Set(["panes", "labels", "search", "hide"]);

function defaultConfig(): NavConfig {
  return {
    ...DEFAULT_NAV_CONFIG,
    search: { ...DEFAULT_NAV_CONFIG.search },
    hide: [...DEFAULT_NAV_CONFIG.hide],
  };
}

export function parseNavConfig(text: string | null | undefined): NavConfigLoad {
  const issues: NavConfigIssue[] = [];

  if (!text || !text.trim()) return { config: defaultConfig(), issues };

  let parsed: unknown;
  try {
    parsed = parseYaml(text);
  } catch (err) {
    const msg = err instanceof YAMLParseError ? err.message : String(err);
    issues.push({ kind: "parse_error", message: msg });
    return { config: defaultConfig(), issues };
  }

  if (parsed === null || parsed === undefined) return { config: defaultConfig(), issues };
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    issues.push({ kind: "parse_error", message: "nav.yaml root must be a mapping" });
    return { config: defaultConfig(), issues };
  }

  const raw = parsed as Record<string, unknown>;
  const config = defaultConfig();

  // panes
  if ("panes" in raw) {
    const v = raw.panes;
    if (typeof v !== "number" || !Number.isInteger(v)) {
      issues.push({ kind: "wrong_type", field: "panes", message: "panes must be an integer" });
    } else if (v < 2 || v > 4) {
      issues.push({ kind: "out_of_range", field: "panes", message: `panes must be between 2 and 4, got ${v}` });
      // mode stays "tree"
    } else {
      config.mode = "panes";
      config.panes = v;
    }
  }

  // labels
  if ("labels" in raw) {
    const v = raw.labels;
    if (Array.isArray(v) && v.every((t) => typeof t === "string")) {
      config.labels = v as string[];
    } else {
      issues.push({ kind: "wrong_type", field: "labels", message: "labels must be an array of strings" });
    }
  }

  // search
  if ("search" in raw) {
    const v = raw.search;
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      const s = v as Record<string, unknown>;
      if ("enabled" in s) {
        if (typeof s.enabled === "boolean") {
          config.search = { ...config.search, enabled: s.enabled };
        } else {
          issues.push({ kind: "wrong_type", field: "search.enabled", message: "search.enabled must be a boolean" });
        }
      }
    } else {
      issues.push({ kind: "wrong_type", field: "search", message: "search must be a mapping" });
    }
  }

  // hide
  if ("hide" in raw) {
    const v = raw.hide;
    if (Array.isArray(v) && v.every((t) => typeof t === "string")) {
      config.hide = v as string[];
    } else {
      issues.push({ kind: "wrong_type", field: "hide", message: "hide must be an array of strings" });
    }
  }

  // unknown fields
  for (const key of Object.keys(raw)) {
    if (!KNOWN_FIELDS.has(key)) {
      issues.push({ kind: "unknown_field", field: key, message: `unknown field "${key}"` });
    }
  }

  return { config, issues };
}

export async function loadNavConfig(contentDir: string): Promise<NavConfigLoad> {
  const navPath = join(contentDir, ".readrun", "nav.yaml");
  try {
    const text = await Bun.file(navPath).text();
    return parseNavConfig(text);
  } catch {
    return { config: defaultConfig(), issues: [] };
  }
}
