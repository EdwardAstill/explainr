# Navigation

The default sidebar is a collapsed file tree. Most folders need no configuration.

If a folder ships `.readrun/nav.yaml` with `panes: N`, that folder switches to a multi-pane drill-down sidebar. One short opt-in.

## Default — tree mode

No file, no config. The sidebar shows your folder structure as a collapsed tree, files and directories sorted alphabetically. The site-wide search palette (`Cmd+K` / `Ctrl+K`) covers everything.

This is the right choice for most folders. Skip the rest of this page unless you have a reason.

## Opt-in — panes mode

Drop one line in `.readrun/nav.yaml`:

```yaml
panes: 3
```

The sidebar replaces the tree with N stacked panes (2, 3, or 4) and a pinned search input above them. Drilling left-to-right is faster than expanding a deep tree.

### What you get

- Pane 1 = top-level folders.
- Pane 2 = children of the active item in pane 1.
- Pane 3 = children of the active item in pane 2.
- Pane 4 (when `panes: 4`) = the in-page outline of the current lesson.
- A pinned search input at the top reorders **every** pane simultaneously: the closest match for what you typed floats to the top of each pane, with the matched substring highlighted. Empty search restores the natural order.
- The active page and its ancestors are marked with `aria-current` and visually highlighted.

### Optional — pane labels

Pane labels are inferred from folder depth. Override only if you want different names:

```yaml
panes: 3
labels: [areas, books, chapters]
```

`labels.length` must equal `panes`.

## When to opt in

Pick panes mode when:

- The folder has at least three meaningful levels of depth.
- Learners hop between siblings often (drilling and back-stepping).
- The flat tree is too dense to scan at a glance.

Stay on the default tree when:

- The folder is shallow (two levels or less).
- One sequential reading order dominates and the sidebar is mostly there for backtracking.
- You want every page visible at once.

## What does NOT live in `nav.yaml`

- **Which pages exist** — that's `.readrun/virtual-paths.yaml`.
- **Quizzes** — readrun builds them and they appear as ordinary lesson rows. No special grouping in either mode.
- **Themes, fonts, shortcuts** — see the Settings doc.

## Validation

`rr validate .` reports:

- Parse errors in `nav.yaml`.
- `panes:` outside the `[2, 4]` range.
- A soft warning when `panes: N` exceeds the actual folder depth (the deeper panes will just be empty).

## Reference — full schema

```yaml
panes: 3              # required to enable panes mode; valid range 2-4
labels: [a, b, c]     # optional; length must equal panes
mode: panes           # optional and redundant when panes is set
search:
  enabled: true       # default true; set false to hide the pinned search input
hide:                 # optional; defaults to ["**/plan.md", "**/glossary.md"]
  - "**/plan.md"
  - "**/glossary.md"
  - "**/notes/**"
```

Authors writing `mode: panes` without a `panes:` value get a clear `nav.yaml` error and the folder falls back to tree mode.
