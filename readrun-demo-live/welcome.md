# Welcome to readrun

readrun turns folders of Markdown into interactive websites. You're looking at one right now.

This demo walks you through everything readrun can do. Start with the [getting started tutorial](./tutorials/intro.md) or explore the sidebar.

## What you'll find here

**[Getting Started](./tutorials/intro.md)** — how to set up and use readrun with your own notes.

**[Python Basics](./notes/lecture-1.md)** — a sample lesson with runnable code blocks. Click "Run" to execute Python directly in your browser.

**[Functions](./notes/lecture-2.md)** — a second lesson that builds on the first, showing how pages can reference each other.

**[Data Visualization](./notes/lecture-3.md)** — read a CSV file and generate matplotlib charts. This is what live mode is for.

## How it works

:::how-it-works.svg

## The key idea

Your existing Markdown notes work as-is. This whole demo is just `.md` files in a folder:

```
readrun-demo-live/
  welcome.md          ← you are here
  tutorials/
    intro.md
  notes/
    lecture-1.md
    lecture-2.md
    lecture-3.md
  .readrun/
    scripts/           ← code files referenced from markdown
      variables.py
      revenue_chart.py
      profit_trend.py
      scatter.py
    images/            ← images referenced from markdown
      how-it-works.svg
    files/             ← data files for live mode
      sales_data.csv
```

No config files. No frontmatter. No special setup. Just Markdown. Code can live inline or in `.readrun/scripts/`.

In live mode, your project can also include a `.readrun/files/` directory with data files (CSVs, images, etc.) that your code blocks can read and write.

## Try the settings

Click the gear icon in the top-right corner to adjust font size, content width, and toggle the sidebar.
