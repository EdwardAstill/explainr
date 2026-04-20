import { parse as parseYaml, YAMLParseError } from "yaml";

export interface Frontmatter {
  title?: string;
  virtualPath?: string;
  raw?: Record<string, unknown>;
}

export interface FrontmatterParse {
  fm: Frontmatter;
  body: string;
  issues: FrontmatterIssue[];
}

export type FrontmatterIssue =
  | { kind: "parse_error"; message: string; line?: number }
  | { kind: "unknown_field"; name: string }
  | { kind: "wrong_type"; name: string; expected: string; got: string };

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

const KNOWN_FIELDS = new Set(["title", "virtual_path"]);

export function splitFrontmatter(source: string): { block: string | null; body: string } {
  const m = source.match(FM_RE);
  if (!m) return { block: null, body: source };
  return { block: m[1] ?? "", body: source.slice(m[0].length) };
}

export function parseFrontmatter(source: string): FrontmatterParse {
  const { block, body } = splitFrontmatter(source);
  const issues: FrontmatterIssue[] = [];
  if (block === null) return { fm: {}, body, issues };

  let parsed: unknown;
  try {
    parsed = parseYaml(block);
  } catch (err) {
    const msg = err instanceof YAMLParseError ? err.message : String(err);
    const line = err instanceof YAMLParseError ? err.linePos?.[0]?.line : undefined;
    issues.push({ kind: "parse_error", message: msg, line });
    return { fm: {}, body, issues };
  }

  if (parsed === null || parsed === undefined) return { fm: {}, body, issues };
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    issues.push({ kind: "parse_error", message: "frontmatter root must be a mapping" });
    return { fm: {}, body, issues };
  }

  const raw = parsed as Record<string, unknown>;
  const fm: Frontmatter = { raw };

  if ("title" in raw) {
    const v = raw.title;
    if (typeof v === "string") fm.title = v;
    else if (v !== null && v !== undefined) issues.push({ kind: "wrong_type", name: "title", expected: "string", got: typeName(v) });
  }

  if ("virtual_path" in raw) {
    const v = raw.virtual_path;
    if (typeof v === "string") fm.virtualPath = v;
    else if (v !== null && v !== undefined) issues.push({ kind: "wrong_type", name: "virtual_path", expected: "string", got: typeName(v) });
  }

  for (const key of Object.keys(raw)) {
    if (!KNOWN_FIELDS.has(key)) issues.push({ kind: "unknown_field", name: key });
  }

  return { fm, body, issues };
}

function typeName(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

export async function readFrontmatter(filePath: string): Promise<FrontmatterParse> {
  const text = await Bun.file(filePath).text();
  return parseFrontmatter(text);
}
