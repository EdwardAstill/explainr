# Philosophy

## Markdown-first

readrun is built around one core idea: **your existing Markdown notes should just work.**

Point readrun at any folder of `.md` files and it renders a navigable website with a sidebar, syntax highlighting, and clean typography. No special syntax, no config files, no frontmatter required. If you already take notes in Markdown, readrun turns them into a website with zero changes to your files.

## Optional enhancements, not requirements

readrun supports executable Python code blocks (`:::python`) and file downloads from generated output. These are **optional layers** on top of plain Markdown — they exist for authors who want interactivity, but they are never required. A site built entirely from standard Markdown is a first-class use case, not a fallback.

This matters because:

- Authors shouldn't have to learn a new format to use readrun
- Notes written for readrun should remain perfectly readable in any Markdown viewer (VS Code, GitHub, Obsidian, etc.)
- The `:::python` fence is the only non-standard syntax, and it degrades gracefully — readers without readrun just see the code as text

## Not a notebook

readrun is not a notebook tool. It's a document renderer. The difference:

- **Notebooks** (Jupyter, Marimo) are code-first — you write code cells and add prose around them
- **readrun** is prose-first — you write documents and optionally embed runnable code

The goal is to make it easy to turn written explanations into interactive websites, not to replace computational notebooks.
