# Issue: `rr validate` bypasses the site content boundary

## Status

Fixed in the local working tree on 2026-05-03.

## Summary

`rr validate` was scanning Markdown files outside the public site content set. It bypassed:

- `.readrun/.ignore`
- `.readrun/virtual-paths.yaml` include/exclude rules

That produced warnings for non-site authoring files that should not be part of the readrun content set.

## Why this matters

In real repos, readrun often lives alongside authoring tools, skills, internal docs, and Warden artifacts. If `validate` ignores the site-boundary rules, it reports noise from files that are intentionally outside the site.

That makes validation less trustworthy:

- warnings include files that will never be routed or rendered
- content repos cannot get to a clean validation result
- authoring metadata gets treated like site content

## Reproduction

Repo:

- `/home/eastill/projects/courses`

Ignore file:

- `/home/eastill/projects/courses/.readrun/.ignore`

Relevant ignore rule:

```text
course-maker/**
```

Ignored file:

- `/home/eastill/projects/courses/course-maker/SKILL.md`

Run:

```bash
rr validate /home/eastill/projects/courses
```

Current result:

```text
course-maker/SKILL.md
  WARN  unknown frontmatter field "name" (readrun ignores it)
  WARN  unknown frontmatter field "description" (readrun ignores it)
```

## Expected behavior

If a file is excluded from the site by `.readrun/.ignore` or the virtual-paths manifest, `rr validate` should not validate it as site content.

That means the ignored `course-maker/SKILL.md` file should not appear in validation output at all.

## Scope of the fix

This should apply consistently anywhere readrun decides which content files belong to the site:

- validation
- page discovery
- navigation
- search
- route generation

The same content boundary should be used everywhere.

## Notes

The implementation fix was to make validation use the same ignore-aware walk and manifest inclusion rules already used by site discovery.
