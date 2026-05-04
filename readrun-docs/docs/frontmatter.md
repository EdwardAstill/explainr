# Frontmatter

Readrun treats YAML frontmatter as optional. A folder of plain `.md` files with no frontmatter renders correctly. When frontmatter *is* present, readrun strips it from the rendered body and uses recognised fields to drive nav and metadata.

## Recognised fields

```yaml
---
title: "Contour Integration"
virtual_path: "math/analysis/complex-analysis/contour-integration"
---
```

| Field | Role |
|-------|------|
| `title` | Display label in the nav tree, page `<title>`, and preferred wikilink label |
| `virtual_path` | Tree position for the virtual sidebar nav (see below) |

Anything else is ignored by readrun but remains available to your own tooling.

## Virtual folder nav via `virtual_path`

Readrun builds its sidebar from each note's `virtual_path` when present, falling back to the note's file-tree location otherwise. The field is a forward-slash-separated path from the nav root down to the note's conceptual slug. The URL that the nav links to is still the actual file location on disk — only the tree placement changes.

**Motivating use case.** Your on-disk layout is flat by design — for example, every note lives directly at `notes/<domain>/<slug>.md`. Flat layouts avoid premature categorisation, survive renames without cascade, and keep filename collisions resolvable with kebab-prefixed slugs. But humans browsing a KB want nested folders. `virtual_path` bridges the two: the file stays flat, the reader sees a deep tree.

**Example.** A KB with 2000 notes arranged flat:

```
notes/
  math/
    contour-integration.md       # frontmatter: virtual_path: "math/analysis/complex-analysis/contour-integration"
    complex-functions.md         # frontmatter: virtual_path: "math/analysis/complex-analysis/complex-functions"
    limits-and-convergence.md    # frontmatter: virtual_path: "math/analysis/real-analysis/limits-and-convergence"
    eigenvalues.md               # frontmatter: virtual_path: "math/algebra/linear-algebra/eigenvalues"
```

Renders in the sidebar as:

```
math/
  algebra/
    linear-algebra/
      eigenvalues
  analysis/
    complex-analysis/
      complex-functions
      contour-integration
    real-analysis/
      limits-and-convergence
```

Clicking a leaf still takes the reader to the actual file URL (`/math/eigenvalues`, etc.).

## Wikilink resolution

Readrun rewrites code examples like `&lbrack;&lbrack;target&rbrack;&rbrack;` and its variants into clickable links before rendering:

| Syntax | Result |
|--------|--------|
| `&lbrack;&lbrack;contour-integration&rbrack;&rbrack;` | Link to the note whose filename stem is `contour-integration` |
| `&lbrack;&lbrack;contour-integration\|The Residue Theorem&rbrack;&rbrack;` | Same link, with custom display label |
| `&lbrack;&lbrack;contour-integration#cauchy-theorem&rbrack;&rbrack;` | Same link with `#cauchy-theorem` anchor appended |
| `&lbrack;&lbrack;old/path/contour-integration&rbrack;&rbrack;` | Path prefix is stripped; only the final segment is resolved |

**Display label preference.** Explicit alias > target note's frontmatter `title` > filename stem.

**Fuzzy matches.** The index is keyed by the filename stem and by a normalised form: lowercase, with leading numeric prefixes like `01_` or `01-` stripped and underscores folded to hyphens. This means `&lbrack;&lbrack;01_absorption&rbrack;&rbrack;`, `&lbrack;&lbrack;Absorption&rbrack;&rbrack;`, and `&lbrack;&lbrack;absorption&rbrack;&rbrack;` all resolve to the same file when the actual filename is `absorption.md`.

**Ambiguity and unresolved.** If the normalised form matches more than one file, or if no file matches at all, the original `&lbrack;&lbrack;target&rbrack;&rbrack;` is left in the rendered output unchanged. Broken refs stay visible instead of silently failing.

## Frontmatter is stripped

Every note's YAML block (`---\n…\n---` at the top of the file) is removed before markdown rendering, so it never appears in the reader's HTML body. Your tooling can still read it directly from the `.md` file.
