# Live Server Mode

**Status: Implemented** -- use `explainr --live` to enable.

Live server mode runs Python code blocks natively on your machine via `uv run`, instead of in the browser via Pyodide. It also enables a files panel (`.explainr/files/`), pre-seeded data files, and inline rendering of generated images.

See [docs/deployment.md](../deployment.md) for usage details.

## Dependency management

Dependencies are handled automatically via two mechanisms:

1. **Auto-detection (default)** -- import statements are parsed from the code and passed to `uv run --with`. Standard library modules are filtered out. Common import-to-package mismatches are mapped (e.g. `PIL` → `pillow`, `cv2` → `opencv-python`, `sklearn` → `scikit-learn`).
2. **PEP 723 override** -- if a code block contains `# /// script` inline metadata, auto-detection is skipped and `uv` reads dependencies directly from the metadata. This is the escape hatch for edge cases auto-detection can't handle.

## Remaining work

- **Markdown frontmatter dependencies** -- declare Python dependencies in the page's YAML frontmatter (e.g. `dependencies: [matplotlib, pandas]`) so they apply to all code blocks on that page without needing PEP 723 metadata in each block
- **Session persistence across page reloads** -- preserve Python state and variables when the page is refreshed
- **Docker deployment support** -- provide a Dockerfile or container setup for deploying live server mode to production
