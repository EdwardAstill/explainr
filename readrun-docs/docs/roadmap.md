# Roadmap

Planned improvements for readrun.

## Client-side routing

Internal links currently trigger a full page reload. A future improvement would intercept internal link clicks and swap content without reloading, for instant navigation.

## Frontmatter dependencies

Declare Python package dependencies in page YAML frontmatter rather than relying on import scanning. Useful for packages that are imported conditionally or inside functions.

## Client-side file uploads

`[upload]...[/upload]` blocks already render upload buttons that write files into Pyodide's virtual filesystem. Remaining work:

- File scoping — currently global per page; could be scoped per block
- Size limits and supported type filtering
- UI for inspecting currently loaded files

## Broken link detection

Warn during `rr build` if a markdown file links to a `.md` file that doesn't exist in the project.
