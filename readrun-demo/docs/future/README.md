# Future Features

Planned improvements for readrun.

## Implemented

- **[Static site deployment](static-site-deployment.md)** — GitHub Pages, Vercel, Netlify builds via TUI
- **[Live server mode](live-server-mode.md)** — native Python execution via uv, file uploads, inline images
- **[Link navigation](link-navigation.md)** — markdown links rewritten to rendered paths
- **[File uploads](file-uploads.md)** — upload data files in live mode; static mode planned

## Remaining

- **Client-side routing** — intercept internal links for instant navigation without page reloads
- **Frontmatter dependencies** — declare Python dependencies in page YAML frontmatter
- **Static file uploads** — client-side file handling via Pyodide's virtual filesystem
- **Broken link detection** — warn during build if markdown links point to missing files
