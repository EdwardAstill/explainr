# Welcome to explainr

explainr turns folders of Markdown into interactive websites. You're looking at one right now.

This demo walks you through everything explainr can do. Start with the [getting started tutorial](./tutorials/intro.md) or explore the sidebar.

## What you'll find here

**[Getting Started](./tutorials/intro.md)** — how to set up and use explainr with your own notes.

**[Python Basics](./notes/lecture-1.md)** — a sample lesson with runnable code blocks. Click "Run" to execute Python directly in your browser.

**[Functions](./notes/lecture-2.md)** — a second lesson that builds on the first, showing how pages can reference each other.

**[Data Visualization](./notes/lecture-3.md)** — read a CSV file and generate matplotlib charts. This is what live mode is for.

## The key idea

Your existing Markdown notes work as-is. This whole demo is just `.md` files in a folder:

```
explainr-demo/
  welcome.md          ← you are here
  tutorials/
    intro.md
  notes/
    lecture-1.md
    lecture-2.md
```

No config files. No frontmatter. No special setup. Just Markdown.

In live mode, your project can also include a `.explainr/files/` directory with data files (CSVs, images, etc.) that your code blocks can read and write.

## Try the settings

Click the gear icon in the top-right corner to adjust font size, content width, and toggle the sidebar.
