# File Uploads

## Goal

Allow readers to upload their own data files (CSV, JSON, etc.) that executable code blocks can read and process. This turns a static document into a personal analysis tool — an author writes the analysis logic, and readers supply their own data.

## Current state

readrun is static-only — all Python execution happens in the browser via Pyodide. There is no server to receive uploads.

**Author-curated data** can be placed in `.readrun/files/` and is embedded into the static build. These files are preloaded into Pyodide's virtual filesystem so Python code can read them with standard file I/O.

**Generated files** — files created by Python scripts (e.g. matplotlib plots, CSVs) are detected in Pyodide's virtual filesystem after execution and offered as downloads via Blob URLs. Image files are also rendered inline.

## Planned: client-side file uploads

File handling must happen entirely client-side within Pyodide's in-browser filesystem:

- Uploaded files would be loaded into Pyodide's virtual filesystem so Python code can read them with standard file I/O.
- Files never leave the user's browser — no data is sent to a server.

### Open questions

- How should uploaded files be scoped? Per code block, per page, or globally across the site?
- Should there be a file picker UI per code block, or a single upload area per page?
- Size limits and supported file types
