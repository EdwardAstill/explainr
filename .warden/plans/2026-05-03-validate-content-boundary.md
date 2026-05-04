# Validate Content Boundary Plan
_2026-05-03_

status: approved

## Goal

Make `rr validate` respect the same content boundary as the rest of readrun, so ignored or manifest-excluded files are not validated as public site content.

## Research Summary

- `src/siteIndex.ts` builds the public page set via `walkContent(...)`, which already respects `.readrun/.ignore`.
- `src/siteIndex.ts` then applies manifest include/exclude rules through `applyManifestFilter(...)`.
- `src/validate.ts` currently bypasses both of those layers for Markdown page validation by calling its own `collectMdFiles(...)`.
- That divergence is the reason `rr validate /home/eastill/projects/courses` still reports warnings from `course-maker/SKILL.md` even though `.readrun/.ignore` excludes `course-maker/**`.
- The same divergence means manifest-excluded Markdown files can still be syntax/frontmatter-validated as if they were part of the site.

## Shape

research → plan → execute → review

## Tasks

### 1. Align validation file discovery with readrun content discovery
block: execute
skill: `typescript`

Instruction:
Replace the raw recursive Markdown walk in `src/validate.ts` with ignore-aware, manifest-aware discovery based on the same rules the site index uses.

Acceptance:

- `bun test src/validate.test.ts` → passes
- `rr validate /home/eastill/projects/courses` → no warnings from `course-maker/SKILL.md`

### 2. Add focused regression tests for ignore and manifest exclusion
block: execute
skill: `typescript`

Instruction:
Add tests proving that `validateFolder(...)` skips:

- files excluded by `.readrun/.ignore`
- files excluded by `.readrun/virtual-paths.yaml`

Acceptance:

- `bun test src/validate.test.ts` → passes new regression tests

### 3. Verify against the real repo repro and preserve existing behavior
block: review
skill: `verification-before-completion`

Instruction:
Run the focused readrun tests plus the real `courses` repro. Confirm that the validator change fixes the boundary bug without breaking existing manifest or server behavior.

Acceptance:

- `bun test src/validate.test.ts src/manifest.test.ts src/server.test.ts` → passes
- `rr validate /home/eastill/projects/courses` → only repo-true issues remain, with no ignored-file noise

## Notes

- This plan intentionally does not expand the scope into broader wikilink parsing changes.
- The current `issue.md` in the repo should remain the user-facing bug record unless implementation changes the diagnosis materially.
