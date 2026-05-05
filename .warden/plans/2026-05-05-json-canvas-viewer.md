# JSON Canvas Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development to implement this plan task-by-task when tasks are independent. For same-session manual execution, follow this plan directly. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a native read-only `[canvas=...]` JSON Canvas viewer for embedded flowcharts and spatial diagrams in readrun Markdown pages.

**Architecture:** Implement the MVP natively in readrun: parse and validate JSON Canvas data in TypeScript, embed validated JSON into page HTML during Markdown rendering, then mount a vanilla DOM/SVG viewer from the existing client bundle. Keep `json-canvas-viewer` as a documented fallback package if the native renderer cannot meet the visual acceptance checks after two real attempts.

**Tech Stack:** Bun, TypeScript, existing readrun block parser, markdown-it render pipeline, vanilla browser TypeScript, SVG edges, absolute-positioned HTML nodes, CSS string bundle. No new production dependency for the native MVP.

**Recommended Skills:** test-driven-development, typescript, readrun, writing, verification-before-completion

**Recommended MCPs:** none

**Machine plan:** 2026-05-05-json-canvas-viewer.yaml

**Status:** draft
**Refinement passes:** 0

## Assumptions

- `A1` - The implementation should be native-first and should not add a production package unless the fallback trigger is reached.
  Type: user-choice
  Source: user request: "ideally it would be a native integration and not using package but if there are good packages set up then we can use those"
  Check: `git diff package.json` should show no new dependency until fallback is explicitly chosen.
  If false: execute the package fallback section before continuing client-renderer tasks.
  Owner: Task 1 and fallback checkpoint

- `A2` - JSON Canvas Spec 1.0 is the target data contract.
  Type: external
  Source: `.warden/specs/2026-05-05-json-canvas-viewer-design.md` and https://jsoncanvas.org/spec/1.0/
  Check: core validation tests cover top-level `nodes`/`edges`, text/file/link/group nodes, edge endpoints, sides, ends, and colors.
  If false: revise `src/canvas.ts` types and tests before rendering work.
  Owner: Task 1

- `A3` - `.canvas` file references should resolve only under `.readrun/files/`.
  Type: design
  Source: design spec "Author Contract"
  Check: `bun test src/markdown.test.ts src/validate.test.ts` includes traversal and missing-file cases.
  If false: re-plan asset routing before any client rendering work.
  Owner: Tasks 4 and 5

- `A4` - Existing static builds must not require runtime JSON fetches for embedded canvases.
  Type: architectural
  Source: readrun static-build model and design spec "Rendering Contract"
  Check: `bun src/cli.ts build readrun-docs --out=/tmp/readrun-canvas-build` produces HTML containing `type="application/json"` canvas data.
  If false: rework server embedding before client interactions.
  Owner: Task 9

- `A5` - The existing client bundle can own the viewer without React.
  Type: repo-state
  Source: `src/client/main.ts`, `src/client/execution.ts`, `src/client/quiz.ts`
  Check: `src/client/main.ts` can import `./canvas` and `bun test` plus `rr serve` still load the bundled client.
  If false: consider a package or isolated bundle entrypoint.
  Owner: Tasks 6 and 7

- `A6` - Browser-level screenshot automation is not currently wired into this repo.
  Type: repo-state
  Source: no Playwright dependency or existing browser test harness in `package.json`
  Check: `rg -n "playwright|puppeteer|chromium" package.json src`
  If false: add visual checks to the final acceptance gate.
  Owner: Task 9

---

## Research Summary

### Package scan

| Package | Finding | Decision |
|---|---|---|
| [`json-canvas-viewer`](https://www.npmjs.com/package/json-canvas-viewer) | Latest npm metadata observed: `4.2.0`, MIT, ESM, about 266 KB unpacked, dependencies on `marked`, `dompurify`, `pointeract`, `@needle-di/core`, and color helpers. Docs expose `new JSONCanvasViewer({ container, canvas, parser })` plus optional modules like `Controls`, `Minimap`, and `MistouchPreventer`. | Keep as fallback only. It is credible and actively shaped for this problem, but it duplicates readrun's Markdown/rendering surface and adds more UI machinery than the MVP needs. |
| [`@trbn/jsoncanvas`](https://www.npmjs.com/package/%40trbn/jsoncanvas) | Tiny MIT TypeScript package with no dependencies, but its npm readme says it does not include a rendering engine. Its published types are a data-structure helper, not a validator or viewer. | Do not use. Native types/validation are simple enough and need stricter spec fidelity. |
| [`rehype-jsoncanvas`](https://www.jsdelivr.com/package/npm/rehype-jsoncanvas) | Unified/rehype plugin with a dependency stack around HAST/remark. Readrun uses `markdown-it` plus a custom bracket-block renderer, not Unified. | Do not use. Wrong integration layer and heavier than native block rendering. |
| [`@json-canvas-viewer/react`](https://www.npmjs.com/package/@json-canvas-viewer/react) | React wrapper over `json-canvas-viewer`; latest metadata observed depends on `json-canvas-viewer` and peers React/ReactDOM 19. | Do not use. Readrun pages do not use React for normal rendering. |

### Native vs package decision

Use a native renderer for the MVP. JSON Canvas Spec 1.0 is small: four node types, edges, coordinates, colors, and endpoint metadata. The readrun MVP needs static embedding, validation, theme integration, and safe text/link handling more than it needs a full infinite-canvas framework.

Fallback trigger: if native rendering cannot meet the acceptance checks for edge geometry, page-scroll behavior, and mobile fit after two implementation attempts, switch client rendering to `json-canvas-viewer@4.2.0` and keep readrun's server-side validation/file-resolution layer.

Fallback shape if triggered:

```bash
bun add json-canvas-viewer@4.2.0
```

Client integration target:

```ts
import { Controls, JSONCanvasViewer, MistouchPreventer } from "json-canvas-viewer";

new JSONCanvasViewer(
  {
    container,
    canvas,
    parser: (markdown) => escapeHtml(markdown),
    theme: document.documentElement.dataset.theme === "dark" ? "dark" : "light",
    loading: "normal",
  },
  [Controls, MistouchPreventer],
);
```

Do not use the fallback package unless the fallback trigger is recorded in this plan with the failed native attempts.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/canvas.ts` | Create | JSON Canvas types, parse/validate helpers, color normalization, bounds and edge geometry, server HTML renderer |
| `src/canvas.test.ts` | Create | Unit tests for schema, validation, sanitization, bounds, geometry, and rendered HTML |
| `src/markdown.ts` | Modify | Add `[canvas]...[/canvas]` block dispatch and `[canvas=file.canvas]` file expansion |
| `src/markdown.test.ts` | Create | Markdown render/file-reference tests for inline and file-based canvas blocks |
| `src/validate.ts` | Modify | Validate canvas block refs and `.canvas` file schema under `.readrun/files/` |
| `src/validate.test.ts` | Modify | Missing file, traversal, invalid JSON, duplicate IDs, invalid endpoints, clean canvas cases |
| `src/utils.ts` | Modify | Add `.canvas` MIME mapping as `application/json` |
| `src/client/canvas.ts` | Create | Browser mount/remount, DOM/SVG scene rendering, safe links, controls, pan/zoom |
| `src/client/main.ts` | Modify | Import `./canvas` side-effect module |
| `src/styles/canvas.ts` | Create | Viewer, toolbar, viewport, nodes, groups, edges, errors, mobile and theme styles |
| `src/styles/index.ts` | Modify | Include canvas styles |
| `src/watch.ts` | Modify | Treat `.canvas` changes as content reload-worthy and add focused test if behavior changes |
| `src/watch.test.ts` | Modify | Assert `.canvas` passes `shouldInvalidateOnFile` if invalidation semantics are changed |
| `readrun-docs/docs/json-canvas.md` | Create | User-facing docs page for `[canvas=...]` |
| `readrun-docs/.readrun/files/example-flow.canvas` | Create | Small sample canvas used by docs |
| `README.md` | Modify | Add one bullet and usage snippet for JSON Canvas viewer |

---

## Task 1: Canvas Types, Parsing, and Schema Validation

**Files:**
- Create: `src/canvas.ts`
- Create: `src/canvas.test.ts`

**Ownership:**
- In scope: `src/canvas.ts`, `src/canvas.test.ts`
- Out of scope: `src/markdown.ts`, `src/client/*`, `package.json`

**Assumption refs:** `A1`, `A2`

**Invoke skill:** `@test-driven-development`, `@typescript`

- [ ] **Step 1: Write the failing tests**

Create `src/canvas.test.ts` with these initial cases:

```ts
import { describe, expect, test } from "bun:test";
import { parseCanvasJson, validateCanvas, normalizeCanvasColor } from "./canvas";

describe("parseCanvasJson", () => {
  test("parses a minimal valid canvas", () => {
    const result = parseCanvasJson(JSON.stringify({
      nodes: [
        { id: "start", type: "text", x: 0, y: 0, width: 180, height: 80, text: "Start" },
      ],
      edges: [],
    }), "flow.canvas");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.canvas.nodes?.[0]?.id).toBe("start");
  });

  test("reports invalid JSON without throwing", () => {
    const result = parseCanvasJson("{", "broken.canvas");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0]?.message).toContain("invalid JSON");
  });
});

describe("validateCanvas", () => {
  test("accepts text, file, link, group, and edge metadata from JSON Canvas 1.0", () => {
    const issues = validateCanvas({
      nodes: [
        { id: "a", type: "text", x: 0, y: 0, width: 100, height: 80, text: "A" },
        { id: "b", type: "file", x: 200, y: 0, width: 100, height: 80, file: "note.md", subpath: "#intro" },
        { id: "c", type: "link", x: 400, y: 0, width: 100, height: 80, url: "https://example.com" },
        { id: "g", type: "group", x: -20, y: -20, width: 560, height: 140, label: "Group", backgroundStyle: "cover" },
      ],
      edges: [
        { id: "a-b", fromNode: "a", fromSide: "right", fromEnd: "none", toNode: "b", toSide: "left", toEnd: "arrow", color: "1", label: "next" },
      ],
    }, "flow.canvas");

    expect(issues).toEqual([]);
  });

  test("rejects duplicate node IDs and missing edge endpoints", () => {
    const issues = validateCanvas({
      nodes: [
        { id: "a", type: "text", x: 0, y: 0, width: 100, height: 80, text: "A" },
        { id: "a", type: "text", x: 0, y: 120, width: 100, height: 80, text: "Duplicate" },
      ],
      edges: [{ id: "bad", fromNode: "a", toNode: "missing" }],
    }, "flow.canvas");

    expect(issues.some((i) => i.message.includes("duplicate node id"))).toBe(true);
    expect(issues.some((i) => i.message.includes("missing"))).toBe(true);
  });
});

describe("normalizeCanvasColor", () => {
  test("accepts hex and JSON Canvas preset strings", () => {
    expect(normalizeCanvasColor("#ff0000")).toBe("#ff0000");
    expect(normalizeCanvasColor("1")).toBe("var(--canvas-color-1)");
    expect(normalizeCanvasColor("6")).toBe("var(--canvas-color-6)");
  });

  test("rejects unsafe color strings", () => {
    expect(normalizeCanvasColor("url(javascript:alert(1))")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
bun test src/canvas.test.ts
```

Expected: fail because `src/canvas.ts` does not exist.

- [ ] **Step 3: Implement minimal `src/canvas.ts`**

Create exported types and functions:

```ts
export type CanvasNodeType = "text" | "file" | "link" | "group";
export type CanvasSide = "top" | "right" | "bottom" | "left";
export type CanvasEnd = "none" | "arrow";

export type CanvasIssue = {
  file: string;
  path?: string;
  message: string;
};

export type JsonCanvas = {
  nodes?: JsonCanvasNode[];
  edges?: JsonCanvasEdge[];
};

export type JsonCanvasNode =
  | ({ type: "text"; text: string } & JsonCanvasGenericNode)
  | ({ type: "file"; file: string; subpath?: string } & JsonCanvasGenericNode)
  | ({ type: "link"; url: string } & JsonCanvasGenericNode)
  | ({ type: "group"; label?: string; background?: string; backgroundStyle?: "cover" | "ratio" | "repeat" } & JsonCanvasGenericNode);

export type JsonCanvasGenericNode = {
  id: string;
  type: CanvasNodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
};

export type JsonCanvasEdge = {
  id: string;
  fromNode: string;
  fromSide?: CanvasSide;
  fromEnd?: CanvasEnd;
  toNode: string;
  toSide?: CanvasSide;
  toEnd?: CanvasEnd;
  color?: string;
  label?: string;
};

export type ParseCanvasResult =
  | { ok: true; canvas: JsonCanvas }
  | { ok: false; issues: CanvasIssue[] };

export function parseCanvasJson(text: string, file = "<inline>"): ParseCanvasResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    return { ok: false, issues: [{ file, message: `invalid JSON: ${(err as Error).message}` }] };
  }
  const issues = validateCanvas(raw, file);
  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, canvas: raw as JsonCanvas };
}

export function validateCanvas(raw: unknown, file = "<inline>"): CanvasIssue[] {
  // Implement the spec checks listed in .warden/specs/2026-05-05-json-canvas-viewer-design.md.
  // Keep this as runtime validation over unknown input, not TypeScript-only trust.
}

export function normalizeCanvasColor(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (/^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/.test(value)) return value;
  if (/^[1-6]$/.test(value)) return `var(--canvas-color-${value})`;
  return undefined;
}
```

Fill in validation with narrow helpers for objects, arrays, finite numbers, positive dimensions, enum values, unique IDs, and endpoint references.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
bun test src/canvas.test.ts
```

Expected: all Task 1 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/canvas.ts src/canvas.test.ts
git commit -m "feat(canvas): add JSON Canvas parsing and validation"
```

---

## Task 2: Bounds and Edge Geometry

**Files:**
- Modify: `src/canvas.ts`
- Modify: `src/canvas.test.ts`

**Ownership:**
- In scope: geometry helpers in `src/canvas.ts`
- Out of scope: browser DOM rendering

**Assumption refs:** `A2`

**Invoke skill:** `@test-driven-development`, `@typescript`

- [ ] **Step 1: Write failing geometry tests**

Append tests for these exports:

```ts
import { connectionPoint, edgePath, getCanvasBounds } from "./canvas";

test("getCanvasBounds covers all nodes with padding", () => {
  const bounds = getCanvasBounds([
    { id: "a", type: "text", x: -100, y: 20, width: 100, height: 50, text: "A" },
    { id: "b", type: "text", x: 300, y: 200, width: 120, height: 80, text: "B" },
  ], 40);

  expect(bounds).toEqual({
    minX: -140,
    minY: -20,
    maxX: 460,
    maxY: 320,
    width: 600,
    height: 340,
    centerX: 160,
    centerY: 150,
  });
});

test("connectionPoint respects requested sides", () => {
  const node = { id: "a", type: "text" as const, x: 10, y: 20, width: 100, height: 80, text: "A" };
  expect(connectionPoint(node, "left")).toEqual({ x: 10, y: 60 });
  expect(connectionPoint(node, "right")).toEqual({ x: 110, y: 60 });
  expect(connectionPoint(node, "top")).toEqual({ x: 60, y: 20 });
  expect(connectionPoint(node, "bottom")).toEqual({ x: 60, y: 100 });
  expect(connectionPoint(node, undefined)).toEqual({ x: 60, y: 60 });
});

test("edgePath returns a stable cubic SVG path between nodes", () => {
  const from = { id: "a", type: "text" as const, x: 0, y: 0, width: 100, height: 80, text: "A" };
  const to = { id: "b", type: "text" as const, x: 300, y: 0, width: 100, height: 80, text: "B" };
  expect(edgePath(from, to, "right", "left")).toBe("M 100 40 C 200 40, 200 40, 300 40");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
bun test src/canvas.test.ts
```

Expected: fail because geometry helpers are missing.

- [ ] **Step 3: Implement geometry helpers**

Add:

```ts
export type CanvasBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
};

export type Point = { x: number; y: number };

export function getCanvasBounds(nodes: JsonCanvasNode[] = [], padding = 40): CanvasBounds {
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
  }
  const minX = Math.min(...nodes.map((n) => n.x)) - padding;
  const minY = Math.min(...nodes.map((n) => n.y)) - padding;
  const maxX = Math.max(...nodes.map((n) => n.x + n.width)) + padding;
  const maxY = Math.max(...nodes.map((n) => n.y + n.height)) + padding;
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY, centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2 };
}

export function connectionPoint(node: JsonCanvasNode, side?: CanvasSide): Point {
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  if (side === "left") return { x: node.x, y: cy };
  if (side === "right") return { x: node.x + node.width, y: cy };
  if (side === "top") return { x: cx, y: node.y };
  if (side === "bottom") return { x: cx, y: node.y + node.height };
  return { x: cx, y: cy };
}

export function edgePath(from: JsonCanvasNode, to: JsonCanvasNode, fromSide?: CanvasSide, toSide?: CanvasSide): string {
  const a = connectionPoint(from, fromSide);
  const b = connectionPoint(to, toSide);
  const dx = Math.max(40, Math.abs(b.x - a.x) / 2);
  return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
bun test src/canvas.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/canvas.ts src/canvas.test.ts
git commit -m "feat(canvas): add bounds and edge geometry"
```

---

## Task 3: Server-Side Canvas HTML Rendering

**Files:**
- Modify: `src/canvas.ts`
- Modify: `src/canvas.test.ts`

**Ownership:**
- In scope: server-safe HTML emitter in `src/canvas.ts`
- Out of scope: client-side scene drawing and CSS

**Assumption refs:** `A2`, `A4`

**Invoke skill:** `@test-driven-development`, `@typescript`

- [ ] **Step 1: Write failing HTML renderer tests**

Append:

```ts
import { renderCanvasBlockHtml } from "./canvas";

test("renderCanvasBlockHtml embeds safe JSON data for the client", () => {
  const html = renderCanvasBlockHtml({
    id: 1,
    source: "flow.canvas",
    rawJson: JSON.stringify({
      nodes: [{ id: "a", type: "text", x: 0, y: 0, width: 100, height: 80, text: "</script><img src=x onerror=alert(1)>" }],
      edges: [],
    }),
    height: 420,
    controls: true,
  });

  expect(html).toContain('class="canvas-viewer"');
  expect(html).toContain('data-canvas-id="1"');
  expect(html).toContain('style="height:420px"');
  expect(html).toContain("<\\/script>");
  expect(html).not.toContain("</script><img");
});

test("renderCanvasBlockHtml returns an inline error panel for invalid JSON", () => {
  const html = renderCanvasBlockHtml({
    id: 2,
    source: "broken.canvas",
    rawJson: "{",
    height: 520,
    controls: true,
  });

  expect(html).toContain("canvas-viewer-error");
  expect(html).toContain("broken.canvas");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
bun test src/canvas.test.ts
```

Expected: fail because `renderCanvasBlockHtml` is missing.

- [ ] **Step 3: Implement server HTML renderer**

Add:

```ts
export type RenderCanvasBlockOptions = {
  id: number;
  source: string;
  rawJson: string;
  height: number;
  controls: boolean;
};

export function renderCanvasBlockHtml(opts: RenderCanvasBlockOptions): string {
  const parsed = parseCanvasJson(opts.rawJson, opts.source);
  if (!parsed.ok) return renderCanvasError(opts.source, parsed.issues);

  const data = JSON.stringify(parsed.canvas).replace(/<\/script/gi, "<\\/script");
  const label = escapeHtml(opts.source);
  const controls = opts.controls
    ? `<div class="canvas-viewer__actions">
        <button type="button" data-canvas-action="fit">Fit</button>
        <button type="button" data-canvas-action="zoom-out">-</button>
        <button type="button" data-canvas-action="zoom-in">+</button>
        <button type="button" data-canvas-action="reset">100%</button>
      </div>`
    : "";

  return `<div class="canvas-viewer" data-canvas-id="${opts.id}">
    <div class="canvas-viewer__header">
      <span class="canvas-viewer__source">${label}</span>
      ${controls}
    </div>
    <div class="canvas-viewer__viewport" data-canvas-viewport="${opts.id}" style="height:${opts.height}px"></div>
  </div>
  <script type="application/json" id="canvas-data-${opts.id}">${data}</script>`;
}
```

Use an internal `escapeHtml()` helper in `src/canvas.ts` rather than importing Node-only utilities into browser-bound code.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
bun test src/canvas.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/canvas.ts src/canvas.test.ts
git commit -m "feat(canvas): render safe canvas embed HTML"
```

---

## Task 4: Markdown Block and File Reference Integration

**Files:**
- Modify: `src/markdown.ts`
- Create: `src/markdown.test.ts`
- Modify: `src/utils.ts`

**Ownership:**
- In scope: `[canvas]...[/canvas]`, `[canvas=file.canvas]`, `.canvas` MIME mapping
- Out of scope: validate command behavior, client drawing

**Assumption refs:** `A3`, `A4`

**Invoke skill:** `@test-driven-development`, `@typescript`, `@readrun`

- [ ] **Step 1: Write failing Markdown tests**

Create `src/markdown.test.ts`:

```ts
import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { renderMarkdown, resolveFileReferences } from "./markdown";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "readrun-markdown-test-"));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

test("renders inline [canvas] JSON into a canvas viewer shell", () => {
  const html = renderMarkdown(`[canvas height=360]
{"nodes":[{"id":"a","type":"text","x":0,"y":0,"width":100,"height":80,"text":"A"}],"edges":[]}
[/canvas]`);

  expect(html).toContain('class="canvas-viewer"');
  expect(html).toContain('style="height:360px"');
  expect(html).toContain('type="application/json"');
});

test("resolves [canvas=flow.canvas] from .readrun/files", async () => {
  await mkdir(join(tmpDir, ".readrun", "files"), { recursive: true });
  await writeFile(join(tmpDir, ".readrun", "files", "flow.canvas"), JSON.stringify({
    nodes: [{ id: "a", type: "text", x: 0, y: 0, width: 100, height: 80, text: "A" }],
    edges: [],
  }));

  const source = await resolveFileReferences("[canvas=flow.canvas]", join(tmpDir, ".readrun", "scripts"), join(tmpDir, ".readrun", "images"), tmpDir);
  expect(source).toContain("[canvas source=\"flow.canvas\"]");
  expect(source).toContain("\"nodes\"");
});

test("rejects canvas path traversal during file reference resolution", async () => {
  const source = await resolveFileReferences("[canvas=../secret.canvas]", join(tmpDir, ".readrun", "scripts"), join(tmpDir, ".readrun", "images"), tmpDir);
  expect(source).toContain("rejects absolute or traversal paths");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
bun test src/markdown.test.ts
```

Expected: fail because `canvas` rendering and resolution are missing.

- [ ] **Step 3: Implement Markdown integration**

In `src/markdown.ts`:

- import `renderCanvasBlockHtml`
- add `"canvas"` to block dispatch in `renderBlock`
- add a `canvas` counter to `RenderCtx`
- implement `renderCanvasBlock(block, ctx)`
- update `resolveFileReferences()` to route `name === "canvas"` to `.readrun/files/`

Implementation rules:

- `height` parses as an integer and clamps to `240..1200`
- `controls=false` hides controls
- inline source label defaults to `<inline>`
- `[canvas=path]` accepts only relative paths without `..`
- file-not-found expands to a `[canvas]` error block or direct Markdown error paragraph consistent with existing image/script behavior

In `src/utils.ts`, add:

```ts
".canvas": "application/json",
```

- [ ] **Step 4: Run focused tests**

Run:

```bash
bun test src/markdown.test.ts src/canvas.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/markdown.ts src/markdown.test.ts src/utils.ts
git commit -m "feat(markdown): add canvas block rendering"
```

---

## Task 5: `rr validate` Canvas Checks

**Files:**
- Modify: `src/validate.ts`
- Modify: `src/validate.test.ts`

**Ownership:**
- In scope: validation-time canvas reference discovery and schema checking
- Out of scope: server rendering

**Assumption refs:** `A2`, `A3`

**Invoke skill:** `@test-driven-development`, `@typescript`

- [ ] **Step 1: Write failing validation tests**

Append to `src/validate.test.ts`:

```ts
test("validates existing canvas file references", async () => {
  await write(".readrun/files/flow.canvas", JSON.stringify({
    nodes: [{ id: "a", type: "text", x: 0, y: 0, width: 100, height: 80, text: "A" }],
    edges: [],
  }));
  await write("index.md", "# Hello\n\n[canvas=flow.canvas]\n");
  const result = await validateFolder(tmpDir);
  expect(result.errors).toHaveLength(0);
});

test("errors on missing canvas file reference", async () => {
  await write("index.md", "# Hello\n\n[canvas=missing.canvas]\n");
  const result = await validateFolder(tmpDir);
  expect(result.errors.some((e) => e.file === "index.md" && e.message.includes("missing.canvas"))).toBe(true);
});

test("errors on invalid canvas JSON", async () => {
  await write(".readrun/files/broken.canvas", "{");
  await write("index.md", "# Hello\n\n[canvas=broken.canvas]\n");
  const result = await validateFolder(tmpDir);
  expect(result.errors.some((e) => e.message.includes("invalid JSON"))).toBe(true);
});

test("errors on invalid canvas edge endpoint", async () => {
  await write(".readrun/files/bad-edge.canvas", JSON.stringify({
    nodes: [{ id: "a", type: "text", x: 0, y: 0, width: 100, height: 80, text: "A" }],
    edges: [{ id: "bad", fromNode: "a", toNode: "missing" }],
  }));
  await write("index.md", "# Hello\n\n[canvas=bad-edge.canvas]\n");
  const result = await validateFolder(tmpDir);
  expect(result.errors.some((e) => e.message.includes("missing"))).toBe(true);
});

test("errors on canvas path traversal", async () => {
  await write("index.md", "# Hello\n\n[canvas=../secret.canvas]\n");
  const result = await validateFolder(tmpDir);
  expect(result.errors.some((e) => e.message.includes("traversal"))).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
bun test src/validate.test.ts
```

Expected: fail because `validateFolder()` does not recognize canvas refs.

- [ ] **Step 3: Implement validation**

In `src/validate.ts`:

- import `parseCanvasJson`
- split file refs into typed buckets:
  - script/image refs continue checking `.readrun/scripts/` and `.readrun/images/`
  - canvas refs check `.readrun/files/`
- add traversal rejection for `[canvas=...]`
- parse referenced canvas files and append `CanvasIssue` messages as validation errors
- keep `.readrun/files/` in the existing valid subdir list

- [ ] **Step 4: Run focused tests**

Run:

```bash
bun test src/validate.test.ts src/canvas.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/validate.ts src/validate.test.ts
git commit -m "feat(validate): check JSON Canvas embeds"
```

---

## Task 6: Client DOM/SVG Scene Renderer

**Files:**
- Create: `src/client/canvas.ts`
- Modify: `src/client/main.ts`
- Modify: `src/canvas.ts`
- Modify: `src/canvas.test.ts`

**Ownership:**
- In scope: client mount, safe node/link rendering, SVG edge rendering
- Out of scope: pan/zoom controls and final CSS polish

**Assumption refs:** `A5`

**Invoke skill:** `@test-driven-development`, `@typescript`

- [ ] **Step 1: Write failing pure rendering helper tests**

In `src/canvas.test.ts`, add tests for helpers that the browser code will use:

```ts
import { safeCanvasHref, sortCanvasNodesForRender } from "./canvas";

test("safeCanvasHref permits http https and mailto", () => {
  expect(safeCanvasHref("https://example.com")).toBe("https://example.com/");
  expect(safeCanvasHref("mailto:a@example.com")).toBe("mailto:a@example.com");
});

test("safeCanvasHref rejects javascript URLs", () => {
  expect(safeCanvasHref("javascript:alert(1)")).toBeUndefined();
});

test("sortCanvasNodesForRender preserves JSON Canvas z-index order with groups first for backgrounds", () => {
  const nodes = [
    { id: "a", type: "text" as const, x: 0, y: 0, width: 100, height: 80, text: "A" },
    { id: "g", type: "group" as const, x: -20, y: -20, width: 200, height: 140, label: "G" },
  ];
  expect(sortCanvasNodesForRender(nodes).map((n) => n.id)).toEqual(["g", "a"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
bun test src/canvas.test.ts
```

Expected: fail because helper exports are missing.

- [ ] **Step 3: Implement helpers and client renderer**

In `src/canvas.ts`, add:

```ts
export function safeCanvasHref(value: string): string | undefined {
  try {
    const url = new URL(value, "http://readrun.local");
    if (url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:") {
      return url.protocol === "mailto:" ? value : url.href;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function sortCanvasNodesForRender(nodes: JsonCanvasNode[]): JsonCanvasNode[] {
  return [...nodes].sort((a, b) => {
    if (a.type === "group" && b.type !== "group") return -1;
    if (a.type !== "group" && b.type === "group") return 1;
    return nodes.indexOf(a) - nodes.indexOf(b);
  });
}
```

Create `src/client/canvas.ts`:

- parse every `script[id^="canvas-data-"]`
- find matching `[data-canvas-viewport]`
- create a `.canvas-viewer__scene`
- create an SVG edge layer
- render group/text/file/link nodes as escaped DOM text
- render link nodes as anchors only when `safeCanvasHref()` returns a value
- render invalid links as inert text
- render edge labels as SVG text
- mark initialized viewers with `data-canvas-mounted="true"`
- listen for `readrun:remount`

In `src/client/main.ts`:

```ts
import "./canvas";
```

- [ ] **Step 4: Run focused tests and bundle smoke check**

Run:

```bash
bun test src/canvas.test.ts
bun src/cli.ts build readrun-docs --out=/tmp/readrun-canvas-build-smoke
```

Expected: tests pass and client bundle builds without import errors.

- [ ] **Step 5: Commit**

```bash
git add src/canvas.ts src/canvas.test.ts src/client/canvas.ts src/client/main.ts
git commit -m "feat(canvas): render canvas nodes and edges in client"
```

---

## Task 7: Pan, Zoom, Fit, and Remount Behavior

**Files:**
- Modify: `src/client/canvas.ts`
- Modify: `src/canvas.ts`
- Modify: `src/canvas.test.ts`
- Modify: `src/watch.ts`
- Modify: `src/watch.test.ts`

**Ownership:**
- In scope: interaction state, controls, page-scroll behavior, `.canvas` reload semantics
- Out of scope: visual polish and docs

**Assumption refs:** `A5`

**Invoke skill:** `@test-driven-development`, `@typescript`

- [ ] **Step 1: Write failing state tests**

Append pure state tests:

```ts
import { createCanvasViewState, fitCanvasView } from "./canvas";

test("fitCanvasView computes a scale and offset that fit bounds into viewport", () => {
  const state = fitCanvasView(
    { minX: 0, minY: 0, maxX: 1000, maxY: 500, width: 1000, height: 500, centerX: 500, centerY: 250 },
    { width: 500, height: 250 },
  );

  expect(state.scale).toBeCloseTo(0.45);
  expect(Number.isFinite(state.x)).toBe(true);
  expect(Number.isFinite(state.y)).toBe(true);
});

test("createCanvasViewState starts at 100 percent with no offset", () => {
  expect(createCanvasViewState()).toEqual({ x: 0, y: 0, scale: 1 });
});
```

If `.canvas` changes should invalidate soft reload state, add to `src/watch.test.ts`:

```ts
test("canvas files trigger reload-worthy invalidation", () => {
  expect(shouldInvalidateOnFile("flow.canvas")).toBe(true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
bun test src/canvas.test.ts src/watch.test.ts
```

Expected: fail for missing view-state helpers and possibly `.canvas` invalidation.

- [ ] **Step 3: Implement interactions**

In `src/canvas.ts`, export view state helpers:

```ts
export type CanvasViewState = { x: number; y: number; scale: number };
export type ViewportSize = { width: number; height: number };

export function createCanvasViewState(): CanvasViewState {
  return { x: 0, y: 0, scale: 1 };
}

export function fitCanvasView(bounds: CanvasBounds, viewport: ViewportSize): CanvasViewState {
  if (bounds.width <= 0 || bounds.height <= 0 || viewport.width <= 0 || viewport.height <= 0) return createCanvasViewState();
  const scale = Math.min(viewport.width / bounds.width, viewport.height / bounds.height) * 0.9;
  return {
    scale,
    x: viewport.width / 2 - bounds.centerX * scale,
    y: viewport.height / 2 - bounds.centerY * scale,
  };
}
```

In `src/client/canvas.ts`:

- apply scene transform via `translate(...) scale(...)`
- toolbar buttons call fit, zoom in, zoom out, reset
- drag on empty viewport pans
- do not hijack normal wheel scrolling
- only Ctrl/Cmd-wheel zooms
- dispose/remount idempotently on `readrun:remount`

In `src/watch.ts`, include `.canvas` in `shouldInvalidateOnFile()` if the current behavior does not reliably soft reload changed canvas assets.

- [ ] **Step 4: Run tests and build smoke check**

Run:

```bash
bun test src/canvas.test.ts src/watch.test.ts
bun src/cli.ts build readrun-docs --out=/tmp/readrun-canvas-build-smoke
```

Expected: tests pass and build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/canvas.ts src/canvas.test.ts src/client/canvas.ts src/watch.ts src/watch.test.ts
git commit -m "feat(canvas): add pan zoom and fit controls"
```

---

## Task 8: Canvas Styles, Theme Tokens, and Mobile Layout

**Files:**
- Create: `src/styles/canvas.ts`
- Modify: `src/styles/index.ts`

**Ownership:**
- In scope: CSS only
- Out of scope: client behavior and docs

**Assumption refs:** `A5`

**Invoke skill:** `@typescript`

- [ ] **Step 1: Add style coverage checklist**

Before editing, inspect existing style variables in:

```bash
sed -n '1,220p' src/styles/themes.ts
sed -n '1,220p' src/styles/exec-blocks.ts
```

Record the token names to use in the task notes or commit body.

- [ ] **Step 2: Create canvas styles**

Create `src/styles/canvas.ts` with:

- `.canvas-viewer`
- `.canvas-viewer__header`
- `.canvas-viewer__actions`
- `.canvas-viewer__viewport`
- `.canvas-viewer__scene`
- `.canvas-viewer__edge-layer`
- `.canvas-node`
- `.canvas-node--text`
- `.canvas-node--file`
- `.canvas-node--link`
- `.canvas-node--group`
- `.canvas-viewer-error`
- `--canvas-color-1` through `--canvas-color-6`
- mobile adjustments under the existing mobile breakpoint pattern

Constraints:

- border radius <= 6px
- use existing theme variables
- toolbar buttons must not resize layout
- text must wrap inside nodes
- SVG edge layer must not block node clicks
- viewport must use `overflow: hidden`

- [ ] **Step 3: Wire style bundle**

In `src/styles/index.ts`:

```ts
import { canvasStyles } from "./canvas";

export const styles = `${baseStyles}${execBlockStyles}${uiStyles}${themeStyles}${quizStyles}${canvasStyles}${mobileStyles}`;
```

- [ ] **Step 4: Run build smoke check**

Run:

```bash
bun src/cli.ts build readrun-docs --out=/tmp/readrun-canvas-build-smoke
```

Expected: build succeeds and `_readrun/client.css` contains `.canvas-viewer`.

- [ ] **Step 5: Commit**

```bash
git add src/styles/canvas.ts src/styles/index.ts
git commit -m "style(canvas): add viewer styling"
```

---

## Task 9: Docs Fixture, README, and Static Build Acceptance

**Files:**
- Create: `readrun-docs/docs/json-canvas.md`
- Create: `readrun-docs/.readrun/files/example-flow.canvas`
- Modify: `README.md`

**Ownership:**
- In scope: public docs and sample fixture
- Out of scope: production code behavior

**Assumption refs:** `A3`, `A4`, `A6`

**Invoke skill:** `@writing`, `@readrun`

- [ ] **Step 1: Add docs fixture**

Create `readrun-docs/.readrun/files/example-flow.canvas`:

```json
{
  "nodes": [
    { "id": "start", "type": "text", "x": 0, "y": 0, "width": 180, "height": 80, "text": "Start" },
    { "id": "decision", "type": "text", "x": 300, "y": 0, "width": 220, "height": 100, "text": "Decision" },
    { "id": "finish", "type": "text", "x": 320, "y": 180, "width": 180, "height": 80, "text": "Finish" },
    { "id": "group", "type": "group", "x": -40, "y": -40, "width": 600, "height": 340, "label": "Example flow", "color": "5" }
  ],
  "edges": [
    { "id": "start-decision", "fromNode": "start", "fromSide": "right", "toNode": "decision", "toSide": "left", "label": "next" },
    { "id": "decision-finish", "fromNode": "decision", "fromSide": "bottom", "toNode": "finish", "toSide": "top", "label": "yes" }
  ]
}
```

Create `readrun-docs/docs/json-canvas.md`:

````markdown
# JSON Canvas

Embed `.canvas` files from `.readrun/files/` with a `[canvas=...]` block.

```markdown
[canvas=example-flow.canvas height=460]
```

[canvas=example-flow.canvas height=460]

Canvas files use the JSON Canvas 1.0 format. The viewer is read-only and supports text, file, link, group, and edge records.
````

- [ ] **Step 2: Update README**

Add a feature bullet:

```markdown
- **JSON Canvas viewer** -- embed `.canvas` diagrams and flowcharts with `[canvas=flow.canvas]`; files resolve from `.readrun/files/` and render as a read-only pan/zoom viewer
```

Add a usage snippet near the file-reference section:

````markdown
Canvas diagrams live in `.readrun/files/`:

```markdown
[canvas=flow.canvas height=520]
```
````

- [ ] **Step 3: Validate and build docs**

Run:

```bash
bun src/cli.ts validate readrun-docs
bun src/cli.ts build readrun-docs --out=/tmp/readrun-canvas-build
rg -n "canvas-data-|canvas-viewer" /tmp/readrun-canvas-build/docs/json-canvas/index.html
```

Expected:

- validate exits 0
- build exits 0
- `rg` finds both the canvas viewer shell and embedded JSON data

- [ ] **Step 4: Commit**

```bash
git add README.md readrun-docs/docs/json-canvas.md readrun-docs/.readrun/files/example-flow.canvas
git commit -m "docs(canvas): document JSON Canvas embeds"
```

---

## Task 10: Package Fallback Checkpoint

**Files:**
- Potentially modify: `package.json`
- Potentially modify: `bun.lock`
- Potentially modify: `src/client/canvas.ts`

**Ownership:**
- In scope: only if native renderer misses acceptance after two real attempts
- Out of scope: adding package because it is convenient

**Assumption refs:** `A1`

**Invoke skill:** `@library-docs`, `@typescript`

- [ ] **Step 1: Decide whether fallback trigger is met**

Do not execute this task unless at least one native client acceptance item failed after two materially different attempts.

Record:

```markdown
Fallback trigger reached:
- Failed item:
- Attempt 1:
- Attempt 2:
- Why native continuation is not worth it:
```

- [ ] **Step 2: If triggered, install package**

Run:

```bash
bun add json-canvas-viewer@4.2.0
```

Expected: `package.json` and `bun.lock` update.

- [ ] **Step 3: Replace only the client renderer**

Keep readrun's native:

- `[canvas=...]` block syntax
- `.readrun/files/` resolution
- validation
- static JSON embedding
- docs

Replace only browser scene rendering in `src/client/canvas.ts` with `JSONCanvasViewer`.

- [ ] **Step 4: Run full focused checks**

Run:

```bash
bun test src/canvas.test.ts src/markdown.test.ts src/validate.test.ts
bun src/cli.ts validate readrun-docs
bun src/cli.ts build readrun-docs --out=/tmp/readrun-canvas-build
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add package.json bun.lock src/client/canvas.ts
git commit -m "feat(canvas): use json-canvas-viewer fallback"
```

---

## Task 11: Final Acceptance Gate

**Files:**
- Modify: `.warden/specs/2026-05-05-json-canvas-viewer-design.md`

**Ownership:**
- In scope: verification only and post-implementation review
- Out of scope: new feature work

**Assumption refs:** `A1`, `A2`, `A3`, `A4`, `A5`, `A6`

**Invoke skill:** `@verification-before-completion`

- [ ] **Step 1: Run full test suite**

Run:

```bash
bun test
```

Expected: all tests pass.

- [ ] **Step 2: Run spec acceptance commands**

Run:

```bash
bun test src/canvas.test.ts
bun test src/markdown.test.ts
bun test src/validate.test.ts
bun src/cli.ts validate readrun-docs
bun src/cli.ts build readrun-docs --out=/tmp/readrun-canvas-build
rg -n "canvas-data-|canvas-viewer" /tmp/readrun-canvas-build/docs/json-canvas/index.html
rg -n "<img src=x onerror|javascript:alert" /tmp/readrun-canvas-build/docs/json-canvas/index.html || true
```

Expected:

- focused tests pass
- validate/build pass
- rendered HTML contains canvas viewer and JSON data
- malicious strings only appear escaped in test fixtures, never as executable HTML or clickable `javascript:` links

- [ ] **Step 3: Manual browser check if no browser harness exists**

Run:

```bash
bun src/cli.ts serve readrun-docs --port=3001 --no-open
```

Open `/docs/json-canvas` manually and check:

- canvas renders nonblank
- Fit, zoom in, zoom out, reset work
- dragging the background pans
- normal page scroll still works over the viewer
- mobile/narrow viewport does not overlap toolbar text

Stop the server before ending the task.

- [ ] **Step 4: Fill post-implementation review**

Append to `.warden/specs/2026-05-05-json-canvas-viewer-design.md`:

```markdown
## Post-Implementation Review

### Acceptance Results

- [ ] `bun test src/canvas.test.ts`:
- [ ] `bun test src/markdown.test.ts`:
- [ ] `bun test src/validate.test.ts`:
- [ ] `bun src/cli.ts validate readrun-docs`:
- [ ] `bun src/cli.ts build readrun-docs --out=/tmp/readrun-canvas-build`:
- [ ] Static HTML inspection:
- [ ] Browser check:

### Scope Drift

- None, or list each drift and why it was kept.

### Known Limitations

- None, or list deferred acceptance items with root cause and revisit trigger.

### Refactor Proposals

- None, or list follow-up refactors with trigger conditions.
```

- [ ] **Step 5: Commit**

```bash
git add .warden/specs/2026-05-05-json-canvas-viewer-design.md
git commit -m "docs(canvas): record implementation review"
```

---

## Execution Notes

- Keep native implementation dependency-free unless Task 10 is explicitly triggered.
- Do not render Markdown inside canvas text nodes in the MVP; escape text as text.
- Do not permit `javascript:` or arbitrary schemes in link nodes.
- Do not fetch canvas JSON at runtime for `[canvas=...]`; static builds must carry the data in HTML.
- Do not add edit mode, node dragging, save behavior, minimap, or full Obsidian parity during this plan.
- If the implementation discovers a meaningful spec mismatch, update the design spec before continuing and bump this plan's refinement pass.
