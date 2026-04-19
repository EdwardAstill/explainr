# readrun

readrun turns folders of Markdown into interactive websites. No config, no mandatory setup — just `.md` files in a folder. Optional YAML frontmatter (`title`, `virtual_path`) is recognised when present.

## Documentation

**[Philosophy](./philosophy.md)** — the design principles behind readrun: markdown-first, optional enhancements, not a notebook.

**[Frontmatter](./frontmatter.md)** — `virtual_path` for virtual folder nav, `title` for labels, wikilink resolution rules.

**[Deployment](./deployment.md)** — TUI usage, static builds, and platform-specific deployment (GitHub Pages, Vercel, Netlify).

**[Limitations](./limitations.md)** — known constraints: Pyodide limitations, package support, build behavior.

**[Future Features](./future/README.md)** — planned improvements: client-side routing, frontmatter dependencies, and more.

## Quick start

```bash
bun install -g github:EdwardAstill/readrun

# serve your notes
cd your-notes-folder
rr

# open a folder or file directly
rr <folder>
rr <file.md>

# or try the built-in docs
# select "Docs" from the TUI menu
```
