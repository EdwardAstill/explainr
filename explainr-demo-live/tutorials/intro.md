# Getting Started

This page walks you through using explainr with your own Markdown notes.

## Install

```bash
bun install -g explainr
```

## Start the dev server

Point explainr at any folder of `.md` files:

```bash
cd your-notes-folder
explainr
```

Open [http://localhost:3001](http://localhost:3001) and you'll see your notes rendered as a navigable website with a sidebar built from your folder structure.

## Try it without your own notes

If you just want to see what explainr does, use the `-t` flag to serve this built-in demo:

```bash
explainr -t                # browser-only Python (Pyodide)
explainr -t --live         # native Python via uv (auto-installs packages, file access)
```

Live mode requires [uv](https://docs.astral.sh/uv/) and Python 3. Dependencies like matplotlib are detected from imports and installed automatically — no setup needed.

## Build for deployment

When you're ready to publish, build a static site:

```bash
explainr build                  # plain static HTML
explainr build github           # GitHub Pages (adds .nojekyll + Actions workflow)
explainr build vercel           # Vercel (adds vercel.json)
explainr build netlify          # Netlify (adds netlify.toml)
```

The output goes to `./dist` by default. Everything runs in the browser — no server needed.

## Adding runnable code

Wrap Python code in `:::python` / `:::` fences and readers can run it inline. Here's an example — click **Run** to try it:

:::python
print("Hello from explainr!")

for i in range(1, 6):
    print("*" * i)
:::

Standard markdown code blocks (triple backticks) are displayed but not runnable — useful for showing bash commands, config snippets, or code you don't want readers to execute.

## Links between pages

Standard Markdown links work as navigation. For example, [Python Basics](../notes/lecture-1.md) links to the first lecture. explainr rewrites `.md` links automatically so they work in the rendered site.

## Next steps

Head to [Python Basics](../notes/lecture-1.md) to see a full lesson with runnable code, or go back to the [welcome page](../welcome.md).
