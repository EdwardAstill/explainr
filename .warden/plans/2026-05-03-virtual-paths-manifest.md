# Virtual Paths Manifest — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development to implement this plan task-by-task when tasks are independent. For same-session manual execution, follow this plan directly. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `.readrun/virtual-paths.yaml` manifest so authors can include/exclude whole folder trees and remap filesystem paths to a cleaner conceptual sidebar structure without touching per-file frontmatter.

**Architecture:** A new pure module `src/manifest.ts` handles YAML parsing, page filtering, and prefix-based virtualPath remapping. `buildSiteIndex()` in `siteIndex.ts` loads and applies the manifest after collecting raw pages, so every downstream consumer (nav, search, validate, wikilinks) automatically sees the filtered+remapped set. `nav.ts` currently walks the filesystem independently of `SiteIndex`; this must be fixed so that nav reflects the filtered set — `collectFiles()` is rewritten to iterate `SiteIndex.pages` instead of calling `walkContent()` again.

**Tech Stack:** TypeScript, Bun, `yaml` package (already a dep), Bun.Glob (used by existing `.ignore` logic), `bun:test`

**Recommended Skills:** `typescript`, `test-driven-development`

**Recommended MCPs:** none

**Machine plan:** 2026-05-03-virtual-paths-manifest.yaml

**Status:** approved
**Refinement passes:** 1

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/manifest.ts` | **Create** | `ManifestConfig` type, `parseManifest()`, `loadManifest()`, `applyManifestFilter()`, `applyManifestMappings()` |
| `src/manifest.test.ts` | **Create** | Unit tests for all manifest.ts exports |
| `src/siteIndex.ts` | **Modify** (lines 55–121) | Call `loadManifest` + apply filter/mappings after building raw `pages[]`; replace `pages` with filtered set in all downstream index-building code |
| `src/nav.ts` | **Modify** (lines 18–46) | Rewrite `collectFiles()` to iterate `SiteIndex.pages` instead of calling `walkContent()` directly; remove unused `walkContent` import |
| `src/watch.ts` | **Modify** (lines 37–53) | Add `.readrun/` root dir to watch paths; set `needsLinkInvalidation = true` when `virtual-paths.yaml` changes |
| `src/validate.ts` | **Modify** (lines 140–193) | Load manifest in `validateFolder()`, report parse issues, check virtual path collisions across all SiteIndex pages (including manifest-mapped ones) |
| `src/init.ts` | **Modify** (lines 14–38) | Scaffold `.readrun/virtual-paths.yaml` with commented template |

---

### Task 1: `src/manifest.ts` — types, `parseManifest()`, `loadManifest()`

**Files:**
- Create: `src/manifest.ts`
- Create: `src/manifest.test.ts`

**Invoke skill:** `typescript` before starting this task.

- [ ] **Step 1: Write the failing tests**

Create `src/manifest.test.ts`:

```typescript
import { describe, it, expect } from "bun:test";
import { parseManifest } from "./manifest";

describe("parseManifest", () => {
  it("returns empty config for null/empty YAML", () => {
    const r = parseManifest("");
    expect(r.config.include).toEqual([]);
    expect(r.config.exclude).toEqual([]);
    expect(r.config.mappings).toEqual({});
    expect(r.issues).toHaveLength(0);
  });

  it("parses include, exclude, and mappings", () => {
    const yaml = [
      "include:",
      "  - courses/**",
      "  - units/**",
      "exclude:",
      "  - docs/**",
      "mappings:",
      "  courses: Courses",
      "  units: Units",
    ].join("\n");
    const r = parseManifest(yaml);
    expect(r.config.include).toEqual(["courses/**", "units/**"]);
    expect(r.config.exclude).toEqual(["docs/**"]);
    expect(r.config.mappings).toEqual({ courses: "Courses", units: "Units" });
    expect(r.issues).toHaveLength(0);
  });

  it("emits parse_error for malformed YAML", () => {
    const r = parseManifest("include: [unterminated");
    expect(r.issues.some((i) => i.kind === "parse_error")).toBe(true);
    expect(r.config.include).toEqual([]);
  });

  it("emits wrong_type when include is not an array", () => {
    const r = parseManifest("include: not-a-list");
    expect(r.issues.some((i) => i.kind === "wrong_type" && i.field === "include")).toBe(true);
  });

  it("emits unknown_field for unrecognised keys", () => {
    const r = parseManifest("sections:\n  - home");
    expect(r.issues.some((i) => i.kind === "unknown_field" && i.field === "sections")).toBe(true);
  });

  it("emits wrong_type when a mappings value is not a string", () => {
    const r = parseManifest("mappings:\n  courses:\n    - nested: bad");
    expect(r.issues.some((i) => i.kind === "wrong_type")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test src/manifest.test.ts
```

Expected: `error: Cannot find module './manifest'`

- [ ] **Step 3: Implement `src/manifest.ts`**

```typescript
import { join } from "path";
import { parse as parseYaml, YAMLParseError } from "yaml";

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
const MANIFEST_FILENAME = "virtual-paths.yaml";

export function parseManifest(text: string): ManifestLoad {
  const issues: ManifestIssue[] = [];

  if (!text.trim()) return { config: EMPTY_CONFIG, issues };

  let parsed: unknown;
  try {
    parsed = parseYaml(text);
  } catch (err) {
    const msg = err instanceof YAMLParseError ? err.message : String(err);
    issues.push({ kind: "parse_error", message: msg });
    return { config: EMPTY_CONFIG, issues };
  }

  if (parsed === null || parsed === undefined) return { config: EMPTY_CONFIG, issues };
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    issues.push({ kind: "parse_error", message: "virtual-paths.yaml root must be a mapping" });
    return { config: EMPTY_CONFIG, issues };
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
  const manifestPath = join(contentDir, ".readrun", MANIFEST_FILENAME);
  try {
    const text = await Bun.file(manifestPath).text();
    return parseManifest(text);
  } catch {
    return { config: EMPTY_CONFIG, issues: [] };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test src/manifest.test.ts
```

Expected: all 6 tests pass, 0 failed

- [ ] **Step 5: Commit**

```bash
git add src/manifest.ts src/manifest.test.ts
git commit -m "feat(manifest): add ManifestConfig types, parseManifest, loadManifest"
```

---

### Task 2: `applyManifestFilter()` — include/exclude page filtering

**Files:**
- Modify: `src/manifest.ts` (append after `loadManifest`)
- Modify: `src/manifest.test.ts` (append new describe block)

**Invoke skill:** `typescript` before starting this task.

- [ ] **Step 1: Write the failing tests**

Append to `src/manifest.test.ts` (after the existing `describe("parseManifest")` block):

```typescript
import type { PageRecord } from "./siteIndex";
import { applyManifestFilter } from "./manifest";

function mkPage(relPath: string, virtualPath: string | null = null): PageRecord {
  const stem = relPath.replace(/\.[^.]+$/, "");
  return {
    url: "/" + stem,
    filePath: "/root/" + relPath,
    relPath,
    ext: ".md",
    title: stem,
    filename: stem.split("/").at(-1)!,
    virtualPath,
    tags: [],
    body: "",
    outboundLinks: [],
    mtimeMs: 0,
  };
}

describe("applyManifestFilter", () => {
  const pages = [
    mkPage("courses/ai/intro.md"),
    mkPage("courses/math/basics.md"),
    mkPage("docs/planning.md"),
    mkPage("wiki/notes.md"),
    mkPage("units/algebra.md"),
  ];

  it("returns all pages when include and exclude are both empty", () => {
    const r = applyManifestFilter(pages, { include: [], exclude: [], mappings: {} });
    expect(r).toHaveLength(5);
  });

  it("keeps only pages matching include patterns", () => {
    const r = applyManifestFilter(pages, { include: ["courses/**", "units/**"], exclude: [], mappings: {} });
    expect(r.map((p) => p.relPath).sort()).toEqual([
      "courses/ai/intro.md",
      "courses/math/basics.md",
      "units/algebra.md",
    ]);
  });

  it("removes pages matching exclude patterns", () => {
    const r = applyManifestFilter(pages, { include: [], exclude: ["docs/**", "wiki/**"], mappings: {} });
    expect(r.map((p) => p.relPath).sort()).toEqual([
      "courses/ai/intro.md",
      "courses/math/basics.md",
      "units/algebra.md",
    ]);
  });

  it("applies include then exclude when both are set", () => {
    const r = applyManifestFilter(pages, {
      include: ["courses/**", "units/**", "docs/**"],
      exclude: ["docs/**"],
      mappings: {},
    });
    expect(r.map((p) => p.relPath).sort()).toEqual([
      "courses/ai/intro.md",
      "courses/math/basics.md",
      "units/algebra.md",
    ]);
  });

  it("does not mutate the input array", () => {
    const original = [...pages];
    applyManifestFilter(pages, { include: ["courses/**"], exclude: [], mappings: {} });
    expect(pages).toHaveLength(original.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test src/manifest.test.ts
```

Expected: `error: applyManifestFilter is not a function` (or not exported)

- [ ] **Step 3: Implement `applyManifestFilter()` in `src/manifest.ts`**

Add after `loadManifest` export (also add `PageRecord` import at top of file):

At the top of `src/manifest.ts`, add the import:
```typescript
import type { PageRecord } from "./siteIndex";
```

Then append the function:
```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test src/manifest.test.ts
```

Expected: all tests pass (12 total — 6 from Task 1 + 5 from Task 2 + 1 for `mkPage` helper)

- [ ] **Step 5: Commit**

```bash
git add src/manifest.ts src/manifest.test.ts
git commit -m "feat(manifest): add applyManifestFilter for include/exclude page filtering"
```

---

### Task 3: `applyManifestMappings()` — prefix-based virtualPath remapping

**Files:**
- Modify: `src/manifest.ts` (append)
- Modify: `src/manifest.test.ts` (append new describe block)

**Invoke skill:** `typescript` before starting this task.

- [ ] **Step 1: Write the failing tests**

Append to `src/manifest.test.ts` (reuse `mkPage` helper from Task 2):

```typescript
import { applyManifestMappings } from "./manifest";

describe("applyManifestMappings", () => {
  it("returns pages unchanged when mappings is empty", () => {
    const pages = [mkPage("courses/ai/intro.md")];
    const r = applyManifestMappings(pages, { include: [], exclude: [], mappings: {} });
    expect(r[0]!.virtualPath).toBeNull();
  });

  it("remaps relPath prefix to virtual prefix", () => {
    const pages = [mkPage("courses/ai/intro.md")];
    const r = applyManifestMappings(pages, {
      include: [],
      exclude: [],
      mappings: { courses: "Courses" },
    });
    expect(r[0]!.virtualPath).toBe("Courses/ai/intro");
  });

  it("strips the file extension from the remapped path", () => {
    const pages = [mkPage("units/math/algebra.md")];
    const r = applyManifestMappings(pages, {
      include: [],
      exclude: [],
      mappings: { units: "Units" },
    });
    expect(r[0]!.virtualPath).toBe("Units/math/algebra");
  });

  it("frontmatter virtualPath takes precedence over manifest mapping", () => {
    const pages = [mkPage("courses/ai/intro.md", "manual/override")];
    const r = applyManifestMappings(pages, {
      include: [],
      exclude: [],
      mappings: { courses: "Courses" },
    });
    expect(r[0]!.virtualPath).toBe("manual/override");
  });

  it("mapping key with trailing slash works the same as without", () => {
    const pages = [mkPage("courses/ai/intro.md")];
    const r = applyManifestMappings(pages, {
      include: [],
      exclude: [],
      mappings: { "courses/": "Courses" },
    });
    expect(r[0]!.virtualPath).toBe("Courses/ai/intro");
  });

  it("pages not matching any mapping key are unchanged", () => {
    const pages = [mkPage("docs/planning.md")];
    const r = applyManifestMappings(pages, {
      include: [],
      exclude: [],
      mappings: { courses: "Courses" },
    });
    expect(r[0]!.virtualPath).toBeNull();
  });

  it("does not mutate input page objects", () => {
    const page = mkPage("courses/ai/intro.md");
    applyManifestMappings([page], { include: [], exclude: [], mappings: { courses: "Courses" } });
    expect(page.virtualPath).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test src/manifest.test.ts
```

Expected: `error: applyManifestMappings is not a function`

- [ ] **Step 3: Implement `applyManifestMappings()` in `src/manifest.ts`**

Append to `src/manifest.ts`:

```typescript
export function applyManifestMappings(pages: PageRecord[], config: ManifestConfig): PageRecord[] {
  if (Object.keys(config.mappings).length === 0) return pages;

  return pages.map((page) => {
    if (page.virtualPath !== null) return page;

    for (const [rawKey, virtualPrefix] of Object.entries(config.mappings)) {
      const prefix = rawKey.replace(/\/$/, "");
      if (!prefix) continue;
      const withSlash = prefix + "/";
      if (!page.relPath.startsWith(withSlash)) continue;
      const remainder = page.relPath.slice(withSlash.length).replace(/\.[^.]+$/, "");
      return { ...page, virtualPath: `${virtualPrefix}/${remainder}` };
    }

    return page;
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test src/manifest.test.ts
```

Expected: all tests pass (19 total — prior 12 + 7 new)

- [ ] **Step 5: Commit**

```bash
git add src/manifest.ts src/manifest.test.ts
git commit -m "feat(manifest): add applyManifestMappings for prefix-based virtualPath remapping"
```

---

### Task 4: Wire manifest into `buildSiteIndex()` and fix `nav.ts` to use SiteIndex

**Files:**
- Modify: `src/siteIndex.ts` (lines 55–121)
- Modify: `src/nav.ts` (lines 1–46)

**Invoke skill:** `typescript` before starting this task.

This task has a critical side-fix: `nav.ts::collectFiles()` currently calls `walkContent()` independently of the SiteIndex (line 23), so manifest filtering in the SiteIndex has zero effect on the rendered sidebar. `collectFiles()` must be rewritten to iterate `idx.pages` instead.

- [ ] **Step 1: Write the failing integration test**

Create `src/nav.test.ts`:

```typescript
import { describe, it, expect, afterEach } from "bun:test";
import { buildNavTree } from "./nav";
import { invalidateSiteIndex } from "./siteIndex";
import { mkdtemp, rm, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

async function makeTempRepo(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "rr-nav-test-"));
  for (const [rel, content] of Object.entries(files)) {
    const full = join(dir, rel);
    await mkdir(full.slice(0, full.lastIndexOf("/")), { recursive: true });
    await Bun.write(full, content);
  }
  return dir;
}

describe("buildNavTree with manifest filtering", () => {
  const dirs: string[] = [];
  afterEach(async () => {
    for (const d of dirs.splice(0)) {
      invalidateSiteIndex(d);
      await rm(d, { recursive: true, force: true });
    }
  });

  it("shows all pages when no manifest exists", async () => {
    const dir = await makeTempRepo({
      "courses/intro.md": "# Intro",
      "docs/planning.md": "# Planning",
    });
    dirs.push(dir);
    const tree = await buildNavTree(dir);
    const flat = JSON.stringify(tree);
    expect(flat).toContain("intro");
    expect(flat).toContain("planning");
  });

  it("excludes pages matching manifest exclude patterns from the nav tree", async () => {
    const dir = await makeTempRepo({
      "courses/intro.md": "# Intro",
      "docs/planning.md": "# Planning",
      ".readrun/virtual-paths.yaml": "exclude:\n  - docs/**\n",
    });
    dirs.push(dir);
    const tree = await buildNavTree(dir);
    const flat = JSON.stringify(tree);
    expect(flat).toContain("intro");
    expect(flat).not.toContain("planning");
  });

  it("remaps page positions in nav tree via manifest mappings", async () => {
    const dir = await makeTempRepo({
      "courses/intro.md": "# Intro",
      ".readrun/virtual-paths.yaml": "mappings:\n  courses: Learning\n",
    });
    dirs.push(dir);
    const tree = await buildNavTree(dir);
    const topLevelNames = tree.map((n) => n.name);
    expect(topLevelNames).toContain("Learning");
    expect(topLevelNames).not.toContain("courses");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test src/nav.test.ts
```

Expected: tests 2 and 3 FAIL — excluded pages still appear in nav, remapped pages not remapped. (Test 1 should PASS as baseline.)

- [ ] **Step 3: Wire manifest into `buildSiteIndex()` in `src/siteIndex.ts`**

Add import at top of `src/siteIndex.ts` (after the existing `import { basename }`):

```typescript
import { loadManifest, applyManifestFilter, applyManifestMappings } from "./manifest";
```

Then replace the line `return { contentDir, pages, byUrl, byKey, all, backlinks, tags, builtAt: Date.now() };` at line 121 — but first, add the manifest application block between the end of the pages-building loop (line 88) and the start of the index-building code (line 90).

The modified `buildSiteIndex()` body becomes (showing only the changed region — the loop and indexes):

After the `for await` loop closing brace (currently line 88), add:

```typescript
  // Apply site manifest: filter excluded pages, remap virtual paths.
  const { config: manifestConfig } = await loadManifest(contentDir);
  const sitePages = applyManifestMappings(
    applyManifestFilter(pages, manifestConfig),
    manifestConfig,
  );
```

Then replace every occurrence of the bare `pages` variable in the remaining code (lines 90–121) with `sitePages`:

- Line 95: `for (const p of pages)` → `for (const p of sitePages)`
- Line 111: `for (const src of pages)` → `for (const src of sitePages)`
- Line 121: `return { contentDir, pages, ...` → `return { contentDir, pages: sitePages, ...`

The final `return` line (121) becomes:
```typescript
  return { contentDir, pages: sitePages, byUrl, byKey, all, backlinks, tags, builtAt: Date.now() };
```

- [ ] **Step 4: Fix `nav.ts` `collectFiles()` to iterate `SiteIndex.pages` instead of `walkContent()`**

Replace the entire `collectFiles` function in `src/nav.ts` (lines 18–47) and update the import line (line 2):

Change import line 2 from:
```typescript
import { escapeHtml, walkContent } from "./utils";
```
to:
```typescript
import { escapeHtml } from "./utils";
```

Replace the `collectFiles` function (lines 18–47) with:

```typescript
async function collectFiles(contentDir: string): Promise<FileMeta[]> {
  const idx = await getSiteIndex(contentDir);
  const out: FileMeta[] = [];

  for (const page of idx.pages) {
    const stem = page.relPath.replace(new RegExp(`\\${page.ext}$`), "");
    const urlPath = page.url;

    if (page.ext === ".jsx") {
      const segments = stem.split("/");
      const leaf = segments[segments.length - 1] ?? basename(page.filePath, ".jsx");
      out.push({ urlPath, segments, displayName: leaf });
      continue;
    }

    const virtualPath = page.virtualPath;
    const segments = virtualPath && virtualPath.length > 0
      ? virtualPath.split("/").filter(Boolean)
      : stem.split("/");
    const leaf = segments[segments.length - 1] ?? basename(page.filePath, ".md");
    const displayName = page.title.length > 0 ? page.title : leaf;
    out.push({ urlPath, segments, displayName });
  }

  return out;
}
```

- [ ] **Step 5: Run test to verify all three tests pass**

```bash
bun test src/nav.test.ts
```

Expected: all 3 tests pass

- [ ] **Step 6: Run full test suite to confirm no regression**

```bash
bun test
```

Expected: all existing tests pass (frontmatter + manifest + nav)

- [ ] **Step 7: Commit**

```bash
git add src/siteIndex.ts src/nav.ts src/nav.test.ts
git commit -m "feat(manifest): wire manifest into buildSiteIndex; fix nav to use SiteIndex pages"
```

---

### Task 5: Watch manifest file changes in `watch.ts`

**Files:**
- Modify: `src/watch.ts` (lines 37–53, extract `shouldInvalidateOnFile` as exported helper)
- Create: `src/watch.test.ts`

**Invoke skill:** `typescript` before starting this task.

- [ ] **Step 1: Write the failing test**

Create `src/watch.test.ts`:

```typescript
import { describe, it, expect } from "bun:test";
import { shouldInvalidateOnFile } from "./watch";

describe("shouldInvalidateOnFile", () => {
  it("returns true for .md files", () => {
    expect(shouldInvalidateOnFile("notes.md")).toBe(true);
  });

  it("returns true for .jsx files", () => {
    expect(shouldInvalidateOnFile("component.jsx")).toBe(true);
  });

  it("returns true for virtual-paths.yaml", () => {
    expect(shouldInvalidateOnFile("virtual-paths.yaml")).toBe(true);
  });

  it("returns false for other files", () => {
    expect(shouldInvalidateOnFile("style.css")).toBe(false);
    expect(shouldInvalidateOnFile("config.json")).toBe(false);
  });

  it("returns false for editor temp files", () => {
    expect(shouldInvalidateOnFile("notes.md~")).toBe(false);
    expect(shouldInvalidateOnFile(".#notes.md")).toBe(false);
    expect(shouldInvalidateOnFile("notes.md.swp")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test src/watch.test.ts
```

Expected: `error: shouldInvalidateOnFile is not a function` (not yet exported)

- [ ] **Step 3: Refactor `watch.ts` — extract `shouldInvalidateOnFile`, add `.readrun/` to watch paths**

In `src/watch.ts`, add the exported helper before `startWatchServer`:

```typescript
export function shouldInvalidateOnFile(filename: string): boolean {
  if (filename.endsWith("~") || filename.startsWith(".#") || filename.endsWith(".swp")) return false;
  const ext = extname(filename).toLowerCase();
  return ext === ".md" || ext === ".jsx" || filename === "virtual-paths.yaml";
}
```

Replace the `toWatch` array (lines 37–42) with:

```typescript
  const toWatch = [
    opts.contentDir,
    join(opts.contentDir, ".readrun"),
    join(opts.contentDir, ".readrun", "scripts"),
    join(opts.contentDir, ".readrun", "images"),
    join(opts.contentDir, ".readrun", "files"),
  ];
```

Replace the watch callback body (lines 48–52) with:

```typescript
        if (!filename) return;
        if (shouldInvalidateOnFile(filename)) needsLinkInvalidation = true;
        fire();
```

Note: the old guard `if (filename.endsWith("~") || ...)` is now inside `shouldInvalidateOnFile`, but files that return `false` from it still trigger `fire()` (a content reload without index rebuild). This matches the previous behaviour.

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test src/watch.test.ts
```

Expected: all 5 tests pass

- [ ] **Step 5: Run full test suite to confirm no regression**

```bash
bun test
```

Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add src/watch.ts src/watch.test.ts
git commit -m "feat(manifest): watch .readrun/virtual-paths.yaml; extract shouldInvalidateOnFile for testability"
```

---

### Task 6: Validate manifest in `validateFolder()`

**Files:**
- Modify: `src/validate.ts` (lines 140–193)
- Modify: `src/validate.test.ts` (append 4 new `test()` calls after existing tests)

- [ ] **Step 1: Write failing tests — append to `src/validate.test.ts`**

`src/validate.test.ts` already exists with imports `{ test, expect, beforeEach, afterEach }`, a shared `tmpDir` (fresh per test via `beforeEach`/`afterEach`), and a `write(rel, content)` helper. Append these 4 tests after the last existing test (line 103):

```typescript
test("no errors when manifest is absent", async () => {
  await write("notes.md", "# Hello");
  const r = await validateFolder(tmpDir);
  expect(r.errors).toHaveLength(0);
});

test("reports error for malformed manifest YAML", async () => {
  await write("notes.md", "# Hello");
  await write(".readrun/virtual-paths.yaml", "include: [unterminated");
  const r = await validateFolder(tmpDir);
  expect(r.errors.some((e) => e.file === ".readrun/virtual-paths.yaml")).toBe(true);
});

test("reports warning for unknown manifest field", async () => {
  await write("notes.md", "# Hello");
  await write(".readrun/virtual-paths.yaml", "sections:\n  - home\n");
  const r = await validateFolder(tmpDir);
  expect(r.warnings.some((w) => w.file === ".readrun/virtual-paths.yaml")).toBe(true);
});

test("reports error for manifest-mapped virtual path collision", async () => {
  await write("courses/intro.md", "# Intro");
  await write("units/intro.md", "# Intro");
  await write(".readrun/virtual-paths.yaml", "mappings:\n  courses: Learning\n  units: Learning\n");
  const r = await validateFolder(tmpDir);
  // Both pages remap to "Learning/intro" — should report collision
  expect(r.errors.some((e) => e.message.includes("collides"))).toBe(true);
});
```

Note: no new imports needed — `test`, `expect`, `validateFolder`, `tmpDir`, and `write` are all already in scope.

- [ ] **Step 2: Run test to verify the 3 new tests fail**

```bash
bun test src/validate.test.ts
```

Expected: the 3 manifest-related tests (`malformed YAML`, `unknown field`, `manifest-mapped collision`) FAIL; existing 13 tests still PASS

- [ ] **Step 3: Add manifest validation to `validateFolder()` in `src/validate.ts`**

Add import at top of `src/validate.ts` (after the existing imports):

```typescript
import { loadManifest } from "./manifest";
```

Then, in `validateFolder()`, add the manifest validation block **before** the existing wikilink check (which starts at line 179 `invalidateSiteIndex(folderPath)`). Insert after the file-reference validation block (after line 165):

```typescript
  // Validate .readrun/virtual-paths.yaml if present.
  const { issues: manifestIssues } = await loadManifest(folderPath);
  for (const issue of manifestIssues) {
    if (issue.kind === "parse_error" || issue.kind === "wrong_type") {
      errors.push({ file: ".readrun/virtual-paths.yaml", message: issue.message });
    } else if (issue.kind === "unknown_field") {
      warnings.push({ file: ".readrun/virtual-paths.yaml", message: issue.message });
    }
  }
```

Then, after the existing `const siteIdx = await getSiteIndex(folderPath);` line (currently 181), add a virtual path collision check that covers manifest-mapped pages (not just frontmatter):

```typescript
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
```

Note: the existing per-file collision detection in `validateMdContent` (lines 57–66) remains in place for frontmatter-only validation during the content scan. The new SiteIndex-level check catches manifest-derived collisions.

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test src/validate.test.ts
```

Expected: all 4 tests pass

- [ ] **Step 5: Run full test suite**

```bash
bun test
```

Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add src/validate.ts src/validate.test.ts
git commit -m "feat(manifest): validate virtual-paths.yaml in validateFolder; detect cross-manifest collisions"
```

---

### Task 7: Scaffold `virtual-paths.yaml` in `rr init`

**Files:**
- Modify: `src/init.ts` (lines 14–38)
- Modify: `src/init.test.ts` (append 2 new `test()` calls after existing tests)

**Invoke skill:** `typescript` before starting this task.

- [ ] **Step 1: Write the failing tests — append to `src/init.test.ts`**

`src/init.test.ts` already exists with imports `{ test, expect, beforeEach, afterEach, readFile }`, a shared `tmpDir` (fresh per test via `beforeEach`/`afterEach`). Append these 2 tests after the last existing test (line 50):

```typescript
test("creates .readrun/virtual-paths.yaml on init", async () => {
  const result = await initReadrun(tmpDir);
  expect(result.created).toContain(".readrun/virtual-paths.yaml");
  const content = await readFile(join(tmpDir, ".readrun", "virtual-paths.yaml"), "utf-8");
  expect(content).toContain("include:");
  expect(content).toContain("exclude:");
  expect(content).toContain("mappings:");
});

test("reports virtual-paths.yaml as existing on second init", async () => {
  await initReadrun(tmpDir);
  const result = await initReadrun(tmpDir);
  expect(result.existing).toContain(".readrun/virtual-paths.yaml");
});
```

Note: `readFile` and `join` are already imported in `src/init.test.ts`. `tmpDir` is the shared variable already in scope. No new imports needed.

- [ ] **Step 2: Run test to verify the 2 new tests fail**

```bash
bun test src/init.test.ts
```

Expected: 2 new tests FAIL — `virtual-paths.yaml` not yet created by `initReadrun`; existing 4 tests PASS

- [ ] **Step 3: Implement manifest scaffolding in `src/init.ts`**

Add constant after `IGNORE_CONTENT` (line 12):

```typescript
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
```

In `initReadrun()`, add after the existing `.ignore` block (after line 36 `created.push(".readrun/.ignore");`):

```typescript
  const manifestPath = join(readrunDir, "virtual-paths.yaml");
  if (await pathExists(manifestPath)) {
    existing.push(".readrun/virtual-paths.yaml");
  } else {
    await Bun.write(manifestPath, MANIFEST_CONTENT);
    created.push(".readrun/virtual-paths.yaml");
  }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test src/init.test.ts
```

Expected: both tests pass

- [ ] **Step 5: Run full test suite to confirm no regression**

```bash
bun test
```

Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add src/init.ts src/init.test.ts
git commit -m "feat(manifest): scaffold virtual-paths.yaml with commented template in rr init"
```

---

### Task 8 (final): Spec Acceptance + Post-Implementation Review

**Files:**
- Modify: `.warden/specs/2026-05-03-virtual-paths-manifest-design.md` (fill Known Limitations and Post-Implementation Review blocks)

- [ ] **Step 1: Re-read the spec's Success Criteria**

Open `.warden/specs/2026-05-03-virtual-paths-manifest-design.md`. The five success criteria (spec §Success Criteria):

1. Author can keep a mixed-purpose repo.
2. Author can publish a clean learner-facing readrun site from it.
3. Author can show `courses/` and `units/` as separate learner-facing sections.
4. Author can hide internal material from the public reading experience.
5. Author can shape the sidebar around reader needs instead of raw disk layout.

- [ ] **Step 2: Run every acceptance item in one batch**

Set up a real test repo:

```bash
# Create mixed-purpose repo
mkdir -p /tmp/rr-acceptance/{courses/ai,courses/math,units/algebra,docs,wiki,preview}
echo "# AI Intro" > /tmp/rr-acceptance/courses/ai/intro.md
echo "# Math Basics" > /tmp/rr-acceptance/courses/math/basics.md
echo "# Algebra Unit" > /tmp/rr-acceptance/units/algebra/welcome.md
echo "# Planning Doc" > /tmp/rr-acceptance/docs/planning.md
echo "# Wiki Note" > /tmp/rr-acceptance/wiki/note.md
echo "# Draft" > /tmp/rr-acceptance/preview/draft.md

# Create the manifest
mkdir -p /tmp/rr-acceptance/.readrun
cat > /tmp/rr-acceptance/.readrun/virtual-paths.yaml <<'EOF'
include:
  - courses/**
  - units/**

exclude: []

mappings:
  courses: Courses
  units: Units
EOF

# Start server in background
bun src/cli.ts serve /tmp/rr-acceptance --port 9999 &
RR_PID=$!
sleep 1

# Criteria 3: courses/ and units/ appear as top-level sections
curl -s http://localhost:9999/ | grep -o '"Courses"\|"Units"\|path.*Courses\|path.*Units' | head -5

# Criteria 4: docs/, wiki/, preview/ are hidden (search index should not list them)
curl -s http://localhost:9999/_readrun/search-index.json | grep -o '"url":"[^"]*"' | grep -v "courses\|units"

# Criteria 4 (nav): sidebar HTML should not contain docs/planning or wiki/note
curl -s http://localhost:9999/ | grep -o 'href="/docs\|href="/wiki\|href="/preview' || echo "PASS: excluded paths not in nav"

# Criteria 5: Courses and Units appear as virtual top-level sections (not courses/ and units/)
curl -s http://localhost:9999/ | grep -o 'data-nav-path="/Courses\|data-nav-path="/Units' || echo "CHECK: look for Courses/Units in sidebar"

kill $RR_PID 2>/dev/null || true
```

Validate `rr validate` reports no errors:

```bash
bun src/cli.ts validate /tmp/rr-acceptance
echo "Exit code: $?"
```

Validate `rr init` creates scaffold:

```bash
bun src/cli.ts init /tmp/rr-init-final 2>&1 | grep virtual-paths
cat /tmp/rr-init-final/.readrun/virtual-paths.yaml | head -3
rm -rf /tmp/rr-init-final
```

Run the full test suite:

```bash
bun test
```

- [ ] **Step 3: Resolve every failing item**

For each ❌ item:
1. Diagnose root cause.
2. Attempt fix (up to 2-3 approaches).
3. If fixed: re-run the failing check, mark ✅.
4. If not fixable: write a `Known Limitations` entry in the spec with root cause, what was tried, why each failed.

Never leave ❌ items.

- [ ] **Step 4: Fill the Post-Implementation Review block in the spec**

In `.warden/specs/2026-05-03-virtual-paths-manifest-design.md`, add a `## Post-Implementation Review` section at the bottom:

```markdown
## Post-Implementation Review

### Acceptance Results
<!-- Paste verification output for each success criterion here -->

### Scope Drift
<!-- List every change beyond spec. Justify or revert. -->

### Refactor Proposals
<!-- Improvements noticed but not executed, with trigger conditions -->

## Known Limitations
<!-- Fill only if any acceptance criterion could not be met -->
```

- [ ] **Step 5: Surface limitations to user**

If `Known Limitations` is non-empty, summarize to the user: which acceptance items did not pass, what blocks them, suggested next step.

- [ ] **Step 6: Commit**

```bash
rm -rf /tmp/rr-acceptance /tmp/rr-init-final 2>/dev/null || true
git add .warden/specs/2026-05-03-virtual-paths-manifest-design.md
git commit -m "docs(spec): post-implementation review for virtual-paths manifest"
```

---

## Dependency Order

```
Task 1 (manifest core)
  ├─ Task 2 (filter) ─────┐
  ├─ Task 3 (mappings) ───┤
  └─ Task 7 (init) ───────┤
                           └─ Task 4 (wire siteIndex + nav) ─┐
                                                              ├─ Task 5 (watch)
                                                              └─ Task 6 (validate)
                                                                         └─ Task 8 (acceptance)
```

Tasks 2, 3, and 7 can execute in parallel after Task 1.
Task 4 requires Tasks 2 and 3.
Tasks 5 and 6 require Task 4.
Task 8 requires all prior tasks.
