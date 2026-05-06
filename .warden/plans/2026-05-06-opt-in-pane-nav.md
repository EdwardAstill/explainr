# Opt-In Pane Navigation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development to implement this plan task-by-task when tasks are independent. For same-session manual execution, follow this plan directly. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a content folder opt into a multi-pane drill-down sidebar by shipping a single small file: `.readrun/nav.yaml` containing `panes: N` (2–4). When the file is absent, the existing collapsed-tree sidebar continues to render unchanged. The pinned search box reorders every pane simultaneously so the closest match floats to the top of each pane.

**Why this shape:**

- Most folders should not have to know about navigation at all. Defaults must be sensible with zero config.
- `.readrun/virtual-paths.yaml` controls *which pages exist*. `.readrun/nav.yaml` controls *how the existing pages are displayed*. Two concerns, two files.
- Authors should be able to enable panes with one line. Pane labels, depth ladders, and per-pane filters are *optional* — labels infer from folder depth, depth infers from `panes: N`.
- Search reorders rather than filters: every pane keeps the same set of items but re-sorts by match score. This preserves the user's place in the tree while surfacing matches.
- Quizzes get **no** special navigation treatment. They are ordinary lessons in the tree.

**Architecture:**

A new pure module `src/navConfig.ts` parses `.readrun/nav.yaml` and exposes a `NavConfig` object. `renderPage.ts` (or wherever the sidebar HTML is currently composed) reads `NavConfig` and chooses one of two render paths: existing `renderNav()` (tree, default) or new `renderPanesNav()` (panes, opt-in). The pane data is the same `NavNode[]` tree that `buildNavTree()` already produces — no new traversal. Client-side, a new `src/client/panes.ts` module owns pane state, rendering, and the search-reorder logic; `src/client/site-search.ts` is extended with a small reorder helper that exposes match scores per item so panes can use the same scoring as the search dropdown.

**Tech Stack:** TypeScript, Bun, `yaml` package (already a dep), `bun:test`

**Recommended Skills:** `typescript`, `test-driven-development`

**Recommended MCPs:** none

**Status:** approved
**Refinement passes:** 1

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/navConfig.ts` | **Create** | `NavConfig` type, `parseNavConfig()`, `loadNavConfig()`, defaults logic |
| `src/navConfig.test.ts` | **Create** | Unit tests: missing file → default; valid `panes: 3`; invalid values; optional `labels:` and `hide:` |
| `src/nav.ts` | **Modify** | Add `renderPanesNav(tree, currentPath, config)` exported alongside existing `renderNav()` |
| `src/nav.test.ts` | **Modify** | Add tests for `renderPanesNav()` output structure (depth, columns, search hooks) |
| `src/renderPage.ts` | **Modify** | Load `NavConfig` once per build; dispatch to `renderNav` or `renderPanesNav`; serialize config into client bootstrap so JS knows which mode to mount |
| `src/init.ts` | **Modify** | Optional: include a commented `nav.yaml` template alongside the existing `virtual-paths.yaml` template |
| `src/validate.ts` | **Modify** | Report `nav.yaml` parse issues; warn if `panes: N` exceeds the actual folder depth |
| `src/watch.ts` | **Modify** | Watch `.readrun/nav.yaml` and trigger sidebar rebuild on change |
| `src/client/panes.ts` | **Create** | Pane state, rendering, click-to-drill, search-reorder |
| `src/client/site-search.ts` | **Modify** | Export a reusable `scoreItem(query, label) → number` so panes can reorder using identical scoring |
| `src/client/main.ts` | **Modify** | If config indicates panes mode, mount `panes.ts`; otherwise leave existing tree behavior alone |
| `src/client/styles.css` (or wherever sidebar CSS lives) | **Modify** | Add panes-mode grid layout, pane scroll behavior, `mark` highlight, dim/match/match-strong row classes |
| `readrun-docs/.../nav.md` | **Create** | One-page author doc: when to use panes, the one-line config, search-reorder behavior |

---

## Task 1: `src/navConfig.ts` — schema, parser, loader, defaults

**Files:**
- Create: `src/navConfig.ts`
- Create: `src/navConfig.test.ts`

**Invoke skill:** `typescript` before starting this task.

- [ ] **Step 1: Write the failing tests**

Create `src/navConfig.test.ts`:

```typescript
import { describe, it, expect } from "bun:test";
import { parseNavConfig, DEFAULT_NAV_CONFIG } from "./navConfig";

describe("parseNavConfig", () => {
  it("returns defaults for empty/null/missing input", () => {
    expect(parseNavConfig("").config).toEqual(DEFAULT_NAV_CONFIG);
    expect(parseNavConfig(null as any).config).toEqual(DEFAULT_NAV_CONFIG);
  });

  it("default mode is 'tree' with search enabled", () => {
    expect(DEFAULT_NAV_CONFIG.mode).toBe("tree");
    expect(DEFAULT_NAV_CONFIG.search.enabled).toBe(true);
  });

  it("`panes: 3` switches to panes mode with 3 columns", () => {
    const r = parseNavConfig("panes: 3");
    expect(r.config.mode).toBe("panes");
    expect(r.config.panes).toBe(3);
    expect(r.issues).toHaveLength(0);
  });

  it("clamps panes to [2, 4]", () => {
    expect(parseNavConfig("panes: 1").issues[0]?.kind).toBe("out_of_range");
    expect(parseNavConfig("panes: 7").issues[0]?.kind).toBe("out_of_range");
    expect(parseNavConfig("panes: 1").config.mode).toBe("tree");
  });

  it("labels are optional; absent labels => inferred from folder depth", () => {
    const r = parseNavConfig("panes: 3");
    expect(r.config.labels).toBeUndefined();
  });

  it("explicit labels override defaults", () => {
    const r = parseNavConfig("panes: 3\nlabels: [areas, books, chapters]");
    expect(r.config.labels).toEqual(["areas", "books", "chapters"]);
  });

  it("rejects unknown top-level fields with an issue, not a throw", () => {
    const r = parseNavConfig("panes: 2\nbogus: true");
    expect(r.issues.find(i => i.kind === "unknown_field")?.field).toBe("bogus");
  });
});
```

Run: `cd ~/projects/readrun && bun test src/navConfig.test.ts` → confirm all tests fail.

- [ ] **Step 2: Implement `parseNavConfig()` and `DEFAULT_NAV_CONFIG`**

Create `src/navConfig.ts`. Mirror the shape of `src/manifest.ts` for issue reporting. Schema:

```typescript
export interface NavConfig {
  mode: "tree" | "panes";
  panes?: number;            // 2-4 when mode === "panes"
  labels?: string[];         // optional; length should match panes
  search: { enabled: boolean };
  hide: string[];            // glob patterns; default ["**/plan.md", "**/glossary.md"]
}
```

`DEFAULT_NAV_CONFIG`: `mode: "tree"`, `search.enabled: true`, `hide: ["**/plan.md","**/glossary.md"]`.

- [ ] **Step 3: Add `loadNavConfig(contentDir: string): Promise<NavConfigLoad>`**

Reads `<contentDir>/.readrun/nav.yaml` if present; returns defaults when absent. No throws — file-not-found is the common path.

- [ ] **Step 4: Run tests until green**

```bash
cd ~/projects/readrun && bun test src/navConfig.test.ts
```

**Acceptance:**
- `bun test src/navConfig.test.ts` passes
- File-absent returns `DEFAULT_NAV_CONFIG` with zero issues
- `panes: 3` produces `{ mode: "panes", panes: 3 }`
- Out-of-range `panes:` falls back to tree mode and reports an issue

---

## Task 2: `src/nav.ts` — add `renderPanesNav()`

**Files:**
- Modify: `src/nav.ts`
- Modify: `src/nav.test.ts`

**Depends on:** Task 1

- [ ] **Step 1: Write the failing tests**

Add to `src/nav.test.ts`:

```typescript
import { renderPanesNav } from "./nav";

describe("renderPanesNav", () => {
  it("renders N pane <ul>s with data-pane-depth attributes", async () => {
    const dir = await makeTempRepo({
      "courses/ai/intro.md": "# Intro",
      "courses/math/vectors.md": "# Vectors",
      "units/ai/embeddings.md": "# Emb",
    });
    dirs.push(dir);
    const tree = await buildNavTree(dir);
    const html = renderPanesNav(tree, "/courses/ai/intro", { panes: 3 });
    expect(html).toContain('data-pane-depth="0"');
    expect(html).toContain('data-pane-depth="1"');
    expect(html).toContain('data-pane-depth="2"');
    expect(html).not.toContain('data-pane-depth="3"');
  });

  it("emits items with searchable text in data attribute for client-side reorder", async () => {
    const dir = await makeTempRepo({ "courses/ai/intro.md": "# Intro" });
    dirs.push(dir);
    const tree = await buildNavTree(dir);
    const html = renderPanesNav(tree, "/courses/ai/intro", { panes: 2 });
    expect(html).toMatch(/data-search-label="[^"]+"/);
  });

  it("marks the active path with `aria-current` on every ancestor pane row", async () => {
    const dir = await makeTempRepo({ "courses/ai/intro.md": "# Intro" });
    dirs.push(dir);
    const tree = await buildNavTree(dir);
    const html = renderPanesNav(tree, "/courses/ai/intro", { panes: 3 });
    // courses, ai, intro all marked
    expect((html.match(/aria-current/g) || []).length).toBeGreaterThanOrEqual(3);
  });
});
```

- [ ] **Step 2: Implement `renderPanesNav(tree, currentPath, { panes, labels? })`**

Walk the tree to produce N parallel `<ul class="rr-pane" data-pane-depth="i">` lists. Each `<li>` carries `data-search-label`, `data-path`, and class `rr-pane-row` plus `is-active` on the ancestor chain of `currentPath`. The container is `<nav class="sidebar-nav rr-panes" data-panes="N">`.

- [ ] **Step 3: Run tests**

```bash
cd ~/projects/readrun && bun test src/nav.test.ts
```

**Acceptance:**
- `bun test src/nav.test.ts` passes including the new cases
- `renderPanesNav` returns HTML with one `data-pane-depth` per pane
- Items carry `data-search-label` for client reorder

---

## Task 3: `src/renderPage.ts` — dispatch tree vs. panes; ship config to client

**Files:**
- Modify: `src/renderPage.ts`
- Modify: `src/renderPage.test.ts` (if exists; otherwise extend existing render-related tests)

**Depends on:** Tasks 1, 2

- [ ] **Step 1: Write/extend tests**

Add a test that:
- when no `.readrun/nav.yaml` exists, the rendered HTML contains `<nav class="sidebar-nav nav-tree">` (existing class)
- when `nav.yaml` has `panes: 3`, the rendered HTML contains `<nav class="sidebar-nav rr-panes" data-panes="3">`
- in both cases, a `<script>` tag (or `data-` attribute on `<body>`) carries the navConfig serialized as JSON for the client

- [ ] **Step 2: Implement dispatch**

In `renderPage.ts`, call `loadNavConfig(contentDir)` once and pass the result through to the sidebar render call. If `mode === "panes"`, call `renderPanesNav`; else `renderNav`. Inject `<script id="rr-nav-config" type="application/json">{ "mode": "...", "panes": N }</script>` so the client knows what to mount.

- [ ] **Step 3: Run tests**

```bash
cd ~/projects/readrun && bun test
```

**Acceptance:**
- Default folder still produces existing `nav-tree` markup (no regression)
- Folder with `panes: 3` produces `rr-panes` markup
- Client can read config via `JSON.parse(document.getElementById('rr-nav-config').textContent)`

---

## Task 4: `src/client/site-search.ts` — extract reusable `scoreItem`

**Files:**
- Modify: `src/client/site-search.ts`

**Depends on:** (none — independent of Tasks 1–3)

- [ ] **Step 1: Refactor `score()` into a pure helper**

Pull the per-item scoring logic out so panes can call the *same* scoring function. Export:

```typescript
export function scoreItem(query: string, label: string): { score: number; firstHitIndex: number };
```

Where `score`:
- 3 = label starts with query (case-insensitive)
- 2 = label contains query as a substring
- 1 = each query token found somewhere (multi-word case)
- 0 = no match

`firstHitIndex` is `label.toLowerCase().indexOf(query.toLowerCase())` (or `-1`).

- [ ] **Step 2: Existing search dropdown keeps working**

The existing dropdown logic should continue to use the same scoring. Confirm nothing visible changes for the existing search behavior.

- [ ] **Step 3: Quick smoke**

```bash
cd ~/projects/readrun && rr build /home/eastill/projects/courses && rr preview /home/eastill/projects/courses/dist
```

Open the built site and confirm the existing tree-mode search dropdown still works.

**Acceptance:**
- `scoreItem` is exported and used by both the search dropdown and (in Task 5) panes reorder
- Existing search behavior unchanged

---

## Task 5: `src/client/panes.ts` — render panes, click-to-drill, search reorders

**Files:**
- Create: `src/client/panes.ts`
- Modify: `src/client/main.ts`

**Depends on:** Tasks 2, 3, 4

- [ ] **Step 1: Mount logic in `main.ts`**

```typescript
const cfgEl = document.getElementById('rr-nav-config');
const cfg = cfgEl ? JSON.parse(cfgEl.textContent || '{}') : { mode: 'tree' };
if (cfg.mode === 'panes') {
  import('./panes').then(m => m.mountPanes(cfg));
}
```

- [ ] **Step 2: Implement `mountPanes(cfg)` in `panes.ts`**

Behavior:
- Read all `.rr-pane-row` elements grouped by `data-pane-depth`.
- Maintain a `focusPath: string[]` (one segment per pane). Initialize from the active row chain in the server-rendered HTML.
- Clicking a row in pane *i* sets `focusPath[i]`, clears `focusPath[i+1..]`, and re-renders panes *i+1..N-1* from the underlying tree (which is also embedded in the page as JSON, or fetched once from `/_readrun/nav-tree.json`).
- On search-input event (use the existing site-search input element), run `scoreItem(query, row.dataset.searchLabel)` for every row in every pane, sort each pane's rows in place by `(-score, firstHitIndex, label)`, and apply `match-strong | match | dim` classes. Empty query restores natural sort.
- Highlight the matched substring with a `<mark>` wrapper (cache original HTML to restore on clear).

- [ ] **Step 3: Wire keyboard shortcut**

`Cmd+K` / `Ctrl+K` focuses the search input. (Already exists for tree mode? If yes, reuse; if not, add in `panes.ts`.)

- [ ] **Step 4: Smoke test in a real folder**

In `~/projects/courses`, add a temporary `.readrun/nav.yaml` containing `panes: 3`, run `rr build .`, then `rr preview dist/`. Confirm:
- 3 panes render
- Clicking a domain in pane 1 narrows panes 2–3
- Typing `loss` reorders all panes; `<mark>` highlights appear

Then remove the temporary file and rerun `rr build .` — confirm sidebar reverts to tree mode.

**Acceptance:**
- Panes render and respond to clicks
- Search reorders all visible panes simultaneously using identical scoring to the dropdown
- Folder without `nav.yaml` is untouched

---

## Task 6: CSS — pane layout, match/dim states, highlight

**Files:**
- Modify: existing sidebar stylesheet (locate via grep for `.sidebar-nav`)

**Depends on:** Task 5

- [ ] **Step 1: Add styles**

```css
.rr-panes { display: grid; height: 100%; min-width: 0; }
.rr-panes[data-panes="2"] { grid-template-columns: 140px 1fr; }
.rr-panes[data-panes="3"] { grid-template-columns: 90px 150px 1fr; }
.rr-panes[data-panes="4"] { grid-template-columns: 80px 130px 160px 1fr; }
.rr-pane { overflow: auto; min-width: 0; border-right: 1px solid var(--rr-border); }
.rr-pane:last-child { border-right: none; }
.rr-pane-row { padding: 7px 14px; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rr-pane-row.is-active { background: var(--rr-accent-bg); border-left: 2px solid var(--rr-accent); }
.rr-pane-row.match-strong { color: var(--rr-accent); font-weight: 600; }
.rr-pane-row.dim { opacity: 0.5; }
.rr-pane-row mark { background: var(--rr-mark-bg); color: inherit; padding: 0 1px; border-radius: 2px; }
```

Use existing CSS variables where they exist; introduce new ones only if necessary.

- [ ] **Step 2: Visual check**

Same smoke test as Task 5 — confirm spacing, scroll behavior, and highlight readability.

**Acceptance:**
- 2/3/4 pane layouts render without horizontal overflow
- Match and dim classes are visually distinguishable
- `<mark>` highlight readable against active and inactive rows

---

## Task 7: `src/watch.ts` and `src/validate.ts` — wire the new file

**Files:**
- Modify: `src/watch.ts`
- Modify: `src/validate.ts`

**Depends on:** Task 1

- [ ] **Step 1: Watch `.readrun/nav.yaml`**

Mirror the pattern already used for `virtual-paths.yaml`. On change, set `needsLinkInvalidation = true` (or whatever the equivalent rebuild flag is) so the dev server reloads sidebar HTML.

- [ ] **Step 2: Validate**

In `validateFolder()`, call `loadNavConfig` and surface parse issues in the `rr validate` report. Add a soft warning when `panes: N` exceeds the actual folder depth.

- [ ] **Step 3: Tests**

Extend `src/validate.test.ts` (or equivalent) with one happy path and one out-of-range case.

**Acceptance:**
- `rr watch .` reloads when `.readrun/nav.yaml` changes
- `rr validate .` reports parse errors and depth-mismatch warnings

---

## Task 8: `src/init.ts` — scaffold optional template

**Files:**
- Modify: `src/init.ts`

**Depends on:** Task 1

- [ ] **Step 1: Add a commented `nav.yaml` template**

When `rr init` runs, write `.readrun/nav.yaml` containing only commented examples — the file is *present but inert*, so the default tree mode still applies. Authors uncomment one line to enable panes:

```yaml
# Optional. Default sidebar is a collapsed tree. Uncomment to opt into panes:
# panes: 3
```

- [ ] **Step 2: Test**

Confirm `rr init` produces both `virtual-paths.yaml` and `nav.yaml` templates and that an inert `nav.yaml` still renders the tree.

**Acceptance:**
- `rr init <empty-dir>` writes both manifest files
- Default tree mode unchanged when `nav.yaml` is all comments

---

## Task 9: Author doc

**Files:**
- Create: `readrun-docs/.../nav.md` (locate the existing docs tree)

**Depends on:** Tasks 1–8

**Invoke skill:** `writing` before starting this task.

One short page covering:

- Default = collapsed tree, search pinned at top.
- One-line opt-in: `panes: 3` in `.readrun/nav.yaml`.
- Pane labels and depth ladder are inferred from folder depth.
- Search reorders every pane; closest match floats up.
- Quizzes get no special treatment.
- Suggested defaults to leave alone unless you have a reason.

**Acceptance:**
- Doc page is < 60 lines
- One copy-pastable example block

---

## Task 10: End-to-end verification on `~/projects/courses`

**Depends on:** Tasks 1–9

- [ ] **Step 1: With no `.readrun/nav.yaml`**

```bash
cd ~/projects/courses && rr build . && python3 -c "import json; d=json.load(open('dist/_readrun/search-index.json')); print(len(d), 'pages')"
```

Confirm sidebar HTML in a built page still uses `nav-tree`. No regression vs current state.

- [ ] **Step 2: With `panes: 3`**

```bash
echo "panes: 3" > .readrun/nav.yaml
rr build .
```

Open `dist/` in `rr preview`. Confirm:
- 3 panes
- Click drill works across `courses/<domain>/<course>/<lesson>` and `units/<domain>/<unit>/<lesson>`
- Typing `loss` reorders all panes simultaneously with `<mark>` highlights
- Quizzes appear as ordinary lesson rows with no grouping

- [ ] **Step 3: With invalid value**

```bash
echo "panes: 99" > .readrun/nav.yaml
rr validate .
```

Confirm a clear validation message and that `rr build .` falls back to tree mode without crashing.

- [ ] **Step 4: Cleanup**

```bash
rm .readrun/nav.yaml
rr build .
```

Confirm tree mode restored.

**Acceptance:**
- Default behavior on real content folder unchanged when file is absent
- Panes mode works on real content folder when file is present
- Invalid config falls back to tree with a validation warning

---

## Risks

- **Existing tree CSS classes** may collide with the new `rr-pane*` classes. Audit before adding.
- **`buildNavTree` already filters via `virtual-paths.yaml`.** Panes mode must use the same filtered tree — do not re-walk the filesystem in panes code.
- **Search reorder on very large trees** (>2000 items): all DOM operations should batch via `requestAnimationFrame` and avoid layout thrash. If perf is bad, fall back to filtering rather than reordering on huge trees.
- **Pane labels inferred from folder depth** assume folder names are human-readable. They usually are in courses/units, but if a folder is `_internal`, labels could look ugly. Acceptable for v1.

## Guardrails

- Folder with no `.readrun/nav.yaml` must produce **byte-identical** sidebar HTML to today's behavior. Regression test enforces this.
- No new required config keys. `panes: N` is the only thing an author needs to type.
- Quizzes get **no** special-casing in nav code paths.
- Search scoring lives in **one** place (`scoreItem` in `site-search.ts`); panes import it.
- `nav.yaml` is **independent** of `virtual-paths.yaml`. Do not merge them.

## Done Definition

This plan is complete when:

- A folder with no `.readrun/nav.yaml` renders the existing collapsed tree, search pinned, with no visible change.
- A folder containing `panes: 3` (one line) renders three drill-down panes against the same filtered tree.
- The pinned search box reorders every pane in panes mode and continues to drive the existing dropdown in tree mode, using the same scoring function.
- `rr validate` reports config errors with line numbers; invalid configs fall back to tree mode without crashing.
- `rr init` scaffolds a commented `nav.yaml` template alongside the existing `virtual-paths.yaml`.
- Author doc page exists and contains the one-line opt-in example.
