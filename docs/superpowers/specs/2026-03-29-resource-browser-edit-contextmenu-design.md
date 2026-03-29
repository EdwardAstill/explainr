# Design: Resource Browser, Edit Mode, and Context Menu

Three features that extend readrun's UI: a multi-tab resource browser in the sidebar, an in-browser file editor, and a right-click context menu.

## 1. Resource Browser

### What it does

The left sidebar gains a bottom-left switcher with four categories: **content**, **images**, **files**, **scripts**. The default is "content" (the existing markdown nav tree). Clicking another category replaces the nav tree with a flat file listing of that `.readrun/` subdirectory.

### Switcher UI

Vertical list at the bottom of the sidebar, replacing the current files panel. Styled identically to nav-tree items: monospace 12px, `display: inline-block` highlight on the active item.

```
┌─────────────────────┐
│ ‹ docs/              │  ← nav tree (swaps per tab)
│   › future/          │
│   deployment         │
│   ▌philosophy▐       │  ← active highlight
│   README             │
│ ‹ notes/             │
│   lecture-1           │
│   lecture-2           │
│   › tutorials/       │
│   welcome            │
│─────────────────────│
│ ▌content▐            │  ← active tab
│ images               │
│ files                │
│ scripts              │
└─────────────────────┘
```

### Tab contents

- **content** — existing nav tree (markdown files). Clicking navigates as usual.
- **images** — flat listing of `.readrun/images/`. Clicking an image shows a centered preview in the main area with filename, size, and dimensions.
- **files** — flat listing of `.readrun/files/`. Clicking shows file contents (text) or a download prompt (binary) in the main area.
- **scripts** — flat listing of `.readrun/scripts/`. Clicking shows syntax-highlighted source in the main area.

### Server changes

New API route needed for non-content tabs:

- `GET /api/resources/:tab` — returns `{ files: [{ name, size }] }` for the given tab (images/files/scripts)
- `GET /api/resources/:tab/:filename` — serves the raw file (for preview/download)
- `GET /api/resource-meta/:tab/:filename` — returns `{ name, size, mime, dimensions? }` (dimensions for images only)

These routes work in both view and live mode since they read from `.readrun/` which is always present.

### Client changes

- Replace the files panel HTML with the four-item switcher
- On tab click: fetch `/api/resources/:tab`, rebuild the sidebar listing using the same `nav-tree` markup (flat `<ul>` with `<li><a>` items, no folders)
- On item click: fetch the file and render preview in main area (images get `<img>`, scripts get syntax-highlighted `<pre>`, files get raw `<pre>` or download link)
- Persist active tab in `localStorage` so it survives page navigation
- Content tab restores the original nav tree HTML

## 2. Edit Mode

### What it does

Opens a CodeMirror/Monaco editor in the main content area for any text-based file. Saves changes back to disk via the server. Works in live mode only (needs server write access). In view/static mode, the edit option is hidden.

### Entering edit mode

- Right-click context menu → "Edit"
- Keyboard shortcut (configurable, default: `e`)
- Both trigger edit mode for the currently viewed file

### Editor UI

The main content area is replaced with:

```
┌──────────────────────────────────────┐
│ editing: docs/philosophy.md   Save Cancel │  ← toolbar
├──────────────────────────────────────┤
│  1 │ # Philosophy                        │
│  2 │                                     │
│  3 │ ## Markdown-first                   │
│  4 │                                     │
│  5 │ readrun is built around one core... │
└──────────────────────────────────────┘
```

- **Toolbar**: file path on the left, Save and Cancel on the right
- **Editor**: CodeMirror 6 (lighter than Monaco, works well as an ES module). Markdown syntax highlighting, line numbers, monospace font matching readrun's `--font-mono`.
- **Save**: `POST /api/save` with `{ path, content }` — writes file to disk, returns success/error. On success, switch back to rendered view with updated content.
- **Cancel**: discard changes, return to rendered view.

### Which files are editable

All text-based files across all tabs:
- **content** tab: `.md` files
- **scripts** tab: `.py`, `.js`, `.ts`, etc.
- **files** tab: text files (`.csv`, `.json`, `.toml`, etc.) — skip binary files
- **images** tab: not editable

### Server changes

- `GET /api/source/:path` — returns raw file content as text (for loading into editor)
- `POST /api/save` — accepts `{ path: string, content: string }`, writes to disk. Path must be within the content directory or `.readrun/`. Live mode only.

### Editor dependency

CodeMirror 6 loaded from CDN (`@codemirror/view`, `@codemirror/state`, `@codemirror/lang-markdown`, `@codemirror/lang-python`). Loaded on-demand when edit mode is first activated, not on every page load.

## 3. Right-click Context Menu

### What it does

A custom context menu replaces the browser default on right-click within the main content area. Three items:

1. **Search** — opens a search bar for the current page (client-side text search)
2. **Edit** — enters edit mode for the current file (live mode only, hidden otherwise)
3. **Settings** — opens the settings panel

### UI

Minimal, no border-radius, monospace font, matching the nav-tree style:

```
┌──────────────┐
│ Search       │
│──────────────│
│ Edit         │  ← hidden in view/static mode
│──────────────│
│ Settings     │
└──────────────┘
```

- Positioned at the cursor coordinates
- Dismissed on click outside, Escape, or scroll
- Separator line between items (1px border)
- Background: `var(--color-sidebar-bg)`, border: `var(--color-border)`

### Search behavior

Clicking "Search" opens an input bar at the top of the main content area. As the user types, matching text is highlighted in the rendered content using `window.find()` or a custom highlight approach (mark matching text nodes with `<mark>` tags). Escape closes the search bar.

### Client changes

- `contextmenu` event listener on `.main` — prevent default, show custom menu
- Menu items dispatch to existing actions (settings panel toggle, edit mode entry)
- Search UI: fixed bar at top of `.main` with input field, match count, prev/next buttons

## Implementation order

1. **Resource browser** — switcher UI, server routes, tab switching, file preview
2. **Right-click context menu** — menu rendering, search bar, settings integration
3. **Edit mode** — CodeMirror loading, editor UI, save/cancel, server routes

This order makes sense because the resource browser establishes the tab infrastructure that edit mode builds on (editing scripts/files tabs), and the context menu provides the "Edit" entry point.

## Files to modify

- `src/template.ts` — replace files panel with resource switcher HTML, add context menu HTML, add editor container
- `src/client-scripts.ts` — tab switching logic, context menu handler, search bar, edit mode controller, CodeMirror initialization
- `src/styles.ts` — context menu styles, search bar styles, editor toolbar styles, resource switcher styles (reuse nav-tree)
- `src/server.ts` — new API routes: `/api/resources/`, `/api/source/`, `/api/save`
- `src/config.ts` — add `edit` shortcut to `ShortcutConfig`
