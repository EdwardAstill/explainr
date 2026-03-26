# Deployment

## Usage

```bash
explainr                              # start dev server (serves current directory)
explainr dev [port]                   # start dev server on a specific port (default: 3001)
explainr build [out]                  # build static site (default: ./dist)
explainr build github [out]           # build for GitHub Pages
explainr build vercel [out]           # build for Vercel
explainr build netlify [out]          # build for Netlify
explainr -t                           # start dev server with built-in demo content
explainr --live                       # start live server (native Python, file uploads)
explainr -t --live                    # live server with demo content
```

## Building a static site

Run `explainr build` to generate static HTML from your Markdown folder:

```bash
explainr build           # outputs to ./dist
explainr build ./public  # outputs to custom directory
```

The output is plain HTML files — no server runtime needed.

## Platform-specific builds

Use `explainr build <platform>` to generate the static site along with platform-specific config files.

### GitHub Pages

```bash
explainr build github
```

Generates:
- `.nojekyll` — prevents GitHub from processing with Jekyll
- `.github/workflows/deploy.yml` — GitHub Actions workflow for automatic deployment

For project sites hosted at `username.github.io/repo-name/`, use the `--base` flag so links resolve correctly:

```bash
explainr build github --base /repo-name/
```

This adds a `<base>` tag to every page so all navigation works under the subpath. User/org sites at `username.github.io` don't need this.

### Vercel

```bash
explainr build vercel
```

Generates a `vercel.json` with the build command and output directory configured.

### Netlify

```bash
explainr build netlify
```

Generates a `netlify.toml` with the build command and publish directory configured.

## Live server mode

Use `explainr --live` to run explainr with native Python execution. In this mode, Python code blocks run on your machine via subprocess rather than in the browser via Pyodide. This removes Pyodide's limitations (no C extensions, memory constraints) and enables server-side features.

Key details:

- **Native Python** -- code runs on your machine, not in the browser. Any packages installed locally are available.
- **File uploads** -- a button in the bottom-right corner lets readers upload files. Uploaded files are saved to `.explainr/files/` inside the content directory.
- **Inline images** -- generated images (e.g., matplotlib plots) display inline below the code block that produced them.
- **Requires Python 3** -- Python 3 must be installed and available on your `PATH`.

Live server mode is intended for local use or deployment on a server that supports persistent processes. It is not compatible with static hosts like GitHub Pages.

## How code execution works on static hosts

GitHub Pages and similar platforms only serve static files — there is no server-side code execution. This is fine for explainr because Python code blocks run entirely in the browser via [Pyodide](https://pyodide.org/) (Python compiled to WebAssembly). No server is involved.

The limitation: there is no way to access files from the user's computer for server-side processing. Any file handling must happen client-side within the browser's Pyodide runtime.
