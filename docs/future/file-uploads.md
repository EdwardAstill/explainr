# File Uploads

Corresponds to Phase 3 of the explainr vision.

## Goal

Allow readers to upload their own data files (CSV, JSON, etc.) that executable code blocks can read and process. This turns a static document into a personal analysis tool — an author writes the analysis logic, and readers supply their own data.

## Live server mode (implemented)

In live server mode (`explainr --live`), files are managed via a panel at the bottom of the sidebar:

- **Pre-seeded files** -- authors can place data files in `.explainr/files/` before starting the server. These appear in the files panel immediately (e.g. the live demo includes `sales_data.csv`).
- **Upload** -- readers can add new files via the "+ Add file" button in the panel. Uploaded files are saved to `.explainr/files/`.
- **File list** -- the panel shows all files with their sizes. Code blocks can read any listed file with standard `open()` or `pandas.read_csv()` calls.

## Static mode (planned)

On static hosts (GitHub Pages, Netlify, Vercel), there is no server to receive uploads. File handling must happen client-side within Pyodide's in-browser filesystem:

- Uploaded files would be loaded into Pyodide's virtual filesystem so Python code can read them with standard file I/O.
- Files never leave the user's browser — no data is sent to a server.

### Open questions

- How should uploaded files be scoped? Per code block, per page, or globally across the site?
- Should there be a file picker UI per code block, or a single upload area per page?
- Size limits and supported file types
