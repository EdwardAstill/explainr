# Deployment

## Previewing your site

Select **View** from the TUI to build and preview your site locally. readrun builds static HTML from your Markdown folder and serves it on a local port. Python code blocks run in the browser via [Pyodide](https://pyodide.org/) (WebAssembly).

## Usage

```bash
readrun    # launch interactive TUI
rr         # shorthand
```

The TUI lets you choose between View, Build, Demo, and Update. Each mode prompts for content directory and port.

## Building a static site

Select **Build** from the TUI to generate static HTML from your Markdown folder. You'll be prompted for:

- Content directory
- Target platform (Plain, GitHub Pages, Vercel, Netlify)
- Output directory (default: `./dist`)
- Base path (for GitHub Pages project sites)

The output is plain HTML files — no server runtime needed.

## Platform-specific builds

### GitHub Pages

Generates:
- `.nojekyll` — prevents GitHub from processing with Jekyll
- `.github/workflows/deploy.yml` — GitHub Actions workflow for automatic deployment

For project sites hosted at `username.github.io/repo-name/`, set the base path in the TUI so links resolve correctly. User/org sites at `username.github.io` don't need this.

### Vercel

Generates a `vercel.json` with the build command and output directory configured.

### Netlify

Generates a `netlify.toml` with the build command and publish directory configured.

## Configuration

readrun stores settings at `~/.config/readrun/settings.toml`. This file is created automatically on first run with default keyboard shortcuts. Edit it to customize keybinds.

## How code execution works

Python code blocks run entirely in the browser via [Pyodide](https://pyodide.org/) (Python compiled to WebAssembly). No server is involved. HTML blocks render in sandboxed iframes that auto-resize to match their content via `ResizeObserver` and `postMessage`.

- **Automatic package installation** — import statements are parsed and packages are installed via micropip automatically. Common packages (numpy, pandas, matplotlib, scipy) are available from Pyodide's distribution. Pure-Python PyPI packages also work.
- **HTML library auto-detection** — HTML blocks are scanned for JS library usage (Plotly, D3, Chart.js, Three.js, Leaflet, Mermaid, etc.) and CDN scripts are injected automatically. No manual `<script>` tags needed.
- **File uploads** — `:::upload` directives render upload buttons that write files into Pyodide's virtual filesystem via the browser File API, making them available to Python code with standard file I/O.
- **Preloading** — when a page loads, all code blocks are scanned for imports and packages begin installing in the background, so they're ready by the time you click Run.
- **Shared session** — all code blocks on a page share a single Python session. Variables and imports persist between blocks, like cells in a Jupyter notebook.
- **Matplotlib** — plots render inline automatically when `plt.show()` is called.
- **File generation** — files created by scripts are detected in Pyodide's virtual filesystem and offered as downloads via Blob URLs.
- **Embedded data** — files placed in `.readrun/files/` are embedded into the static build (base64 encoded) and preloaded into Pyodide's virtual filesystem, so Python code can read them with standard file I/O.

See [limitations](./limitations.md) for known constraints.
