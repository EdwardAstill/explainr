# readrun

Turn folders of Markdown into interactive websites with executable Python code blocks.

Write your content in `.md` files, organize them in folders, and readrun renders them as a navigable site where readers can run Python code inline. No config files, no frontmatter, no special setup -- just Markdown.

## Install

Requires [Bun](https://bun.sh).

```bash
bun install -g github:EdwardAstill/readrun
```

## Quick start

```bash
cd your-markdown-folder
rr                         # start dev server on localhost:3001
rr -t                      # try the built-in demo
```

## Features

- **Markdown-first** -- your existing notes work as-is, no special syntax needed
- **Executable code** -- `:::python` code blocks run in the browser via Pyodide, or natively with `--live`. `:::html` blocks render in a sandboxed iframe
- **File references** -- keep code in `.readrun/scripts/` and images in `.readrun/images/`, reference with `:::filename`
- **Live server mode** -- `--live` flag for native Python execution, file uploads, and inline image rendering
- **Link navigation** -- markdown links between `.md` files are automatically rewritten for site navigation
- **Settings panel** -- readers can adjust font size, content width, and toggle the sidebar
- **Platform builds** -- `rr build github|vercel|netlify` generates deployment configs

## Usage

```bash
rr                                   # start dev server
rr dev [port]                        # dev server on custom port (default: 3001)
rr --live                            # live server (native Python, file uploads)
rr build [out]                       # build static site (default: ./dist)
rr build github [out]                # build for GitHub Pages
rr build vercel [out]                # build for Vercel
rr build netlify [out]               # build for Netlify
rr build github --base /repo/        # GitHub Pages project site with base path
rr -t                                # use built-in demo content
```

## How it works

Point `rr` at a folder like this:

```
my-notes/
  getting-started.md
  guides/
    setup.md
    advanced.md
  reference/
    api.md
  .readrun/
    scripts/            # code files referenced from markdown
      demo.py
      widget.html
    images/             # images referenced from markdown
      diagram.svg
    files/              # data files for live mode (optional)
```

It renders a website with a sidebar nav built from your folder structure. Standard Markdown renders as clean HTML. Code blocks wrapped in `:::python` / `:::` get a "Run" button -- readers click it and see output inline. `:::html` blocks render in a sandboxed iframe.

You can write code inline in the markdown, or keep it in `.readrun/scripts/` and reference it by filename:

```
:::plot.py
```

This loads `.readrun/scripts/plot.py`, displays the code, and makes it runnable -- exactly like an inline block.

Images work the same way -- place them in `.readrun/images/` and reference by filename:

```
:::diagram.svg
```

Click any image to enlarge it.

In **static mode** (default), Python runs in the browser via Pyodide. In **live mode** (`--live`), Python runs natively on your machine with full package access, file uploads, and inline image rendering for things like matplotlib plots.

## Philosophy

**Your existing Markdown notes should just work.** Executable code and file uploads are optional layers -- a site built entirely from standard Markdown is a first-class use case. Notes written for readrun remain readable in any Markdown viewer.

See [docs/philosophy.md](docs/philosophy.md) for more.

## Deployment

Build a static site and deploy anywhere:

```bash
rr build github    # GitHub Pages (.nojekyll + Actions workflow)
rr build vercel    # Vercel (vercel.json)
rr build netlify   # Netlify (netlify.toml)
```

Python execution happens client-side via Pyodide (WASM), so static hosts work without a server. See [docs/deployment.md](docs/deployment.md) for details.

## Documentation

- [Philosophy](docs/philosophy.md) -- core design principles
- [Deployment](docs/deployment.md) -- building and hosting your site
- [Future features](docs/future/) -- planned work
