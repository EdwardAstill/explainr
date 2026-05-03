# CLI Redesign — Design Spec
_2026-04-11_

## Overview

Replace the terminal TUI with a clean subcommand CLI and a browser-based dashboard. The server, build, and markdown modules are unchanged. The surface area shrinks: one binary, one set of subcommands, one interactive surface (the browser).

---

## Command Surface

| Command | Behaviour |
|---|---|
| `rr` | Start server in dashboard mode, open browser dashboard |
| `rr <folder>` | Serve that folder directly, open browser at `/` |
| `rr <file.md>` | Serve parent folder, open browser at that file's path |
| `rr build <folder> [--platform=github\|vercel\|netlify] [--out=<dir>]` | Build static site; prompts for platform if flag omitted |
| `rr init [folder]` | Scaffold `.readrun/` structure (defaults to cwd) |
| `rr validate [folder]` | Validate markdown and `.readrun/` structure (defaults to cwd) |
| `rr update` | Run `bun install` in the readrun root |
| `rr help` | Print command table to stdout |
| `rr guide` | Serve built-in architecture guide page in browser |

**Parsing order in `cli.ts`:**
1. No args → dashboard mode
2. `argv[2]` matches a known subcommand → dispatch
3. `argv[2]` starts with `-` → print help, exit 1
4. `argv[2]` looks like a path → dev mode (folder or `.md` file)
5. Otherwise → unknown command error, exit 1

---

## Architecture

### Removed
- `src/tui.ts` — deleted entirely
- TUI dependency on `@types/` readline wrappers

### Modified
- `src/cli.ts` — complete rewrite; subcommand dispatch table; no TUI import
- `src/server.ts` — gains dashboard mode (no `contentDir`); adds three `/api/` routes active only in dashboard mode

### Added
- `src/validate.ts` — validation logic
- `src/init.ts` — scaffold logic
- `src/landing/index.html` + `src/landing/dashboard.tsx` — browser dashboard UI
- `src/guide.html` — embedded architecture guide page (static, bundled into binary)
- `~/.config/readrun/saved.json` — persisted saved + recent folder list (replaces TUI's saved state)

---

## Dashboard (Browser Landing Page)

Served at `http://localhost:<port>/` when `rr` is run with no args.

### Server-side (dashboard mode)
Three additional API routes, active only when server is in dashboard mode:

- `GET /api/saved` — returns `{ saved: string[], recent: string[] }` from `~/.config/readrun/saved.json`
- `POST /api/saved` — body `{ action: "add"|"remove", path: string }` — mutates saved list
- `POST /api/open` — body `{ path: string }` — server switches `contentDir` to the given path, responds `{ url: string }`; browser navigates to that URL

### UI sections
1. **Saved** — pinned folders; each has Open and Remove buttons
2. **Recent** — last 5 opened paths (auto-tracked on every `rr <path>` invocation); Open button only
3. **Quick actions** — Build (path input + go), Validate (path input + go), open a path inline

### Saved state schema (`~/.config/readrun/saved.json`)
```json
{
  "saved": ["/absolute/path/to/folder"],
  "recent": ["/absolute/path/to/folder"]
}
```
`recent` is capped at 5 entries, newest first. File is created on first write if absent.

---

## `src/validate.ts`

Accepts a folder path. Walks all `.md` files and reports errors and warnings.

### Checks

**1. Markdown structure**
- Unclosed fenced code blocks (`` ``` `` without closing `` ``` ``)
- Unclosed `:::` blocks (opener without matching closer)
- Malformed headings (e.g. `#Heading` with no space)

**2. Block identifiers**
- `:::` opener language must be one of: `python`, `jsx`, `upload`, a filename (contains `.`), or include the `hidden` modifier
- Unrecognised identifiers → warning

**3. File references**
- `:::filename` (where filename contains `.`) must resolve to `.readrun/scripts/<filename>` or `.readrun/images/<filename>`
- Missing file → error

**4. `.readrun/` structure**
- Valid subdirs: `images/`, `scripts/`, `files/`
- Unexpected subdirs or files at `.readrun/` root → warning
- If any script/image refs exist in `.md` files, the corresponding subdir must exist → error if missing

### Output format
Grouped by file, coloured terminal output:
```
path/to/file.md
  ERROR  line 12  unclosed ::: block
  WARN   line 34  unknown block identifier "mermaid"

.readrun/
  WARN   unexpected entry: .readrun/cache/
```
Exits 1 if any errors, 0 if warnings only or clean.

---

## `src/init.ts`

Creates the following structure in the target folder (additive — never overwrites):

```
.readrun/
  images/      ← created if absent
  scripts/     ← created if absent
  files/       ← created if absent
  .ignore      ← created if absent, with format comment
```

`.ignore` default content:
```
# Files and folders to exclude from navigation (one pattern per line)
# Supports glob patterns, e.g.: drafts/, *.tmp
```

Prints what was created and what already existed.

---

## `rr guide`

Serves a self-contained HTML page embedded in the binary (like existing static assets). Opens at `http://localhost:<port>/guide`. No `contentDir` required — works standalone.

Content covers:
- Project folder structure (`.readrun/` layout)
- Block syntax reference (`:::python`, `:::jsx`, `:::upload`, `:::filename`, `hidden` modifier)
- Command reference (mirrors `rr help` output)
- Link and image conventions

---

## Error Handling

- Invalid path passed to `rr <path>` → print error, exit 1
- `rr build` with no folder arg → print usage, exit 1
- `rr build` with no `--platform` flag → interactive terminal prompt (select from github/vercel/netlify/none)
- `~/.config/readrun/saved.json` missing or malformed → treat as empty, do not crash
- Dashboard `/api/open` with non-existent path → 400 response, dashboard shows inline error

---

## Out of Scope

- No `rr make`, `rr edit`, `rr rename` commands — direct file editing is the interface for content authoring
- No TUI backwards compatibility shim
- No changes to `server.ts` routing logic beyond dashboard mode additions
- No changes to `build.ts`, `markdown.ts`, `nav.ts`, `template.ts`
