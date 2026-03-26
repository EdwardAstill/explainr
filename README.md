# explainr

Turn folders of Markdown into interactive websites with executable Python code blocks.

Write your content in `.md` files, organize them in folders, and explainr renders them as a navigable site where readers can run Python code inline. No config files, no frontmatter, no special setup -- just Markdown.

## Install

Requires [Bun](https://bun.sh).

```bash
bun install -g github:EdwardAstill/explainr
```

## Quick start

```bash
cd your-markdown-folder
explainr                    # start dev server on localhost:3001
explainr -t                 # try the built-in demo
```

## Features

- **Markdown-first** -- your existing notes work as-is, no special syntax needed
- **Executable Python** -- optional `:::python` code blocks run in the browser via Pyodide, or natively with `--live`
- **Live server mode** -- `--live` flag for native Python execution, file uploads, and inline image rendering
- **Link navigation** -- markdown links between `.md` files are automatically rewritten for site navigation
- **Settings panel** -- readers can adjust font size, content width, and toggle the sidebar
- **Platform builds** -- `explainr build github|vercel|netlify` generates deployment configs

## Usage

```bash
explainr                              # start dev server
explainr dev [port]                   # dev server on custom port (default: 3001)
explainr --live                       # live server (native Python, file uploads)
explainr build [out]                  # build static site (default: ./dist)
explainr build github [out]           # build for GitHub Pages
explainr build vercel [out]           # build for Vercel
explainr build netlify [out]          # build for Netlify
explainr build github --base /repo/   # GitHub Pages project site with base path
explainr -t                           # use built-in demo content
```

## How it works

Point explainr at a folder like this:

```
my-notes/
  getting-started.md
  guides/
    setup.md
    advanced.md
  reference/
    api.md
```

It renders a website with a sidebar nav built from your folder structure. Standard Markdown renders as clean HTML. Code blocks wrapped in `:::python` / `:::` get a "Run" button -- readers click it and see output inline.

In **static mode** (default), Python runs in the browser via Pyodide. In **live mode** (`--live`), Python runs natively on your machine with full package access, file uploads, and inline image rendering for things like matplotlib plots.

## Philosophy

**Your existing Markdown notes should just work.** Executable code and file uploads are optional layers -- a site built entirely from standard Markdown is a first-class use case. Notes written for explainr remain readable in any Markdown viewer.

See [docs/philosophy.md](docs/philosophy.md) for more.

## Deployment

Build a static site and deploy anywhere:

```bash
explainr build github    # GitHub Pages (.nojekyll + Actions workflow)
explainr build vercel    # Vercel (vercel.json)
explainr build netlify   # Netlify (netlify.toml)
```

Python execution happens client-side via Pyodide (WASM), so static hosts work without a server. See [docs/deployment.md](docs/deployment.md) for details.

## Documentation

- [Philosophy](docs/philosophy.md) -- core design principles
- [Deployment](docs/deployment.md) -- building and hosting your site
- [Future features](docs/future/) -- planned work
