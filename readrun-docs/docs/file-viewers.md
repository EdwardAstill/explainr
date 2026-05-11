# File Viewers

readrun can embed rich file types inline in any page — no Python, no JSX, no config.
All files live under `.readrun/files/`.

---

## 3D Models — STL

STL files render as interactive Three.js viewers. Orbit with mouse, zoom with scroll.

[stl=bracket.stl]

```
[stl=bracket.stl]
[stl=bracket.stl height=520 controls=false]
```

Supported: `.stl` (ASCII and binary).

---

## 3D Models — GLTF / GLB

GLTF files support full materials, textures, and scene hierarchies.

[model=scene.gltf]

```
[model=scene.gltf]
[model=scene.glb height=600]
```

Supported: `.gltf`, `.glb`.

---

## CSV Tables

CSV files render as sortable, filterable tables with pagination. Click any column header to sort. Type in the filter box to search.

[csv=results.csv]

```
[csv=results.csv]
[csv=results.csv height=400 rows=50 filter=false]
```

Data is embedded at build time — works offline and in static builds.

---

## Audio

[audio=talk.mp3]

```
[audio=talk.mp3]
[audio=talk.mp3 loop=true]
```

Supported: `.mp3`, `.wav`, `.ogg`, `.m4a`.

---

## Video

[video=demo.mp4 height=360]

```
[video=demo.mp4]
[video=demo.mp4 height=360 loop=true muted=true]
```

Supported: `.mp4`, `.webm`, `.ogv`.

---

## PDF

[pdf=spec.pdf height=500]

```
[pdf=spec.pdf]
[pdf=spec.pdf height=700]
```

Renders using the browser's native PDF viewer inside a sandboxed iframe.

---

## All attributes

| Block | Attribute | Default | Notes |
|---|---|---|---|
| `stl`, `model` | `height` | 480px | Clamped 240–1200 |
| `stl`, `model` | `controls` | true | Orbit + zoom toolbar |
| `csv` | `height` | 400px | Clamped 200–1000 |
| `csv` | `rows` | 100 | Rows per page |
| `csv` | `filter` | true | Filter input |
| `audio` | `loop` | false | |
| `audio` | `autoplay` | false | |
| `video` | `height` | auto | Browser aspect ratio if omitted |
| `video` | `loop` | false | |
| `video` | `muted` | false | Required when `autoplay=true` |
| `pdf` | `height` | 600px | Clamped 300–1200 |

Three.js (~600KB) loads only on pages that contain `[stl=]` or `[model=]` blocks.
