# Limitations

Known constraints of readrun in its current state.

## Python execution (Pyodide)

- **WebAssembly only** — Python runs in the browser via Pyodide, not natively. This means slower startup (Pyodide is ~10MB to download on first load) and slower execution than native Python.
- **No C extension packages** — only packages that are either pure Python or pre-built for Pyodide work. Most scientific packages (numpy, pandas, scipy, matplotlib, scikit-learn) are available, but packages requiring native compilation (e.g. some ML frameworks, database drivers) will not install.
- **Memory limits** — browser tab memory applies. Very large datasets or computations may cause the tab to crash.
- **No network access** — Python code cannot make HTTP requests or access the internet. `urllib`, `requests`, etc. will not work.
- **No filesystem persistence** — Pyodide's virtual filesystem resets on page reload. Files created by scripts exist only for the duration of the session. Use the download links to save generated files.
- **Shared state across blocks** — all code blocks on a page share a single Python session. This is usually convenient, but means a failing block can leave state that affects subsequent blocks. Reloading the page resets everything.
- **First run is slow** — Pyodide and packages must be downloaded and initialized. Subsequent runs on the same page are fast. Packages are preloaded in the background when the page opens, but large packages (numpy, scipy) still take a few seconds.

## Package installation

- **Import detection is regex-based** — readrun parses `import X` and `from X import ...` to detect packages. Dynamic imports (`__import__()`, `importlib.import_module()`) are not detected. Conditional imports inside functions are not detected until the block is run.
- **Package name mismatches** — common mappings are built in (e.g. `PIL` to `pillow`, `cv2` to `opencv-python`), but obscure packages where the import name differs from the PyPI name may fail. Workaround: add a comment `# import the-pypi-name` so the regex picks it up, or use `micropip.install("package-name")` explicitly in a code block.

## Matplotlib

- **Agg backend only** — interactive backends (zooming, panning) are not available. Plots are rendered as static PNG images.
- **Must call `plt.show()`** — figures only appear in the output after `plt.show()` is called. Forgetting it means no output.

## Content and navigation

- **No hot reload** — in View mode, changes to markdown files require a page refresh to see. There is no file watcher or live reload.
- **No client-side routing** — navigating between pages is a full page load. Python state resets when you navigate to a different page.
- **No broken link detection** — links to non-existent markdown files are not caught during build. They just 404 at runtime.
- **Node_modules and common dirs are filtered** — the nav tree ignores `node_modules`, `dist`, `out`, `__pycache__`, and `venv` directories. If your content is inside one of these, it won't appear.

## Static builds

- **Embedded files increase page size** — files in `.readrun/files/` are base64 encoded into every page's HTML. Large data files will significantly increase page size and load time.
- **No incremental builds** — every build regenerates all pages from scratch.
- **Resource browser requires dev server** — the images/files/scripts tabs in the sidebar use API routes that only work in View mode. In static builds, these tabs will show empty.

## General

- **Bun required** — readrun requires [Bun](https://bun.sh) as its runtime. Node.js is not supported.
- **No mobile optimization** — the UI is designed for desktop browsers. The sidebar and TOC panel are hidden on narrow screens but the overall experience is not optimized for mobile.
- **KaTeX optional** — math rendering requires `@vscode/markdown-it-katex` to be installed. Without it, LaTeX blocks render as plain text.
