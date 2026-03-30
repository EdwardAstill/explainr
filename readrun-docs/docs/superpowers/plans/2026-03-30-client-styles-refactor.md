# Client Scripts & Styles Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `client-scripts.ts` (1072 lines) and `styles.ts` (773 lines) into focused modules under `src/client/` and `src/styles/`, update imports in `template.ts`.

**Architecture:** Each new module exports a raw string fragment (JS or CSS, no wrapper tags). An `index.ts` in each directory concatenates fragments and wraps in `<script>` or `<style>` tags. `template.ts` imports from the new index files. No functional changes.

**Tech Stack:** TypeScript, Bun, template literal strings

---

### Task 1: Create `src/styles/base.ts`

**Files:**
- Create: `src/styles/base.ts`
- Source: `src/styles.ts:1-198` (everything from reset through `.readrun-img`)

- [ ] **Step 1: Create the file**

Create `src/styles/base.ts` with the CSS from `styles.ts` lines 1-198. This includes: reset, `:root` variables, `body`, `.sidebar`, `.nav-tree` shared styles, `.sidebar-nav`, `.main`, `.toc-sidebar`, `.toc-link--active`, `.resize-handle`, focus mode hide rules for TOC/resize, responsive breakpoints, all `.markdown-body` styles, and `.readrun-img`.

```ts
export const baseStyles = `
    /* Reset */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --sidebar-width: 260px;
      --color-bg: #ffffff;
      --color-sidebar-bg: #f6f8fa;
      --color-border: #d0d7de;
      --color-text: #1f2328;
      --color-text-muted: #656d76;
      --color-link: #0969da;
      --color-active-bg: #dcdcdc;
      --color-code-bg: #f6f8fa;
      --font-body: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
      --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
    }
```

Copy the full CSS content from `styles.ts` lines 2-198 (inside the template literal, without the opening `` export const styles = ` `` or the closing `` `; ``). Wrap in `` export const baseStyles = ` ... `; ``.

- [ ] **Step 2: Verify it's valid TypeScript**

Run: `bun build src/styles/base.ts --target=bun --outfile=/dev/null`
Expected: builds without errors

---

### Task 2: Create `src/styles/exec-blocks.ts`

**Files:**
- Create: `src/styles/exec-blocks.ts`
- Source: `src/styles.ts:200-358` (from `.lightbox` through `.code-modal__output`)

- [ ] **Step 1: Create the file**

Create `src/styles/exec-blocks.ts` containing: `.lightbox` styles, `.exec-block` and all children (`.exec-block-header`, `.exec-run-btn`, `.exec-output`, `.exec-stdout`, `.exec-stderr`, `.exec-loading`, `.exec-block-actions`, `.exec-toggle-btn`, `.exec-block--collapsed`, `.exec-enlarge-btn`), `.upload-block` and all children, `.code-modal` and all children.

Copy CSS from `styles.ts` lines 200-358. Wrap in `` export const execBlockStyles = ` ... `; ``.

- [ ] **Step 2: Verify it's valid TypeScript**

Run: `bun build src/styles/exec-blocks.ts --target=bun --outfile=/dev/null`
Expected: builds without errors

---

### Task 3: Create `src/styles/ui.ts`

**Files:**
- Create: `src/styles/ui.ts`
- Source: `src/styles.ts:360-773` (from `.resource-switcher` through end), EXCLUDING themes (lines 486-611) and focus mode sidebar hide (lines 612-614)

- [ ] **Step 1: Create the file**

Create `src/styles/ui.ts` containing: `.resource-switcher` styles, `.search-bar` and children, `.search-highlight`, `.context-menu` styles, focus mode sidebar/settings hide (`[data-focus="true"] .sidebar`, `[data-focus="true"] .settings`), `.overlay` and children, `@keyframes overlay-fade-in`, `.shortcuts-grid` and children, `kbd`, `.theme-grid` and `.theme-card` styles, `.settings__theme-row`, `.settings__theme-arrow`, `.settings__theme-name`, `.settings__shortcuts-btn`, `.settings` and `.settings__panel` and all children.

Copy CSS from `styles.ts` lines 360-485 (resource-switcher through context-menu) + lines 612-773 (focus mode, overlays, shortcuts, theme picker, settings). Wrap in `` export const uiStyles = ` ... `; ``.

- [ ] **Step 2: Verify it's valid TypeScript**

Run: `bun build src/styles/ui.ts --target=bun --outfile=/dev/null`
Expected: builds without errors

---

### Task 4: Create `src/styles/themes.ts`

**Files:**
- Create: `src/styles/themes.ts`
- Source: `src/styles.ts:486-611` (all `[data-theme]` blocks and highlight.js theme overrides)

- [ ] **Step 1: Create the file**

Create `src/styles/themes.ts` containing all theme variable definitions (`[data-theme="dark"]` through `[data-theme="catppuccin"]`), all highlight.js base styles (`.hljs`, `.hljs-comment`, etc.), and all theme-specific highlight.js overrides.

Copy CSS from `styles.ts` lines 486-611. Wrap in `` export const themeStyles = ` ... `; ``.

- [ ] **Step 2: Verify it's valid TypeScript**

Run: `bun build src/styles/themes.ts --target=bun --outfile=/dev/null`
Expected: builds without errors

---

### Task 5: Create `src/styles/index.ts` and wire up

**Files:**
- Create: `src/styles/index.ts`
- Modify: `src/template.ts:2`

- [ ] **Step 1: Create the index file**

```ts
import { baseStyles } from "./base";
import { execBlockStyles } from "./exec-blocks";
import { uiStyles } from "./ui";
import { themeStyles } from "./themes";

export const styles = `${baseStyles}${execBlockStyles}${uiStyles}${themeStyles}`;
```

- [ ] **Step 2: Update template.ts import**

Change line 2 of `src/template.ts` from:
```ts
import { styles } from "./styles";
```
to:
```ts
import { styles } from "./styles/index";
```

- [ ] **Step 3: Verify build compiles**

Run: `bun build src/cli.ts --target=bun --outfile=/dev/null`
Expected: builds without errors

- [ ] **Step 4: Snapshot HTML output for comparison**

Run: `bun src/cli.ts -t -b /tmp/readrun-before 2>/dev/null` (or equivalent build command) to capture the current output. We'll compare after the full migration.

---

### Task 6: Delete `src/styles.ts`

**Files:**
- Delete: `src/styles.ts`

- [ ] **Step 1: Verify no other imports of old file**

Run: `grep -r 'from.*["\x27]./styles["\x27]' src/` — should show only `template.ts` which was already updated.

- [ ] **Step 2: Delete the file**

```bash
rm src/styles.ts
```

- [ ] **Step 3: Verify build still compiles**

Run: `bun build src/cli.ts --target=bun --outfile=/dev/null`
Expected: builds without errors

- [ ] **Step 4: Commit styles refactor**

```bash
git add src/styles/ src/template.ts
git rm src/styles.ts
git commit -m "refactor: split styles.ts into focused modules under src/styles/"
```

---

### Task 7: Create `src/client/execution.ts`

**Files:**
- Create: `src/client/execution.ts`
- Source: `src/client-scripts.ts:1-312` (from `PYODIDE_URL` through run button click handler)

- [ ] **Step 1: Create the file**

Create `src/client/execution.ts` exporting two things:
1. `PYODIDE_URL` as a named export (used by `index.ts` for the script tag)
2. `executionCode` — the JS string containing: `IMPORT_TO_PKG`, `STDLIB`, `parseImports`, `loadPyodideRuntime`, `installPackages`, `scanPageImports`, preloading trigger, `snapshotFS`, `detectNewFiles`, `renderFileDownloads`, `renderFigures`, `runPyodide`, `RESIZE_SCRIPT`, iframe resize listener, `runHtml`, toggle click handler, run button click handler, `escapeHtml` (client-side).

The `PYODIDE_URL` needs to be interpolated into the JS string. Keep it as a template literal:

```ts
export const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js";

export const executionCode = `
    let pyodide = null;
    let pyodideLoading = null;
    let packagesReady = null;

    const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp"]);
    // ... rest of code through run button click handler and escapeHtml ...
`;
```

Copy the JS from `client-scripts.ts` lines 3-318 (the content inside the first `<script type="module">` block, from `let pyodide = null;` through the `escapeHtml` function). Do NOT include the `<script>` tags. The `${PYODIDE_URL}` interpolation on the `script.src` line must still reference the exported constant.

- [ ] **Step 2: Verify it's valid TypeScript**

Run: `bun build src/client/execution.ts --target=bun --outfile=/dev/null`
Expected: builds without errors

---

### Task 8: Create `src/client/code-ui.ts`

**Files:**
- Create: `src/client/code-ui.ts`
- Source: `src/client-scripts.ts:320-443` (file upload handler, enlarge modal, image lightbox)

- [ ] **Step 1: Create the file**

Create `src/client/code-ui.ts` containing: file upload change handler, code enlarge modal (element refs, `openCodeModal`, `closeCodeModal`, MutationObserver, enlarge button click, close button click, backdrop click, run delegation, Escape handler), image lightbox (element refs, click handler, close handler, Escape handler).

Copy JS from `client-scripts.ts` lines 320-443. Wrap in `` export const codeUiCode = ` ... `; ``.

Note: this code references `loadPyodideRuntime` and `escapeHtml` which are defined in `execution.ts`. This works because at runtime both fragments are concatenated inside the same `<script type="module">` block.

- [ ] **Step 2: Verify it's valid TypeScript**

Run: `bun build src/client/code-ui.ts --target=bun --outfile=/dev/null`
Expected: builds without errors

---

### Task 9: Create `src/client/settings.ts`

**Files:**
- Create: `src/client/settings.ts`
- Source: `src/client-scripts.ts:445-597` (from `settingsScript` opening through overlay backdrop clicks)

- [ ] **Step 1: Create the file**

Create `src/client/settings.ts` containing: `STORAGE_KEY`, `THEMES`, `THEME_LABELS`, `FONT_SIZES`, `fontSizeMap`, `defaults`, `escapeHtml` (settings-side copy), `loadSettings`, `saveSettings`, `applySettings`, initial `applySettings` call, settings panel mousedown-to-close, font size button handlers, width slider handler, sidebar toggle handler, `cycleTheme`, theme prev/next buttons, theme name click, theme picker card clicks, shortcuts button click, `openOverlay`, `closeAllOverlays`, `isAnyOverlayOpen`, overlay backdrop click handlers.

Copy JS from `client-scripts.ts` lines 447-597 (the content inside the second `<script type="module">`, from `const STORAGE_KEY` through overlay backdrop clicks). Wrap in `` export const settingsCode = ` ... `; ``.

- [ ] **Step 2: Verify it's valid TypeScript**

Run: `bun build src/client/settings.ts --target=bun --outfile=/dev/null`
Expected: builds without errors

---

### Task 10: Create `src/client/navigation.ts`

**Files:**
- Create: `src/client/navigation.ts`
- Source: `src/client-scripts.ts:599-815` (page nav through resource browser)

- [ ] **Step 1: Create the file**

Create `src/client/navigation.ts` containing: `getNavLinks`, `getCurrentPageIndex`, `navigateToPage`, `cycleFontSize`, `toggleFocusMode`, TOC scroll spy (`tocLinks`, `headingEls`, `updateActiveToc`, scroll listener), `initResize` and both resize handle inits, nav folder state persistence (`NAV_STATE_KEY`, `loadCollapsed`, `saveCollapsed`, details toggle handlers), resource browser (`TAB_KEY`, `setActiveTab`, `loadResourceTab`, `previewResource`, switcher click handler, resource file click handler, initial tab restore).

Copy JS from `client-scripts.ts` lines 599-815. Wrap in `` export const navigationCode = ` ... `; ``.

Note: this code references `settings`, `saveSettings`, `applySettings` from `settings.ts` and `escapeHtml` — all in the same `<script>` scope at runtime.

- [ ] **Step 2: Verify it's valid TypeScript**

Run: `bun build src/client/navigation.ts --target=bun --outfile=/dev/null`
Expected: builds without errors

---

### Task 11: Create `src/client/search.ts`

**Files:**
- Create: `src/client/search.ts`
- Source: `src/client-scripts.ts:817-1072` (search bar through keyboard shortcuts)

- [ ] **Step 1: Create the file**

Create `src/client/search.ts` containing: search bar (element refs, `searchMarks`, `searchActiveIdx`, `clearSearch`, `highlightMatches`, `navigateSearch`, `openSearchBar`, `closeSearchBar`, input/button event listeners), context menu (`showContextMenu`, `hideContextMenu`, contextmenu handler, click-outside handler, scroll handler, action handler), keyboard shortcuts (shortcuts JSON parse, `parseBinding`, `matchesKey`, `actions` map, `simpleBindings`/`chordBindings` parsing, `chordKey`/`chordTimer`, `clearChord`, keydown listener).

Copy JS from `client-scripts.ts` lines 817-1072 (through the closing of the second `</script>` tag, but NOT including the tag itself). Wrap in `` export const searchCode = ` ... `; ``.

Note: references `panel`, `openOverlay`, `closeAllOverlays`, `isAnyOverlayOpen`, `navigateToPage`, `getNavLinks`, `settings`, `saveSettings`, `applySettings`, `toggleFocusMode`, `cycleTheme`, `cycleFontSize`, `openSearchBar` — all defined in earlier fragments in the same `<script>` scope.

- [ ] **Step 2: Verify it's valid TypeScript**

Run: `bun build src/client/search.ts --target=bun --outfile=/dev/null`
Expected: builds without errors

---

### Task 12: Create `src/client/index.ts` and wire up

**Files:**
- Create: `src/client/index.ts`
- Modify: `src/template.ts:3`

- [ ] **Step 1: Create the index file**

```ts
import { PYODIDE_URL, executionCode } from "./execution";
import { codeUiCode } from "./code-ui";
import { settingsCode } from "./settings";
import { navigationCode } from "./navigation";
import { searchCode } from "./search";

export const executionScript = `
  <script type="module">
${executionCode}
${codeUiCode}
  </script>`;

export const settingsScript = `
  <script type="module">
${settingsCode}
${navigationCode}
${searchCode}
  </script>`;

export { PYODIDE_URL };
```

- [ ] **Step 2: Update template.ts import**

Change line 3 of `src/template.ts` from:
```ts
import { executionScript, settingsScript } from "./client-scripts";
```
to:
```ts
import { executionScript, settingsScript } from "./client/index";
```

- [ ] **Step 3: Verify build compiles**

Run: `bun build src/cli.ts --target=bun --outfile=/dev/null`
Expected: builds without errors

---

### Task 13: Check for other imports of `client-scripts`

**Files:**
- Potentially modify: any file importing from `./client-scripts`

- [ ] **Step 1: Search for remaining imports**

Run: `grep -r 'client-scripts' src/`

If any other file imports `PYODIDE_URL` or other exports from `client-scripts`, update those imports to point to `./client/index`.

Check `src/template.ts` for any usage of `PYODIDE_URL` — the current `template.ts` does not use it directly (it's only used inside `executionCode`), but verify.

- [ ] **Step 2: Verify build compiles**

Run: `bun build src/cli.ts --target=bun --outfile=/dev/null`
Expected: builds without errors

---

### Task 14: Delete `src/client-scripts.ts` and final verification

**Files:**
- Delete: `src/client-scripts.ts`

- [ ] **Step 1: Delete the file**

```bash
rm src/client-scripts.ts
```

- [ ] **Step 2: Verify build compiles**

Run: `bun build src/cli.ts --target=bun --outfile=/dev/null`
Expected: builds without errors

- [ ] **Step 3: Commit client scripts refactor**

```bash
git add src/client/ src/template.ts
git rm src/client-scripts.ts
git commit -m "refactor: split client-scripts.ts into focused modules under src/client/"
```

---

### Task 15: Verify no functional changes

- [ ] **Step 1: Check file counts**

```bash
wc -l src/client/*.ts src/styles/*.ts | sort -n
```

Verify each file is well under 300 lines and the totals approximately match the originals.

- [ ] **Step 2: Build and serve the docs**

Run the dev server with `bun src/cli.ts` and select Docs (or use `-t` flag if CLI supports it). Manually verify:
- Code blocks render with Run, Hide/Show, and Enlarge buttons
- Python execution works (click Run on a Python block)
- HTML execution works (click Run on an HTML block)
- Toggle (Hide/Show) collapses and expands code
- Enlarge modal opens, shows code, Run works inside modal, output syncs
- Image lightbox works (click an image)
- Settings panel opens (Escape key), font size/theme/width/sidebar all work
- Theme picker overlay works
- Shortcuts overlay works
- Page search works (/ key)
- Context menu works (right-click)
- Keyboard shortcuts work (j/k for pages, Space for scroll, etc.)
- TOC scroll spy highlights correct heading
- Sidebar resize handles work
- Resource browser tabs work
- Nav folder collapse state persists across page loads

- [ ] **Step 3: Final commit if any fixes needed**

If any fixes were needed during verification, commit them:
```bash
git add -A
git commit -m "fix: address issues found during refactor verification"
```
