# Getting Started

This page walks you through using readrun with your own Markdown notes.

## Install

```bash
bun install -g readrun
```

## Start the dev server

Run `rr` with no arguments to open the interactive menu:

```bash
cd your-notes-folder
rr
```

Or pass a path directly to skip the menu:

```bash
rr .                      # serve the current folder
rr ./my-notes             # serve a specific folder
rr intro.md               # open a single file
rr notes/lecture-1.md     # open a single file by path
```

When given a folder, readrun serves the whole directory. When given a `.md` file, it serves that file's folder and opens the browser directly on that page.

Open [http://localhost:3001](http://localhost:3001) and you'll see your notes rendered as a navigable website with a sidebar built from your folder structure.

### Previewing a single file from the TUI

If you prefer the interactive menu, select **📄 File** from the main menu. You can then browse your filesystem and pick any `.md` file — readrun opens the browser directly on that page.

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

Wrap code in bracket blocks and readers can run it inline:

[python]
print("Hello from readrun!")

for i in range(1, 6):
    print("*" * i)
[/python]

### File references

You can also keep code in separate files under `.readrun/scripts/` and reference them by filename:

```
[python=variables.py]
```

The code is loaded from `.readrun/scripts/variables.py`, displayed on the page, and made runnable — exactly like an inline block. This keeps your markdown clean when scripts get longer.

### JSX blocks

JSX blocks render directly in the page — no iframe, no run button. React and Tailwind are loaded automatically. Use the built-in `render()` helper to mount your component:

```
[jsx]
function App() {
  return <h1 className="text-2xl font-bold">Hello!</h1>;
}
render(<App />);
[/jsx]
```

Reference a `.jsx` file from `.readrun/scripts/` the same way as any other file — it auto-renders on page load:

```
[jsx=counter.jsx]
```

[jsx=counter.jsx]

### Images

Place images in `.readrun/images/` and reference them the same way:

```
[image=diagram.svg]
```

Here's the "how it works" diagram from the welcome page, embedded via `[image=how-it-works.svg]`:

[image=how-it-works.svg]

Images are embedded directly in the page. Click any image to enlarge it.

Standard markdown code blocks (triple backticks) are displayed but not runnable — useful for showing bash commands, config snippets, or code you don't want readers to execute.

## Links between pages

Standard Markdown links work as navigation. For example, [Python Basics](../notes/lecture-1.md) links to the first lecture. readrun rewrites `.md` links automatically so they work in the rendered site.

## Next steps

Head to [Python Basics](../notes/lecture-1.md) to see a full lesson with runnable code, or go back to the [welcome page](../welcome.md).
