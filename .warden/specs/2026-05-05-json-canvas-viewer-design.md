# JSON Canvas Viewer - Design Spec
_2026-05-05_

## Overview

Readrun should support a read-only JSON Canvas viewer so authors can embed spatial diagrams, flowcharts, and Obsidian-style `.canvas` files inside Markdown pages.

The feature should add a first-class `[canvas=...]` block that renders a JSON Canvas file from `.readrun/files/` into an interactive viewer with fit, pan, and zoom controls. It should remain Markdown-first: a page without canvas blocks behaves exactly as it does today, and `.canvas` assets stay as normal JSON files that can be edited outside readrun.

Reference format: [JSON Canvas Spec 1.0](https://jsoncanvas.org/spec/1.0/) defines top-level `nodes` and `edges`; node types are `text`, `file`, `link`, and `group`; edges connect node IDs and may specify sides, arrow ends, color, and labels.

---

## Constraint Summary

Readrun already has a bracket-block parser, server-side Markdown rendering, a bundled vanilla TypeScript client, static builds, and `.readrun/` resource folders. The viewer should fit those seams rather than adding a new content system. It must work in `rr serve`, `rr watch`, and `rr build`; avoid requiring React for normal pages; avoid executing arbitrary HTML from canvas content; and preserve the existing security rule that Markdown assets cannot read arbitrary files outside the served content folder.

---

## Alternatives

| Option | Shape | Why pick it |
|---|---|---|
| A. Use `[canvas=flow.canvas]` with a built-in viewer | New readrun block type; server embeds validated canvas JSON; client renders DOM/SVG | Best fit for existing block syntax, static builds, validation, and docs |
| B. Tell authors to use `[jsx=viewer.jsx]` | No core feature; users write a custom React viewer per site | Lowest core maintenance, but too much repeated work and weak validation |
| C. Convert `.canvas` files to static SVG/PNG during build | Pre-render diagrams as images | Simple output, but loses pan/zoom, links, text selection, theme support, and future interaction |

| Criterion | A. Built-in block | B. Custom JSX | C. Static image |
|---|---|---|---|
| Author ergonomics | One-line embed | Requires custom code | Requires conversion step |
| Static build support | Strong, if JSON is embedded in page HTML | Depends on user code/CDNs | Strong |
| Validation | Can be built into `rr validate` | Mostly absent | Only validates generated image exists |
| Interactivity | Fit, pan, zoom, clickable links | Whatever author builds | None |
| Maintenance | Moderate | Low core, high user burden | Moderate conversion burden |
| Ecosystem fit | Matches current `[python=...]`, `[jsx=...]`, `[image=...]` blocks | Uses existing JSX, but not Markdown-first | Treats diagrams as images, not canvases |

Recommendation: **Option A**. Add a built-in read-only block because the user-facing value is the embed contract, not a general diagram authoring system.

---

## Author Contract

### File-based embed

Canvas files live under `.readrun/files/` and use the standard `.canvas` extension.

```markdown
[canvas=flow.canvas]
```

With optional height:

```markdown
[canvas=systems/onboarding.canvas height=560]
```

### Inline embed

Inline JSON is allowed for small examples and tests.

```markdown
[canvas height=420]
{
  "nodes": [
    { "id": "a", "type": "text", "x": 0, "y": 0, "width": 180, "height": 80, "text": "Start" },
    { "id": "b", "type": "text", "x": 280, "y": 0, "width": 180, "height": 80, "text": "Finish" }
  ],
  "edges": [
    { "id": "a-b", "fromNode": "a", "toNode": "b" }
  ]
}
[/canvas]
```

### Attributes

| Attribute | Type | Default | Behavior |
|---|---:|---:|---|
| `height` | integer pixels | `520` | Viewer height, clamped to `240..1200` |
| `controls` | `true` or `false` | `true` | Shows or hides fit/zoom/reset buttons |
| `source` | string | internal | Set by file resolution so errors can name the source file |

`[canvas=path]` resolves only inside `.readrun/files/`. Absolute paths and `..` are rejected.

---

## Rendering Contract

### Server-side responsibilities

Add a canvas renderer to the existing Markdown pipeline.

1. `resolveFileReferences()` recognizes `[canvas=*.canvas]`.
2. It reads `.readrun/files/<path>`, rejects traversal, and expands the block into an internal `[canvas source="..."]...[/canvas]` block.
3. `renderBlock()` handles `canvas` blocks.
4. The server parses JSON, validates the supported subset, and emits:
   - a wrapper `<div class="canvas-viewer" data-canvas-id="...">`
   - a toolbar when `controls` is enabled
   - a viewport element
   - an adjacent `<script type="application/json" id="canvas-data-...">...</script>`
5. JSON embedded in `<script>` escapes `</script` the same way inline quiz data does.
6. Parse or validation errors render as an inline error panel instead of crashing the page.

Suggested module boundary:

| File | Responsibility |
|---|---|
| `src/canvas.ts` | Types, parsing, validation, bounds calculation, server HTML rendering helpers |
| `src/markdown.ts` | Block dispatch and file-reference expansion for `[canvas=...]` |
| `src/client/canvas.ts` | Browser pan/zoom/fit behavior and soft-reload remounting |
| `src/styles/canvas.ts` | Viewer, node, edge, toolbar, and error styles |
| `src/validate.ts` | `.canvas` reference existence and schema checks |
| `src/utils.ts` | `.canvas` MIME mapping as `application/json` |
| `src/client/main.ts` | Side-effect import for `./canvas` |
| `src/styles/index.ts` | Include canvas styles |

### Client-side responsibilities

The client renders each canvas using HTML nodes plus an SVG edge layer:

- The viewport contains one absolutely positioned scene.
- Group nodes render first according to array order; node array order is preserved as z-index.
- Edges render in SVG using node bounds and optional `fromSide`/`toSide`.
- Default `toEnd` is `arrow`; default `fromEnd` is `none`.
- Text, labels, and URLs are escaped before insertion.
- Links open with `rel="noopener noreferrer"` and only allow safe URL schemes: `http`, `https`, and `mailto`.
- Background drag pans the scene.
- `+`, `-`, and reset buttons adjust zoom when controls are visible.
- "Fit" computes the bounding box and scales/translates the scene into the viewport.
- Plain page scroll should continue to scroll the document; wheel zoom only happens with Ctrl/Cmd or explicit controls.
- After watch-mode soft reload dispatches `readrun:remount`, the canvas client re-initializes new viewers without duplicating listeners on existing ones.

---

## JSON Canvas Support Level

### Required for MVP

| Spec surface | Required behavior |
|---|---|
| Top-level `nodes` | Optional array; missing means empty canvas |
| Top-level `edges` | Optional array; missing means no edges |
| Generic node fields | Enforce `id`, `type`, `x`, `y`, `width`, `height` |
| `text` nodes | Render text content with preserved line breaks and escaped HTML |
| `group` nodes | Render as translucent visual containers with optional label |
| `link` nodes | Render a clickable URL card |
| `file` nodes | Render filename/subpath card; image preview can be a follow-up |
| Edge endpoints | Validate `fromNode` and `toNode` refer to existing nodes |
| Edge sides | Support `top`, `right`, `bottom`, `left`; otherwise fall back to node centers |
| Edge arrows | Support `none` and `arrow` |
| Edge labels | Render centered label on the path |
| Colors | Support hex colors and preset strings `"1"` through `"6"` mapped through CSS variables |

### Explicitly out of scope

- Editing `.canvas` files in the browser
- Auto-layout or flowchart generation
- Dragging nodes and saving positions
- Executing Markdown, HTML, scripts, or readrun blocks inside text nodes
- Embedding arbitrary local files from `file` nodes
- Full Obsidian parity beyond JSON Canvas Spec 1.0

---

## Validation Contract

`rr validate <folder>` should report canvas issues with file and line context where possible.

Checks:

- `[canvas=path]` target exists under `.readrun/files/`
- target path is relative and does not include `..`
- target parses as JSON
- root is an object
- `nodes`, when present, is an array
- `edges`, when present, is an array
- node IDs are unique strings
- edge IDs are unique strings when present
- node `type` is one of `text`, `file`, `link`, `group`
- node coordinates and dimensions are finite numbers; width and height are positive
- text nodes include string `text`
- file nodes include string `file`
- link nodes include string `url`
- group `backgroundStyle`, when present, is `cover`, `ratio`, or `repeat`
- edge endpoints reference existing node IDs
- edge sides, when present, are valid sides
- edge ends, when present, are `none` or `arrow`
- colors, when present, are hex strings or preset strings `"1"` through `"6"`

Warnings:

- canvas contains unsupported optional fields readrun ignores
- file node references an asset readrun cannot preview
- link node uses a URL scheme readrun will render as inert text

---

## User Experience

The viewer should look like part of the article, not like a separate app.

- Use a thin border, theme variables, and compact toolbar controls.
- Keep rounded corners at 6px or less to match existing executable blocks.
- Provide a clear empty state for a valid canvas with no nodes.
- Show parse errors inline with the source filename.
- Make every node selectable as text where practical.
- Preserve color contrast across existing light and dark themes.
- On mobile, default to fit-to-width and keep controls tappable.

Example visual structure:

```text
+--------------------------------------------+
| flow.canvas                    Fit - + 100% |
+--------------------------------------------+
|                                            |
|   [Start] -----------------> [Decision]    |
|                              |             |
|                              v             |
|                           [Finish]         |
|                                            |
+--------------------------------------------+
```

---

## Acceptance Criteria

These should be executable checks in the implementation plan.

1. `bun test src/canvas.test.ts` passes for parsing, validation, bounds, color mapping, and edge endpoint calculations.
2. `bun test src/markdown.test.ts` includes `[canvas=flow.canvas]` and inline `[canvas]...[/canvas]` render cases.
3. `bun test src/validate.test.ts` reports missing canvas files, invalid JSON, duplicate node IDs, invalid edge endpoints, and valid canvases cleanly.
4. A fixture page with `[canvas=flow.canvas]` renders a `.canvas` file from `.readrun/files/flow.canvas` in `rr serve`.
5. `rr build <fixture> --out=<tmp>` emits static HTML where the canvas still renders without a server-side JSON fetch.
6. Watch-mode soft reload updates canvas content after the markdown page or `.canvas` file changes.
7. A malicious canvas text value like `<img src=x onerror=alert(1)>` appears as text and does not execute.
8. A malicious link URL like `javascript:alert(1)` is not clickable.
9. Page scrolling still works normally when the pointer is over the viewer; zoom requires controls or Ctrl/Cmd-wheel.
10. Existing `[python]`, `[jsx]`, `[image=...]`, `[include=...]`, and quiz rendering tests continue to pass.

---

## Implementation Order

1. Add `src/canvas.ts` with types, validation, bounds, and HTML emission helpers.
2. Add unit tests for valid and invalid JSON Canvas data.
3. Extend `resolveFileReferences()` and `renderBlock()` for `[canvas=...]` and inline `[canvas]`.
4. Add client renderer and styles.
5. Add validation checks to `rr validate`.
6. Add `.canvas` MIME support.
7. Add a small docs example under `readrun-docs/` after the feature works.

---

## Future Extensions

- Render Markdown formatting inside text nodes using a safe, non-executable Markdown subset.
- Preview image file nodes when they resolve to `.readrun/images/` or `.readrun/files/`.
- Add search integration so canvas text contributes to site search.
- Add an optional full-screen viewer mode.
- Add an authoring bridge later if readrun gains browser edit mode for resources.
