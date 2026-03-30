# Deployment

## Previewing your site

Run `rr` from your content folder and select **View**. readrun serves the current directory on port 3001 (or the next available port if 3001 is in use) and opens your browser automatically.

## Usage

```bash
readrun    # launch interactive TUI
rr         # shorthand
rr -t      # preview the built-in docs
```

The TUI lets you choose between View, Build, Docs, and Update.

## Building a static site

Select **Build** from the TUI to generate static HTML. A folder browser lets you navigate the filesystem at each step:

1. **Site root** — browse to the folder containing your `.md` files
2. **Target platform** — Plain, GitHub Pages, Vercel, or Netlify
3. **Output folder** — browse to a parent directory, then name the output folder (default: `dist`)

The output is a self-contained directory of HTML files — no server runtime needed. Each markdown page becomes `path/index.html`, and a root `index.html` redirects to the first page.

## Platform-specific builds

### GitHub Pages

Generates:
- `.nojekyll` — prevents GitHub from processing with Jekyll
- `.github/workflows/deploy.yml` — GitHub Actions workflow that installs Bun, builds the site, and deploys to Pages on push to main

The base path is auto-detected from your git remote. If your repo is `my-notes`, links are prefixed with `/my-notes/` so they resolve correctly at `username.github.io/my-notes/`. Repos named `username.github.io` get no prefix.

### Vercel

Generates a `vercel.json` with the build command and output directory configured.

### Netlify

Generates a `netlify.toml` with the build command and publish directory configured.

## Configuration

readrun stores settings at `~/.config/readrun/settings.toml`. This file is created automatically on first run with default keyboard shortcuts. Example:

```toml
[shortcuts]
search = "/"
settings = "Escape"
next_page = "j"
prev_page = "k"
home = "g h"
scroll_down = "d"
scroll_up = "u"
focus_mode = "f"
run_all = "r a"
```

Chord bindings like `g h` (go home) and `r a` (run all) require pressing both keys within one second.

## Ignore patterns

Create `.readrun/.ignore` to exclude files and folders from the navigation tree:

```
drafts
notes/scratch.md
work-in-progress/
```

One pattern per line. Lines starting with `#` are comments. The nav tree also automatically ignores `node_modules`, `dist`, `out`, `.git`, `__pycache__`, and `venv`.

## The `.readrun/` directory

```
your-notes/
  page.md
  .readrun/
    scripts/       # code files referenced with :::filename.py
    images/        # images referenced with :::diagram.svg
    files/         # data files preloaded into Pyodide's filesystem
    .ignore        # patterns to exclude from navigation
```

- **scripts/** — code files in any supported language (`.py`, `.js`, `.ts`, `.html`, `.rb`, `.rs`, `.go`, `.java`, `.c`, `.cpp`, `.sh`, `.sql`, `.r`, `.jl`, `.lua`, `.php`, `.swift`, `.kt`, `.scala`). Referenced from markdown with `:::filename.ext`
- **images/** — image files (`.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp`). Referenced with `:::filename.ext`, base64-embedded into HTML. Click any image to enlarge it in a lightbox
- **files/** — data files embedded into static builds and preloaded into Pyodide's virtual filesystem, so Python code can read them with `open("data.csv")`

## How code execution works

Python code blocks run entirely in the browser via [Pyodide](https://pyodide.org/) (Python compiled to WebAssembly). No server is involved.

- **Automatic package installation** — import statements are parsed and packages are installed via micropip automatically. Common packages (numpy, pandas, matplotlib, scipy) are available from Pyodide's distribution. Pure-Python PyPI packages also work. Common import-to-package mappings are built in (e.g. `PIL` → `pillow`, `cv2` → `opencv-python`, `sklearn` → `scikit-learn`)
- **Preloading** — when a page loads, all code blocks are scanned for imports and packages begin installing in the background, so they're ready by the time you click Run
- **Shared session** — all code blocks on a page share a single Python session. Variables and imports persist between blocks, like cells in a Jupyter notebook
- **Matplotlib** — the Agg backend is configured automatically. Plots render inline as images when `plt.show()` is called
- **File generation** — files created by scripts are detected by comparing Pyodide's virtual filesystem before and after execution. New files are offered as downloads via Blob URLs
- **File uploads** — `:::upload` directives render upload buttons that write files into Pyodide's virtual filesystem via the browser File API, making them available to Python code with standard file I/O
- **Embedded data** — files placed in `.readrun/files/` are embedded into the static build (base64 encoded) and preloaded into Pyodide's virtual filesystem

## How HTML blocks work

`:::html` blocks render in a sandboxed iframe (`allow-scripts`) that auto-resizes to match content via `ResizeObserver` and `postMessage`. The iframe dynamically tracks content size — interactive elements that grow or shrink update the frame height automatically.

JS library usage is auto-detected from the code and CDN scripts are injected automatically:

| Library | Detection pattern | CDN |
|---------|------------------|-----|
| Plotly | `Plotly.` | plotly.js@2 |
| D3 | `d3.` | d3@7 |
| Chart.js | `new Chart`, `Chart.` | chart.js@4 |
| Observable Plot | `Plot.` | @observablehq/plot@0.6 |
| Three.js | `THREE` | three@0.170 |
| p5.js | `p5` | p5@1 |
| Leaflet | `L.map`, `L.tileLayer`, `Leaflet` | leaflet@1 (+ CSS) |
| Mermaid | `mermaid` | mermaid@11 |

No manual `<script>` or `<link>` tags needed — just use the library's API directly.

## User interface

- **Settings panel** — press Escape to open. Adjust font size (small/medium/large), content width (500–1400px slider), theme, and sidebar visibility
- **Theme picker** — click the theme name in settings to browse all 8 themes with live previews (Light, Dark, Solarized, Nord, Dracula, Monokai, Gruvbox, Catppuccin)
- **In-page search** — press `/` to search. Matches are highlighted and counted (e.g. "3/12"). Navigate with Enter/Shift+Enter or arrow buttons
- **Table of contents** — auto-generated from headings in the right sidebar. Sections are collapsible. The current section highlights as you scroll (scroll spy). Heading IDs are generated from the text (e.g. `## My Section` → `#my-section`)
- **Context menu** — right-click in the content area for quick access to Search and Settings
- **Code block controls** — every executable block has Hide/Show (collapse the code), Enlarge (full-screen modal with synced output), and Run buttons
- **Focus mode** — press `f` to hide both sidebars for distraction-free reading
- **Resizable sidebars** — drag the edge of the nav or TOC sidebar to resize. Widths persist across page loads
- **Image lightbox** — click any image to view it enlarged. Press Escape to close
- **Resource browser** — sidebar tabs for images, files, and scripts from `.readrun/`. Only works in View mode (dev server); static builds show empty tabs

## Keyboard shortcuts

All shortcuts are configurable in `~/.config/readrun/settings.toml`.

| Action | Default | Description |
|--------|---------|-------------|
| Search | `/` | Open in-page search |
| Settings | `Escape` | Toggle settings panel |
| Next page | `j` | Navigate to next page |
| Previous page | `k` | Navigate to previous page |
| Home | `g h` | Go to first page |
| Scroll down | `d` | Smooth scroll down |
| Scroll up | `u` | Smooth scroll up |
| Focus mode | `f` | Toggle sidebar visibility |
| Run all | `r a` | Run all code blocks on page |

Escape also closes search, modals, and focus mode (in that priority order).

See [limitations](./limitations.md) for known constraints.
