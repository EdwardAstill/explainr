# Live Server Mode

**Status: Implemented** -- use `explainr --live` to enable.

Live server mode runs Python code blocks natively on your machine via subprocess, instead of in the browser via Pyodide. It also enables file uploads (saved to `.explainr/files/`) and inline rendering of generated images.

See [docs/deployment.md](../deployment.md) for usage details.

## Remaining work

- **Server-side Python package management** -- automatically install missing packages or provide a way to declare dependencies
- **Session persistence across page reloads** -- preserve Python state and variables when the page is refreshed
- **Docker deployment support** -- provide a Dockerfile or container setup for deploying live server mode to production
