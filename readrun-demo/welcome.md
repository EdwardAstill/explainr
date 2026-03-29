# Welcome to readrun

readrun turns folders of Markdown into interactive websites. You're looking at one right now.

## Get started

**[Getting Started](./tutorials/intro.md)** — install readrun and serve your own notes.

**[Deployment](./docs/deployment.md)** — CLI usage, static builds, and platform-specific deployment (GitHub Pages, Vercel, Netlify).

## Examples

**[Python Basics](./notes/lecture-1.md)** — a sample lesson with runnable code blocks. Click "Run" to execute Python directly in your browser.

**[Functions](./notes/lecture-2.md)** — a second lesson that builds on the first, showing how pages can reference each other.

## How it works

:::how-it-works.svg

Your existing Markdown notes work as-is. This whole demo is just `.md` files in a folder:

```
readrun-demo/
  welcome.md          ← you are here
  tutorials/
    intro.md
  notes/
    lecture-1.md
    lecture-2.md
  docs/
    deployment.md
    philosophy.md
    future/
  .readrun/
    scripts/
    images/
```

No config files. No frontmatter. No special setup. Just Markdown.

## Learn more

**[Philosophy](./docs/philosophy.md)** — the design principles behind readrun: markdown-first, optional enhancements, not a notebook.

**[Future Features](./docs/future/README.md)** — planned improvements and roadmap.
