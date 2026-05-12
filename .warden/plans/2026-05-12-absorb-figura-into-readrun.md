# Plan: Absorb figura into readrun

**Spec:** (no formal spec — design decided inline via conversation 2026-05-12)
**Created:** 2026-05-12T09:00Z
**Status:** draft
**Shape:** plan-execute-review (atomic-commit variant)
**Human checkpoints:** 2 (mid-plan sanity check, pre-archive sign-off)
**Refinement passes:** 0 (run Phase 6.5 before flipping to approved)
**Worktree exemption:** Authored on main per explicit user override; recommended to dispatch from `.worktrees/figura-absorb` for the actual execution.

## Goal

Fold the standalone figura React component library (~/projects/figura) into readrun as the in-house widget toolkit. Public import name becomes `"@readrun/widgets"`. Bundling becomes a built-in `rr` capability; the figura repo gets archived after a clean cutover. All existing widget output (`<content>/.readrun/scripts/*.jsx`) continues to load through readrun's untouched JSX runtime.

## Assumptions

- `A1` — Figura's bundler is esbuild + a small `react-globals` plugin that redirects `react` / `react-dom` to `globalThis.React` / `globalThis.ReactDOM`.
  - Type: architectural
  - Source: figura/README.md
  - Check: `head -200 ~/projects/figura/src/bundler.ts | grep -E 'esbuild|react-globals'`
  - If false: re-plan around whatever bundler figura actually uses (probably trivial swap of dependency name).
  - Owner: Sub-task 2

- `A2` — Figura tests live as `*.test.ts` / `*.test.tsx` files alongside `src/`, runnable via `bun test`.
  - Type: repo-state
  - Source: figura/package.json scripts.test
  - Check: `ls ~/projects/figura/src/**/*.test.ts*`
  - If false: adapt the test-move sub-task to the actual test location.
  - Owner: Sub-task 4

- `A3` — Readrun's JSX runtime mounts widgets via the self-contained shape `function PascalName() {...} render(<PascalName/>);` with no module system, just Babel-standalone.
  - Type: architectural
  - Source: figura/README.md ("Bundler" section), prior conversation context
  - Check: `rg -n 'render\\s*\\(' /home/eastill/projects/readrun/src/client/ | head`
  - If false: the bundler output shape must change; significant re-plan.
  - Owner: Sub-task 3

- `A4` — `~/projects/thesis/learn/.readrun/scripts/` is figura's current bundle output target.
  - Type: repo-state
  - Source: figura/figura.config.ts
  - Check: `cat ~/projects/figura/figura.config.ts | grep outDir`
  - If false: adjust verification sub-task targets.
  - Owner: Sub-task 8

- `A5` — All 6 `fanmin-*` widget *sources* currently live in `~/projects/figura/src/widgets/`.
  - Type: repo-state
  - Source: figura.config.ts widgets list
  - Check: `ls ~/projects/figura/src/widgets/fanmin-*.tsx`
  - If false: find actual source locations before move sub-task.
  - Owner: Sub-task 5

- `A6` — The 13 reference widgets exist as `.tsx` files in `~/projects/figura/src/widgets/`.
  - Type: repo-state
  - Source: figura README ("mass widget catalog")
  - Check: `ls ~/projects/figura/src/widgets/*.tsx | wc -l`
  - If false: adjust list of widgets moved into readrun-docs.
  - Owner: Sub-task 5

- `A7` — readrun's `src/ensure-deps.ts` will pick up new package.json deps (esbuild, react, react-dom) automatically on next `rr` invocation.
  - Type: architectural
  - Source: src/ensure-deps.ts added 2026-05-12
  - Check: `node_modules/esbuild` exists after first `rr` run post-merge
  - If false: bug in ensure-deps; fix before bundler can run.
  - Owner: Sub-task 6

- `A8` — `~/projects/figura/.warden/` artifacts (specs, plans, maps) stay in the archived figura repo and are NOT moved into readrun.
  - Type: policy
  - Source: user decision (implicit — only library code moves)
  - Check: confirm with user at human checkpoint
  - If false: also migrate `.warden/` artifacts.
  - Owner: Sub-task 11

## Sub-tasks

### Sub-task 1 — Inventory figura source and verify assumptions

**Block:** research
**Skill:** codebase-explainer
**Depends on:** (none)
**Assumption refs:** A1, A2, A3, A5, A6

**Instruction:**

Read `~/projects/figura/src/` end-to-end. Produce a short inventory:

- Each top-level dir (primitives, plot, diagram, interaction, draw, math, demo, widgets) with file count and a one-line summary.
- The bundler: confirm esbuild + react-globals plugin shape; capture the virtual-module / alias mechanism so we can extend it to resolve `@readrun/widgets`.
- The widget catalog: list every `.tsx` file in `src/widgets/` and classify each as `reference` (13 demo widgets) or `fanmin` (6 user widgets).
- Test files: list `*.test.ts*` paths and rough count.
- Public entry: how `src/index.ts` re-exports the subpackages.

Save as `.warden/research/figura-inventory.md` so later sub-tasks can read it.

**Inputs:**
- folder: `~/projects/figura/src/`
- file: `~/projects/figura/README.md`
- file: `~/projects/figura/package.json`

**Acceptance:**
- `test -f .warden/research/figura-inventory.md` → exit 0
- `grep -E 'esbuild|react-globals' .warden/research/figura-inventory.md` → exits 0
- `grep -E '^- fanmin-' .warden/research/figura-inventory.md | wc -l` → outputs `6`

---

### Sub-task 2 — Copy figura source into readrun/src/figura/

**Block:** execute
**Skill:** typescript
**Depends on:** Sub-task 1
**Assumption refs:** A1

**Instruction:**

Copy (do not symlink) these directories from `~/projects/figura/src/` into `readrun/src/figura/`:

- `primitives/`, `plot/`, `diagram/`, `interaction/`, `draw/`, `math/`
- `bundler.ts`
- `index.ts` (the public entry that re-exports the above)

Do NOT copy:
- `widgets/` (handled in Sub-task 5)
- `demo/` (dropped entirely)
- `*.test.ts*` (handled in Sub-task 4)

After copy: confirm internal relative imports inside the copied tree still resolve (they should — directory structure is preserved).

**Inputs:**
- prior: research/figura-inventory.md

**Acceptance:**
- `test -d /home/eastill/projects/readrun/src/figura/primitives` → exit 0
- `test -f /home/eastill/projects/readrun/src/figura/bundler.ts` → exit 0
- `test -f /home/eastill/projects/readrun/src/figura/index.ts` → exit 0
- `! test -d /home/eastill/projects/readrun/src/figura/demo` → exit 0
- `! test -d /home/eastill/projects/readrun/src/figura/widgets` → exit 0
- `bunx tsc --noEmit --project /home/eastill/projects/readrun/tsconfig.json` → exit 0 (no new TS errors in copied tree)

---

### Sub-task 3 — Teach the bundler to resolve `@readrun/widgets`

**Block:** execute
**Skill:** typescript
**Depends on:** Sub-task 2
**Assumption refs:** A1, A3

**Instruction:**

Modify `readrun/src/figura/bundler.ts` so the existing esbuild `react-globals` plugin (or a sibling plugin) ALSO resolves these specifiers to readrun's internal paths:

- `@readrun/widgets` → `readrun/src/figura/index.ts`
- `@readrun/widgets/primitives` → `readrun/src/figura/primitives/index.tsx`
- `@readrun/widgets/plot` → `readrun/src/figura/plot/index.ts`
- `@readrun/widgets/diagram` → `readrun/src/figura/diagram/index.ts`
- `@readrun/widgets/interaction` → `readrun/src/figura/interaction/index.ts`
- `@readrun/widgets/draw` → `readrun/src/figura/draw/index.ts`
- `@readrun/widgets/math` → `readrun/src/figura/math/index.ts`

Keep the existing `react` / `react-dom` → globals redirect untouched. Output shape must remain `function PascalName() {...} render(<PascalName/>);` — the readrun JSX runtime is not changing.

Drop any `"figura"` / `"figura/*"` resolver logic — that name is dead post-cutover. If a widget source still imports from `"figura"` after the codemod (Sub-task 7) the bundler should error with a clear message.

**Inputs:**
- file: `readrun/src/figura/bundler.ts`

**Acceptance:**
- `bunx tsc --noEmit` → exit 0
- `bun test readrun/src/figura/bundler` → all existing bundler tests pass (after import-path updates in Sub-task 4)
- `grep -E '"@readrun/widgets"' readrun/src/figura/bundler.ts` → exits 0
- `! grep -E '\"figura\"' readrun/src/figura/bundler.ts` → exit 0

---

### Sub-task 4 — Port figura tests + typecheck

**Block:** execute
**Skill:** test-driven-development
**Depends on:** Sub-task 2
**Assumption refs:** A2

**Instruction:**

Copy figura's `*.test.ts` / `*.test.tsx` files preserving their relative directory layout under `readrun/src/figura/`. (E.g., `figura/src/primitives/foo.test.tsx` → `readrun/src/figura/primitives/foo.test.tsx`.)

Run `bun test src/figura/` to confirm test count and passing state match the pre-move figura state. Run `bunx tsc --noEmit` to confirm typecheck. Fix any breakage caused by the copy itself (relative paths, missing deps).

**Inputs:**
- folder: `~/projects/figura/src/`
- prior: research/figura-inventory.md (test inventory)

**Acceptance:**
- `bun test src/figura/ 2>&1 | tail -5` → reports 0 failures and ≥200 tests pass
- `bunx tsc --noEmit` → exit 0

---

### Sub-task 5 — Relocate widget sources to their content homes

**Block:** execute
**Skill:** typescript
**Depends on:** Sub-task 2
**Assumption refs:** A5, A6

**Instruction:**

Move (`mv`, not copy — they leave figura entirely):

- All 13 *reference* widgets from `~/projects/figura/src/widgets/*.tsx` (those NOT matching `fanmin-*`) → `/home/eastill/projects/readrun/readrun-docs/.readrun/widgets/`. Create the destination folder if missing.
- All 6 `fanmin-*` widgets → `/home/eastill/projects/thesis/learn/.readrun/widgets/`. Create the destination folder if missing.

Do NOT yet rewrite imports inside these files — Sub-task 7 (codemod) handles that as one cross-cutting pass.

**Inputs:**
- folder: `~/projects/figura/src/widgets/`

**Acceptance:**
- `ls /home/eastill/projects/readrun/readrun-docs/.readrun/widgets/*.tsx | wc -l` → outputs `13`
- `ls /home/eastill/projects/thesis/learn/.readrun/widgets/fanmin-*.tsx | wc -l` → outputs `6`
- `! ls ~/projects/figura/src/widgets/*.tsx 2>/dev/null` → exit non-zero (folder emptied)

---

### Sub-task 6 — Add esbuild + react deps to readrun

**Block:** execute
**Skill:** typescript
**Depends on:** Sub-task 2
**Assumption refs:** A7

**Instruction:**

Update `readrun/package.json`:

- Add `esbuild` to `dependencies` (version pin matching figura's current pin; check `~/projects/figura/package.json`).
- Add `react` and `react-dom` to `dependencies` (matching figura's pins).
- Add `@types/react` and `@types/react-dom` to `devDependencies` (matching figura's pins).

Run `bun install` once manually to populate `node_modules` (and to make sure `ensure-deps.ts` will see them as already-installed on subsequent runs). Verify no version conflicts with readrun's existing tree (markdown-it, three, etc.).

**Inputs:**
- file: `readrun/package.json`
- file: `~/projects/figura/package.json`

**Acceptance:**
- `grep -E '"esbuild"' /home/eastill/projects/readrun/package.json` → exits 0
- `grep -E '"react"' /home/eastill/projects/readrun/package.json` → exits 0
- `test -d /home/eastill/projects/readrun/node_modules/esbuild` → exit 0
- `test -d /home/eastill/projects/readrun/node_modules/react` → exit 0
- `bun src/cli.ts --version` → outputs `0.1.0` (or current) with no ensure-deps install banner

---

### Sub-task 7 — Codemod `figura` → `@readrun/widgets` everywhere

**Block:** execute
**Skill:** repo-text-codemod
**Depends on:** Sub-task 5, Sub-task 6
**Assumption refs:** (none — pure mechanical pass)

**Instruction:**

Run a single repo-wide codemod across:

- `readrun/src/figura/**` (internal toolkit — only the public re-exports that previously referenced `"figura"` as a virtual root will be affected, but check)
- `readrun/readrun-docs/.readrun/widgets/**` (13 reference widgets)
- `/home/eastill/projects/thesis/learn/.readrun/widgets/**` (6 fanmin widgets)

Replacements (regex, with sd or rg + sd):

- `from "figura"` → `from "@readrun/widgets"`
- `from "figura/primitives"` → `from "@readrun/widgets/primitives"`
- `from "figura/plot"` → `from "@readrun/widgets/plot"`
- `from "figura/diagram"` → `from "@readrun/widgets/diagram"`
- `from "figura/interaction"` → `from "@readrun/widgets/interaction"`
- `from "figura/draw"` → `from "@readrun/widgets/draw"`
- `from "figura/math"` → `from "@readrun/widgets/math"`

Verify with: `rg -n '"figura"|"figura/' readrun/ /home/eastill/projects/thesis/learn/.readrun/widgets/ /home/eastill/projects/readrun/readrun-docs/` should return 0 hits.

**Inputs:**
- prior: Sub-task 5 (widgets relocated), Sub-task 2 (toolkit copied)

**Acceptance:**
- `rg -n '"figura"|from "figura/' /home/eastill/projects/readrun/src/figura/ /home/eastill/projects/readrun/readrun-docs/.readrun/widgets/ /home/eastill/projects/thesis/learn/.readrun/widgets/ 2>/dev/null` → exits 1 (no matches)
- `bunx tsc --noEmit` → exit 0

---

### Sub-task 8 — Wire `rr` to auto-bundle widgets + add `rr build-widgets`

**Block:** execute
**Skill:** typescript
**Depends on:** Sub-task 3, Sub-task 7
**Assumption refs:** A3, A4

**Instruction:**

In `readrun/src/cli.ts`:

- Add `rr build-widgets [path]` subcommand. Walks `<path>/.readrun/widgets/*.tsx`, bundles each through `readrun/src/figura/bundler.ts`, writes `<path>/.readrun/scripts/<name>.jsx`.
- Hook into the existing `rr serve` flow (and `rr watch`): on startup, run the bundler once over `<contentDir>/.readrun/widgets/`. In watch mode (`rr watch` already exists), add the widgets dir to the file watcher and re-bundle on change.
- Hook into `rr build` (static-site path): same as above, run once before the markdown build.

**Name conflict rule (mandatory):** before writing `<name>.jsx`, check whether the destination already exists AND was not produced by a prior widget-bundle run. If a hand-written `<name>.jsx` exists in `.readrun/scripts/` and a `<name>.tsx` exists in `.readrun/widgets/`, abort with a clear error: `rr: refusing to overwrite hand-written script .readrun/scripts/<name>.jsx — rename either the script or the widget`. Track which `.jsx` files were produced by the bundler (e.g., a top-of-file `// generated by @readrun/widgets` banner — the bundler already emits a similar banner today).

**Inputs:**
- file: `readrun/src/cli.ts`
- file: `readrun/src/figura/bundler.ts`
- file: `readrun/src/watch.ts` (existing watch server)
- file: `readrun/src/build.ts` (existing static build)

**Acceptance:**
- `bun src/cli.ts build-widgets --help` → prints help, exit 0
- `bun src/cli.ts build-widgets /home/eastill/projects/thesis/learn` → exit 0, produces `/home/eastill/projects/thesis/learn/.readrun/scripts/fanmin-scatter-geometry.jsx` (and the other 5)
- `head -3 /home/eastill/projects/thesis/learn/.readrun/scripts/fanmin-scatter-geometry.jsx | grep -E 'generated by @readrun/widgets'` → exits 0
- Conflict-detection unit: create a hand-written `dummy.jsx` and a same-named `dummy.tsx`; `bun src/cli.ts build-widgets <path>` → exits non-zero with the documented error message

---

### Sub-task 9 — Verify the readrun-docs demo + thesis widgets still work

**Block:** execute
**Skill:** test-driven-development
**Depends on:** Sub-task 8
**Assumption refs:** A3, A4

**Instruction:**

Run end-to-end:

1. `bun src/cli.ts demo` — should auto-bundle the 13 reference widgets into `readrun-docs/.readrun/scripts/`, serve them. Verify by HTTP GET against one of the bundled `.jsx` paths.
2. `bun src/cli.ts serve /home/eastill/projects/thesis/learn` — should auto-bundle the 6 fanmin widgets, serve them. Verify HTTP GET.
3. Compare the bundler output for ONE widget against the pre-move output (which the user has cached at `~/projects/thesis/learn/.readrun/scripts/fanmin-*.jsx` pre-cutover). The function name + `render(...)` shape must match; the body can differ in trivial ways (whitespace, comment banner) but must be syntactically equivalent.

Add a smoke test under `readrun/src/figura/__tests__/bundler-e2e.test.ts` that:
- Constructs a temp dir with one `.tsx` widget that imports `Slider` from `@readrun/widgets/primitives`.
- Runs the bundler.
- Asserts the output file exists, has no `import` statements, ends with `render(<...>);`.

**Inputs:**
- prior: Sub-task 8 (rr build-widgets working)

**Acceptance:**
- `bun src/cli.ts demo &` then `curl -sf http://localhost:3001/.readrun/scripts/$(ls readrun-docs/.readrun/scripts/*.jsx | head -1 | xargs basename)` → HTTP 200, body starts with widget JS
- `bun src/cli.ts serve /home/eastill/projects/thesis/learn &` then `curl -sf http://localhost:3001/.readrun/scripts/fanmin-scatter-geometry.jsx` → HTTP 200
- `bun test src/figura/__tests__/bundler-e2e.test.ts` → exit 0
- All 6 fanmin `.jsx` files exist post-bundle in thesis/learn/.readrun/scripts/

---

### Sub-task 10 — Update readrun warden skill + docs

**Block:** execute
**Skill:** writing
**Depends on:** Sub-task 9
**Assumption refs:** (none)

**Instruction:**

Update the user-visible documentation surface so that the `@readrun/widgets` toolkit and the `.readrun/widgets/` authoring location are discoverable:

1. **Warden `readrun` skill** — locate the SKILL.md (under `~/.warden/` or wherever the user's warden install keeps `core/skills/readrun/`). Add a section on widget authoring: `<content>/.readrun/widgets/*.tsx` with `import { ... } from "@readrun/widgets/primitives"`; mention auto-bundle on `rr serve` / `rr build`; mention `rr build-widgets` for one-shot; note the same-name conflict rule. Update trigger phrases if needed so the skill catches "add a figura widget" / "build a slider widget".

2. **`readrun/README.md`** — add a "Widgets" section explaining the authoring surface and import path. Link to the readrun-docs demo.

3. **`readrun-docs/docs/`** — add `widgets.md` documenting the public API surface (primitives, plot, diagram, interaction, draw, math) at the same depth as the existing readrun-docs reference pages. Cross-link the 13 reference widgets as live examples.

4. **`readrun/CLAUDE.md`** — add a one-paragraph note that `@readrun/widgets` is the in-repo widget toolkit (so future Claude sessions know not to ask "where does figura live").

Do NOT migrate `~/projects/figura/.warden/` — those artifacts stay in the archived repo per Assumption A8.

**Inputs:**
- prior: Sub-task 9 (verified working)

**Acceptance:**
- `test -f /home/eastill/projects/readrun/readrun-docs/docs/widgets.md` → exit 0
- `grep -E '@readrun/widgets' /home/eastill/projects/readrun/README.md` → exits 0
- `grep -E '@readrun/widgets' /home/eastill/projects/readrun/CLAUDE.md` → exits 0
- Warden readrun skill SKILL.md: `grep -E '@readrun/widgets' <path>` → exits 0

---

### Sub-task 11 — Final review + pre-archive sign-off

**Block:** human
**Skill:** ask
**Depends on:** Sub-task 10
**Assumption refs:** A8

**Instruction:**

Surface to user:
- Diff summary (files changed, lines added/removed across readrun + thesis + readrun-docs).
- Confirmation that `rr demo` and `rr serve thesis/learn` both work.
- Confirmation that all tests pass + typecheck clean.
- Question: ready to archive `~/projects/figura` (`mv ~/projects/figura ~/projects/figura.archived`)?
- Confirmation question on A8: leave figura's `.warden/` artifacts in the archived repo, or migrate them?

Wait for user explicit yes/no on archive + A8 before any move.

**Inputs:**
- prior: all sub-tasks complete

**Acceptance:** (human-graded)

---

### Sub-task 12 — Review pass

**Block:** review
**Skill:** reviewer
**Depends on:** Sub-task 10
**Assumption refs:** (none)

**Instruction:**

Independent read of the diff. Look for:
- Stale references to `figura` (the import name) anywhere outside intentional internal naming.
- Bundler edge cases (name conflict path; empty widgets dir; widget that imports something not in the toolkit).
- Test gaps (does the bundler test cover the `@readrun/widgets/<subpkg>` resolution?).
- Doc gaps (README / SKILL.md / CLAUDE.md / readrun-docs all consistent).

Report by severity. Do not approve if any high-severity issue is unresolved.

**Inputs:**
- prior: full diff against main

**Acceptance:** review report attached; no high-severity issues open

---

### Sub-task 13 — Atomic commit

**Block:** execute
**Skill:** typescript (acts as git operator)
**Depends on:** Sub-task 11, Sub-task 12
**Assumption refs:** (none)

**Instruction:**

Stage all changes across the worktree:
- `readrun/src/figura/**` (new)
- `readrun/src/cli.ts`, `readrun/src/watch.ts`, `readrun/src/build.ts` (modified)
- `readrun/package.json`, `bun.lock` (modified)
- `readrun/readrun-docs/.readrun/widgets/**` (new, 13 widgets)
- `readrun/readrun-docs/docs/widgets.md` (new)
- `readrun/README.md`, `readrun/CLAUDE.md` (modified)
- `readrun/.warden/plans/2026-05-12-absorb-figura-into-readrun.md` (this plan)

Commit message (HEREDOC):

```
feat(widgets): absorb figura into readrun as @readrun/widgets

Folds the figura React component library (primitives, plot, diagram,
interaction, draw, math, bundler) into readrun/src/figura/. Public
import name becomes "@readrun/widgets". `rr serve` and `rr build` now
auto-bundle <content>/.readrun/widgets/*.tsx into self-contained .jsx
files in .readrun/scripts/, matching the existing JSX runtime contract.

- 13 reference widgets moved to readrun-docs/.readrun/widgets/
- 6 fanmin widgets moved to ~/projects/thesis/learn/.readrun/widgets/
- New `rr build-widgets` subcommand for one-shot bundling
- Same-name conflict (<n>.tsx + hand-written <n>.jsx) errors out
- figura repo at ~/projects/figura to be archived separately
```

Do NOT push. User does that manually.

**Inputs:**
- prior: all sub-tasks complete + reviewed

**Acceptance:**
- `git log -1 --format=%s` → matches expected first line
- `git status` → clean working tree
- `bun test` → exit 0 on a fresh clone of the commit

---

## Refinement notes (run Phase 6.5 before flipping to approved)

- Verify A1 by reading `~/projects/figura/src/bundler.ts` (Sub-task 1 covers this).
- Verify A2 by listing test files (Sub-task 1).
- Cross-check that nothing in readrun's existing `src/client/` JSX execution path needs to change — A3 must hold.
- Decide whether `figura/src/index.ts` is the right top-level entry to copy, or whether we should write a fresh `readrun/src/figura/index.ts` with the same re-exports but explicit `@readrun/widgets` doc comments.

## Out of scope (deferred)

- Per-content widget allow-listing (some content dirs may want a subset).
- A readrun-side primitives gallery to replace figura's demo harness.
- ESM + importmaps runtime — not pursued; bundler stays server-side.
- Migrating figura's `.warden/` artifacts (see A8; user decides at Sub-task 11).
