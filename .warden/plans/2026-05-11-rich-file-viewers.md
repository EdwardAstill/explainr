# Rich File Viewers — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development to implement this plan task-by-task when tasks are independent. For same-session manual execution, follow this plan directly. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add six embedded viewer block types — `[stl=]`, `[model=]`, `[csv=]`, `[audio=]`, `[video=]`, `[pdf=]` — that resolve files from `.readrun/files/` and render inline in Markdown pages.

**Machine plan:** 2026-05-11-rich-file-viewers.yaml

**Architecture:** New viewer HTML emitters live in `src/viewers/` and are called from `resolveFileReferences()` in `src/markdown.ts` (already async, already has access to `contentDir`). STL/GLB use a client-side Three.js viewer that lazy-loads via dynamic `import()` only when the page has a `.model-viewer` element. CSV data is embedded as JSON in a `<script type="application/json">` tag; the client reads it and powers sort/filter/pagination without network requests. Audio, video, and PDF use native HTML5 elements referencing `/_readrun/files/<path>` URLs.

**Tech Stack:** TypeScript, Bun, `three` (npm), `bun test`, `bun build --splitting`

**Recommended Skills:** `test-driven-development`, `typescript`, `verification-before-completion`

**Recommended MCPs:** none

**Status:** draft
**Refinement passes:** 0

## Assumptions

- `A1` — Files under `.readrun/files/` are served at URL `/_readrun/files/<filename>` in dev mode and copied to `dist/_readrun/files/` in static builds (confirmed from `src/server.ts:354` and `src/build.ts:37-45`).
  Type: repo-state
  Source: `src/server.ts:354`, `src/build.ts:37-45`
  Check: `grep -n "_readrun/files" src/server.ts src/build.ts`
  If false: Use the actual URL prefix from the server route.
  Owner: Task 2 (first task to generate a file URL)

- `A2` — Bun `--splitting` code-splits a dynamic `import('three')` into a separate chunk.
  Type: repo-state
  Source: Bun docs
  Check: `bun build src/client/main.ts --splitting --outdir=/tmp/rr-split-test && ls /tmp/rr-split-test/` — expect multiple `.js` files.
  If false: Use runtime `<script>` tag injection instead of dynamic import.
  Owner: Task 8

- `A3` — `three` is not yet in `package.json`; must be added before Task 8.
  Type: repo-state
  Source: deduction (not mentioned in README/existing deps)
  Check: `cat package.json | grep three`
  If false: Skip the `bun add three` step in Task 8.
  Owner: Task 8

- `A4` — `clientBundle.ts` (or the equivalent build entry) uses a `bun build` command that can accept `--splitting`.
  Type: repo-state
  Source: `src/clientBundle.ts` filename
  Check: Read `src/clientBundle.ts` before Task 8.
  If false: Adjust build command or use CDN fallback for Three.js.
  Owner: Task 8

- `A5` — `src/styles/` uses a TypeScript file (e.g. `index.ts`) that exports or imports CSS strings; new viewer styles should follow the same pattern.
  Type: repo-state
  Source: directory listing (`src/styles/base.ts`, `ui.ts`, etc.)
  Check: Read `src/styles/index.ts` before Task 9.
  If false: Follow whatever convention `src/styles/` uses.
  Owner: Task 9

---

## File Map

**New files**
| Path | Purpose |
|---|---|
| `src/viewers/pdf.ts` | Emit sandboxed iframe HTML for `[pdf=]` |
| `src/viewers/media.ts` | Emit `<audio>` / `<video>` HTML for `[audio=]` / `[video=]` |
| `src/viewers/csv.ts` | Parse CSV, embed JSON, emit table shell HTML |
| `src/viewers/model.ts` | Emit Three.js viewer shell HTML for `[stl=]` / `[model=]` |
| `src/viewers/pdf.test.ts` | Unit tests for PDF emitter |
| `src/viewers/media.test.ts` | Unit tests for media emitters |
| `src/viewers/csv.test.ts` | Unit tests for CSV parser + emitter |
| `src/viewers/model.test.ts` | Unit tests for model emitter |
| `src/client/viewers/csv.ts` | Client sort / filter / pagination |
| `src/client/viewers/model.ts` | Three.js lazy-load, STL/GLB render, OrbitControls |
| `src/styles/viewers.ts` | CSS for all viewer blocks |

**Modified files**
| Path | Change |
|---|---|
| `src/blocks.ts` | Add six names to `KNOWN_BLOCKS` and `VOID_BLOCKS` |
| `src/utils.ts` | Add MIME entries for `.stl`, `.glb`, `.gltf`, `.mp3`, `.wav`, `.ogg`, `.m4a`, `.mp4`, `.webm`, `.ogv`, `.pdf` |
| `src/markdown.ts` | Add viewer dispatch in `resolveFileReferences()` |
| `src/renderPage.ts` | Pass `filesDir` to `resolveFileReferences()` |
| `src/validate.ts` | File-existence, extension, and warning checks for all six types |
| `src/client/main.ts` | Import `./viewers/model` and `./viewers/csv` |
| `src/styles/index.ts` | Import viewer styles |

---

### Task 1: Foundation — KNOWN_BLOCKS, VOID_BLOCKS, MIME types

**Files:**
- Modify: `src/blocks.ts` (lines with `KNOWN_BLOCKS` and `VOID_BLOCKS` sets)
- Modify: `src/utils.ts` (wherever `EXT_TO_MIME` or equivalent is defined)
- Test: `src/blocks.test.ts`

**Ownership:**
- In scope: `src/blocks.ts`, `src/utils.ts`, `src/blocks.test.ts`
- Out of scope: `src/markdown.ts`, `src/validate.ts`

**Assumption refs:** none

**Invoke skill:** `@test-driven-development` before starting this task.

- [ ] **Step 1: Write the failing test**

Add to `src/blocks.test.ts`:

```ts
import { test, expect, describe } from "bun:test";
import { KNOWN_BLOCKS, VOID_BLOCKS } from "./blocks";

describe("viewer block names", () => {
  const VIEWER_NAMES = ["stl", "model", "csv", "audio", "video", "pdf"];

  for (const name of VIEWER_NAMES) {
    test(`${name} is in KNOWN_BLOCKS`, () => {
      expect(KNOWN_BLOCKS.has(name)).toBe(true);
    });
    test(`${name} is in VOID_BLOCKS`, () => {
      expect(VOID_BLOCKS.has(name)).toBe(true);
    });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test src/blocks.test.ts --reporter=verbose 2>&1 | tail -20
```

Expected: FAIL — `stl is in KNOWN_BLOCKS` fails.

- [ ] **Step 3: Add to KNOWN_BLOCKS and VOID_BLOCKS in src/blocks.ts**

Do NOT replace the set literals — add to them. The existing sets contain members that must not be removed. Find the set definitions and add the six viewer names:

```ts
// VOID_BLOCKS: add "stl", "model", "csv", "audio", "video", "pdf" alongside existing members
// KNOWN_BLOCKS: add the same six names alongside existing members
// Example: if existing VOID_BLOCKS is Set(["upload", "include"]),
// the result should be Set(["upload", "include", "stl", "model", "csv", "audio", "video", "pdf"])
// Read the file first to see the current members before editing.
```

Use the Read tool on `src/blocks.ts` to see the current set contents, then add only the new names.

- [ ] **Step 4: Add MIME entries to src/utils.ts**

Find `EXT_TO_MIME` (or equivalent map) and add:

```ts
".stl":  "model/stl",
".glb":  "model/gltf-binary",
".gltf": "model/gltf+json",
".mp3":  "audio/mpeg",
".wav":  "audio/wav",
".ogg":  "audio/ogg",
".m4a":  "audio/mp4",
".mp4":  "video/mp4",
".webm": "video/webm",
".ogv":  "video/ogg",
".pdf":  "application/pdf",
```

If no such map exists, add it or use the same pattern as existing MIME lookups in `src/utils.ts`.

- [ ] **Step 5: Run test to verify it passes**

```bash
bun test src/blocks.test.ts --reporter=verbose 2>&1 | tail -20
```

Expected: all 12 new assertions PASS.

- [ ] **Step 6: Commit**

```bash
git add src/blocks.ts src/utils.ts src/blocks.test.ts
git commit -m "feat(viewers): register viewer block names and MIME types"
```

---

### Task 2: Server PDF and media viewers

**Files:**
- Create: `src/viewers/pdf.ts`
- Create: `src/viewers/media.ts`
- Create: `src/viewers/pdf.test.ts`
- Create: `src/viewers/media.test.ts`

**Ownership:**
- In scope: `src/viewers/pdf.ts`, `src/viewers/media.ts` and their test files
- Out of scope: `src/markdown.ts` wiring (Task 5)

**Assumption refs:** `A1`

**Invoke skill:** `@test-driven-development` before starting this task.

- [ ] **Step 1: Write failing tests**

`src/viewers/pdf.test.ts`:

```ts
import { test, expect, describe } from "bun:test";
import { renderPdfViewer } from "./pdf";

describe("renderPdfViewer", () => {
  test("emits iframe with correct src", () => {
    const html = renderPdfViewer("spec.pdf", []);
    expect(html).toContain('src="/_readrun/files/spec.pdf"');
    expect(html).toContain("<iframe");
  });

  test("sandbox is allow-same-origin only", () => {
    const html = renderPdfViewer("spec.pdf", []);
    expect(html).toContain('sandbox="allow-same-origin"');
    expect(html).not.toContain("allow-scripts");
  });

  test("default height is 600", () => {
    const html = renderPdfViewer("spec.pdf", []);
    expect(html).toContain("600px");
  });

  test("custom height is clamped 300–1200", () => {
    const h200 = renderPdfViewer("doc.pdf", [{ key: "height", value: "200" }]);
    expect(h200).toContain("300px");  // clamped up
    const h9000 = renderPdfViewer("doc.pdf", [{ key: "height", value: "9000" }]);
    expect(h9000).toContain("1200px"); // clamped down
    const h700 = renderPdfViewer("doc.pdf", [{ key: "height", value: "700" }]);
    expect(h700).toContain("700px");
  });

  test("rejects path with ..", () => {
    const html = renderPdfViewer("../secrets.pdf", []);
    expect(html).toContain("rejects");
    expect(html).not.toContain("<iframe");
  });
});
```

`src/viewers/media.test.ts`:

```ts
import { test, expect, describe } from "bun:test";
import { renderAudioViewer, renderVideoViewer } from "./media";

describe("renderAudioViewer", () => {
  test("emits audio element with correct src", () => {
    const html = renderAudioViewer("talk.mp3", []);
    expect(html).toContain('src="/_readrun/files/talk.mp3"');
    expect(html).toContain("<audio");
    expect(html).toContain("controls");
  });

  test("loop attr forwarded", () => {
    const html = renderAudioViewer("talk.mp3", [{ key: "loop", value: "true" }]);
    expect(html).toContain("loop");
  });

  test("rejects path with ..", () => {
    const html = renderAudioViewer("../bad.mp3", []);
    expect(html).toContain("rejects");
    expect(html).not.toContain("<audio");
  });
});

describe("renderVideoViewer", () => {
  test("emits video element with correct src", () => {
    const html = renderVideoViewer("demo.mp4", []);
    expect(html).toContain('src="/_readrun/files/demo.mp4"');
    expect(html).toContain("<video");
    expect(html).toContain("controls");
  });

  test("height attr applied when provided", () => {
    const html = renderVideoViewer("demo.mp4", [{ key: "height", value: "360" }]);
    expect(html).toContain("360px");
  });

  test("muted attr forwarded", () => {
    const html = renderVideoViewer("demo.mp4", [{ key: "muted", value: "true" }]);
    expect(html).toContain("muted");
  });

  test("rejects path with ..", () => {
    const html = renderVideoViewer("../bad.mp4", []);
    expect(html).toContain("rejects");
    expect(html).not.toContain("<video");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun test src/viewers/pdf.test.ts src/viewers/media.test.ts 2>&1 | tail -10
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Implement src/viewers/pdf.ts**

```ts
import type { BlockAttr } from "../blocks";

function clampHeight(raw: string | true | undefined, def: number, min: number, max: number): number {
  if (typeof raw !== "string") return def;
  const n = parseInt(raw, 10);
  return isNaN(n) ? def : Math.max(min, Math.min(max, n));
}

function rejectPath(path: string): string | null {
  if (path.startsWith("/") || path.includes("..")) {
    return `<p class="viewer-error"><em>[pdf] rejects absolute or traversal paths: ${path}</em></p>`;
  }
  return null;
}

export function renderPdfViewer(src: string, attrs: BlockAttr[]): string {
  const err = rejectPath(src);
  if (err) return err;

  const heightAttr = attrs.find(a => a.key === "height")?.value;
  const height = clampHeight(heightAttr, 600, 300, 1200);
  const url = `/_readrun/files/${src}`;

  return `<div class="pdf-viewer-wrap" style="height:${height}px">` +
    `<iframe class="pdf-viewer" src="${url}" ` +
    `sandbox="allow-same-origin" ` +
    `style="width:100%;height:100%;border:none" ` +
    `title="${src}"></iframe>` +
    `</div>`;
}
```

- [ ] **Step 4: Implement src/viewers/media.ts**

```ts
import type { BlockAttr } from "../blocks";

function rejectPath(path: string, tag: string): string | null {
  if (path.startsWith("/") || path.includes("..")) {
    return `<p class="viewer-error"><em>[${tag}] rejects absolute or traversal paths: ${path}</em></p>`;
  }
  return null;
}

export function renderAudioViewer(src: string, attrs: BlockAttr[]): string {
  const err = rejectPath(src, "audio");
  if (err) return err;

  const loop = attrs.some(a => a.key === "loop" && a.value === "true");
  const autoplay = attrs.some(a => a.key === "autoplay" && a.value === "true");
  const url = `/_readrun/files/${src}`;

  const extra = [loop && "loop", autoplay && "autoplay"].filter(Boolean).join(" ");
  return `<div class="audio-viewer-wrap">` +
    `<audio class="audio-viewer" controls ${extra} src="${url}"></audio>` +
    `</div>`;
}

export function renderVideoViewer(src: string, attrs: BlockAttr[]): string {
  const err = rejectPath(src, "video");
  if (err) return err;

  const loop = attrs.some(a => a.key === "loop" && a.value === "true");
  const autoplay = attrs.some(a => a.key === "autoplay" && a.value === "true");
  const muted = attrs.some(a => a.key === "muted" && a.value === "true");
  const heightAttr = attrs.find(a => a.key === "height")?.value;
  const url = `/_readrun/files/${src}`;

  const style = heightAttr ? ` style="height:${heightAttr}px;width:100%"` : ` style="width:100%"`;
  const extra = [loop && "loop", autoplay && "autoplay", muted && "muted"].filter(Boolean).join(" ");

  return `<div class="video-viewer-wrap">` +
    `<video class="video-viewer" controls ${extra}${style} src="${url}"></video>` +
    `</div>`;
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
bun test src/viewers/pdf.test.ts src/viewers/media.test.ts --reporter=verbose 2>&1 | tail -20
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/viewers/pdf.ts src/viewers/media.ts src/viewers/pdf.test.ts src/viewers/media.test.ts
git commit -m "feat(viewers): server-side PDF and media (audio/video) emitters"
```

---

### Task 3: Server CSV viewer

**Files:**
- Create: `src/viewers/csv.ts`
- Create: `src/viewers/csv.test.ts`

**Ownership:**
- In scope: `src/viewers/csv.ts`, `src/viewers/csv.test.ts`
- Out of scope: client-side CSV table (Task 7), markdown wiring (Task 5)

**Invoke skill:** `@test-driven-development` before starting this task.

- [ ] **Step 1: Write failing tests**

`src/viewers/csv.test.ts`:

```ts
import { test, expect, describe } from "bun:test";
import { parseCSV, renderCsvViewer } from "./csv";

describe("parseCSV", () => {
  test("parses headers and rows", () => {
    const result = parseCSV("name,value\nAlpha,1240\nBeta,875");
    expect(result.headers).toEqual(["name", "value"]);
    expect(result.rows).toEqual([["Alpha", "1240"], ["Beta", "875"]]);
  });

  test("handles quoted fields with commas", () => {
    const result = parseCSV('a,b\n"hello, world",42');
    expect(result.rows[0]).toEqual(["hello, world", "42"]);
  });

  test("handles escaped quotes inside quoted fields", () => {
    const result = parseCSV('a\n"say ""hi"""');
    expect(result.rows[0]).toEqual(['say "hi"']);
  });

  test("returns empty rows and headers for empty string", () => {
    const result = parseCSV("");
    expect(result.headers).toEqual([]);
    expect(result.rows).toEqual([]);
  });

  test("single-row CSV is treated as headers only", () => {
    const result = parseCSV("name,value");
    expect(result.headers).toEqual(["name", "value"]);
    expect(result.rows).toEqual([]);
  });
});

describe("renderCsvViewer", () => {
  test("embeds headers and rows as JSON", () => {
    const html = renderCsvViewer("name,value\nAlpha,1240\nBeta,875", "results.csv", []);
    const scriptMatch = html.match(/<script type="application\/json"[^>]*>([\s\S]*?)<\/script>/);
    expect(scriptMatch).not.toBeNull();
    const data = JSON.parse(scriptMatch![1]!);
    expect(data.headers).toEqual(["name", "value"]);
    expect(data.rows[0]).toEqual(["Alpha", "1240"]);
  });

  test("uses csv-viewer class with data-rows attr", () => {
    const html = renderCsvViewer("h1,h2\n1,2", "test.csv", []);
    expect(html).toContain('class="csv-viewer"');
    expect(html).toContain("data-rows=");
  });

  test("rejects path traversal from src (used in error context)", () => {
    // renderCsvViewer receives already-read content; path validation happens in caller
    // This test verifies the function does not embed the raw path as executable content
    const html = renderCsvViewer("h\n1", "../secret.csv", []);
    expect(html).not.toContain("<script src");
  });

  test("escapes </script in JSON content", () => {
    const html = renderCsvViewer('col\n</script>', "x.csv", []);
    expect(html).not.toContain("</script>");  // must be escaped
    expect(html).toContain("<\\/script");
  });

  test("default rows attr is 100", () => {
    const html = renderCsvViewer("h\n1", "x.csv", []);
    expect(html).toContain('data-rows="100"');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun test src/viewers/csv.test.ts 2>&1 | tail -10
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement src/viewers/csv.ts**

```ts
import type { BlockAttr } from "../blocks";

export interface CsvData {
  headers: string[];
  rows: string[][];
}

export function parseCSV(content: string): CsvData {
  const lines = content.split(/\r?\n/);
  const nonEmpty = lines.filter(l => l.trim() !== "");
  if (nonEmpty.length === 0) return { headers: [], rows: [] };

  const headers = parseLine(nonEmpty[0]!);
  const rows = nonEmpty.slice(1).map(parseLine);
  return { headers, rows };
}

function parseLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      // Quoted field
      i++;
      let field = "";
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') {
          field += '"';
          i += 2;
        } else if (line[i] === '"') {
          i++;
          break;
        } else {
          field += line[i++];
        }
      }
      fields.push(field);
      if (line[i] === ",") i++;
    } else {
      const end = line.indexOf(",", i);
      if (end === -1) {
        fields.push(line.slice(i).trim());
        break;
      }
      fields.push(line.slice(i, end).trim());
      i = end + 1;
    }
  }
  return fields;
}

export function renderCsvViewer(content: string, filename: string, attrs: BlockAttr[]): string {
  const data = parseCSV(content);
  const rowsAttr = attrs.find(a => a.key === "rows")?.value;
  const maxRows = typeof rowsAttr === "string" ? parseInt(rowsAttr, 10) || 100 : 100;
  const filter = attrs.find(a => a.key === "filter")?.value !== "false";
  const heightAttr = attrs.find(a => a.key === "height")?.value;
  const height = typeof heightAttr === "string" ? Math.max(200, Math.min(1000, parseInt(heightAttr, 10) || 400)) : 400;

  const id = `csv-${Math.random().toString(36).slice(2, 8)}`;
  const json = JSON.stringify(data).replace(/<\/script/gi, "<\\/script");

  return `<div class="csv-viewer" data-csv-id="${id}" data-rows="${maxRows}" data-filter="${filter}" style="height:${height}px">` +
    `<div class="csv-toolbar">${filter ? `<input class="csv-filter" type="text" placeholder="Filter rows…" aria-label="Filter rows">` : ""}</div>` +
    `<div class="csv-table-wrap"><table class="csv-table"></table></div>` +
    `<div class="csv-pagination"></div>` +
    `</div>` +
    `\n<script type="application/json" id="csv-data-${id}">${json}</script>`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun test src/viewers/csv.test.ts --reporter=verbose 2>&1 | tail -20
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/viewers/csv.ts src/viewers/csv.test.ts
git commit -m "feat(viewers): server-side CSV parser and table shell emitter"
```

---

### Task 4: Server model viewer (STL / GLTF/GLB)

**Files:**
- Create: `src/viewers/model.ts`
- Create: `src/viewers/model.test.ts`

**Ownership:**
- In scope: `src/viewers/model.ts`, `src/viewers/model.test.ts`
- Out of scope: Three.js client code (Task 8), markdown wiring (Task 5)

**Invoke skill:** `@test-driven-development` before starting this task.

- [ ] **Step 1: Write failing tests**

`src/viewers/model.test.ts`:

```ts
import { test, expect, describe } from "bun:test";
import { renderModelViewer } from "./model";

describe("renderModelViewer", () => {
  test("emits model-viewer div with data-src", () => {
    const html = renderModelViewer("bracket.stl", "stl", []);
    expect(html).toContain('class="model-viewer"');
    expect(html).toContain('data-src="/_readrun/files/bracket.stl"');
    expect(html).toContain('data-format="stl"');
  });

  test("works for glb format", () => {
    const html = renderModelViewer("scene.glb", "model", []);
    expect(html).toContain('data-src="/_readrun/files/scene.glb"');
    expect(html).toContain('data-format="glb"');
  });

  test("works for gltf format", () => {
    const html = renderModelViewer("scene.gltf", "model", []);
    expect(html).toContain('data-format="gltf"');
  });

  test("default height is 480", () => {
    const html = renderModelViewer("m.stl", "stl", []);
    expect(html).toContain("480px");
  });

  test("height attr clamped 240–1200", () => {
    const low = renderModelViewer("m.stl", "stl", [{ key: "height", value: "100" }]);
    expect(low).toContain("240px");
    const high = renderModelViewer("m.stl", "stl", [{ key: "height", value: "9999" }]);
    expect(high).toContain("1200px");
  });

  test("controls=false sets data-controls=false", () => {
    const html = renderModelViewer("m.stl", "stl", [{ key: "controls", value: "false" }]);
    expect(html).toContain('data-controls="false"');
  });

  test("default controls is true", () => {
    const html = renderModelViewer("m.stl", "stl", []);
    expect(html).toContain('data-controls="true"');
  });

  test("rejects path with ..", () => {
    const html = renderModelViewer("../evil.stl", "stl", []);
    expect(html).toContain("rejects");
    expect(html).not.toContain("model-viewer");
  });

  test("rejects absolute path", () => {
    const html = renderModelViewer("/etc/passwd", "stl", []);
    expect(html).toContain("rejects");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun test src/viewers/model.test.ts 2>&1 | tail -10
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement src/viewers/model.ts**

```ts
import type { BlockAttr } from "../blocks";

type ModelFormat = "stl" | "glb" | "gltf";

function detectFormat(filename: string): ModelFormat {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  if (ext === ".glb") return "glb";
  if (ext === ".gltf") return "gltf";
  return "stl";
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function renderModelViewer(src: string, _blockName: string, attrs: BlockAttr[]): string {
  if (src.startsWith("/") || src.includes("..")) {
    return `<p class="viewer-error"><em>[model/stl] rejects absolute or traversal paths: ${src}</em></p>`;
  }

  const format = detectFormat(src);
  const heightAttr = attrs.find(a => a.key === "height")?.value;
  const height = typeof heightAttr === "string" ? clamp(parseInt(heightAttr, 10) || 480, 240, 1200) : 480;
  const controls = attrs.find(a => a.key === "controls")?.value !== "false";
  const url = `/_readrun/files/${src}`;

  return `<div class="model-viewer" ` +
    `data-src="${url}" ` +
    `data-format="${format}" ` +
    `data-controls="${controls}" ` +
    `style="height:${height}px">` +
    `<canvas class="model-canvas" style="width:100%;height:100%"></canvas>` +
    `<div class="model-error" hidden></div>` +
    `</div>`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun test src/viewers/model.test.ts --reporter=verbose 2>&1 | tail -20
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/viewers/model.ts src/viewers/model.test.ts
git commit -m "feat(viewers): server-side STL/GLTF model viewer HTML emitter"
```

---

### Task 5: Wire viewers in resolveFileReferences

**Files:**
- Modify: `src/markdown.ts` (function `resolveFileReferences`, around line 262)
- Modify: `src/renderPage.ts` (line 48 — the `resolveFileReferences` call)

**Ownership:**
- In scope: viewer dispatch logic in `resolveFileReferences`, signature change in `renderPage.ts`
- Out of scope: `src/viewers/*.ts` (Tasks 2–4), validate.ts (Task 6)

**Assumption refs:** `A1`

- [ ] **Step 1: Write failing integration test**

Add to `src/markdown.test.ts` (look for the existing test file or create it):

```ts
import { test, expect, describe } from "bun:test";
import { resolveFileReferences } from "./markdown";
import { mkdtemp, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

describe("resolveFileReferences — viewer blocks", () => {
  async function makeContentDir(files: Record<string, string>): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), "rr-test-"));
    const filesDir = join(dir, ".readrun", "files");
    await mkdir(filesDir, { recursive: true });
    for (const [name, content] of Object.entries(files)) {
      await writeFile(join(filesDir, name), content);
    }
    const scriptsDir = join(dir, ".readrun", "scripts");
    const imagesDir = join(dir, ".readrun", "images");
    await mkdir(scriptsDir, { recursive: true });
    await mkdir(imagesDir, { recursive: true });
    return dir;
  }

  test("[pdf=doc.pdf] resolves to iframe HTML", async () => {
    const contentDir = await makeContentDir({ "doc.pdf": "%PDF-1.4" });
    const source = "[pdf=doc.pdf]";
    const scriptsDir = join(contentDir, ".readrun", "scripts");
    const imagesDir = join(contentDir, ".readrun", "images");
    const result = await resolveFileReferences(source, scriptsDir, imagesDir, contentDir);
    expect(result).toContain("<iframe");
    expect(result).toContain("/_readrun/files/doc.pdf");
  });

  test("[audio=talk.mp3] resolves to audio element", async () => {
    const contentDir = await makeContentDir({ "talk.mp3": "fake-mp3" });
    const scriptsDir = join(contentDir, ".readrun", "scripts");
    const imagesDir = join(contentDir, ".readrun", "images");
    const result = await resolveFileReferences("[audio=talk.mp3]", scriptsDir, imagesDir, contentDir);
    expect(result).toContain("<audio");
  });

  test("[video=demo.mp4] resolves to video element", async () => {
    const contentDir = await makeContentDir({ "demo.mp4": "fake-mp4" });
    const scriptsDir = join(contentDir, ".readrun", "scripts");
    const imagesDir = join(contentDir, ".readrun", "images");
    const result = await resolveFileReferences("[video=demo.mp4]", scriptsDir, imagesDir, contentDir);
    expect(result).toContain("<video");
  });

  test("[stl=bracket.stl] resolves to model-viewer div", async () => {
    const contentDir = await makeContentDir({ "bracket.stl": "solid\nendsolid" });
    const scriptsDir = join(contentDir, ".readrun", "scripts");
    const imagesDir = join(contentDir, ".readrun", "images");
    const result = await resolveFileReferences("[stl=bracket.stl]", scriptsDir, imagesDir, contentDir);
    expect(result).toContain('class="model-viewer"');
    expect(result).toContain('data-format="stl"');
  });

  test("[model=scene.glb] resolves to model-viewer div", async () => {
    const contentDir = await makeContentDir({ "scene.glb": "glTF" });
    const scriptsDir = join(contentDir, ".readrun", "scripts");
    const imagesDir = join(contentDir, ".readrun", "images");
    const result = await resolveFileReferences("[model=scene.glb]", scriptsDir, imagesDir, contentDir);
    expect(result).toContain('class="model-viewer"');
    expect(result).toContain('data-format="glb"');
  });

  test("[csv=data.csv] resolves to csv-viewer with embedded JSON", async () => {
    const contentDir = await makeContentDir({ "data.csv": "name,value\nAlpha,1240" });
    const scriptsDir = join(contentDir, ".readrun", "scripts");
    const imagesDir = join(contentDir, ".readrun", "images");
    const result = await resolveFileReferences("[csv=data.csv]", scriptsDir, imagesDir, contentDir);
    expect(result).toContain('class="csv-viewer"');
    expect(result).toContain('"headers":["name","value"]');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test src/markdown.test.ts 2>&1 | grep -E "PASS|FAIL|Error" | tail -10
```

Expected: FAIL — viewer blocks not resolved.

- [ ] **Step 3: Add viewer dispatch to resolveFileReferences in src/markdown.ts**

Imports to add at the top of `src/markdown.ts`:

```ts
import { renderPdfViewer } from "./viewers/pdf";
import { renderAudioViewer, renderVideoViewer } from "./viewers/media";
import { renderCsvViewer, parseCSV } from "./viewers/csv";
import { renderModelViewer } from "./viewers/model";
```

In `resolveFileReferences()`, after the image-extension check and before `if (!EXEC_LANG_NAMES.has(name)) continue;`, add:

```ts
const VIEWER_BLOCKS = new Set(["stl", "model", "csv", "audio", "video", "pdf"]);

if (VIEWER_BLOCKS.has(name)) {
  const filePath = path.startsWith("/") || path.includes("..") ? null
    : contentDir ? join(contentDir, ".readrun", "files", path) : null;

  let viewerHtml: string;

  if (name === "csv") {
    if (!filePath) {
      viewerHtml = `<p class="viewer-error"><em>[csv] rejects invalid path: ${path}</em></p>`;
    } else {
      let content = "";
      try {
        content = await Bun.file(filePath).text();
      } catch {
        viewerHtml = `<p class="viewer-error"><em>[csv] file not found: ${path}</em></p>`;
        replacements.push({ start, end, text: viewerHtml });
        continue;
      }
      viewerHtml = renderCsvViewer(content, path, parseAttrs(flagStr));
    }
  } else if (name === "stl" || name === "model") {
    viewerHtml = renderModelViewer(path, name, parseAttrs(flagStr));
  } else if (name === "audio") {
    viewerHtml = renderAudioViewer(path, parseAttrs(flagStr));
  } else if (name === "video") {
    viewerHtml = renderVideoViewer(path, parseAttrs(flagStr));
  } else {
    viewerHtml = renderPdfViewer(path, parseAttrs(flagStr));
  }

  replacements.push({ start, end, text: viewerHtml });
  continue;
}
```

`parseAttrs` is already exported from `src/blocks.ts` and does exactly this. Import it and call it on `flagStr`:

```ts
import { parse, getAttr, hasAttr, parseAttrs } from "./blocks";
// ...
viewerHtml = renderPdfViewer(path, parseAttrs(flagStr));
```

Do not create a new helper — `parseAttrs(flagStr)` from `src/blocks.ts` is the correct call.

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun test src/markdown.test.ts --reporter=verbose 2>&1 | tail -20
```

Expected: all new viewer dispatch tests PASS.

- [ ] **Step 5: Run full test suite to check regressions**

```bash
bun test 2>&1 | tail -20
```

Expected: all previously passing tests still PASS.

- [ ] **Step 6: Commit**

```bash
git add src/markdown.ts
git commit -m "feat(viewers): wire viewer blocks into resolveFileReferences"
```

---

### Task 6: Validation rules

**Files:**
- Modify: `src/validate.ts`
- Modify: `src/validate.test.ts`

**Ownership:**
- In scope: file-existence, extension, and warning checks for the six new block types
- Out of scope: rendering logic

**Invoke skill:** `@test-driven-development` before starting this task.

- [ ] **Step 1: Write failing tests**

Add to `src/validate.test.ts` (find the existing test file — if using `validateFolder`, you need a temp dir):

```ts
import { test, expect, describe } from "bun:test";
import { validateFolder } from "./validate";
import { mkdtemp, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

async function makeFolder(pages: Record<string, string>, files: string[] = []): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "rr-validate-"));
  const filesDir = join(dir, ".readrun", "files");
  await mkdir(filesDir, { recursive: true });
  await mkdir(join(dir, ".readrun", "scripts"), { recursive: true });
  await mkdir(join(dir, ".readrun", "images"), { recursive: true });
  for (const [name, content] of Object.entries(pages)) {
    await writeFile(join(dir, name), content);
  }
  for (const f of files) {
    await writeFile(join(filesDir, f), "placeholder");
  }
  return dir;
}

describe("viewer block validation", () => {
  test("error: [stl=missing.stl] file not found", async () => {
    const dir = await makeFolder({ "page.md": "[stl=missing.stl]" });
    const result = await validateFolder(dir);
    expect(result.errors.some(e => e.message.includes("missing.stl"))).toBe(true);
  });

  test("no error: [stl=bracket.stl] file exists", async () => {
    const dir = await makeFolder({ "page.md": "[stl=bracket.stl]" }, ["bracket.stl"]);
    const result = await validateFolder(dir);
    const stlErrors = result.errors.filter(e => e.message.includes("bracket.stl"));
    expect(stlErrors).toHaveLength(0);
  });

  test("error: [stl=doc.pdf] wrong extension for stl block", async () => {
    const dir = await makeFolder({ "page.md": "[stl=doc.pdf]" }, ["doc.pdf"]);
    const result = await validateFolder(dir);
    expect(result.errors.some(e => e.message.includes("doc.pdf") && e.message.includes("extension"))).toBe(true);
  });

  test("error: [model=missing.glb] file not found", async () => {
    const dir = await makeFolder({ "page.md": "[model=missing.glb]" });
    const result = await validateFolder(dir);
    expect(result.errors.some(e => e.message.includes("missing.glb"))).toBe(true);
  });

  test("error: [csv=missing.csv] file not found", async () => {
    const dir = await makeFolder({ "page.md": "[csv=missing.csv]" });
    const result = await validateFolder(dir);
    expect(result.errors.some(e => e.message.includes("missing.csv"))).toBe(true);
  });

  test("error: [audio=track.mp3] file not found", async () => {
    const dir = await makeFolder({ "page.md": "[audio=track.mp3]" });
    const result = await validateFolder(dir);
    expect(result.errors.some(e => e.message.includes("track.mp3"))).toBe(true);
  });

  test("error: [video=demo.mp4] file not found", async () => {
    const dir = await makeFolder({ "page.md": "[video=demo.mp4]" });
    const result = await validateFolder(dir);
    expect(result.errors.some(e => e.message.includes("demo.mp4"))).toBe(true);
  });

  test("error: [pdf=spec.pdf] file not found", async () => {
    const dir = await makeFolder({ "page.md": "[pdf=spec.pdf]" });
    const result = await validateFolder(dir);
    expect(result.errors.some(e => e.message.includes("spec.pdf"))).toBe(true);
  });

  test("warning: [video=demo.mp4 autoplay=true] without muted", async () => {
    const dir = await makeFolder({ "page.md": "[video=demo.mp4 autoplay=true]" }, ["demo.mp4"]);
    const result = await validateFolder(dir);
    expect(result.warnings.some(w => w.message.includes("muted") && w.message.includes("autoplay"))).toBe(true);
  });

  test("no warning: [video=demo.mp4 autoplay=true muted=true]", async () => {
    const dir = await makeFolder({ "page.md": "[video=demo.mp4 autoplay=true muted=true]" }, ["demo.mp4"]);
    const result = await validateFolder(dir);
    const autoplayWarnings = result.warnings.filter(w => w.message.includes("autoplay"));
    expect(autoplayWarnings).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun test src/validate.test.ts 2>&1 | grep -E "PASS|FAIL" | tail -15
```

Expected: new viewer validation tests FAIL.

- [ ] **Step 3: Implement validate.ts viewer checks**

**Critical context (read before coding):**

The existing `allFileRefs` set in `validateFolder` only checks `.readrun/scripts/` and `.readrun/images/` — not `.readrun/files/`. Viewer block refs land in `allFileRefs` after Task 1 (since they're in `VOID_BLOCKS`), but the existing resolution loop at `src/validate.ts:149-151` would report them as errors because it only looks in scripts/images.

**Critical one-line fix before anything else:**

In `validateMdContent`, the existing condition at approximately line 104 of `validate.ts` is:

```ts
if (refPath.includes(".") && name !== "include") fileRefs.add(refPath);
```

Viewer block paths will fall into `fileRefs` after Task 1 adds them to `VOID_BLOCKS`. The existing `validateFolder` resolver then looks for them in `.readrun/scripts/` and `.readrun/images/` — which will always emit a false-positive error. **Change this line to exclude viewer names:**

```ts
if (refPath.includes(".") && name !== "include" && !VIEWER_NAMES.has(name)) fileRefs.add(refPath);
```

Define `VIEWER_NAMES` at the top of `validate.ts`:

```ts
const VIEWER_NAMES = new Set(["stl", "model", "csv", "audio", "video", "pdf"]);
```

Do this fix first, before adding the new viewerRefs collection below.

**Implementation approach — add a separate `viewerRefs` collection:**

In `validateMdContent`, add a second regex pass dedicated to viewer blocks. Add a `viewerRefs: { name: string; path: string; line: number }[]` parameter (or accumulate into the caller's list). The existing `bracketRe` at line 58 captures only `name`, `close`, and `src` — it does NOT capture attrs. You need a separate regex that also captures the attrs string for the autoplay/muted warning:

```ts
const VIEWER_NAMES = new Set(["stl", "model", "csv", "audio", "video", "pdf"]);

const VIEWER_EXTENSIONS: Record<string, string[]> = {
  stl:   [".stl"],
  model: [".glb", ".gltf"],
  csv:   [".csv"],
  audio: [".mp3", ".wav", ".ogg", ".m4a"],
  video: [".mp4", ".webm", ".ogv"],
  pdf:   [".pdf"],
};

// In the line-by-line loop of validateMdContent, add this check
// AFTER the existing bracketRe match:
const viewerRe = /^\s*\[(?<name>[A-Za-z][A-Za-z0-9-]*)=(?<path>[^\s\]"]+)(?<attrs>[^\]]*)\]\s*$/;
const vm = viewerRe.exec(line);
if (vm && VIEWER_NAMES.has(vm.groups!.name!)) {
  const name = vm.groups!.name!;
  const path = vm.groups!.path!;
  const attrs = vm.groups!.attrs ?? "";

  // Queue for file-existence check after content walk (include relPath for error reporting)
  viewerRefs.push({ name, path, line: lineNum, file: relPath });

  // Autoplay/muted warning — can check attrs directly since we captured them
  if (name === "video") {
    const hasAutoplay = /\bautoplay=true\b/.test(attrs);
    const hasMuted = /\bmuted=true\b/.test(attrs);
    if (hasAutoplay && !hasMuted) {
      warnings.push({ file: relPath, line: lineNum,
        message: `[video] autoplay=true without muted=true — browsers block unmuted autoplay` });
    }
  }
}
```

In `validateFolder`, after the content walk, add a file-existence + extension check against `.readrun/files/`:

```ts
const filesDir = join(folderPath, ".readrun", "files");

// allViewerRefs entries carry { name, path, line, file } — file = source .md relPath
for (const { name, path, line, file } of allViewerRefs) {
  // Extension check
  const ext = path.slice(path.lastIndexOf(".")).toLowerCase();
  const allowed = VIEWER_EXTENSIONS[name];
  if (allowed && !allowed.includes(ext)) {
    errors.push({ file, line,
      message: `[${name}=${path}] wrong extension "${ext}" — expected one of: ${allowed.join(", ")}` });
    continue;
  }
  // File existence check in .readrun/files/
  if (path.startsWith("/") || path.includes("..")) continue; // already caught by parser
  const filePath = join(filesDir, path);
  try {
    await stat(filePath);
  } catch {
    errors.push({ file, line,
      message: `[${name}=${path}] file not found in .readrun/files/` });
  }
}
```

Accumulate `allViewerRefs` across all markdown files, similar to how `allFileRefs` is accumulated today.

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun test src/validate.test.ts --reporter=verbose 2>&1 | tail -25
```

Expected: all new tests PASS; existing validate tests still PASS.

- [ ] **Step 5: Commit**

```bash
git add src/validate.ts src/validate.test.ts
git commit -m "feat(viewers): validate file-existence, extensions, and autoplay warning"
```

---

### Task 7: Client CSV table

**Files:**
- Create: `src/client/viewers/csv.ts`

**Ownership:**
- In scope: `src/client/viewers/csv.ts` — sort, filter, pagination, DOM rendering
- Out of scope: `src/client/main.ts` wiring (Task 10), styles (Task 9)

- [ ] **Step 1: Write failing test**

Create `src/client/viewers/csv.test.ts`:

```ts
import { test, expect, describe, beforeEach } from "bun:test";

// Mock DOM for testing without a browser
// If Bun's test runner doesn't include jsdom, use a simple in-memory check
// that the module exports the right functions.

import { sortRows, filterRows, paginateRows } from "./csv";

describe("sortRows", () => {
  const rows = [["Beta", "875"], ["Alpha", "1240"], ["Gamma", "2104"]];

  test("sorts ascending by column index", () => {
    const sorted = sortRows(rows, 0, "asc");
    expect(sorted[0]![0]).toBe("Alpha");
    expect(sorted[2]![0]).toBe("Gamma");
  });

  test("sorts descending by column index", () => {
    const sorted = sortRows(rows, 0, "desc");
    expect(sorted[0]![0]).toBe("Gamma");
  });

  test("numeric sort when all values are numbers", () => {
    const numRows = [["30"], ["9"], ["100"]];
    const sorted = sortRows(numRows, 0, "asc");
    expect(sorted[0]![0]).toBe("9");
    expect(sorted[2]![0]).toBe("100");
  });
});

describe("filterRows", () => {
  const rows = [["Alpha", "sensors"], ["Beta", "motors"], ["Gamma", "sensors"]];

  test("returns rows matching filter string (case-insensitive)", () => {
    const result = filterRows(rows, "sensor");
    expect(result).toHaveLength(2);
  });

  test("empty filter returns all rows", () => {
    const result = filterRows(rows, "");
    expect(result).toHaveLength(3);
  });
});

describe("paginateRows", () => {
  const rows = Array.from({ length: 25 }, (_, i) => [`row${i}`]);

  test("returns first page of 10", () => {
    const result = paginateRows(rows, 0, 10);
    expect(result).toHaveLength(10);
    expect(result[0]![0]).toBe("row0");
  });

  test("returns correct second page", () => {
    const result = paginateRows(rows, 1, 10);
    expect(result[0]![0]).toBe("row10");
  });

  test("last page has remaining rows", () => {
    const result = paginateRows(rows, 2, 10);
    expect(result).toHaveLength(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test src/client/viewers/csv.test.ts 2>&1 | tail -10
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement src/client/viewers/csv.ts**

```ts
export function sortRows(rows: string[][], col: number, dir: "asc" | "desc"): string[][] {
  const numeric = rows.every(r => !isNaN(parseFloat(r[col] ?? "")));
  return [...rows].sort((a, b) => {
    const av = a[col] ?? "";
    const bv = b[col] ?? "";
    const cmp = numeric ? parseFloat(av) - parseFloat(bv) : av.localeCompare(bv);
    return dir === "asc" ? cmp : -cmp;
  });
}

export function filterRows(rows: string[][], query: string): string[][] {
  if (!query) return rows;
  const q = query.toLowerCase();
  return rows.filter(r => r.some(cell => cell.toLowerCase().includes(q)));
}

export function paginateRows(rows: string[][], page: number, perPage: number): string[][] {
  return rows.slice(page * perPage, (page + 1) * perPage);
}

interface CsvData { headers: string[]; rows: string[][]; }

function renderTable(wrap: HTMLElement, headers: string[], rows: string[][], sortCol: number, sortDir: "asc" | "desc"): void {
  const table = wrap.querySelector<HTMLTableElement>(".csv-table")!;
  const thead = `<thead><tr>${headers.map((h, i) => {
    const arrow = i === sortCol ? (sortDir === "asc" ? " ↑" : " ↓") : " ↕";
    return `<th data-col="${i}" style="cursor:pointer">${escHtml(h)}<span style="opacity:0.5;font-size:0.75em">${arrow}</span></th>`;
  }).join("")}</tr></thead>`;
  const tbody = `<tbody>${rows.map(row =>
    `<tr>${row.map(cell => `<td>${escHtml(cell)}</td>`).join("")}</tr>`
  ).join("")}</tbody>`;
  table.innerHTML = thead + tbody;
}

function renderPagination(wrap: HTMLElement, page: number, total: number, perPage: number, onPage: (p: number) => void): void {
  const pages = Math.ceil(total / perPage);
  const pag = wrap.querySelector(".csv-pagination")!;
  if (pages <= 1) { pag.innerHTML = ""; return; }
  pag.innerHTML = `<span style="font-size:0.8em;color:var(--text-muted)">Page ${page + 1} / ${pages}</span>
    <button data-dir="-1" ${page === 0 ? "disabled" : ""}>‹</button>
    <button data-dir="1" ${page >= pages - 1 ? "disabled" : ""}>›</button>`;
  pag.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => onPage(page + parseInt((btn as HTMLElement).dataset.dir!)));
  });
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function initCsvViewer(wrap: HTMLElement): void {
  const id = wrap.dataset.csvId!;
  const maxRows = parseInt(wrap.dataset.rows ?? "100", 10);
  const scriptEl = document.getElementById(`csv-data-${id}`);
  if (!scriptEl) return;

  const data: CsvData = JSON.parse(scriptEl.textContent!);
  let filteredRows = data.rows;
  let sortCol = -1;
  let sortDir: "asc" | "desc" = "asc";
  let page = 0;

  function render(): void {
    const pageRows = paginateRows(filteredRows, page, maxRows);
    renderTable(wrap, data.headers, pageRows, sortCol, sortDir);
    renderPagination(wrap, page, filteredRows.length, maxRows, p => { page = p; render(); });

    wrap.querySelectorAll("th[data-col]").forEach(th => {
      th.addEventListener("click", () => {
        const col = parseInt((th as HTMLElement).dataset.col!);
        if (sortCol === col) sortDir = sortDir === "asc" ? "desc" : "asc";
        else { sortCol = col; sortDir = "asc"; }
        filteredRows = sortRows(filteredRows, sortCol, sortDir);
        page = 0;
        render();
      });
    });
  }

  const filterInput = wrap.querySelector<HTMLInputElement>(".csv-filter");
  if (filterInput) {
    let debounce: ReturnType<typeof setTimeout>;
    filterInput.addEventListener("input", () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        filteredRows = filterRows(data.rows, filterInput.value);
        if (sortCol >= 0) filteredRows = sortRows(filteredRows, sortCol, sortDir);
        page = 0;
        render();
      }, 150);
    });
  }

  render();
}

export function initCsvViewers(): void {
  document.querySelectorAll<HTMLElement>(".csv-viewer").forEach(el => {
    if (el.dataset.csvMounted) return; // guard: skip already-initialised viewers
    el.dataset.csvMounted = "1";
    initCsvViewer(el);
  });
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", initCsvViewers);
  document.addEventListener("readrun:remount", initCsvViewers);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun test src/client/viewers/csv.test.ts --reporter=verbose 2>&1 | tail -20
```

Expected: sortRows, filterRows, paginateRows tests PASS. (DOM-dependent tests are excluded from the pure unit suite; they will be verified manually in Task 11.)

- [ ] **Step 5: Commit**

```bash
git add src/client/viewers/csv.ts src/client/viewers/csv.test.ts
git commit -m "feat(viewers): client CSV table with sort, filter, and pagination"
```

---

### Task 8: Client model viewer (Three.js)

**Files:**
- Create: `src/client/viewers/model.ts`

**Ownership:**
- In scope: Three.js lazy init, STL/GLB loading, OrbitControls, fit-to-view, resize, remount
- Out of scope: styles (Task 9), main.ts import (Task 10)

**Assumption refs:** `A2`, `A3`, `A4`

- [ ] **Step 1: Verify assumptions and add Three.js**

```bash
# A3: check if three is already in package.json
cat package.json | grep -i three

# A4: read clientBundle.ts to understand build flags
cat src/clientBundle.ts
```

If `three` is absent, install it:

```bash
bun add three
bun add -d @types/three
```

- [ ] **Step 2: Write failing test**

Create `src/client/viewers/model.test.ts`:

```ts
import { test, expect } from "bun:test";

// The model viewer has no unit-testable pure functions —
// all logic is DOM + WebGL dependent.
// Verify the module exports the right surface and doesn't throw on import.

test("model viewer module exports initModelViewers", async () => {
  // dynamic import to avoid DOM errors in test env
  const mod = await import("./model");
  expect(typeof mod.initModelViewers).toBe("function");
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
bun test src/client/viewers/model.test.ts 2>&1 | tail -10
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement src/client/viewers/model.ts**

```ts
export async function initModelViewers(): Promise<void> {
  const viewers = document.querySelectorAll<HTMLElement>(".model-viewer");
  if (viewers.length === 0) return;

  // Lazy-load Three.js only when needed — Bun splits this into a separate chunk.
  const THREE = await import("three");
  const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
  const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
  const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");

  for (const viewer of viewers) {
    await initOne(viewer, THREE, STLLoader, GLTFLoader, OrbitControls);
  }
}

async function initOne(
  viewer: HTMLElement,
  THREE: typeof import("three"),
  STLLoader: any,
  GLTFLoader: any,
  OrbitControls: any,
): Promise<void> {
  const src = viewer.dataset.src!;
  const format = viewer.dataset.format as "stl" | "glb" | "gltf";
  const controls = viewer.dataset.controls !== "false";
  const canvas = viewer.querySelector<HTMLCanvasElement>(".model-canvas")!;
  const errorEl = viewer.querySelector<HTMLElement>(".model-error")!;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(
    getComputedStyle(document.documentElement).getPropertyValue("--bg-primary").trim() || "#1a1a2e"
  );

  const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.01, 10000);
  camera.position.set(0, 0, 5);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(1, 2, 3);
  scene.add(ambientLight, dirLight);

  const orbitControls = controls
    ? new OrbitControls(camera, canvas)
    : null;

  function animate(): void {
    requestAnimationFrame(animate);
    orbitControls?.update();
    renderer.render(scene, camera);
  }

  function fitCamera(object: THREE.Object3D): void {
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    const dist = Math.abs(maxDim / (2 * Math.tan(fov / 2))) * 1.5;
    camera.position.copy(center).add(new THREE.Vector3(0, 0, dist));
    camera.lookAt(center);
    if (orbitControls) orbitControls.target.copy(center);
  }

  new ResizeObserver(() => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }).observe(canvas);

  try {
    if (format === "stl") {
      const loader = new STLLoader();
      const geometry = await new Promise<any>((res, rej) => loader.load(src, res, undefined, rej));
      const material = new THREE.MeshPhongMaterial({ color: 0x6688cc, specular: 0x444444, shininess: 30 });
      const mesh = new THREE.Mesh(geometry, material);
      geometry.computeVertexNormals();
      scene.add(mesh);
      fitCamera(mesh);
    } else {
      const loader = new GLTFLoader();
      const gltf = await new Promise<any>((res, rej) => loader.load(src, res, undefined, rej));
      scene.add(gltf.scene);
      fitCamera(gltf.scene);
    }
  } catch (err: any) {
    errorEl.textContent = `Failed to load model: ${err?.message ?? String(err)}`;
    errorEl.hidden = false;
    return;
  }

  animate();
}

// Guard against Node/Bun test environments that have no DOM
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => { initModelViewers(); });
  document.addEventListener("readrun:remount", () => { initModelViewers(); });
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
bun test src/client/viewers/model.test.ts --reporter=verbose 2>&1 | tail -10
```

Expected: `initModelViewers` export test PASS.

- [ ] **Step 6: Commit**

```bash
git add src/client/viewers/model.ts src/client/viewers/model.test.ts package.json bun.lock
git commit -m "feat(viewers): Three.js lazy-loaded STL/GLB client viewer"
```

---

### Task 9: Viewer styles

**Files:**
- Create: `src/styles/viewers.ts`
- Modify: `src/styles/index.ts`

**Ownership:**
- In scope: CSS for all viewer wrappers, error states, CSV table, model canvas
- Out of scope: content styles (existing), client logic

**Assumption refs:** `A5`

- [ ] **Step 1: Read src/styles/index.ts and base.ts to understand the pattern**

```bash
cat src/styles/index.ts
cat src/styles/base.ts | head -40
```

Note the CSS export shape (string literal, CSS-in-TS template, or separate `.css` file).

- [ ] **Step 2: Write failing test**

Add to `src/styles/base.test.ts` (or create `src/styles/viewers.test.ts`):

```ts
import { test, expect } from "bun:test";
import { viewerStyles } from "./viewers";

test("viewerStyles is a non-empty string", () => {
  expect(typeof viewerStyles).toBe("string");
  expect(viewerStyles.length).toBeGreaterThan(0);
});

test("viewerStyles contains pdf-viewer class", () => {
  expect(viewerStyles).toContain(".pdf-viewer");
});

test("viewerStyles contains csv-viewer class", () => {
  expect(viewerStyles).toContain(".csv-viewer");
});

test("viewerStyles contains model-viewer class", () => {
  expect(viewerStyles).toContain(".model-viewer");
});

test("viewerStyles contains audio-viewer and video-viewer classes", () => {
  expect(viewerStyles).toContain(".audio-viewer");
  expect(viewerStyles).toContain(".video-viewer");
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
bun test src/styles/viewers.test.ts 2>&1 | tail -10
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement src/styles/viewers.ts**

Follow the same export pattern as other files in `src/styles/`. Typical pattern is:

```ts
export const viewerStyles = /* css */`
  /* ── Shared viewer chrome ── */
  .viewer-error {
    padding: 0.75rem 1rem;
    background: var(--error-bg, #3a1a1a);
    color: var(--error-text, #f87171);
    border-left: 3px solid var(--error-text, #f87171);
    border-radius: 0 4px 4px 0;
    font-size: 0.875rem;
  }

  /* ── PDF ── */
  .pdf-viewer-wrap {
    width: 100%;
    border: 1px solid var(--border, #2d3148);
    border-radius: 4px;
    overflow: hidden;
    margin: 1rem 0;
  }
  .pdf-viewer {
    width: 100%;
    height: 100%;
    border: none;
    display: block;
  }

  /* ── Audio / Video ── */
  .audio-viewer-wrap,
  .video-viewer-wrap {
    margin: 1rem 0;
  }
  .audio-viewer {
    width: 100%;
  }
  .video-viewer {
    display: block;
    max-width: 100%;
  }

  /* ── CSV table ── */
  .csv-viewer {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--border, #2d3148);
    border-radius: 4px;
    overflow: hidden;
    margin: 1rem 0;
    font-size: 0.875rem;
  }
  .csv-toolbar {
    padding: 6px 10px;
    background: var(--surface-2, #161824);
    border-bottom: 1px solid var(--border, #2d3148);
  }
  .csv-filter {
    width: 100%;
    background: var(--surface-1, #1e2130);
    border: 1px solid var(--border, #2d3148);
    color: var(--text, #e2e8f0);
    padding: 4px 8px;
    border-radius: 3px;
    font-size: 0.8rem;
  }
  .csv-table-wrap {
    flex: 1;
    overflow: auto;
  }
  .csv-table {
    width: 100%;
    border-collapse: collapse;
  }
  .csv-table th {
    background: var(--surface-2, #161824);
    color: var(--text-muted, #94a3b8);
    padding: 5px 10px;
    text-align: left;
    border-bottom: 1px solid var(--border, #2d3148);
    white-space: nowrap;
    font-weight: 600;
    font-size: 0.8rem;
  }
  .csv-table th:hover { background: var(--surface-3, #1a1f30); }
  .csv-table td {
    padding: 4px 10px;
    border-bottom: 1px solid var(--border-subtle, #1a1f30);
    color: var(--text, #e2e8f0);
  }
  .csv-table tr:hover td { background: var(--surface-hover, #161824); }
  .csv-pagination {
    display: flex;
    gap: 6px;
    align-items: center;
    padding: 6px 10px;
    background: var(--surface-2, #161824);
    border-top: 1px solid var(--border, #2d3148);
    font-size: 0.75rem;
  }
  .csv-pagination button {
    background: var(--surface-3, #2d3148);
    border: none;
    color: var(--text, #e2e8f0);
    padding: 2px 8px;
    cursor: pointer;
    border-radius: 3px;
  }
  .csv-pagination button:disabled { opacity: 0.4; cursor: default; }

  /* ── 3D model ── */
  .model-viewer {
    position: relative;
    width: 100%;
    border: 1px solid var(--border, #2d3148);
    border-radius: 4px;
    overflow: hidden;
    margin: 1rem 0;
    background: var(--surface-1, #1e2130);
  }
  .model-canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
  .model-error {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    color: var(--error-text, #f87171);
    background: var(--surface-1, #1e2130);
    font-size: 0.875rem;
  }
`;
```

Add the import to `src/styles/index.ts` following the same pattern as other style imports.

- [ ] **Step 5: Run tests to verify they pass**

```bash
bun test src/styles/viewers.test.ts --reporter=verbose 2>&1 | tail -15
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/styles/viewers.ts src/styles/viewers.test.ts src/styles/index.ts
git commit -m "feat(viewers): CSS for PDF, audio, video, CSV, and model viewer blocks"
```

---

### Task 10: Client wiring and build verification

**Files:**
- Modify: `src/client/main.ts`

**Ownership:**
- In scope: import side-effect calls in main.ts; verify Bun code-splitting works
- Out of scope: viewer implementations (Tasks 7–8)

**Assumption refs:** `A2`, `A4`

- [ ] **Step 1: Read src/client/main.ts and src/clientBundle.ts**

```bash
cat src/client/main.ts
cat src/clientBundle.ts
```

Understand how the client is bundled and how existing side-effect imports work.

- [ ] **Step 2: Add viewer imports to src/client/main.ts**

Add at the bottom of the existing imports in `src/client/main.ts`:

```ts
import "./viewers/csv";
import "./viewers/model";
```

These are side-effect imports — the modules call `initCsvViewers()` and `initModelViewers()` on `DOMContentLoaded` / `readrun:remount`.

- [ ] **Step 3: Verify Bun code-splits Three.js (assumption A2)**

```bash
bun build src/client/main.ts --splitting --outdir=/tmp/rr-split-test --target=browser 2>&1
ls -la /tmp/rr-split-test/
```

Expected: multiple `.js` files — `main.js` plus at least one chunk file for Three.js.

If only one file is produced, Three.js is NOT being code-split. Escalate to user with findings from `src/clientBundle.ts`.

- [ ] **Step 4: Run full test suite**

```bash
bun test 2>&1 | tail -20
```

Expected: all tests PASS (no regressions from wiring change).

- [ ] **Step 5: Commit**

```bash
git add src/client/main.ts
git commit -m "feat(viewers): wire CSV and model client viewers into main bundle"
```

---

### Task 11 (final): Spec Acceptance + Post-Implementation Review

**Files:**
- Modify: `.warden/specs/2026-05-11-rich-file-viewers-design.md`

- [ ] **Step 1: Re-read the spec's Acceptance Criteria block**

Open `.warden/specs/2026-05-11-rich-file-viewers-design.md`. Hold every criterion in context.

- [ ] **Step 2: Run every acceptance item, fresh, in one batch**

Run each criterion command from the spec. Key commands:

```bash
# Unit tests
bun test src/viewers/model.test.ts
bun test src/viewers/csv.test.ts
bun test src/viewers/media.test.ts
bun test src/viewers/pdf.test.ts
bun test src/validate.test.ts
bun test src/blocks.test.ts

# Integration
bun test  # full suite

# Manual: spin up fixture page with all six viewer types
# Create a temp .readrun/files/ dir with bracket.stl, scene.glb, results.csv,
# talk.mp3, demo.mp4, spec.pdf, then rr serve fixture/
rr serve /tmp/rr-viewer-fixture
```

Verify Three.js code-splitting via build output (no browser required for this check):

```bash
# Build with splitting and confirm Three.js lands in a separate chunk file
bun build src/client/main.ts --splitting --outdir=/tmp/rr-chunk-check --target=browser
# Must produce more than one .js file — main.js plus at least one chunk
ls /tmp/rr-chunk-check/*.js | wc -l   # expect >= 2
# The three chunk must NOT be inlined in main.js
grep -l "THREE\|BufferGeometry\|WebGLRenderer" /tmp/rr-chunk-check/*.js | grep -v main
# Expected: at least one chunk file named something other than main.js
```

For the full Network-tab test (confirms runtime lazy-load), verify manually in browser: open a page with only text content, open DevTools Network, confirm no Three.js chunk request. Then navigate to a page with `[stl=]`, confirm a chunk file loads.

Static build check:
```bash
rr build /tmp/rr-viewer-fixture --out=/tmp/rr-viewer-dist
ls /tmp/rr-viewer-dist/_readrun/files/
grep -q 'model-viewer' /tmp/rr-viewer-dist/index.html
grep -q 'csv-viewer' /tmp/rr-viewer-dist/index.html
```

Security checks (manual in browser console):
- CSV cell containing `<img src=x onerror=alert(1)>` renders as text
- PDF iframe does not have `allow-scripts` in sandbox attribute

- [ ] **Step 3: Resolve every ❌ fail**

For each failing item, fix or log with root cause + 2-3 approaches tried.

- [ ] **Step 4: Fill the Post-Implementation Review block in the spec**

Three subsections: Acceptance results, Scope drift, Refactor proposals.

- [ ] **Step 5: Surface limitations to user**

If any known limitations, summarise: what didn't pass, why, recommended next step.

- [ ] **Step 6: Commit**

```bash
git add .warden/specs/2026-05-11-rich-file-viewers-design.md
git commit -m "docs(spec): post-implementation review for rich file viewers"
```

---

### Task 12: Merge and cleanup

- [ ] **Step 1: Run verification-before-completion gate**

`@verification-before-completion` — confirm all acceptance criteria are met (✅ or ⚠ known-limit).

- [ ] **Step 2: Confirm no planner documentation sub-task is outstanding**

All tasks in this plan are marked complete in the checkbox list above.

- [ ] **Step 3: No wiki artifacts to promote**

No `.warden/research/` or `.warden/lessons/` artifacts were created; skip wiki-writer.

- [ ] **Step 4: Merge to main**

```bash
git checkout main
git merge feat/rich-file-viewers --no-ff -m "feat: rich file viewers (STL, GLTF, CSV, audio, video, PDF)"
```

- [ ] **Step 5: Remove worktree and branch**

*(Skip if working directly on main without a worktree.)*

```bash
git worktree remove .worktrees/feat-rich-file-viewers
git branch -d feat/rich-file-viewers
```

- [ ] **Step 6: Run warden audit orphan check**

```bash
warden audit
```

Confirm no orphaned spec/plan artifacts remain.
