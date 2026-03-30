# Future: Link Navigation

## Implemented

Markdown links to `.md` files are automatically rewritten to their rendered paths. For example:

- `[intro](../tutorials/intro.md)` becomes a link to `../tutorials/intro`
- External links (`https://...`) are left unchanged

This works in both the dev server and static builds.

## Remaining work

- **Client-side routing**: Currently links trigger a full page reload. A future improvement could intercept internal link clicks and swap content without reloading for instant navigation.
- **Broken link detection**: Warn during build if a markdown file links to a `.md` file that doesn't exist in the project.
