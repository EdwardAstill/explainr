# Deployment

## Previewing your site

Run `rr` from your content folder and select **View**. readrun serves the current directory on port 3001 (or the next available port if 3001 is in use) and opens your browser automatically.

## Usage

```bash
readrun          # launch interactive TUI
rr               # shorthand
rr <folder>      # open a folder directly
rr <file.md>     # open a single markdown file directly
```

The TUI has six options: **View** (preview current directory), **Saved** (open a saved path), **File** (browse and open a single markdown file), **Build** (generate a static site), **Docs** (preview the built-in documentation), and **Update** (install/update dependencies).

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
nextPage       = "j"
prevPage       = "k"
goHome         = "g h"
scrollDown     = "Space"
scrollUp       = "Shift+Space"
scrollToTop    = "g g"
scrollToBottom = "G"
toggleSidebar  = "s"
focusMode      = "f"
nextTheme      = "t"
prevTheme      = "T"
fontIncrease   = "+"
fontDecrease   = "-"
search         = "/"
showShortcuts  = "?"
closeOverlay   = "Escape"
```

Chord bindings like `g h` (go home) and `g g` (scroll to top) require pressing both keys within one second.

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

### Python blocks (`:::python`)

Python code blocks run entirely in the browser via [Pyodide](https://pyodide.org/) (Python compiled to WebAssembly). No server is involved.

- **Automatic package installation** — import statements are parsed and packages are installed via micropip automatically. Common packages (numpy, pandas, matplotlib, scipy) are available from Pyodide's distribution. Pure-Python PyPI packages also work. Common import-to-package mappings are built in (e.g. `PIL` → `pillow`, `cv2` → `opencv-python`, `sklearn` → `scikit-learn`)
- **Preloading** — when a page loads, all code blocks are scanned for imports and packages begin installing in the background, so they're ready by the time you click Run
- **Shared session** — all code blocks on a page share a single Python session. Variables and imports persist between blocks, like cells in a Jupyter notebook
- **Matplotlib** — the Agg backend is configured automatically. Plots render inline as images when `plt.show()` is called
- **File generation** — files created by scripts are detected by comparing Pyodide's virtual filesystem before and after execution. New files are offered as downloads via Blob URLs
- **File uploads** — `:::upload` directives render upload buttons that write files into Pyodide's virtual filesystem via the browser File API, making them available to Python code with standard file I/O
- **Embedded data** — files placed in `.readrun/files/` are embedded into the static build (base64 encoded) and preloaded into Pyodide's virtual filesystem

### JSX blocks (`:::jsx`)

JSX blocks run React/JSX code in the browser and auto-render on page load (no Run button needed). React 18, ReactDOM, Babel, and Tailwind CSS are loaded automatically.

Use the `render()` function to mount a component:

```
:::jsx
function Counter() {
  const [n, setN] = React.useState(0);
  return <button onClick={() => setN(n + 1)} className="p-2 bg-blue-500 text-white rounded">Clicked {n} times</button>;
}
render(<Counter />);
:::
```

JSX blocks can also have Hide/Show, Enlarge, and Run controls like Python blocks. Add `hidden` to start collapsed.

## User interface

- **Settings panel** — press Escape to open (Escape follows a priority chain: close open overlays → close search → close settings panel → exit focus mode → open settings). Adjust font size (small/medium/large), content width (500–1400px slider), theme, and sidebar visibility
- **Theme picker** — click the theme name in settings to browse all 8 themes with live previews (Light, Dark, Solarized, Nord, Dracula, Monokai, Gruvbox, Catppuccin). Or press `t`/`T` to cycle themes directly
- **In-page search** — press `/` to search. Matches are highlighted and counted (e.g. "3/12"). Navigate with Enter/Shift+Enter or arrow buttons
- **Table of contents** — auto-generated from headings in the right sidebar. Sections are collapsible. The current section highlights as you scroll (scroll spy). Heading IDs are generated from the text (e.g. `## My Section` → `#my-section`)
- **Context menu** — right-click in the content area for quick access to Search and Settings
- **Code block controls** — every executable block has Hide/Show (collapse the code), Enlarge (full-screen modal with synced output), and Run buttons
- **Focus mode** — press `f` to hide both sidebars for distraction-free reading
- **Resizable sidebars** — drag the edge of the nav or TOC sidebar to resize. Widths persist across page loads
- **Image lightbox** — click any image to view it enlarged. Press Escape to close
- **Resource browser** — sidebar tabs for images, files, and scripts from `.readrun/`. Only works in View mode (dev server); static builds show empty tabs
- **Enter folder** — right-click any folder in the nav sidebar to zoom into it. A breadcrumb bar appears at the top; click any crumb to navigate back up
- **Saved documents** — the TUI **Saved** option lets you save folders or files for quick access. Saved paths are stored in `~/.config/readrun/settings.toml` under `[[saved]]` entries

## Keyboard shortcuts

All shortcuts are configurable in `~/.config/readrun/settings.toml`. Press `?` on any page to view the full list.

| Action | Default | Description |
|--------|---------|-------------|
| Search | `/` | Open in-page search |
| Close / Settings | `Escape` | Close overlays → search → settings panel → focus mode → open settings |
| Show shortcuts | `?` | Open keyboard shortcuts overlay |
| Next page | `j` | Navigate to next page |
| Previous page | `k` | Navigate to previous page |
| Go home | `g h` | Go to first page |
| Scroll down | `Space` | Scroll down one screen |
| Scroll up | `Shift+Space` | Scroll up one screen |
| Scroll to top | `g g` | Jump to top of page |
| Scroll to bottom | `G` | Jump to bottom of page |
| Toggle sidebar | `s` | Show/hide nav sidebar |
| Focus mode | `f` | Hide both sidebars |
| Next theme | `t` | Cycle to next theme |
| Previous theme | `T` | Cycle to previous theme |
| Increase font | `+` | Increase font size |
| Decrease font | `-` | Decrease font size |

See [limitations](./limitations.md) for known constraints.
