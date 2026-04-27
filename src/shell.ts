// Shared HTML shell + dark palette for non-content pages (dashboard, guide).
// Keeps the colour vocabulary in one place so all standalone readrun chrome
// agrees on what blue, what grey, what background.

export const SHELL_PALETTE = `
  --shell-bg: #0d1117;
  --shell-bg-alt: #161b22;
  --shell-fg: #e6edf3;
  --shell-fg-muted: #8b949e;
  --shell-fg-soft: #c9d1d9;
  --shell-border: #30363d;
  --shell-border-soft: #21262d;
  --shell-accent: #58a6ff;
  --shell-accent-soft: #79c0ff;
  --shell-success: #238636;
  --shell-success-hover: #2ea043;
  --shell-danger: #f85149;
`;

const RESET = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root { ${SHELL_PALETTE} }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: var(--shell-bg); color: var(--shell-fg); }
`;

export function landingShell(opts: { title: string; bodyHtml: string; extraCss?: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${opts.title}</title>
<style>${RESET}${opts.extraCss ?? ""}</style>
</head>
<body>
${opts.bodyHtml}
</body>
</html>`;
}
