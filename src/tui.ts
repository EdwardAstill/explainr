import { resolve, basename } from "path";
import { readdirSync, statSync } from "fs";

// --- ANSI helpers ---
const ESC = "\x1b[";
const BOLD = `${ESC}1m`;
const DIM = `${ESC}2m`;
const RESET = `${ESC}0m`;
const CYAN = `${ESC}36m`;
const MAGENTA = `${ESC}35m`;
const YELLOW = `${ESC}33m`;
const CLEAR_LINE = `${ESC}2K`;
const HIDE_CURSOR = `${ESC}?25l`;
const SHOW_CURSOR = `${ESC}?25h`;

function moveTo(row: number, col: number) {
  process.stdout.write(`${ESC}${row};${col}H`);
}

function clearScreen() {
  process.stdout.write(`${ESC}2J${ESC}H`);
}

function write(s: string) {
  process.stdout.write(s);
}

// --- Input reading ---
function enableRawMode() {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();
  process.stdin.setEncoding("utf8");
}

function disableRawMode() {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  process.stdin.pause();
}

function readKey(): Promise<string> {
  return new Promise((resolve) => {
    const handler = (data: string) => {
      process.stdin.removeListener("data", handler);
      resolve(data);
    };
    process.stdin.on("data", handler);
  });
}

// --- UI Components ---

const LOGO = `${DIM}
                                     __
                                    |  \\
  ______    ______    ______    ____| $$  ______   __    __  _______
 /      \\  /      \\  |      \\  /      $$ /      \\ |  \\  |  \\|       \\
|  $$$$$$\\|  $$$$$$\\  \\$$$$$$\\|  $$$$$$$|  $$$$$$\\| $$  | $$| $$$$$$$\\
| $$   \\$$| $$    $$ /      $$| $$  | $$| $$   \\$$| $$  | $$| $$  | $$
| $$      | $$$$$$$$|  $$$$$$$| $$__| $$| $$      | $$__/ $$| $$  | $$
| $$       \\$$     \\ \\$$    $$ \\$$    $$| $$       \\$$    $$| $$  | $$
 \\$$        \\$$$$$$$  \\$$$$$$$  \\$$$$$$$ \\$$        \\$$$$$$  \\$$   \\$$
${RESET}
`;

interface MenuOption {
  label: string;
  description: string;
  value: string;
}

async function selectMenu(title: string, options: MenuOption[], startRow: number): Promise<string> {
  let selected = 0;

  function render() {
    for (let i = 0; i < options.length; i++) {
      moveTo(startRow + i, 3);
      write(CLEAR_LINE);
      if (i === selected) {
        write(`${CYAN}${BOLD}  ▸ ${options[i].label}${RESET}  ${DIM}${options[i].description}${RESET}`);
      } else {
        write(`${DIM}    ${options[i].label}${RESET}  ${DIM}${options[i].description}${RESET}`);
      }
    }
    moveTo(startRow + options.length + 1, 3);
    write(CLEAR_LINE);
    write(`${DIM}  ↑/↓ navigate  ⏎ select  q quit${RESET}`);
  }

  render();

  while (true) {
    const key = await readKey();

    if (key === "\x03" || key === "q") {
      return "quit";
    }

    if (key === "\r" || key === "\n") {
      return options[selected].value;
    }

    if (key === "\x1b[A" || key === "k") {
      selected = (selected - 1 + options.length) % options.length;
    } else if (key === "\x1b[B" || key === "j") {
      selected = (selected + 1) % options.length;
    }

    render();
  }
}

async function promptInput(label: string, defaultValue: string, row: number): Promise<string> {
  moveTo(row, 3);
  write(CLEAR_LINE);
  write(`  ${BOLD}${label}${RESET} ${DIM}(${defaultValue})${RESET}: `);
  write(SHOW_CURSOR);

  let value = "";

  while (true) {
    const key = await readKey();

    if (key === "\x03") {
      write(HIDE_CURSOR);
      return "quit";
    }

    if (key === "\r" || key === "\n") {
      write(HIDE_CURSOR);
      return value || defaultValue;
    }

    if (key === "\x7f" || key === "\b") {
      if (value.length > 0) {
        value = value.slice(0, -1);
        write(`\b \b`);
      }
      continue;
    }

    if (key.charCodeAt(0) < 32 || key.startsWith("\x1b")) continue;

    value += key;
    write(key);
  }
}

function detectRepoName(cwd: string): string | undefined {
  try {
    const result = Bun.spawnSync(["git", "remote", "get-url", "origin"], { cwd });
    const url = result.stdout.toString().trim();
    if (url) {
      // Extract repo name from git URL (handles https and ssh)
      const match = url.match(/\/([^/]+?)(?:\.git)?$/);
      if (match) {
        const name = match[1];
        // username.github.io repos are root sites — no base path needed
        if (name.endsWith(".github.io")) return undefined;
        return name;
      }
    }
  } catch {}
  // Fallback: use directory name
  return basename(cwd);
}

const BROWSE_IGNORE = new Set(["node_modules", "dist", "out", ".git", "__pycache__", ".venv", "venv"]);

async function browseFolder(label: string, startDir: string, startRow: number): Promise<string> {
  let currentDir = resolve(startDir);

  while (true) {
    // Read subdirectories
    let dirs: string[] = [];
    try {
      dirs = readdirSync(currentDir)
        .filter((name) => {
          if (name.startsWith(".") || BROWSE_IGNORE.has(name)) return false;
          try {
            return statSync(resolve(currentDir, name)).isDirectory();
          } catch {
            return false;
          }
        })
        .sort();
    } catch {
      // Can't read directory — go up
      currentDir = resolve(currentDir, "..");
      continue;
    }

    // Build options list
    const options: MenuOption[] = [
      { label: "✓ Use this folder", description: "", value: "__select__" },
      { label: "../", description: "parent directory", value: "__up__" },
      ...dirs.map((d) => ({ label: `${d}/`, description: "", value: d })),
    ];

    // Draw header
    moveTo(startRow, 3);
    write(CLEAR_LINE);
    write(`  ${BOLD}${label}${RESET}`);
    moveTo(startRow + 1, 3);
    write(CLEAR_LINE);
    write(`  ${DIM}📂 ${currentDir}${RESET}`);

    // Clear old content below
    const maxVisible = Math.min(options.length, 15);
    for (let i = 0; i < maxVisible + 4; i++) {
      moveTo(startRow + 3 + i, 1);
      write(CLEAR_LINE);
    }

    let selected = 0;
    let scrollOffset = 0;

    const render = () => {
      const visible = Math.min(options.length, 15);
      // Adjust scroll to keep selected in view
      if (selected < scrollOffset) scrollOffset = selected;
      if (selected >= scrollOffset + visible) scrollOffset = selected - visible + 1;

      for (let i = 0; i < visible; i++) {
        const idx = scrollOffset + i;
        moveTo(startRow + 3 + i, 3);
        write(CLEAR_LINE);
        if (idx === selected) {
          write(`${CYAN}${BOLD}  ▸ ${options[idx].label}${RESET}  ${DIM}${options[idx].description}${RESET}`);
        } else {
          write(`${DIM}    ${options[idx].label}${RESET}  ${DIM}${options[idx].description}${RESET}`);
        }
      }
      // Scroll indicators
      moveTo(startRow + 3 + visible, 3);
      write(CLEAR_LINE);
      if (options.length > visible) {
        write(`${DIM}  ${scrollOffset > 0 ? "↑ " : "  "}${scrollOffset + visible < options.length ? "↓ " : "  "}(${options.length} items)${RESET}`);
      }
      moveTo(startRow + 3 + visible + 1, 3);
      write(CLEAR_LINE);
      write(`${DIM}  ↑/↓ navigate  ⏎ enter/select  q quit${RESET}`);
    };

    render();

    let picked: string | null = null;
    while (picked === null) {
      const key = await readKey();

      if (key === "\x03" || key === "q") {
        return "quit";
      }

      if (key === "\r" || key === "\n") {
        const val = options[selected].value;
        if (val === "__select__") {
          return currentDir;
        } else if (val === "__up__") {
          currentDir = resolve(currentDir, "..");
          picked = "__navigate__";
        } else {
          currentDir = resolve(currentDir, val);
          picked = "__navigate__";
        }
      }

      if (key === "\x1b[A" || key === "k") {
        selected = (selected - 1 + options.length) % options.length;
      } else if (key === "\x1b[B" || key === "j") {
        selected = (selected + 1) % options.length;
      }

      if (picked === null) render();
    }

    // Clear the browser area before re-rendering
    const clearRows = Math.min(options.length, 15) + 5;
    for (let i = 0; i < clearRows; i++) {
      moveTo(startRow + i, 1);
      write(CLEAR_LINE);
    }
  }
}

// --- TUI Flows ---

export interface TuiResult {
  command: "dev" | "build" | "update" | "quit";
  contentDir: string;
  port?: number;
  platform?: "github" | "vercel" | "netlify" | null;
  outDir?: string;
  basePath?: string;
  testMode?: boolean;
}

export async function runTui(): Promise<TuiResult> {
  const cwd = resolve(process.cwd());

  enableRawMode();
  write(HIDE_CURSOR);
  clearScreen();
  write(LOGO);

  moveTo(13, 3);
  write(`  ${BOLD}What would you like to do?${RESET}`);

  const mainChoice = await selectMenu("", [
    { label: "👁  View", description: "Preview your site locally", value: "view" },
    { label: "📦 Build", description: "Build a static site for deployment", value: "build" },
    { label: "📖 Docs", description: "Preview the built-in docs", value: "docs" },
    { label: "🔄 Update", description: "Install/update dependencies", value: "update" },
  ], 15);

  if (mainChoice === "quit") return cleanup({ command: "quit", contentDir: cwd });

  if (mainChoice === "update") {
    return cleanup({ command: "update", contentDir: cwd });
  }

  if (mainChoice === "docs") {
    return await docsFlow(cwd);
  }

  if (mainChoice === "view") {
    return await viewFlow(cwd);
  }

  if (mainChoice === "build") {
    return await buildFlow(cwd);
  }

  return cleanup({ command: "quit", contentDir: cwd });
}

async function buildFlow(cwd: string): Promise<TuiResult> {
  clearScreen();
  write(LOGO);

  // 1. Content directory — folder browser
  const contentDir = await browseFolder("Choose your site root (the folder with your .md files)", cwd, 13);
  if (contentDir === "quit") return cleanup({ command: "quit", contentDir: cwd });

  // 2. Platform selection
  clearScreen();
  write(LOGO);
  moveTo(13, 3);
  write(`  ${BOLD}${MAGENTA}Build Setup${RESET}  ${DIM}site: ${contentDir}${RESET}`);
  moveTo(15, 3);
  write(`  ${BOLD}Target platform${RESET}`);

  const platform = await selectMenu("", [
    { label: "Plain", description: "Static HTML files, no platform config", value: "none" },
    { label: "GitHub Pages", description: "Adds .nojekyll + Actions workflow", value: "github" },
    { label: "Vercel", description: "Adds vercel.json", value: "vercel" },
    { label: "Netlify", description: "Adds netlify.toml", value: "netlify" },
  ], 17);

  if (platform === "quit") return cleanup({ command: "quit", contentDir: cwd });

  const resolvedPlatform = platform === "none" ? null : platform as "github" | "vercel" | "netlify";

  // 3. Output directory — folder browser + name
  clearScreen();
  write(LOGO);
  moveTo(13, 3);
  write(`  ${BOLD}${MAGENTA}Build Setup${RESET}  ${DIM}site: ${contentDir}${RESET}`);

  const outParent = await browseFolder("Choose where to put the output folder", contentDir, 15);
  if (outParent === "quit") return cleanup({ command: "quit", contentDir: cwd });

  clearScreen();
  write(LOGO);
  moveTo(13, 3);
  write(`  ${BOLD}${MAGENTA}Build Setup${RESET}  ${DIM}site: ${contentDir}${RESET}`);
  moveTo(15, 3);
  write(`  ${DIM}Output will be created in: ${outParent}/${RESET}`);
  const outName = await promptInput("Output folder name", "dist", 16);
  if (outName === "quit") return cleanup({ command: "quit", contentDir: cwd });
  const outDir = resolve(outParent, outName);

  // 4. Base path — auto-detected from git repo name
  let basePath: string | undefined;
  if (resolvedPlatform === "github") {
    const repoName = detectRepoName(cwd);
    if (repoName) {
      basePath = "/" + repoName;
    }
  }

  return cleanup({
    command: "build",
    contentDir: resolve(contentDir),
    platform: resolvedPlatform,
    outDir: resolve(outDir),
    basePath,
  });
}

async function viewFlow(cwd: string): Promise<TuiResult> {
  return cleanup({
    command: "dev",
    contentDir: cwd,
    port: 3001,
  });
}

async function docsFlow(cwd: string): Promise<TuiResult> {
  clearScreen();
  write(LOGO);
  moveTo(13, 3);
  write(`  ${BOLD}${YELLOW}Docs Preview${RESET}`);

  const portStr = await promptInput("Port", "3001", 15);
  if (portStr === "quit") return cleanup({ command: "quit", contentDir: cwd });
  const port = Number(portStr) || 3001;

  return cleanup({
    command: "dev",
    contentDir: cwd,
    port,
    testMode: true,
  });
}

function cleanup(result: TuiResult): TuiResult {
  write(SHOW_CURSOR);
  disableRawMode();
  clearScreen();
  return result;
}
