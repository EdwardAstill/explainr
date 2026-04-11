# CLI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the TUI with a clean subcommand CLI and browser-based dashboard, adding `rr init` and `rr validate` commands.

**Architecture:** Rewrite `cli.ts` as a pure subcommand dispatcher. Extend `server.ts` with an optional dashboard mode (no contentDir) that serves a self-contained HTML dashboard and three API routes. New modules `init.ts` and `validate.ts` handle their respective logic independently.

**Tech Stack:** Bun, TypeScript, vanilla HTML/CSS/JS (dashboard — no bundler, no CDN), `bun:test` for tests.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/config.ts` | Modify | Add `recent: string[]` field |
| `src/utils.ts` | Modify | Add `detectRepoName()` (moved from tui.ts) |
| `src/init.ts` | Create | Scaffold `.readrun/` structure |
| `src/validate.ts` | Create | Validation logic (markdown + .readrun/ structure) |
| `src/landing.ts` | Create | Dashboard HTML string generator |
| `src/guide.ts` | Create | Architecture guide HTML string |
| `src/server.ts` | Modify | Optional contentDir, dashboard API routes |
| `src/cli.ts` | Rewrite | Subcommand dispatch, no TUI import |
| `src/tui.ts` | Delete | Removed entirely |
| `src/init.test.ts` | Create | Tests for init logic |
| `src/validate.test.ts` | Create | Tests for validation logic |

---

## Task 1: Add `recent` field to config

**Files:**
- Modify: `src/config.ts`

- [ ] **Step 1: Add `recent` to the `ReadrunConfig` interface and defaults**

In `src/config.ts`, update the interface and default:

```ts
export interface ReadrunConfig {
  shortcuts: ShortcutConfig;
  saved: SavedEntry[];
  recent: string[];           // ← add this
}

export const defaultConfig: ReadrunConfig = {
  shortcuts: { ...defaultShortcuts },
  saved: [],
  recent: [],                 // ← add this
};
```

- [ ] **Step 2: Serialize `recent` to TOML**

Add a helper and update `configToToml`:

```ts
function recentToToml(recent: string[]): string {
  if (recent.length === 0) return "";
  return recent.map(p => `[[recent]]\npath = "${escapeTomlString(p)}"`).join("\n\n") + "\n";
}

function configToToml(config: ReadrunConfig): string {
  let toml = shortcutsToToml(config.shortcuts);
  if (config.saved.length > 0) {
    toml += "\n" + savedToToml(config.saved);
  }
  if (config.recent.length > 0) {
    toml += "\n" + recentToToml(config.recent);
  }
  return toml;
}
```

- [ ] **Step 3: Deserialize `recent` from TOML**

In `loadConfig`, after the `saved` parsing block:

```ts
if (Array.isArray(parsed.recent)) {
  config.recent = parsed.recent
    .filter((e: any) => typeof e.path === "string")
    .map((e: any) => e.path as string)
    .slice(0, 5);
}
```

- [ ] **Step 4: Add `addRecent` helper function**

After `saveConfig`:

```ts
export async function addRecent(path: string): Promise<void> {
  const config = await loadConfig();
  const abs = resolve(path);
  config.recent = [abs, ...config.recent.filter(p => p !== abs)].slice(0, 5);
  await saveConfig(config);
}
```

- [ ] **Step 5: Commit**

```bash
git add src/config.ts
git commit -m "feat: add recent paths to config"
```

---

## Task 2: Move `detectRepoName` to utils.ts

**Files:**
- Modify: `src/utils.ts`

- [ ] **Step 1: Add `detectRepoName` to `src/utils.ts`**

```ts
export function detectRepoName(cwd: string): string | undefined {
  try {
    const result = Bun.spawnSync(["git", "remote", "get-url", "origin"], { cwd });
    const url = result.stdout.toString().trim();
    if (url) {
      const match = url.match(/\/([^/]+?)(?:\.git)?$/);
      if (match) {
        const name = match[1];
        if (name.endsWith(".github.io")) return undefined;
        return name;
      }
    }
  } catch {}
  return undefined;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/utils.ts
git commit -m "feat: move detectRepoName to utils"
```

---

## Task 3: `src/init.ts` with tests

**Files:**
- Create: `src/init.ts`
- Create: `src/init.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/init.test.ts`:

```ts
import { test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, stat, readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { initReadrun } from "./init";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "readrun-init-test-"));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

test("creates .readrun subdirs when none exist", async () => {
  const result = await initReadrun(tmpDir);
  for (const d of ["images", "scripts", "files"]) {
    const s = await stat(join(tmpDir, ".readrun", d));
    expect(s.isDirectory()).toBe(true);
  }
  expect(result.created).toContain(".readrun/images");
  expect(result.created).toContain(".readrun/scripts");
  expect(result.created).toContain(".readrun/files");
});

test("creates .readrun/.ignore when absent", async () => {
  await initReadrun(tmpDir);
  const content = await readFile(join(tmpDir, ".readrun", ".ignore"), "utf-8");
  expect(content).toContain("one pattern per line");
});

test("is additive — does not overwrite existing .ignore", async () => {
  const readrunDir = join(tmpDir, ".readrun");
  await Bun.write(join(readrunDir, ".ignore"), "my-custom-ignore").catch(() => {
    // dir may not exist yet
  });
  // create dir first
  await import("fs/promises").then(fs => fs.mkdir(readrunDir, { recursive: true }));
  await Bun.write(join(readrunDir, ".ignore"), "my-custom-ignore");

  const result = await initReadrun(tmpDir);
  const content = await readFile(join(readrunDir, ".ignore"), "utf-8");
  expect(content).toBe("my-custom-ignore");
  expect(result.existing).toContain(".readrun/.ignore");
});

test("reports existing dirs as already present", async () => {
  await initReadrun(tmpDir);
  const result = await initReadrun(tmpDir);
  expect(result.created).toHaveLength(0);
  expect(result.existing.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /home/eastill/projects/readrun && bun test src/init.test.ts
```

Expected: error — `./init` module not found.

- [ ] **Step 3: Implement `src/init.ts`**

```ts
import { join } from "path";
import { mkdir, writeFile, access } from "fs/promises";

export interface InitResult {
  created: string[];
  existing: string[];
}

const IGNORE_CONTENT = `# Files and folders to exclude from navigation (one pattern per line)
# Supports glob patterns, e.g.: drafts/, *.tmp
`;

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function initReadrun(targetDir: string): Promise<InitResult> {
  const created: string[] = [];
  const existing: string[] = [];

  const readrunDir = join(targetDir, ".readrun");

  for (const subdir of ["images", "scripts", "files"]) {
    const full = join(readrunDir, subdir);
    if (await exists(full)) {
      existing.push(`.readrun/${subdir}`);
    } else {
      await mkdir(full, { recursive: true });
      created.push(`.readrun/${subdir}`);
    }
  }

  const ignorePath = join(readrunDir, ".ignore");
  if (await exists(ignorePath)) {
    existing.push(".readrun/.ignore");
  } else {
    await writeFile(ignorePath, IGNORE_CONTENT);
    created.push(".readrun/.ignore");
  }

  return { created, existing };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
bun test src/init.test.ts
```

Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/init.ts src/init.test.ts
git commit -m "feat: add init module with tests"
```

---

## Task 4: `src/validate.ts` with tests

**Files:**
- Create: `src/validate.ts`
- Create: `src/validate.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/validate.test.ts`:

```ts
import { test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, mkdir, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { validateFolder, type ValidationResult } from "./validate";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "readrun-validate-test-"));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

async function write(rel: string, content: string) {
  const full = join(tmpDir, rel);
  await mkdir(join(full, ".."), { recursive: true });
  await writeFile(full, content);
}

test("clean project produces no issues", async () => {
  await write(".readrun/scripts/demo.py", "print('hello')");
  await write("index.md", "# Hello\n\n:::python\nprint('hi')\n:::\n");
  const result = await validateFolder(tmpDir);
  expect(result.errors).toHaveLength(0);
  expect(result.warnings).toHaveLength(0);
});

test("detects unclosed ::: block", async () => {
  await write("index.md", "# Hello\n\n:::python\nprint('hi')\n");
  const result = await validateFolder(tmpDir);
  expect(result.errors.some(e => e.message.includes("unclosed") && e.file === "index.md")).toBe(true);
});

test("detects unclosed fenced code block", async () => {
  await write("index.md", "# Hello\n\n```python\nprint('hi')\n");
  const result = await validateFolder(tmpDir);
  expect(result.errors.some(e => e.message.includes("unclosed") && e.file === "index.md")).toBe(true);
});

test("detects malformed heading", async () => {
  await write("index.md", "#BadHeading\n\nsome text\n");
  const result = await validateFolder(tmpDir);
  expect(result.warnings.some(w => w.message.includes("heading") && w.file === "index.md")).toBe(true);
});

test("warns on unknown block identifier", async () => {
  await write("index.md", "# Hello\n\n:::mermaid\ngraph LR\n:::\n");
  const result = await validateFolder(tmpDir);
  expect(result.warnings.some(w => w.message.includes("mermaid") && w.file === "index.md")).toBe(true);
});

test("errors on missing file reference", async () => {
  await write("index.md", "# Hello\n\n:::missing.py\n");
  const result = await validateFolder(tmpDir);
  expect(result.errors.some(e => e.message.includes("missing.py") && e.file === "index.md")).toBe(true);
});

test("resolves valid file reference in scripts/", async () => {
  await write(".readrun/scripts/plot.py", "import matplotlib");
  await write("index.md", "# Hello\n\n:::plot.py\n");
  const result = await validateFolder(tmpDir);
  expect(result.errors).toHaveLength(0);
});

test("warns on unexpected .readrun/ subdir", async () => {
  await mkdir(join(tmpDir, ".readrun", "cache"), { recursive: true });
  const result = await validateFolder(tmpDir);
  expect(result.warnings.some(w => w.message.includes("cache"))).toBe(true);
});

test("errors when scripts/ missing but refs exist", async () => {
  // no .readrun/ at all, but md references a .py file
  await write("index.md", "# Hello\n\n:::demo.py\n");
  const result = await validateFolder(tmpDir);
  expect(result.errors.some(e => e.message.includes("demo.py"))).toBe(true);
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
bun test src/validate.test.ts
```

Expected: error — `./validate` module not found.

- [ ] **Step 3: Implement `src/validate.ts`**

```ts
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
const VALID_READRUN_SUBDIRS = new Set(["images", "scripts", "files"]);

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
  scriptsDir: string,
  imagesDir: string,
  errors: Issue[],
  warnings: Issue[],
  fileRefs: Set<string>
) {
  const lines = content.split("\n");
  let inFence = false;
  let inColonBlock = false;
  let fenceLine = 0;
  let colonLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Malformed headings (e.g. #NoSpace)
    if (/^#{1,6}[^\s#]/.test(line)) {
      warnings.push({ file: relPath, line: lineNum, message: `malformed heading (missing space after #)` });
    }

    // Fenced code blocks
    if (!inColonBlock && line.startsWith("```")) {
      if (inFence) {
        inFence = false;
      } else {
        inFence = true;
        fenceLine = lineNum;
      }
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
      if (!rest) {
        // bare ::: closer when not in block — ignore
        continue;
      }
      const parts = rest.split(/\s+/);
      const identifier = parts[0];
      const modifiers = parts.slice(1);
      const validModifiers = new Set(["hidden"]);
      for (const m of modifiers) {
        if (!validModifiers.has(m)) {
          warnings.push({ file: relPath, line: lineNum, message: `unknown block modifier "${m}"` });
        }
      }

      if (VALID_IDENTIFIERS.has(identifier)) {
        inColonBlock = true;
        colonLine = lineNum;
      } else if (identifier === "upload") {
        // upload is self-closing, no block body
      } else if (identifier.includes(".")) {
        // file reference — record for resolution check
        fileRefs.add(identifier);
        // file references are self-closing (no block body), but may have a closing :::
        // treat as opening a block to be closed
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

  // Collect all file references across all md files
  const allFileRefs = new Set<string>();

  const mdFiles = await collectMdFiles(folderPath);
  for (const full of mdFiles) {
    const content = await readFile(full, "utf-8");
    const rel = full.slice(folderPath.length + 1);
    validateMdContent(rel, content, scriptsDir, imagesDir, errors, warnings, allFileRefs);
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
bun test src/validate.test.ts
```

Expected: all 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/validate.ts src/validate.test.ts
git commit -m "feat: add validate module with tests"
```

---

## Task 5: `src/landing.ts` — dashboard HTML

**Files:**
- Create: `src/landing.ts`

The dashboard is a self-contained HTML string — no bundler, no CDN. Pure vanilla JS.

- [ ] **Step 1: Create `src/landing.ts`**

```ts
export function dashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>readrun</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0d1117; color: #e6edf3; min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 48px 24px; }
  h1 { font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em; color: #58a6ff; margin-bottom: 8px; }
  .subtitle { color: #8b949e; font-size: 0.875rem; margin-bottom: 48px; }
  .container { width: 100%; max-width: 640px; display: flex; flex-direction: column; gap: 32px; }
  section h2 { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #8b949e; margin-bottom: 12px; }
  .list { display: flex; flex-direction: column; gap: 6px; }
  .item { display: flex; align-items: center; gap: 8px; background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 10px 14px; }
  .item-path { flex: 1; font-size: 0.875rem; color: #e6edf3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .item-name { font-size: 0.8rem; color: #8b949e; margin-bottom: 2px; }
  .btn { padding: 6px 14px; border-radius: 6px; font-size: 0.8rem; font-weight: 500; border: none; cursor: pointer; transition: background 0.15s; }
  .btn-primary { background: #238636; color: #fff; }
  .btn-primary:hover { background: #2ea043; }
  .btn-ghost { background: transparent; color: #8b949e; border: 1px solid #30363d; }
  .btn-ghost:hover { color: #e6edf3; border-color: #8b949e; }
  .btn-danger { background: transparent; color: #f85149; border: 1px solid #30363d; }
  .btn-danger:hover { border-color: #f85149; }
  .add-row { display: flex; gap: 8px; }
  .add-row input { flex: 1; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; padding: 8px 12px; color: #e6edf3; font-size: 0.875rem; outline: none; }
  .add-row input:focus { border-color: #58a6ff; }
  .empty { color: #8b949e; font-size: 0.875rem; padding: 12px 0; }
  .error { color: #f85149; font-size: 0.8rem; margin-top: 6px; min-height: 18px; }
</style>
</head>
<body>
<h1>readrun</h1>
<p class="subtitle">Turn Markdown folders into interactive sites</p>
<div class="container">
  <section>
    <h2>Saved</h2>
    <div class="list" id="saved-list"></div>
    <div class="add-row" style="margin-top:10px">
      <input id="add-input" type="text" placeholder="Add folder path..." />
      <button class="btn btn-ghost" onclick="addSaved()">Save</button>
    </div>
    <div class="error" id="add-error"></div>
  </section>
  <section>
    <h2>Recent</h2>
    <div class="list" id="recent-list"></div>
  </section>
  <section>
    <h2>Quick Actions</h2>
    <div class="add-row">
      <input id="open-input" type="text" placeholder="Folder or file path..." />
      <button class="btn btn-primary" onclick="openPath(document.getElementById('open-input').value.trim())">Open</button>
    </div>
    <div class="error" id="open-error"></div>
  </section>
</div>
<script>
  async function load() {
    const res = await fetch('/api/saved');
    const { saved, recent } = await res.json();
    renderList('saved-list', saved, true);
    renderList('recent-list', recent, false);
  }

  function renderList(id, paths, showRemove) {
    const el = document.getElementById(id);
    if (!paths || paths.length === 0) {
      el.innerHTML = '<p class="empty">None yet.</p>';
      return;
    }
    el.innerHTML = paths.map(p => {
      const name = p.split('/').filter(Boolean).pop() || p;
      const removeBtn = showRemove
        ? \`<button class="btn btn-danger" onclick="removeSaved('\${p.replace(/'/g, "\\\\'")}')">Remove</button>\`
        : '';
      return \`<div class="item">
        <div style="flex:1;min-width:0">
          <div class="item-name">\${name}</div>
          <div class="item-path">\${p}</div>
        </div>
        <button class="btn btn-primary" onclick="openPath('\${p.replace(/'/g, "\\\\'")}')">Open</button>
        \${removeBtn}
      </div>\`;
    }).join('');
  }

  async function openPath(path) {
    const res = await fetch('/api/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path })
    });
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    } else {
      const { error } = await res.json();
      alert(error || 'Could not open path');
    }
  }

  async function addSaved() {
    const input = document.getElementById('add-input');
    const errEl = document.getElementById('add-error');
    const path = input.value.trim();
    if (!path) return;
    const res = await fetch('/api/saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', path })
    });
    if (res.ok) {
      input.value = '';
      errEl.textContent = '';
      load();
    } else {
      const { error } = await res.json();
      errEl.textContent = error || 'Could not add path';
    }
  }

  async function removeSaved(path) {
    await fetch('/api/saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove', path })
    });
    load();
  }

  load();
</script>
</body>
</html>`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/landing.ts
git commit -m "feat: add dashboard HTML generator"
```

---

## Task 6: `src/guide.ts` — architecture guide HTML

**Files:**
- Create: `src/guide.ts`

- [ ] **Step 1: Create `src/guide.ts`**

```ts
export function guideHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>readrun guide</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0d1117; color: #e6edf3; max-width: 740px; margin: 0 auto; padding: 48px 24px; line-height: 1.7; }
  h1 { font-size: 1.75rem; font-weight: 700; color: #58a6ff; margin-bottom: 8px; }
  h2 { font-size: 1.1rem; font-weight: 600; color: #e6edf3; margin: 36px 0 12px; border-bottom: 1px solid #30363d; padding-bottom: 8px; }
  h3 { font-size: 0.95rem; font-weight: 600; color: #8b949e; margin: 20px 0 8px; text-transform: uppercase; letter-spacing: 0.06em; }
  p { margin-bottom: 12px; color: #c9d1d9; }
  code { font-family: "SF Mono", Consolas, monospace; font-size: 0.85em; background: #161b22; border: 1px solid #30363d; border-radius: 4px; padding: 2px 6px; color: #79c0ff; }
  pre { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; overflow-x: auto; margin: 12px 0 20px; }
  pre code { background: none; border: none; padding: 0; color: #e6edf3; font-size: 0.875rem; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0 20px; font-size: 0.875rem; }
  th { text-align: left; padding: 8px 12px; border-bottom: 2px solid #30363d; color: #8b949e; font-weight: 600; }
  td { padding: 8px 12px; border-bottom: 1px solid #21262d; color: #c9d1d9; }
  td:first-child { color: #79c0ff; font-family: monospace; }
  .subtitle { color: #8b949e; margin-bottom: 36px; }
</style>
</head>
<body>
<h1>readrun</h1>
<p class="subtitle">Architecture guide — how a readrun project is structured</p>

<h2>Project Structure</h2>
<pre><code>my-notes/
  index.md                    ← your content
  guides/
    setup.md
    advanced.md
  .readrun/
    scripts/                  ← code files referenced from markdown
      demo.py
      widget.jsx
    images/                   ← images referenced from markdown
      diagram.svg
    files/                    ← data files embedded in static builds
      dataset.csv
    .ignore                   ← patterns to exclude from navigation</code></pre>

<p>The <code>.readrun/</code> folder lives inside your content directory. All subdirs are optional — only create what you need.</p>

<h2>Block Syntax</h2>
<h3>Executable Python</h3>
<pre><code>:::python
import pandas as pd
df = pd.read_csv("data.csv")
print(df.head())
:::</code></pre>

<h3>JSX Components</h3>
<pre><code>:::jsx
function Counter() {
  const [n, setN] = React.useState(0);
  return &lt;button onClick={() => setN(n+1)}&gt;Clicked {n} times&lt;/button&gt;;
}
render(&lt;Counter /&gt;);
:::</code></pre>

<h3>File References</h3>
<pre><code>:::plot.py</code></pre>
<p>Loads <code>.readrun/scripts/plot.py</code> and makes it runnable. Images work the same way:</p>
<pre><code>:::diagram.svg</code></pre>
<p>Loads <code>.readrun/images/diagram.svg</code> and renders it inline.</p>

<h3>Upload Buttons</h3>
<pre><code>:::upload "Upload CSV" accept=.csv rename=data.csv</code></pre>

<h3>Hidden Blocks</h3>
<pre><code>:::python hidden
# This code is collapsed by default
print("click Show to reveal")
:::</code></pre>

<h2>Commands</h2>
<table>
  <tr><th>Command</th><th>What it does</th></tr>
  <tr><td>rr</td><td>Open browser dashboard</td></tr>
  <tr><td>rr &lt;folder|file.md&gt;</td><td>Serve a folder or file</td></tr>
  <tr><td>rr build &lt;folder&gt;</td><td>Build static site for deployment</td></tr>
  <tr><td>rr init [folder]</td><td>Scaffold .readrun/ structure</td></tr>
  <tr><td>rr validate [folder]</td><td>Validate content and structure</td></tr>
  <tr><td>rr update</td><td>Update dependencies</td></tr>
  <tr><td>rr guide</td><td>Show this guide</td></tr>
  <tr><td>rr help</td><td>Print command reference</td></tr>
</table>

<h2>.ignore Patterns</h2>
<p>Create <code>.readrun/.ignore</code> to exclude files and folders from navigation. One glob pattern per line:</p>
<pre><code>drafts/
*.tmp
private-notes.md</code></pre>
</body>
</html>`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/guide.ts
git commit -m "feat: add guide HTML"
```

---

## Task 7: Modify `src/server.ts` for dashboard mode

**Files:**
- Modify: `src/server.ts`

- [ ] **Step 1: Make `contentDir` optional in `ServerOptions`**

```ts
export interface ServerOptions {
  contentDir?: string;   // undefined = dashboard mode
  port: number;
}
```

- [ ] **Step 2: Add dashboard mode logic**

Replace the `startServer` function. Key changes: `contentDir` becomes a `let` variable; three API routes are added when in dashboard mode; normal content routes only run when `contentDir` is set.

Full updated function — replace the existing `startServer` body:

```ts
import { join, normalize, resolve, extname } from "path";
import { readFile, readdir, stat, access } from "fs/promises";
import { renderMarkdown, resolveFileReferences, extractToc } from "./markdown";
import { buildNavTree, renderNav } from "./nav";
import { htmlPage } from "./template";
import { extractTitle } from "./utils";
import { loadConfig, saveConfig, type ReadrunConfig } from "./config";
import { dashboardHtml } from "./landing";
import { guideHtml } from "./guide";

// ... (MIME map and port helpers unchanged) ...

export async function startServer(options: ServerOptions): Promise<ServerHandle> {
  const port = await findAvailablePort(options.port);
  let contentDir = options.contentDir ? normalize(resolve(options.contentDir)) : undefined;
  const isDashboard = () => contentDir === undefined;

  const config = await loadConfig();

  async function loadEmbeddedFiles(dir: string) {
    const filesDir = join(dir, ".readrun", "files");
    try {
      const entries = await readdir(filesDir);
      const files: { name: string; data: string }[] = [];
      for (const name of entries) {
        const content = await readFile(join(filesDir, name));
        files.push({ name, data: content.toString("base64") });
      }
      return files;
    } catch {
      return [];
    }
  }

  const server = Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);
      const pathname = decodeURIComponent(url.pathname);

      // --- Dashboard API routes (dashboard mode only) ---
      if (pathname === "/api/saved" && req.method === "GET" && isDashboard()) {
        const cfg = await loadConfig();
        return Response.json({ saved: cfg.saved.map(e => e.path), recent: cfg.recent });
      }

      if (pathname === "/api/saved" && req.method === "POST" && isDashboard()) {
        const { action, path: p } = await req.json() as { action: string; path: string };
        const abs = resolve(p);
        const cfg = await loadConfig();
        if (action === "add") {
          try { await access(abs); } catch {
            return Response.json({ error: `Path not found: ${abs}` }, { status: 400 });
          }
          if (!cfg.saved.find(e => e.path === abs)) {
            const { basename } = await import("path");
            cfg.saved.push({ name: basename(abs), path: abs });
            await saveConfig(cfg);
          }
          return Response.json({ ok: true });
        }
        if (action === "remove") {
          cfg.saved = cfg.saved.filter(e => e.path !== abs);
          await saveConfig(cfg);
          return Response.json({ ok: true });
        }
        return Response.json({ error: "Unknown action" }, { status: 400 });
      }

      if (pathname === "/api/open" && req.method === "POST" && isDashboard()) {
        const { path: p } = await req.json() as { path: string };
        const abs = normalize(resolve(p));
        try { await access(abs); } catch {
          return Response.json({ error: `Path not found: ${abs}` }, { status: 400 });
        }
        contentDir = abs;
        return Response.json({ url: "/" });
      }

      // --- Guide route ---
      if (pathname === "/guide") {
        return new Response(guideHtml(), { headers: { "Content-Type": "text/html; charset=utf-8" } });
      }

      // --- Dashboard mode ---
      if (isDashboard()) {
        if (pathname === "/" || pathname === "") {
          return new Response(dashboardHtml(), { headers: { "Content-Type": "text/html; charset=utf-8" } });
        }
        return new Response("Not found", { status: 404 });
      }

      // --- Content mode (existing logic, use updated contentDir) ---
      const dir = contentDir!;
      const normalizedContent = normalize(resolve(dir));
      const scriptsDir = join(dir, ".readrun", "scripts");
      const imagesDir = join(dir, ".readrun", "images");

      // Resource browser API
      if (pathname.startsWith("/api/resources/") && req.method === "GET") {
        const parts = pathname.slice("/api/resources/".length).split("/");
        const tab = parts[0];
        const tabDirs: Record<string, string> = {
          images: join(normalizedContent, ".readrun", "images"),
          files: join(normalizedContent, ".readrun", "files"),
          scripts: join(normalizedContent, ".readrun", "scripts"),
        };
        const tabDir = tabDirs[tab];
        if (!tabDir) return Response.json({ error: "Invalid tab" }, { status: 400 });

        if (parts.length === 1) {
          try {
            const entries = await readdir(tabDir).catch(() => [] as string[]);
            const files: { name: string; size: number }[] = [];
            for (const name of entries) {
              const s = await stat(join(tabDir, name)).catch(() => null);
              if (s && s.isFile()) files.push({ name, size: s.size });
            }
            return Response.json({ files });
          } catch {
            return Response.json({ files: [] });
          }
        } else {
          const fileName = parts.slice(1).join("/");
          const filePath = normalize(resolve(tabDir, fileName));
          if (!filePath.startsWith(tabDir + "/") && filePath !== tabDir) {
            return new Response("Forbidden", { status: 403 });
          }
          try {
            const file = Bun.file(filePath);
            if (!(await file.exists())) return new Response("Not found", { status: 404 });
            const ext = extname(filePath).toLowerCase();
            return new Response(file, { headers: { "Content-Type": MIME[ext] || "application/octet-stream" } });
          } catch {
            return new Response("Not found", { status: 404 });
          }
        }
      }

      let pagePath = pathname === "/" ? null : pathname.replace(/\/$/, "");
      const tree = await buildNavTree(dir);
      const embeddedFiles = await loadEmbeddedFiles(dir);

      if (!pagePath || pagePath === "/") {
        const { findFirstFile } = await import("./utils");
        const first = findFirstFile(tree);
        if (first) return new Response(null, { status: 302, headers: { Location: first } });
        return new Response("No pages found", { status: 404 });
      }

      const mdPath = join(dir, pagePath + ".md");
      try {
        const source = await readFile(mdPath, "utf-8");
        const resolved = await resolveFileReferences(source, scriptsDir, imagesDir);
        const rendered = renderMarkdown(resolved);
        const toc = extractToc(resolved);
        const nav = renderNav(tree, pagePath);
        const title = extractTitle(source, pagePath.split("/").pop() || "readrun");
        const html = htmlPage(nav, rendered, title, undefined, config, embeddedFiles, toc);
        return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
      } catch {
        return new Response("Not found", { status: 404 });
      }
    },
  });

  console.log(`readrun running at http://localhost:${port}`);
  if (contentDir) console.log(`Serving content from: ${contentDir}`);
  return { port, stop: () => server.stop() };
}
```

- [ ] **Step 3: Verify the server still starts**

```bash
cd /home/eastill/projects/readrun && bun src/cli.ts --help 2>&1 | head -5
```

Expected: no import errors (the CLI hasn't been rewritten yet but the module should import cleanly).

- [ ] **Step 4: Commit**

```bash
git add src/server.ts src/landing.ts src/guide.ts
git commit -m "feat: add dashboard mode to server"
```

---

## Task 8: Rewrite `src/cli.ts`

**Files:**
- Rewrite: `src/cli.ts`
- Delete: `src/tui.ts`

This is a full replacement. The new file has no TUI import.

- [ ] **Step 1: Write the new `src/cli.ts`**

```ts
#!/usr/bin/env bun

import { resolve, basename } from "path";
import { statSync } from "fs";
import { addRecent } from "./config";
import { detectRepoName } from "./utils";
import type { Platform } from "./build";

function openBrowser(url: string) {
  const cmd = process.platform === "darwin" ? "open"
    : process.platform === "win32" ? "start"
    : "xdg-open";
  Bun.spawn([cmd, url], { stdout: "ignore", stderr: "ignore" });
}

async function promptSelect(
  question: string,
  options: { label: string; value: string }[]
): Promise<string> {
  console.log(`\n${question}`);
  options.forEach((o, i) => console.log(`  ${i + 1}. ${o.label}`));
  process.stdout.write("\nChoice [1]: ");

  return new Promise((res) => {
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    let buf = "";
    const handler = (data: string) => {
      buf += data;
      if (buf.includes("\n") || buf.includes("\r")) {
        process.stdin.removeListener("data", handler);
        process.stdin.pause();
        const n = parseInt(buf.trim());
        const idx = Number.isFinite(n) && n >= 1 && n <= options.length ? n - 1 : 0;
        res(options[idx].value);
      }
    };
    process.stdin.on("data", handler);
  });
}

const HELP = `
readrun — turn Markdown folders into interactive sites

USAGE
  rr                          Open browser dashboard
  rr <folder|file.md>         Serve a folder or file
  rr build <folder>           Build static site
  rr init [folder]            Scaffold .readrun/ structure (default: cwd)
  rr validate [folder]        Validate content and .readrun/ structure
  rr update                   Update dependencies
  rr guide                    Open architecture guide in browser
  rr help                     Show this help
`.trim();

const SUBCOMMANDS = new Set(["build", "init", "validate", "update", "guide", "help"]);

const rawCmd = process.argv[2];
const rawArg = process.argv[3];

// --- Flags (unknown -flag → help) ---
if (rawCmd && rawCmd.startsWith("-") && rawCmd !== "--help" && rawCmd !== "-h") {
  console.error(`Unknown flag: ${rawCmd}`);
  console.error("Run rr help for usage.");
  process.exit(1);
}

// --- Help ---
if (!rawCmd || rawCmd === "help" || rawCmd === "--help" || rawCmd === "-h") {
  console.log(HELP);
  process.exit(0);
}

// --- Update ---
if (rawCmd === "update") {
  const readrunRoot = resolve(import.meta.dirname, "..");
  console.log("Installing dependencies...\n");
  const proc = Bun.spawn(["bun", "install"], { cwd: readrunRoot, stdout: "inherit", stderr: "inherit" });
  await proc.exited;
  process.exit(proc.exitCode ?? 1);
}

// --- Init ---
if (rawCmd === "init") {
  const target = rawArg ? resolve(process.cwd(), rawArg) : process.cwd();
  const { initReadrun } = await import("./init");
  const result = await initReadrun(target);
  for (const p of result.created) console.log(`  created  ${p}`);
  for (const p of result.existing) console.log(`  exists   ${p}`);
  if (result.created.length === 0) console.log("Nothing to do — .readrun/ already set up.");
  process.exit(0);
}

// --- Validate ---
if (rawCmd === "validate") {
  const target = rawArg ? resolve(process.cwd(), rawArg) : process.cwd();
  const { validateFolder } = await import("./validate");
  const result = await validateFolder(target);

  const RED = "\x1b[31m";
  const YELLOW = "\x1b[33m";
  const GREEN = "\x1b[32m";
  const RESET = "\x1b[0m";
  const DIM = "\x1b[2m";

  if (result.errors.length === 0 && result.warnings.length === 0) {
    console.log(`${GREEN}✓ No issues found${RESET}`);
    process.exit(0);
  }

  // Group issues by file
  const byFile = new Map<string, { errors: typeof result.errors; warnings: typeof result.warnings }>();
  for (const e of result.errors) {
    if (!byFile.has(e.file)) byFile.set(e.file, { errors: [], warnings: [] });
    byFile.get(e.file)!.errors.push(e);
  }
  for (const w of result.warnings) {
    if (!byFile.has(w.file)) byFile.set(w.file, { errors: [], warnings: [] });
    byFile.get(w.file)!.warnings.push(w);
  }

  for (const [file, issues] of byFile) {
    console.log(`\n${file}`);
    for (const e of issues.errors) {
      const loc = e.line ? `${DIM}line ${e.line}  ${RESET}` : "        ";
      console.log(`  ${RED}ERROR${RESET}  ${loc}${e.message}`);
    }
    for (const w of issues.warnings) {
      const loc = w.line ? `${DIM}line ${w.line}  ${RESET}` : "        ";
      console.log(`  ${YELLOW}WARN${RESET}   ${loc}${w.message}`);
    }
  }

  console.log(`\n${result.errors.length} error(s), ${result.warnings.length} warning(s)`);
  process.exit(result.errors.length > 0 ? 1 : 0);
}

// --- Build ---
if (rawCmd === "build") {
  if (!rawArg) {
    console.error("Usage: rr build <folder> [--platform=github|vercel|netlify] [--out=<dir>]");
    process.exit(1);
  }
  const contentDir = resolve(process.cwd(), rawArg);
  try { statSync(contentDir); } catch {
    console.error(`Folder not found: ${contentDir}`);
    process.exit(1);
  }

  // Parse flags
  const flags = process.argv.slice(4);
  let platform: Platform = null;
  let outDir = resolve(contentDir, "dist");

  for (const flag of flags) {
    if (flag.startsWith("--platform=")) {
      const p = flag.slice("--platform=".length);
      if (p === "github" || p === "vercel" || p === "netlify") platform = p;
    }
    if (flag.startsWith("--out=")) {
      outDir = resolve(process.cwd(), flag.slice("--out=".length));
    }
  }

  if (!platform) {
    platform = await promptSelect("Target platform?", [
      { label: "Plain (no platform config)", value: "none" },
      { label: "GitHub Pages", value: "github" },
      { label: "Vercel", value: "vercel" },
      { label: "Netlify", value: "netlify" },
    ]) as Platform;
    if (platform === ("none" as string)) platform = null;
  }

  let basePath: string | undefined;
  if (platform === "github") {
    const repoName = detectRepoName(process.cwd());
    if (repoName) basePath = "/" + repoName;
  }

  const { build } = await import("./build");
  await build({ contentDir, outDir, platform, basePath });
  process.exit(0);
}

// --- Guide ---
if (rawCmd === "guide") {
  const { startServer } = await import("./server");
  const handle = await startServer({ port: 3001 });
  openBrowser(`http://localhost:${handle.port}/guide`);
  console.log(`\nGuide open at http://localhost:${handle.port}/guide`);
  console.log("Press Ctrl+C to stop.");
  await new Promise(() => {}); // keep alive
}

// --- Unknown subcommand guard ---
if (SUBCOMMANDS.has(rawCmd)) {
  console.error(`Unknown usage of subcommand "${rawCmd}". Run rr help.`);
  process.exit(1);
}

// --- Path shortcut: rr <folder|file.md> ---
const abs = resolve(process.cwd(), rawCmd);
let stat;
try { stat = statSync(abs); } catch {
  console.error(`Not a valid path or command: ${rawCmd}`);
  console.error("Run rr help for usage.");
  process.exit(1);
}

let contentDirForDev: string;
let filePath: string | undefined;

if (stat.isDirectory()) {
  contentDirForDev = abs;
} else if (stat.isFile() && abs.endsWith(".md")) {
  contentDirForDev = resolve(abs, "..");
  filePath = abs;
} else {
  console.error(`Not a folder or .md file: ${abs}`);
  process.exit(1);
}

await addRecent(contentDirForDev);

const { startServer } = await import("./server");
const handle = await startServer({ contentDir: contentDirForDev, port: 3001 });
let openPath = "/";
if (filePath) {
  const rel = filePath.slice(contentDirForDev.length).replace(/\.md$/, "");
  openPath = rel.startsWith("/") ? rel : "/" + rel;
}
openBrowser(`http://localhost:${handle.port}${openPath}`);
console.log("\nPress Ctrl+C to stop.");
await new Promise(() => {}); // keep alive until Ctrl+C
```

- [ ] **Step 2: Handle `rr` with no args (dashboard mode)**

Add the dashboard block before the `rawCmd` variable checks. Insert this after the shebang and imports block, before `const rawCmd`:

```ts
// No args → dashboard mode
if (process.argv.length === 2) {
  const { startServer } = await import("./server");
  const handle = await startServer({ port: 3001 });
  openBrowser(`http://localhost:${handle.port}`);
  console.log(`readrun dashboard at http://localhost:${handle.port}`);
  console.log("Press Ctrl+C to stop.");
  await new Promise(() => {});
}
```

- [ ] **Step 3: Delete `src/tui.ts`**

```bash
rm /home/eastill/projects/readrun/src/tui.ts
```

- [ ] **Step 4: Run the CLI help to verify no import errors**

```bash
cd /home/eastill/projects/readrun && bun src/cli.ts help
```

Expected output:
```
readrun — turn Markdown folders into interactive sites

USAGE
  rr                          Open browser dashboard
  rr <folder|file.md>         Serve a folder or file
  rr build <folder>           Build static site
  rr init [folder]            Scaffold .readrun/ structure (default: cwd)
  rr validate [folder]        Validate content and .readrun/ structure
  rr update                   Update dependencies
  rr guide                    Open architecture guide in browser
  rr help                     Show this help
```

- [ ] **Step 5: Run the test suite to make sure existing tests still pass**

```bash
bun test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/cli.ts
git rm src/tui.ts
git commit -m "feat: rewrite cli with subcommands, remove TUI"
```

---

## Task 9: Smoke-test the full flow

- [ ] **Step 1: Test `rr init`**

```bash
cd /tmp && mkdir rr-smoke && cd rr-smoke
bun /home/eastill/projects/readrun/src/cli.ts init
```

Expected:
```
  created  .readrun/images
  created  .readrun/scripts
  created  .readrun/files
  created  .readrun/.ignore
```

Run again:
```bash
bun /home/eastill/projects/readrun/src/cli.ts init
```

Expected:
```
Nothing to do — .readrun/ already set up.
```

- [ ] **Step 2: Test `rr validate` on clean project**

```bash
echo "# Hello\n\n:::python\nprint('hi')\n:::" > /tmp/rr-smoke/index.md
bun /home/eastill/projects/readrun/src/cli.ts validate /tmp/rr-smoke
```

Expected: `✓ No issues found`

- [ ] **Step 3: Test `rr validate` detects an error**

```bash
echo "# Hello\n\n:::python\nprint('hi')" > /tmp/rr-smoke/bad.md
bun /home/eastill/projects/readrun/src/cli.ts validate /tmp/rr-smoke
echo "exit code: $?"
```

Expected: ERROR output for unclosed `:::` block, exit code 1.

- [ ] **Step 4: Test `rr` (dashboard) starts without crash**

```bash
timeout 3 bun /home/eastill/projects/readrun/src/cli.ts 2>&1 | head -3
```

Expected: `readrun dashboard at http://localhost:3001` (process killed after 3s by timeout — that's fine).

- [ ] **Step 5: Test `rr <folder>` starts server**

```bash
timeout 3 bun /home/eastill/projects/readrun/src/cli.ts /tmp/rr-smoke 2>&1 | head -3
```

Expected: `readrun running at http://localhost:3001` and `Serving content from: /tmp/rr-smoke`.

- [ ] **Step 6: Clean up smoke dir**

```bash
rm -rf /tmp/rr-smoke
```

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "chore: cli redesign complete"
```
