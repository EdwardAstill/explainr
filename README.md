# explainr

Turn folders of Markdown into interactive websites with executable Python code blocks.

Like [Marimo](https://marimo.io/) but for Markdown-first workflows -- write your content in `.md` files, organize them in folders, and explainr renders them as a navigable, interactive site where readers can run Python code inline.

## Quick start

```bash
bun install -g explainr    # install globally
cd your-markdown-folder
explainr                    # start dev server on localhost:3001
explainr build              # build static site to ./dist
explainr build github       # build for GitHub Pages
explainr build vercel       # build for Vercel
explainr build netlify      # build for Netlify
explainr -t                 # try the built-in demo
explainr --live             # start live server (native Python, file uploads)
```

## Features

- **Markdown-first** -- your existing notes work as-is, no special syntax needed
- **Executable Python** -- optional `:::python` code blocks run in the browser via Pyodide
- **Link navigation** -- markdown links between `.md` files are automatically rewritten to work in the rendered site
- **Settings panel** -- readers can adjust font size, content width, and toggle the sidebar
- **Live server mode** -- `--live` flag for native Python execution, file uploads, and inline image rendering
- **Platform builds** -- `explainr build github|vercel|netlify` generates platform-specific config

## Philosophy

**Your existing Markdown notes should just work.** Point explainr at any folder of `.md` files and it renders a navigable website. No special syntax, no config files, no frontmatter required.

Executable Python (`:::python`) and file uploads are optional enhancements, not requirements. A site built entirely from standard Markdown is a first-class use case.

See [docs/philosophy.md](docs/philosophy.md) for more.

## Vision

### Phase 1: Markdown Rendering
Render a folder of Markdown files as a static website with navigation, syntax highlighting, and clean typography. Deployable to Vercel or GitHub Pages.

### Phase 2: Executable Code Blocks
Python code blocks become runnable in the browser (via Pyodide/WASM). Readers click "Run" and see output inline -- tables, plots, printed results.

### Phase 3: File Uploads
Users can upload their own data files (CSV, JSON, etc.) that the code blocks can read and process. Turns a static document into a personal analysis tool.

### Phase 4: `index.yml` Layout Configuration
An `index.yml` at the root describes how Markdown files and folders are structured -- ordering, grouping, titles, and navigation hierarchy. Lets authors control the site layout without renaming files.

## Motivation

For my thesis project ([FanMin](https://github.com/eastill/FanMin)), I used Marimo to build an interactive notebook for a numerical method. Marimo is great for notebooks, but what I actually wanted was to write Markdown documents with embedded runnable code -- more like a textbook or tutorial than a notebook. explainr fills that gap.

## Hosting

Designed to deploy as a static site to:
- Vercel
- GitHub Pages
- Netlify
- Any static file host

Python code execution happens client-side via Pyodide (WASM), so no server is needed. See [docs/deployment.md](docs/deployment.md) for details.

## Documentation

- [Philosophy](docs/philosophy.md) -- core design principles
- [Deployment](docs/deployment.md) -- building and hosting your site
- [Future features](docs/future/) -- planned work
