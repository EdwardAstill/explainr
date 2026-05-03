# Virtual Paths Manifest — Product Spec
_2026-05-03_

## Overview

Readrun should support a repo-level virtual paths manifest that lets a site author decide:

- which content belongs in the rendered site
- how that content should be grouped in the sidebar
- which pages should appear as the main learner-facing entry points

This feature exists so a repo can contain many kinds of Markdown, while the readrun site only shows the subset that belongs in the learner experience.

The feature is about **site organization**, not content generation.

---

## Core Idea

Today, readrun mainly reflects the physical filesystem, with optional page-level `virtual_path` frontmatter.

The new feature should let the author say:

- "include these folders in the site"
- "exclude these folders from the site"
- "show these included pages under this virtual structure"
- "treat these pages as the public entry points"

The author should be able to do that without moving files around and without adding frontmatter to every page.

---

## What Problem It Solves

A real repo often contains all of these at once:

- learner-facing course content
- learner-facing skill-unit content
- internal planning docs
- teaching notes
- previews and experiments
- generated output

Those things should not all appear in the same sidebar.

Example:

```text
courses/
units/
docs/
wiki/
preview/
dist/
```

The learner-facing site should probably show `courses/` and `units/`, but not `docs/`, `wiki/`, `preview/`, or `dist/`.

Without a manifest, the site structure becomes coupled too tightly to the repo structure.

---

## What We Want

We want readrun to support a single site that can expose:

- a home page
- a guided courses area
- a skill unit library

without forcing those things to become one giant course.

We also want the author to be able to define a cleaner conceptual structure than the raw filesystem provides.

Example learner-facing structure:

```text
Home
Courses
  AI
  Math
  Engineering
Units
  Math Foundations
  AI Foundations
  Computer Basics
```

even if the real files live in a more detailed or more scattered directory layout.

---

## Author Experience

The author should have one place where they can describe the public site structure.

That description should answer:

- what is included
- what is excluded
- what the top-level sections are
- where certain pages should appear in the virtual navigation

This should feel like a **site map**, not like writing program logic.

The author should not need to:

- physically reorganize the whole repo
- add `virtual_path` to every page
- create fake wrapper courses just to make navigation work

---

## Intended Use

This feature is especially useful when:

1. The repo is broader than the public site.
2. The public site has multiple content types.
3. The author wants cleaner navigation than the disk layout provides.
4. The author wants a library/catalog structure rather than a single sequential path.

It is not necessary for small sites where the filesystem already matches the desired reading experience.

---

## Relationship To Existing `virtual_path`

Page-level `virtual_path` should remain valid and useful.

The manifest is for the next level up:

- page frontmatter is good for one page
- the manifest is good for the whole site

The manifest should reduce repetitive page-level metadata, not make existing frontmatter obsolete.

---

## Expected Behavior

### Inclusion

The author should be able to decide which pages are part of the site.

If a page is excluded:

- it should not appear in the sidebar
- it should not appear in search
- it should not behave like part of the public reading experience

### Virtual grouping

The author should be able to place included pages into a cleaner conceptual tree.

This tree should be allowed to differ from the physical folder layout.

### Stable page identity

The feature should organize pages without changing what the page fundamentally is.

This is a navigation layer, not a content rewrite.

### Multiple entry points

The site should be able to present different top-level entry points, such as:

- `Home`
- `Courses`
- `Units`

without requiring those sections to be collapsed into one content type.

---

## Courses Use Case

For the courses project, the intended use is:

- include learner-facing pages under `courses/`
- include learner-facing pages under `units/`
- exclude authoring and support folders like `docs/`, `wiki/`, `recommend/`, `preview/`, `dist/`
- expose `courses/welcome.md` as the entry point for guided learning
- expose `units/welcome.md` as the entry point for direct skill-unit browsing

This gives one readrun site with two different ways to enter the material:

```text
Study a guided course
Browse a reusable skill unit
```

That is the right shape for the learner experience.

---

## Virtual Paths Use Case

The main use of virtual paths here is not "pretend the files are somewhere else" for its own sake.

The real use is:

- separate learner-facing structure from authoring structure
- let the author design navigation around how humans browse
- support libraries and catalogs, not only sequences

Example:

- a page can physically live under `units/math/linear-algebra-essentials/welcome.md`
- but conceptually appear under `Units / Math Foundations / Linear Algebra Essentials`

That is exactly the kind of separation this feature should support.

---

## Constraints

This feature should remain faithful to readrun's current philosophy:

- Markdown-first
- optional metadata
- readable outside readrun
- simple by default

The feature should not turn readrun into a CMS or site-builder with its own parallel content system.

The manifest should describe organization, not replace Markdown pages.

---

## What This Should Not Become

- It should not become a giant config system.
- It should not require authors to describe every page manually.
- It should not replace simple frontmatter for small sites.
- It should not push authors into building fake "everything courses."
- It should not make repo organization irrelevant; it should just loosen the coupling.

---

## Success Criteria

The feature is successful if an author can:

1. Keep a mixed-purpose repo.
2. Publish a clean learner-facing readrun site from it.
3. Show `courses/` and `units/` as separate learner-facing sections.
4. Hide internal material from the public reading experience.
5. Shape the sidebar around reader needs instead of raw disk layout.

The feature is especially successful if it removes the pressure to misuse a course as a catalog.

---

## Decision

Readrun should support a virtual paths manifest as a site-level organization feature.

Its job is:

- choose what belongs in the site
- define how the site is grouped
- support multiple public entry points

Its job is not:

- to generate content
- to define pedagogy
- to replace Markdown pages
- to force everything into one path

For the courses project, this is the correct way to support both guided courses and a skill-unit library inside one readrun site.

---

## Post-Implementation Review

### Acceptance Results

<!-- Criterion 1: mixed-purpose repo -->
**Criterion 1 — Keep a mixed-purpose repo:** ✅ pass. The acceptance repo contained `courses/`, `units/`, `docs/`, `wiki/`, and `preview/` coexisting on disk. The manifest lived in `.readrun/virtual-paths.yaml` with no changes to any Markdown file or directory layout.

<!-- Criterion 2: publish clean site -->
**Criterion 2 — Publish a clean learner-facing readrun site:** ✅ pass. `bun src/cli.ts serve /tmp/rr-acceptance --port 9998` served a site containing only the three included pages (`courses/ai/intro`, `courses/math/basics`, `units/algebra/welcome`). The search index (`/_readrun/search-index.json`) returned exactly those three URLs and nothing from the excluded folders.

<!-- Criterion 3: courses/ and units/ as separate sections -->
**Criterion 3 — Show `courses/` and `units/` as separate learner-facing sections:** ✅ pass. The rendered sidebar contained two distinct `<details>` trees labelled `Courses/` and `Units/` respectively. Both appeared at the top level of the nav, making them visually separate entry points.

<!-- Criterion 4: hide internal material -->
**Criterion 4 — Hide internal material from the public reading experience:** ✅ pass. A search through the rendered HTML for `docs`, `wiki`, and `preview` returned no results. Those paths were absent from both the sidebar HTML and the search index JSON. No URLs under those folders were reachable via the nav.

<!-- Criterion 5: sidebar shaped by reader needs instead of raw disk layout -->
**Criterion 5 — Shape the sidebar around reader needs:** ✅ pass. The `mappings` block in the manifest renamed `courses` → `Courses` and `units` → `Units` in the sidebar summaries. The physical folder names were not shown to the reader; the conceptual labels from the manifest were shown instead.

### Scope Drift

No changes beyond the spec were detected. The key files (`src/manifest.ts`, `src/siteIndex.ts`, `src/nav.ts`, `src/watch.ts`, `src/validate.ts`, `src/init.ts`) match the implementation plan exactly. The 121 existing tests all pass with no new failures.

### Refactor Proposals

- **URL rewriting for mapped paths:** Currently the sidebar labels are remapped (e.g. `Courses/`) but the actual `href` values still use the physical path (`/courses/ai/intro`). A future improvement could optionally rewrite URLs to match virtual names so the URL bar also reflects the reader-facing hierarchy. Trigger condition: user feedback that URLs look authoring-centric rather than reader-centric.
- **Per-file virtual path override via manifest:** The manifest currently operates at the folder-prefix level. An `overrides` block that maps individual file paths to virtual locations would allow finer-grained placement without requiring per-page frontmatter. Trigger condition: a repo whose files can't be grouped cleanly by prefix alone.
- **`exclude` as complement to `include`:** The current `include` list already implicitly excludes everything else, but an explicit `exclude` key (scaffolded by `rr init`) could be useful when an author wants to start from "include everything" and carve out exceptions. The YAML schema supports it; the runtime filtering logic should be verified to handle both modes.

## Known Limitations

None. All five acceptance criteria were met in the acceptance test run.
