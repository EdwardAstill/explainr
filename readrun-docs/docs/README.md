# readrun

readrun turns folders of Markdown into interactive websites. No config, no frontmatter, no special setup — just `.md` files in a folder.

## Documentation

**[Philosophy](./philosophy.md)** — the design principles behind readrun: markdown-first, optional enhancements, not a notebook.

**[Deployment](./deployment.md)** — TUI usage, static builds, and platform-specific deployment (GitHub Pages, Vercel, Netlify).

**[Limitations](./limitations.md)** — known constraints: Pyodide limitations, package support, build behavior.

**[Future Features](./future/README.md)** — planned improvements: client-side routing, frontmatter dependencies, and more.

## Quick start

```bash
bun install -g readrun

# serve your notes
cd your-notes-folder
readrun

# or try the built-in demo
# select "Demo" from the TUI menu
```
