# Client Scripts & Styles Refactor

Split `client-scripts.ts` (1072 lines), `styles.ts` (773 lines), and update `template.ts` imports. Pure reorganization — no functional changes.

## Problem

Three files contain all client-side code as monolithic template literal strings. `client-scripts.ts` mixes Pyodide execution, settings, search, keyboard shortcuts, and 15+ other concerns. `styles.ts` mixes base layout, exec blocks, overlays, themes, and everything else. Both are difficult to navigate, edit, and reason about.

## Design

### `src/client/` (replaces `client-scripts.ts`)

Each file exports a string fragment — raw JS, no `<script>` tags.

| File | Contents |
|------|----------|
| `execution.ts` | `PYODIDE_URL`, `IMPORT_TO_PKG`, `STDLIB`, `parseImports`, `loadPyodideRuntime`, `installPackages`, `scanPageImports`, preloading trigger, `snapshotFS`, `detectNewFiles`, `renderFileDownloads`, `renderFigures`, `runPyodide`, `RESIZE_SCRIPT`, iframe resize listener, `runHtml` |
| `code-ui.ts` | Toggle click handler, run button click handler, `escapeHtml` (client-side), file upload handler, enlarge modal (open/close, MutationObserver, run delegation, Escape handler), image lightbox |
| `settings.ts` | `THEMES`, `FONT_SIZES`, `fontSizeMap`, `defaults`, `escapeHtml`, `loadSettings`, `saveSettings`, `applySettings`, font size buttons, width slider, sidebar toggle, theme cycling, theme picker, shortcuts button, overlay management (`openOverlay`, `closeAllOverlays`, `isAnyOverlayOpen`), overlay backdrop clicks |
| `navigation.ts` | `getNavLinks`, `getCurrentPageIndex`, `navigateToPage`, `cycleFontSize`, `toggleFocusMode`, TOC scroll spy, resize handles (`initResize`), nav folder state persistence, resource browser (tab switching, `loadResourceTab`, `previewResource`, tab click handlers) |
| `search.ts` | Search bar (highlight, navigate, open/close), context menu (show/hide, action handler), keyboard shortcuts (parseBinding, matchesKey, actions map, chord handling, keydown listener) |
| `index.ts` | Imports all fragments. Exports `executionScript` wrapping execution + code-ui in `<script type="module">`. Exports `settingsScript` wrapping settings + navigation + search in `<script type="module">`. |

The two `<script type="module">` boundary is preserved: execution script has Pyodide state (`pyodide`, `pyodideLoading`, `packagesReady`), settings script has UI state (`settings`, `shortcuts`, etc). They don't share variables.

### `src/styles/` (replaces `styles.ts`)

Each file exports a string fragment — raw CSS, no `<style>` tags.

| File | Contents |
|------|----------|
| `base.ts` | Reset, `:root` variables, `body`, `.sidebar`, `.nav-tree` (shared tree styles), `.sidebar-nav`, `.main`, `.toc-sidebar`, `.toc-link--active`, `.resize-handle`, focus mode hide rules, responsive breakpoints, `.markdown-body` (headings, paragraphs, lists, blockquotes, links, code, pre, tables, images, hr), `.readrun-img` |
| `exec-blocks.ts` | `.exec-block`, `.exec-block-header`, `.exec-block-actions`, `.exec-run-btn`, `.exec-toggle-btn`, `.exec-enlarge-btn`, `.exec-block--collapsed`, `.exec-output`, `.exec-stdout`, `.exec-stderr`, `.code-modal` and children |
| `ui.ts` | `.settings`, `.settings__panel`, `.settings__section`, all settings sub-components, `.overlay`, `.overlay__card`, `.shortcuts-grid`, `.theme-grid`, `.theme-card`, `.search-bar`, `.search-highlight`, `.context-menu`, `.lightbox`, `.resource-switcher`, `.upload-*` styles |
| `themes.ts` | `[data-theme="dark"]`, `[data-theme="solarized"]`, `[data-theme="nord"]`, `[data-theme="dracula"]`, `[data-theme="monokai"]`, `[data-theme="gruvbox"]`, `[data-theme="catppuccin"]`, `@media (prefers-color-scheme: dark)` |
| `index.ts` | Imports all fragments. Exports `styles` as concatenation. |

### `template.ts` changes

- Import `styles` from `"./styles/index"` instead of `"./styles"`
- Import `executionScript`, `settingsScript` from `"./client/index"` instead of `"./client-scripts"`
- HTML template strings (settings panel, theme picker, shortcuts overlay, TOC) stay in `template.ts`

### Constraints

- Every module exports a `const` string via `export const`
- No `<script>`, `<style>`, or `<template>` wrapper tags in fragments — `index.ts` adds those
- The `executionScript` fragment in `execution.ts` interpolates `PYODIDE_URL` (the only cross-boundary value) — this stays as a template literal
- `code-ui.ts` references functions defined in `execution.ts` (`runPyodide`, `runHtml`, `escapeHtml`) — these are in the same `<script>` scope at runtime since index.ts concatenates them
- No changes to any runtime behavior, HTML output, or CSS
- Delete `client-scripts.ts` and `styles.ts` after migration

## Verification

- `bun build src/cli.ts --target=bun` compiles clean
- Serve the demo (`rr -t`) and verify: code execution, toggle, enlarge, settings, themes, search, shortcuts, resource browser, lightbox all work
- Diff the generated HTML output before/after to confirm identical output (modulo whitespace)
