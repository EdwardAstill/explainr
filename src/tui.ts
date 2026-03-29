import { resolve } from "path";

// --- ANSI helpers ---
const ESC = "\x1b[";
const BOLD = `${ESC}1m`;
const DIM = `${ESC}2m`;
const RESET = `${ESC}0m`;
const CYAN = `${ESC}36m`;
const GREEN = `${ESC}32m`;
const YELLOW = `${ESC}33m`;
const MAGENTA = `${ESC}35m`;
const WHITE = `${ESC}37m`;
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
    // Navigation hint
    moveTo(startRow + options.length + 1, 3);
    write(CLEAR_LINE);
    write(`${DIM}  ↑/↓ navigate  ⏎ select  q quit${RESET}`);
  }

  render();

  while (true) {
    const key = await readKey();

    if (key === "\x03" || key === "q") {
      // Ctrl+C or q
      return "quit";
    }

    if (key === "\r" || key === "\n") {
      return options[selected].value;
    }

    // Arrow keys
    if (key === "\x1b[A" || key === "k") {
      // Up
      selected = (selected - 1 + options.length) % options.length;
    } else if (key === "\x1b[B" || key === "j") {
      // Down
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
      // Backspace
      if (value.length > 0) {
        value = value.slice(0, -1);
        write(`\b \b`);
      }
      continue;
    }

    // Ignore control sequences
    if (key.charCodeAt(0) < 32 || key.startsWith("\x1b")) continue;

    value += key;
    write(key);
  }
}

async function confirmPrompt(label: string, defaultYes: boolean, row: number): Promise<boolean | "quit"> {
  const hint = defaultYes ? "Y/n" : "y/N";
  moveTo(row, 3);
  write(CLEAR_LINE);
  write(`  ${BOLD}${label}${RESET} ${DIM}(${hint})${RESET}: `);
  write(SHOW_CURSOR);

  while (true) {
    const key = await readKey();

    if (key === "\x03") {
      write(HIDE_CURSOR);
      return "quit";
    }

    if (key === "\r" || key === "\n") {
      write(HIDE_CURSOR);
      return defaultYes;
    }

    if (key === "y" || key === "Y") {
      write("yes");
      write(HIDE_CURSOR);
      return true;
    }

    if (key === "n" || key === "N") {
      write("no");
      write(HIDE_CURSOR);
      return false;
    }
  }
}

// --- TUI Flows ---

export interface TuiResult {
  command: "dev" | "build" | "update" | "quit";
  contentDir: string;
  port?: number;
  liveMode?: boolean;
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

  // Main menu
  moveTo(13, 3);
  write(`  ${BOLD}What would you like to do?${RESET}`);

  const mainChoice = await selectMenu("", [
    { label: "🌐 View", description: "Serve your site in the browser (no file access)", value: "view" },
    { label: "🖥  Live Server", description: "Dev server with native code execution + file uploads", value: "live" },
    { label: "📦 Build", description: "Build a static site for deployment", value: "build" },
    { label: "🧪 Demo", description: "Launch with built-in demo content + docs", value: "demo" },
    { label: "🔄 Update", description: "Install/update dependencies", value: "update" },
  ], 15);

  if (mainChoice === "quit") return cleanup({ command: "quit", contentDir: cwd });

  if (mainChoice === "update") {
    return cleanup({ command: "update", contentDir: cwd });
  }

  if (mainChoice === "demo") {
    return await demoFlow(cwd);
  }

  if (mainChoice === "view") {
    return await devFlow(cwd, false);
  }

  if (mainChoice === "live") {
    return await devFlow(cwd, true);
  }

  if (mainChoice === "build") {
    return await buildFlow(cwd);
  }

  return cleanup({ command: "quit", contentDir: cwd });
}

async function devFlow(cwd: string, liveMode: boolean): Promise<TuiResult> {
  clearScreen();
  write(LOGO);
  moveTo(13, 3);
  const title = liveMode ? `${BOLD}${GREEN}Live Server Setup${RESET}` : `${BOLD}${CYAN}View Setup${RESET}`;
  write(`  ${title}`);

  // Content directory
  const contentDir = await promptInput("Content directory", cwd, 15);
  if (contentDir === "quit") return cleanup({ command: "quit", contentDir: cwd });

  // Port
  const portStr = await promptInput("Port", "3001", 17);
  if (portStr === "quit") return cleanup({ command: "quit", contentDir: cwd });
  const port = Number(portStr) || 3001;

  return cleanup({
    command: "dev",
    contentDir: resolve(contentDir),
    port,
    liveMode,
  });
}

async function buildFlow(cwd: string): Promise<TuiResult> {
  clearScreen();
  write(LOGO);
  moveTo(13, 3);
  write(`  ${BOLD}${MAGENTA}Build Setup${RESET}`);

  // Content directory
  const contentDir = await promptInput("Content directory", cwd, 15);
  if (contentDir === "quit") return cleanup({ command: "quit", contentDir: cwd });

  // Platform selection
  moveTo(17, 3);
  write(`  ${BOLD}Target platform${RESET}`);

  const platform = await selectMenu("", [
    { label: "Plain", description: "Static HTML files, no platform config", value: "none" },
    { label: "GitHub Pages", description: "Adds .nojekyll + Actions workflow", value: "github" },
    { label: "Vercel", description: "Adds vercel.json", value: "vercel" },
    { label: "Netlify", description: "Adds netlify.toml", value: "netlify" },
  ], 19);

  if (platform === "quit") return cleanup({ command: "quit", contentDir: cwd });

  const resolvedPlatform = platform === "none" ? null : platform as "github" | "vercel" | "netlify";

  // Output directory
  const defaultOut = resolve(contentDir, "dist");
  const outDir = await promptInput("Output directory", defaultOut, 25);
  if (outDir === "quit") return cleanup({ command: "quit", contentDir: cwd });

  // Base path (for GitHub Pages project sites)
  let basePath: string | undefined;
  if (resolvedPlatform === "github") {
    moveTo(27, 3);
    write(`  ${DIM}Base path is needed for GitHub Pages project sites (e.g. /my-repo/)${RESET}`);
    const bp = await promptInput("Base path", "/", 28);
    if (bp === "quit") return cleanup({ command: "quit", contentDir: cwd });
    basePath = bp === "/" ? undefined : bp;
  }

  return cleanup({
    command: "build",
    contentDir: resolve(contentDir),
    platform: resolvedPlatform,
    outDir: resolve(outDir),
    basePath,
  });
}

async function demoFlow(cwd: string): Promise<TuiResult> {
  clearScreen();
  write(LOGO);
  moveTo(13, 3);
  write(`  ${BOLD}${YELLOW}Demo Mode${RESET}`);

  moveTo(15, 3);
  write(`  ${BOLD}Which demo?${RESET}`);

  const demoChoice = await selectMenu("", [
    { label: "Standard", description: "Basic demo with markdown examples", value: "standard" },
    { label: "Live", description: "Demo with Python execution and file uploads", value: "live" },
  ], 17);

  if (demoChoice === "quit") return cleanup({ command: "quit", contentDir: cwd });

  // Port
  const portStr = await promptInput("Port", "3001", 21);
  if (portStr === "quit") return cleanup({ command: "quit", contentDir: cwd });
  const port = Number(portStr) || 3001;

  return cleanup({
    command: "dev",
    contentDir: cwd,
    port,
    liveMode: demoChoice === "live",
    testMode: true,
  });
}

function cleanup(result: TuiResult): TuiResult {
  write(SHOW_CURSOR);
  disableRawMode();
  clearScreen();
  return result;
}
