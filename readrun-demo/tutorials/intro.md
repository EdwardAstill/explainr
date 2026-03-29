# Getting Started

This page walks you through using readrun with your own Markdown notes.

## Install

```bash
bun install -g readrun
```

## Start the dev server

Point `rr` at any folder of `.md` files:

```bash
cd your-notes-folder
rr
```

Open [http://localhost:3001](http://localhost:3001) and you'll see your notes rendered as a navigable website with a sidebar built from your folder structure.

## Try it without your own notes

If you just want to see what readrun does, use the `-t` flag to serve this built-in demo:

```bash
rr -t
```

## Build for deployment

When you're ready to publish, build a static site:

```bash
rr build                       # plain static HTML
rr build github                # GitHub Pages (adds .nojekyll + Actions workflow)
rr build vercel                # Vercel (adds vercel.json)
rr build netlify               # Netlify (adds netlify.toml)
```

The output goes to `./dist` by default. Everything runs in the browser — no server needed.

## Adding runnable code

There are two ways to add executable code blocks.

### Inline code

Wrap code in `:::language` / `:::` fences and readers can run it inline:

:::python
print("Hello from readrun!")

for i in range(1, 6):
    print("*" * i)
:::

### File references

You can also keep code in separate files under `.readrun/scripts/` and reference them by filename:

```
:::variables.py
```

The code is loaded from `.readrun/scripts/variables.py`, displayed on the page, and made runnable — exactly like an inline block. This keeps your markdown clean when scripts get longer.

### HTML blocks

HTML is supported too — it renders in a sandboxed iframe. Inline or from a file:

```
:::html
<p style="color: blue;">Hello!</p>
:::
```

```
:::greeting.html
```

### Images

Place images in `.readrun/images/` and reference them the same way:

```
:::diagram.svg
```

Images are embedded directly in the page. Click any image to enlarge it.

Standard markdown code blocks (triple backticks) are displayed but not runnable — useful for showing bash commands, config snippets, or code you don't want readers to execute.

## Links between pages

Standard Markdown links work as navigation. For example, [Python Basics](../notes/lecture-1.md) links to the first lecture. readrun rewrites `.md` links automatically so they work in the rendered site.

## Next steps

Head to [Python Basics](../notes/lecture-1.md) to see a full lesson with runnable code, or go back to the [welcome page](../welcome.md).
