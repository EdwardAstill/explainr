export const themeStyles = `
    /* Themes */
    [data-theme="dark"] {
      --color-bg: #0d1117; --color-sidebar-bg: #161b22; --color-border: #30363d;
      --color-text: #e6edf3; --color-text-muted: #8b949e; --color-link: #58a6ff;
      --color-active-bg: #1f2a38; --color-code-bg: #161b22;
    }
    [data-theme="solarized"] {
      --color-bg: #fdf6e3; --color-sidebar-bg: #eee8d5; --color-border: #d6ccb1;
      --color-text: #657b83; --color-text-muted: #93a1a1; --color-link: #268bd2;
      --color-active-bg: #e8dfc8; --color-code-bg: #eee8d5;
    }
    [data-theme="nord"] {
      --color-bg: #2e3440; --color-sidebar-bg: #3b4252; --color-border: #434c5e;
      --color-text: #d8dee9; --color-text-muted: #616e88; --color-link: #88c0d0;
      --color-active-bg: #434c5e; --color-code-bg: #3b4252;
    }
    [data-theme="dracula"] {
      --color-bg: #282a36; --color-sidebar-bg: #21222c; --color-border: #44475a;
      --color-text: #f8f8f2; --color-text-muted: #6272a4; --color-link: #8be9fd;
      --color-active-bg: #44475a; --color-code-bg: #21222c;
    }
    [data-theme="monokai"] {
      --color-bg: #272822; --color-sidebar-bg: #1e1f1c; --color-border: #3e3d32;
      --color-text: #f8f8f2; --color-text-muted: #75715e; --color-link: #66d9ef;
      --color-active-bg: #3e3d32; --color-code-bg: #1e1f1c;
    }
    [data-theme="gruvbox"] {
      --color-bg: #282828; --color-sidebar-bg: #3c3836; --color-border: #504945;
      --color-text: #ebdbb2; --color-text-muted: #928374; --color-link: #83a598;
      --color-active-bg: #504945; --color-code-bg: #3c3836;
    }
    [data-theme="catppuccin"] {
      --color-bg: #1e1e2e; --color-sidebar-bg: #181825; --color-border: #313244;
      --color-text: #cdd6f4; --color-text-muted: #6c7086; --color-link: #89b4fa;
      --color-active-bg: #313244; --color-code-bg: #181825;
    }

    /* highlight.js — Light (default) */
    .hljs { background: var(--color-code-bg); color: var(--color-text); }
    .hljs-comment, .hljs-quote { color: #6e7781; }
    .hljs-keyword, .hljs-selector-tag, .hljs-type { color: #cf222e; }
    .hljs-string, .hljs-addition { color: #0a3069; }
    .hljs-number, .hljs-literal { color: #0550ae; }
    .hljs-built_in { color: #8250df; }
    .hljs-title, .hljs-section { color: #8250df; }
    .hljs-attr, .hljs-attribute { color: #0550ae; }
    .hljs-name, .hljs-tag { color: #116329; }
    .hljs-deletion { color: #82071e; background: #ffebe9; }

    /* highlight.js — Dark */
    [data-theme="dark"] .hljs-comment, [data-theme="dark"] .hljs-quote { color: #8b949e; }
    [data-theme="dark"] .hljs-keyword, [data-theme="dark"] .hljs-selector-tag, [data-theme="dark"] .hljs-type { color: #ff7b72; }
    [data-theme="dark"] .hljs-string, [data-theme="dark"] .hljs-addition { color: #a5d6ff; }
    [data-theme="dark"] .hljs-number, [data-theme="dark"] .hljs-literal { color: #79c0ff; }
    [data-theme="dark"] .hljs-built_in { color: #d2a8ff; }
    [data-theme="dark"] .hljs-title, [data-theme="dark"] .hljs-section { color: #d2a8ff; }
    [data-theme="dark"] .hljs-attr, [data-theme="dark"] .hljs-attribute { color: #79c0ff; }
    [data-theme="dark"] .hljs-name, [data-theme="dark"] .hljs-tag { color: #7ee787; }
    [data-theme="dark"] .hljs-deletion { color: #ffa198; background: #490202; }

    /* highlight.js — Solarized */
    [data-theme="solarized"] .hljs-comment, [data-theme="solarized"] .hljs-quote { color: #93a1a1; }
    [data-theme="solarized"] .hljs-keyword, [data-theme="solarized"] .hljs-selector-tag, [data-theme="solarized"] .hljs-type { color: #859900; }
    [data-theme="solarized"] .hljs-string, [data-theme="solarized"] .hljs-addition { color: #2aa198; }
    [data-theme="solarized"] .hljs-number, [data-theme="solarized"] .hljs-literal { color: #d33682; }
    [data-theme="solarized"] .hljs-built_in { color: #b58900; }
    [data-theme="solarized"] .hljs-title, [data-theme="solarized"] .hljs-section { color: #268bd2; }
    [data-theme="solarized"] .hljs-attr, [data-theme="solarized"] .hljs-attribute { color: #b58900; }
    [data-theme="solarized"] .hljs-name, [data-theme="solarized"] .hljs-tag { color: #268bd2; }
    [data-theme="solarized"] .hljs-deletion { color: #dc322f; background: #fdf6e3; }

    /* highlight.js — Nord */
    [data-theme="nord"] .hljs-comment, [data-theme="nord"] .hljs-quote { color: #616e88; }
    [data-theme="nord"] .hljs-keyword, [data-theme="nord"] .hljs-selector-tag, [data-theme="nord"] .hljs-type { color: #81a1c1; }
    [data-theme="nord"] .hljs-string, [data-theme="nord"] .hljs-addition { color: #a3be8c; }
    [data-theme="nord"] .hljs-number, [data-theme="nord"] .hljs-literal { color: #b48ead; }
    [data-theme="nord"] .hljs-built_in { color: #88c0d0; }
    [data-theme="nord"] .hljs-title, [data-theme="nord"] .hljs-section { color: #8fbcbb; }
    [data-theme="nord"] .hljs-attr, [data-theme="nord"] .hljs-attribute { color: #8fbcbb; }
    [data-theme="nord"] .hljs-name, [data-theme="nord"] .hljs-tag { color: #81a1c1; }
    [data-theme="nord"] .hljs-deletion { color: #bf616a; background: #3b4252; }

    /* highlight.js — Dracula */
    [data-theme="dracula"] .hljs-comment, [data-theme="dracula"] .hljs-quote { color: #6272a4; }
    [data-theme="dracula"] .hljs-keyword, [data-theme="dracula"] .hljs-selector-tag, [data-theme="dracula"] .hljs-type { color: #ff79c6; }
    [data-theme="dracula"] .hljs-string, [data-theme="dracula"] .hljs-addition { color: #f1fa8c; }
    [data-theme="dracula"] .hljs-number, [data-theme="dracula"] .hljs-literal { color: #bd93f9; }
    [data-theme="dracula"] .hljs-built_in { color: #50fa7b; }
    [data-theme="dracula"] .hljs-title, [data-theme="dracula"] .hljs-section { color: #50fa7b; }
    [data-theme="dracula"] .hljs-attr, [data-theme="dracula"] .hljs-attribute { color: #50fa7b; }
    [data-theme="dracula"] .hljs-name, [data-theme="dracula"] .hljs-tag { color: #ff79c6; }
    [data-theme="dracula"] .hljs-deletion { color: #ff5555; background: #44475a; }

    /* highlight.js — Monokai */
    [data-theme="monokai"] .hljs-comment, [data-theme="monokai"] .hljs-quote { color: #75715e; }
    [data-theme="monokai"] .hljs-keyword, [data-theme="monokai"] .hljs-selector-tag, [data-theme="monokai"] .hljs-type { color: #f92672; }
    [data-theme="monokai"] .hljs-string, [data-theme="monokai"] .hljs-addition { color: #e6db74; }
    [data-theme="monokai"] .hljs-number, [data-theme="monokai"] .hljs-literal { color: #ae81ff; }
    [data-theme="monokai"] .hljs-built_in { color: #a6e22e; }
    [data-theme="monokai"] .hljs-title, [data-theme="monokai"] .hljs-section { color: #a6e22e; }
    [data-theme="monokai"] .hljs-attr, [data-theme="monokai"] .hljs-attribute { color: #a6e22e; }
    [data-theme="monokai"] .hljs-name, [data-theme="monokai"] .hljs-tag { color: #f92672; }
    [data-theme="monokai"] .hljs-deletion { color: #f92672; background: #3e3d32; }

    /* highlight.js — Gruvbox */
    [data-theme="gruvbox"] .hljs-comment, [data-theme="gruvbox"] .hljs-quote { color: #928374; }
    [data-theme="gruvbox"] .hljs-keyword, [data-theme="gruvbox"] .hljs-selector-tag, [data-theme="gruvbox"] .hljs-type { color: #fb4934; }
    [data-theme="gruvbox"] .hljs-string, [data-theme="gruvbox"] .hljs-addition { color: #b8bb26; }
    [data-theme="gruvbox"] .hljs-number, [data-theme="gruvbox"] .hljs-literal { color: #d3869b; }
    [data-theme="gruvbox"] .hljs-built_in { color: #fabd2f; }
    [data-theme="gruvbox"] .hljs-title, [data-theme="gruvbox"] .hljs-section { color: #83a598; }
    [data-theme="gruvbox"] .hljs-attr, [data-theme="gruvbox"] .hljs-attribute { color: #fabd2f; }
    [data-theme="gruvbox"] .hljs-name, [data-theme="gruvbox"] .hljs-tag { color: #fb4934; }
    [data-theme="gruvbox"] .hljs-deletion { color: #fb4934; background: #3c3836; }

    /* highlight.js — Catppuccin */
    [data-theme="catppuccin"] .hljs-comment, [data-theme="catppuccin"] .hljs-quote { color: #6c7086; }
    [data-theme="catppuccin"] .hljs-keyword, [data-theme="catppuccin"] .hljs-selector-tag, [data-theme="catppuccin"] .hljs-type { color: #cba6f7; }
    [data-theme="catppuccin"] .hljs-string, [data-theme="catppuccin"] .hljs-addition { color: #a6e3a1; }
    [data-theme="catppuccin"] .hljs-number, [data-theme="catppuccin"] .hljs-literal { color: #fab387; }
    [data-theme="catppuccin"] .hljs-built_in { color: #94e2d5; }
    [data-theme="catppuccin"] .hljs-title, [data-theme="catppuccin"] .hljs-section { color: #89b4fa; }
    [data-theme="catppuccin"] .hljs-attr, [data-theme="catppuccin"] .hljs-attribute { color: #94e2d5; }
    [data-theme="catppuccin"] .hljs-name, [data-theme="catppuccin"] .hljs-tag { color: #cba6f7; }
    [data-theme="catppuccin"] .hljs-deletion { color: #f38ba8; background: #313244; }
`;
