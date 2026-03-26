# Shortcuts, Themes & Focus Mode

## Overview

Add keyboard shortcuts, a shortcut help overlay, 8 color themes with a theme picker overlay, and a focus mode to the explainr documentation viewer. All changes are in 3 existing files: `src/styles.ts`, `src/client-scripts.ts`, and `src/template.ts`.

## Themes

### 8 Themes

Each theme is a set of CSS custom properties applied via `[data-theme="name"]` on `<html>`. The current `:root` variables become the "light" theme (default).

1. **Light** — current default (white background, GitHub-style)
2. **Dark** — `#0d1117` bg, `#e6edf3` text, `#58a6ff` links
3. **Solarized** — `#fdf6e3` bg, `#657b83` text, `#268bd2` links
4. **Nord** — `#2e3440` bg, `#d8dee9` text, `#88c0d0` links
5. **Dracula** — `#282a36` bg, `#f8f8f2` text, `#8be9fd` links
6. **Monokai** — `#272822` bg, `#f8f8f2` text, `#66d9ef` links
7. **Gruvbox** — `#282828` bg, `#ebdbb2` text, `#83a598` links
8. **Catppuccin** — `#1e1e2e` bg, `#cdd6f4` text, `#89b4fa` links

Each theme also overrides:
- `--color-sidebar-bg`, `--color-border`, `--color-text-muted`, `--color-code-bg`, `--color-active-bg`
- `.hljs` syntax highlighting classes (keyword, string, number, comment, etc.)

### Theme Variables per Theme

Each `[data-theme]` selector sets all 10 CSS custom properties:
- `--color-bg`, `--color-sidebar-bg`, `--color-border`, `--color-text`, `--color-text-muted`, `--color-link`, `--color-active-bg`, `--color-code-bg`, `--font-body`, `--font-mono`

### Highlight.js Overrides

Each theme gets a scoped `.hljs` color block under its `[data-theme]` selector, matching the theme's palette for: `.hljs-comment`, `.hljs-keyword`, `.hljs-string`, `.hljs-number`, `.hljs-built_in`, `.hljs-title`, `.hljs-attr`, `.hljs-name`, `.hljs-deletion`, `.hljs-addition`.

### Persistence

Theme name stored in localStorage under the existing `explainr-settings` key as `settings.theme`. Default: `"light"`. Applied on page load by setting `document.documentElement.dataset.theme`.

## Settings Panel Changes

The existing settings panel in `src/template.ts` gains two new sections:

### Theme Row
A new section between font size and content width:
```
Theme
← Light →
```
- Left/right arrow buttons cycle through themes
- The theme name label in the center is clickable and opens the full-page theme picker overlay

### Keyboard Shortcuts Button
At the bottom of the settings panel:
```
[Keyboard Shortcuts]
```
A full-width button that opens the shortcut overlay.

## Theme Picker Overlay

Full-page overlay triggered by clicking the theme name in settings or (future) a dedicated shortcut.

- **Backdrop**: fixed overlay, `rgba(0,0,0,0.8)`, `backdrop-filter: blur(6px)`
- **Content**: centered container, ~94% viewport width, rounded corners, themed background
- **Grid**: 4x2 grid of theme cards
- **Each card**: mini docs preview showing heading, code block with syntax colors, body text, and link — all rendered in that theme's actual colors
- **Interaction**: click a card to select the theme, overlay closes, theme applies immediately
- **Close**: `Esc` key or clicking the backdrop

## Shortcut Overlay

Full-page overlay triggered by `?` key or the settings button.

- **Backdrop**: same style as theme picker (fixed, blur, dark)
- **Content**: wide centered card (~94% viewport width)
- **Layout**: 3 columns
  - Column 1: Navigation + Scrolling
  - Column 2: UI Controls
  - Column 3: Actions
- **Key badges**: `<kbd>` elements with border, background, monospace font
- **Header**: "Keyboard Shortcuts" title with "Esc to close" badge
- **Close**: `Esc` key or clicking the backdrop

## Keyboard Shortcuts

All shortcuts only fire when no overlay is open and no input/textarea is focused.

### Navigation
| Key | Action |
|-----|--------|
| `j` | Navigate to next page (uses sidebar nav order) |
| `k` | Navigate to previous page |
| `g h` | Navigate to home (first page) |

### Scrolling
| Key | Action |
|-----|--------|
| `Space` | Scroll down one viewport height |
| `Shift+Space` | Scroll up one viewport height |
| `g g` | Scroll to top of page |
| `G` | Scroll to bottom of page |

### UI Controls
| Key | Action |
|-----|--------|
| `s` | Toggle sidebar visibility |
| `f` | Toggle focus mode |
| `t` | Cycle to next theme |
| `Shift+T` | Cycle to previous theme |
| `+` | Increase font size (small → medium → large) |
| `-` | Decrease font size (large → medium → small) |

### Actions
| Key | Action |
|-----|--------|
| `/` | Focus search (future — no-op for now) |
| `?` | Open shortcut overlay |
| `Esc` | Close any open overlay or exit focus mode |

### Chord Keys

`g` is a chord prefix. When `g` is pressed, wait up to 1 second for the next key:
- `g h` → go home
- `g g` → scroll to top
- Any other key or timeout → cancel chord

## Focus Mode

- `f` toggles focus mode on/off
- **On**: sidebar hidden, settings gear hidden, content area expands to full width (remove max-width constraint), `body` gets `data-focus="true"`
- **Off**: sidebar and settings restored to their previous state, max-width restored
- **Esc** also exits focus mode if active
- **Persisted**: `settings.focusMode` in localStorage, applied on page load
- **CSS**: `[data-focus="true"] .sidebar { display: none }`, `[data-focus="true"] .settings { display: none }`, `[data-focus="true"] .main { max-width: none }`

## Implementation Files

### `src/styles.ts`
- Add 7 `[data-theme="..."]` selectors (light is the default `:root`)
- Add `.hljs` overrides per theme
- Add overlay styles (`.shortcuts-overlay`, `.theme-picker-overlay`, shared backdrop)
- Add `<kbd>` styles
- Add focus mode styles (`[data-focus="true"]`)
- Add theme picker card grid styles
- Add settings panel theme row and shortcuts button styles

### `src/client-scripts.ts`
- New `shortcutsScript` export (or extend `settingsScript`) with:
  - Keyboard event listener with chord buffer for `g` prefix
  - Theme cycling logic (ordered array of theme names)
  - Focus mode toggle
  - Overlay open/close logic (shortcuts overlay, theme picker)
  - Font size cycling via `+`/`-`
  - Page navigation via `j`/`k` (reads sidebar links to determine order)
  - Scroll commands

### `src/template.ts`
- Add shortcut overlay HTML (hidden by default)
- Add theme picker overlay HTML with 8 preview cards (hidden by default)
- Update settings panel: add theme row, add shortcuts button
- Wire in `data-theme` attribute on `<html>` from settings
- Include new script
