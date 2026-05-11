# Rich File Viewers — Design Spec
_2026-05-11_

## Overview

Readrun should support six new embedded-viewer block types so authors can present 3D models, tabular data, audio, video, and documents inline in Markdown pages without requiring Python or custom JSX. The new types are: `[stl=]`, `[model=]`, `[csv=]`, `[audio=]`, `[video=]`, and `[pdf=]`.

All six follow the existing `[name=path]` void-block pattern, resolve files from `.readrun/files/`, and work in `rr serve`, `rr watch`, and `rr build` (static). Three.js (for STL and GLTF/GLB) is lazy-loaded via dynamic `import()` — only pages that actually contain 3D blocks pay the cost.

---

## Constraint Summary

- Must fit the existing bracket-block parser, file-reference resolver, and `renderBlock()` dispatch in `src/markdown.ts`.
- Must work in static builds — data is embedded inline or files are copied to output.
- Three.js is large (~600KB); must not load on pages without 3D blocks.
- No new CDN dependencies — all libs bundled or native HTML5.
- No arbitrary script execution from file content (STL/GLB is geometry data, not code).
- PDF iframe gets `sandbox` attribute to prevent top-level navigation.
- Path traversal (`..`, absolute paths) rejected server-side for all file types.
- Consistent with the canvas viewer pattern already specced.

---

## Locked Decisions

- **Approach A** — one explicit block name per format. No generic `[viewer=]` auto-dispatch.
- **CSV** — table viewer only (sort + filter + pagination); no chart rendering.
- **No Mermaid** — out of scope for this spec.
- **No GeoJSON/Leaflet** — out of scope.
- **Three.js loading** — lazy dynamic `import()` in client, Bun code-splits with `--splitting`. Not CDN, not always-bundled.
- **CSV data** — embedded as JSON in `<script type="application/json">` (same pattern as canvas), not fetched at runtime.
- **3D / audio / video / PDF files** — served by URL (existing file route in dev; copied to output in static build).

---

## Open Assumptions

- Bun's bundler `--splitting` flag produces a valid separate chunk for Three.js when `await import('three')` is used in a client module. Validate early in implementation.
- The existing `.readrun/files/` static-build copy mechanism handles binary files (`.stl`, `.glb`, `.mp3`, `.mp4`, `.pdf`) without modification. Confirm during implementation.
- PDF iframe rendering is browser-native and acceptable without PDF.js. If a future requirement needs page-level control, PDF.js can be added then.

---

## Rejected Alternatives

| Option | Reason rejected |
|---|---|
| Generic `[viewer=file.ext]` auto-dispatch | Ambiguous attrs, unclear validation errors, breaks explicit-names pattern |
| Chart rendering for CSV | Requires Chart.js (~60KB); user confirmed table-only is sufficient |
| Mermaid diagram support | Mermaid is ~2MB; user excluded it |
| GeoJSON/Leaflet map | User excluded it |
| Three.js from CDN | Requires internet for static sites; lazy dynamic import is offline-compatible |
| Always bundle Three.js | Every page pays ~600KB cost regardless of content |
| PDF.js | Overkill for basic embed; browser-native iframe is sufficient |

---

## Author Contract

### Block syntax

All blocks are void (no closer). Files resolve under `.readrun/files/` only.

```markdown
[stl=bracket.stl]
[stl=bracket.stl height=520 controls=false]

[model=scene.glb]
[model=scene.glb height=600 controls=true]

[csv=results.csv]
[csv=results.csv height=400 rows=200 filter=false]

[audio=talk.mp3]
[audio=talk.mp3 loop=true autoplay=false]

[video=demo.mp4]
[video=demo.mp4 height=360 loop=true muted=true]

[pdf=spec.pdf]
[pdf=spec.pdf height=700]
```

### Attributes

| Block | Attr | Type | Default | Notes |
|---|---|---|---|---|
| `stl`, `model` | `height` | int px | `480` | Clamped `240–1200` |
| `stl`, `model` | `controls` | bool | `true` | Show/hide orbit + zoom toolbar |
| `csv` | `height` | int px | `400` | Clamped `200–1000` |
| `csv` | `rows` | int | `100` | Max rows visible before pagination |
| `csv` | `filter` | bool | `true` | Show/hide filter input |
| `audio` | `loop` | bool | `false` | |
| `audio` | `autoplay` | bool | `false` | |
| `video` | `height` | int px | auto | Browser-native aspect ratio if omitted |
| `video` | `loop` | bool | `false` | |
| `video` | `autoplay` | bool | `false` | |
| `video` | `muted` | bool | `false` | Required by browsers when `autoplay=true` |
| `pdf` | `height` | int px | `600` | Clamped `300–1200` |

---

## Architecture

### Module boundaries

**New server-side files (`src/viewers/`)**

| File | Responsibility |
|---|---|
| `src/viewers/model.ts` | STL + GLTF/GLB — path validation, file-URL resolution, HTML emission for `[stl=]` and `[model=]` |
| `src/viewers/csv.ts` | CSV — parse rows/headers, embed as JSON in `<script type="application/json">`, emit table shell HTML |
| `src/viewers/media.ts` | Audio + Video — emit `<audio controls>` / `<video controls>` with resolved file URL and parsed attrs |
| `src/viewers/pdf.ts` | PDF — emit sandboxed `<iframe>` with resolved file URL and `height` |

**New client-side files (`src/client/viewers/`)**

| File | Responsibility |
|---|---|
| `src/client/viewers/model.ts` | Scan for `.model-viewer` elements; lazy `await import('three')` + STLLoader + GLTFLoader; orbit controls; fit-to-view; theme-aware background |
| `src/client/viewers/csv.ts` | Client-side sort (click header), debounced filter, pagination — pure DOM, no lib |

Audio, video, and PDF are native HTML elements — no client JS needed.

**Existing files with additions**

| File | Addition |
|---|---|
| `src/blocks.ts` | Add `stl`, `model`, `csv`, `audio`, `video`, `pdf` to `KNOWN_BLOCKS` and `VOID_BLOCKS` |
| `src/markdown.ts` | Dispatch new block names to their viewer emitters in `renderBlock()` |
| `src/validate.ts` | File-existence + extension checks for all six types |
| `src/utils.ts` | MIME entries: `.stl → model/stl`, `.glb → model/gltf-binary`, `.gltf → model/gltf+json` |
| `src/client/main.ts` | Import `./viewers/model` and `./viewers/csv` |
| `src/styles/` | Viewer styles (model toolbar, csv table, shared viewer chrome) |

### Three.js lazy loading

`src/client/viewers/model.ts` is included in the main bundle but contains no Three.js at module level. On page load:

1. Scan document for `.model-viewer` elements.
2. If none found, return immediately — Three.js never loads.
3. If found, execute:
   ```ts
   const THREE = await import('three');
   const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js');
   const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
   const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
   ```
4. Bun bundles with `--splitting`, emitting Three.js as a separate chunk fetched on demand.

### Data embedding

| Type | Data strategy |
|---|---|
| CSV | Server parses with a lightweight CSV parser; embeds rows + headers as JSON in `<script type="application/json" id="csv-data-{n}">` — works offline |
| STL / GLB / audio / video / PDF | Referenced by URL; file route in dev; copied to `dist/` in static build |

### Server-side rendering flow

For each new block type in `renderBlock()`:

1. Resolve path: reject `..` and absolute paths; resolve under `.readrun/files/`.
2. Check file exists; emit inline error panel if missing (same pattern as canvas).
3. Emit viewer HTML shell with `data-*` attrs carrying height, controls, file URL or data ID.
4. For CSV: parse and embed JSON inline.
5. For all others: embed resolved file URL as a `data-src` attr.

---

## Validation Contract

`rr validate <folder>` reports issues for all new block types.

**Errors**

- `[stl=path]` / `[model=path]` target does not exist under `.readrun/files/`
- `[stl=path]` target extension is not `.stl`
- `[model=path]` target extension is not `.glb` or `.gltf`
- `[csv=path]` target does not exist or extension is not `.csv`
- `[audio=path]` target does not exist or extension is not `.mp3`, `.wav`, `.ogg`, `.m4a`
- `[video=path]` target does not exist or extension is not `.mp4`, `.webm`, `.ogv`
- `[pdf=path]` target does not exist or extension is not `.pdf`
- Any `path` contains `..` or is absolute

**Warnings**

- `height` outside clamped range (value will be clamped silently)
- `autoplay=true` without `muted=true` on `[video=]` (browsers block unmuted autoplay)
- CSV file is empty (zero data rows)
- CSV file exceeds 5MB (large files may be slow to embed and parse)

---

## Security

- All file resolution is server-side; client receives a trusted URL or embedded JSON.
- CSV values are JSON-serialized — no HTML injection risk.
- Three.js loads geometry data only; STL/GLB cannot execute scripts.
- PDF iframe: `sandbox="allow-same-origin"` — allows the browser PDF plugin to load same-origin content while blocking scripts, top-level navigation, forms, and popups. (`allow-scripts` + `allow-same-origin` together defeat sandboxing and must not be combined.)
- Audio/video: standard `<audio>`/`<video>` — no sandbox needed.
- Watch-mode soft reload dispatches `readrun:remount`; model and CSV clients reinitialise new elements without duplicating listeners on existing ones.

---

## Non-goals

- Editing STL/GLB/CSV files in the browser
- Chart rendering from CSV data
- Mermaid or other diagram-as-code formats
- GeoJSON / map tile rendering
- MIDI or other audio synthesis formats
- Full-screen viewer mode (can be added later)
- 3D model export or screenshot from viewer

---

## Recommended Skills

- `test-driven-development` — for `src/viewers/*.ts` and client modules
- `verification-before-completion` — gate before claiming done
- `superpowers:subagent-driven-development` — viewer modules are largely independent, suitable for parallel execution

---

## Acceptance Criteria

- [ ] `bun test src/viewers/model.test.ts` exits 0 — covers path rejection (`..`, absolute), valid STL/GLB resolution, missing-file error HTML output
- [ ] `bun test src/viewers/csv.test.ts` exits 0 — covers header parsing, row embedding, empty CSV, large CSV warning, path rejection
- [ ] `bun test src/viewers/media.test.ts` exits 0 — covers audio/video HTML output, attr defaults, autoplay+muted warning
- [ ] `bun test src/viewers/pdf.test.ts` exits 0 — covers iframe output, sandbox attr present, height clamping
- [ ] `bun test src/validate.test.ts` exits 0 — existing tests pass; new tests cover missing files, wrong extensions, `..` paths, autoplay-without-muted warning for all six types
- [ ] `bun test src/blocks.test.ts` exits 0 — `stl`, `model`, `csv`, `audio`, `video`, `pdf` present in `KNOWN_BLOCKS` and `VOID_BLOCKS`
- [ ] `rr serve <fixture>` renders `[stl=bracket.stl]` as an interactive Three.js viewer with orbit controls; page loads without console errors
- [ ] `rr serve <fixture>` renders `[model=scene.glb]` as an interactive Three.js viewer; same Three.js chunk is used (not loaded twice)
- [ ] `rr serve <fixture>` renders `[csv=results.csv]` as a sortable, filterable table; clicking a column header re-sorts; filter input filters rows; pagination controls work
- [ ] `rr serve <fixture>` renders `[audio=talk.mp3]` as a native audio player; `loop=true` attr is forwarded to the `<audio>` element
- [ ] `rr serve <fixture>` renders `[video=demo.mp4]` as a native video player with correct height; `muted=true` forwarded
- [ ] `rr serve <fixture>` renders `[pdf=spec.pdf]` as an iframe with `sandbox="allow-same-origin"` and no `allow-scripts`
- [ ] `rr build <fixture> --out=<tmp>` exits 0; `ls <tmp>/*.stl <tmp>/*.glb <tmp>/*.mp3 <tmp>/*.mp4 <tmp>/*.pdf` all exit 0 (files copied); `grep -q 'model-viewer' <tmp>/index.html` exits 0; `grep -q 'csv-viewer' <tmp>/index.html` exits 0
- [ ] On a page with no 3D blocks, the Three.js chunk is absent from the network waterfall (check browser DevTools Network tab — no `three` chunk request)
- [ ] On a page with `[stl=]` block, the Three.js chunk appears in the network waterfall after page load
- [ ] `rr validate <fixture>` reports an error for a `[stl=missing.stl]` referencing a nonexistent file
- [ ] `rr validate <fixture>` reports an error for `[stl=doc.pdf]` (wrong extension)
- [ ] `rr validate <fixture>` reports a warning for `[video=demo.mp4 autoplay=true]` without `muted=true`
- [ ] A malicious CSV value `<img src=x onerror=alert(1)>` renders as text in the table cell, not as HTML
- [ ] Existing `bun test` suite (all test files) exits 0 after changes

---

## Known Limitations

_(Empty at spec-write time. Executing agent populates during implementation.)_

---

## Post-Implementation Review

_(Empty at spec-write time. Executing agent fills before claiming done.)_

### Acceptance results

### Scope drift

### Refactor proposals
