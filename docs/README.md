# explainr

explainr turns folders of Markdown into interactive websites. No config, no frontmatter, no special setup — just `.md` files in a folder.

## Documentation

**[Philosophy](./philosophy.md)** — the design principles behind explainr: markdown-first, optional enhancements, not a notebook.

**[Deployment](./deployment.md)** — CLI usage, live server mode, static builds, and platform-specific deployment (GitHub Pages, Vercel, Netlify).

**[Future Features](./future/README.md)** — planned improvements: client-side routing, frontmatter dependencies, static file uploads, and more.

## Quick start

```bash
bun install -g explainr

# serve your notes
cd your-notes-folder
explainr

# or try the built-in demo
explainr -t

# live mode (native Python via uv, file access, matplotlib)
explainr -t --live
```

## This guide

You're reading explainr's own documentation, rendered by explainr itself. Run `explainr --guide` at any time to open it.
