# Navigation

Readrun's sidebar is a collapsed file tree. Single-click a folder to expand or collapse it. The full site search palette (`Cmd+K` / `Ctrl+K`) covers every page.

This page documents two extras that are always on — no config required.

## Pinned search

Above the tree there's a search input. Typing in it reorders matching items toward the top of the tree, dims non-matches, and highlights the matched substring. Empty search restores the natural order. The search palette and this pinned input are independent — use whichever fits.

## Focus mode

**Double-click any folder** to focus the sidebar on it. The folder's siblings, ancestors, and even the folder row itself disappear; only its descendants remain. A breadcrumb appears above the tree showing the current scope:

```
all  ›  courses  ›  ai            ×
```

- Click any segment in the breadcrumb to widen back one or more levels.
- Click `all` (left) or `×` (right) to widen fully.
- Focus persists across page loads in `localStorage` — useful when reading a long course.

Focus mode is purely a sidebar view filter. The page you're reading does not change when you focus or widen, and links inside the focused scope still work normally.

## What this is *not*

- Not configurable. There is no `.readrun/nav.yaml`. If you want to hide files from the sidebar, use `.readrun/virtual-paths.yaml` (the page-existence manifest) — see `frontmatter.md` for `virtual_path`.
- Not specific to any folder shape. It works on any tree. Deeply nested trees benefit most.
- Not a tab system. There's only one focus state per browser, kept in `localStorage`.

## Keyboard

| Action | Shortcut |
|---|---|
| Open the search palette | `Cmd+K` / `Ctrl+K` |
| Focus a folder | Double-click on its name |
| Widen back | Click any breadcrumb segment, or click `×` |
