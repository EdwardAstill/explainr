# Deployment

## Two ways to serve

readrun has two serving modes:

- **View** — serves your Markdown site in the browser. Code blocks run in-browser via [Pyodide](https://pyodide.org/) (WebAssembly). No access to your filesystem. Safe to share — behaves like a static site with interactive code.
- **Live Server** — serves your site with native Python execution via [uv](https://docs.astral.sh/uv/). Code runs on your machine with full filesystem access, file uploads, and no Pyodide limitations. Intended for local authoring and development.

Both are available from the interactive TUI — just run `readrun` or `rr`.

## Usage

```bash
readrun    # launch interactive TUI
rr         # shorthand
```

The TUI lets you choose between View, Live Server, Build, Demo, and Update. Each mode prompts for content directory and port.

If the chosen port is already in use, readrun automatically picks the next available one.

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

## Live server mode

Select **Live Server** from the TUI to run readrun with native Python execution. In this mode, Python code blocks run on your machine via [uv](https://docs.astral.sh/uv/) rather than in the browser via Pyodide. This removes Pyodide's limitations (no C extensions, memory constraints) and enables server-side features.

Key details:

- **Native Python via uv** -- code runs on your machine using `uv run`. Dependencies are auto-detected from import statements and installed on the fly — no `pip install` needed. For example, a code block with `import matplotlib` will automatically run via `uv run --with matplotlib`.
- **PEP 723 override** -- for packages where the import name differs from the PyPI name (e.g. `import cv2` needs `opencv-python`), add [PEP 723](https://peps.python.org/pep-0723/) inline script metadata and it takes precedence over auto-detection:
  ```python
  # /// script
  # dependencies = ["opencv-python"]
  # ///
  import cv2
  ```
- **Files panel** -- at the bottom of the sidebar, a files panel lists everything in `.readrun/files/` and lets readers upload new files.
- **Pre-seeded data files** -- place CSVs, JSON, or other data in `.readrun/files/` before starting the server. Code blocks can read them with standard `open()` or `pandas.read_csv()`.
- **Inline images** -- generated images (e.g., matplotlib plots) display inline below the code block that produced them.
- **Requires uv and Python 3** -- [uv](https://docs.astral.sh/uv/) and Python 3 must be installed and available on your `PATH`.

Live server mode is intended for local use or deployment on a server that supports persistent processes. It is not compatible with static hosts like GitHub Pages.

## Configuration

readrun stores settings at `~/.config/readrun/settings.toml`. This file is created automatically on first run with default keyboard shortcuts. Edit it to customize keybinds.

## How code execution works on static hosts

GitHub Pages and similar platforms only serve static files — there is no server-side code execution. This is fine for readrun because Python code blocks run entirely in the browser via [Pyodide](https://pyodide.org/) (Python compiled to WebAssembly). No server is involved.

The limitation: there is no way to access files from the user's computer for server-side processing. Any file handling must happen client-side within the browser's Pyodide runtime.
