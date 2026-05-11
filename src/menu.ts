import pkg from "../package.json" with { type: "json" };

const HIDE  = "\x1b[?25l";
const SHOW  = "\x1b[?25h";
const CLEAR = "\x1b[2J\x1b[H";
const RESET = "\x1b[0m";
const BOLD  = "\x1b[1m";
const DIM   = "\x1b[2m";
const GREEN = "\x1b[32m";

const ITEMS = [
  { cmd: "serve",     desc: "Serve current folder as a site" },
  { cmd: "demo",      desc: "Serve the built-in demo" },
  { cmd: "watch",     desc: "Serve with auto-reload on changes" },
  { cmd: "validate",  desc: "Check content and .readrun/ for issues" },
  { cmd: "build",     desc: "Build a static site for deployment" },
  { cmd: "new",       desc: "Scaffold a new .md page" },
  { cmd: "today",     desc: "Open / create today's daily note" },
  { cmd: "init",      desc: "Set up .readrun/ in a folder" },
  { cmd: "dashboard", desc: "Open the web dashboard" },
  { cmd: "preview",   desc: "Preview a static build locally" },
  { cmd: "share",     desc: "Tunnel current folder to a public URL" },
  { cmd: "clean",     desc: "Remove dist/ and orphan assets" },
  { cmd: "doctor",    desc: "Check environment (Bun, KaTeX, ports)" },
  { cmd: "guide",     desc: "Architecture guide in browser" },
];

function render(idx: number): void {
  const pad = 11;
  const lines: string[] = [
    "",
    `  ${BOLD}readrun${RESET} ${DIM}v${pkg.version}${RESET}`,
    "",
    `  ${DIM}↑↓  navigate    enter  select    q  quit${RESET}`,
    "",
    ...ITEMS.map((item, i) => {
      const sel = i === idx;
      const arrow = sel ? `${GREEN}►${RESET}` : " ";
      const name  = sel
        ? `${BOLD}${item.cmd.padEnd(pad)}${RESET}`
        : `${DIM}${item.cmd.padEnd(pad)}${RESET}`;
      const desc  = sel ? item.desc : `${DIM}${item.desc}${RESET}`;
      return `  ${arrow} ${name}  ${desc}`;
    }),
    "",
  ];
  process.stdout.write(CLEAR + lines.join("\n"));
}

async function readKey(): Promise<string> {
  return new Promise(res => process.stdin.once("data", (d: Buffer) => res(d.toString())));
}

function cleanup(): void {
  process.stdout.write(SHOW + CLEAR);
  try { process.stdin.setRawMode(false); } catch {}
  process.stdin.pause();
}

export async function runMenu(): Promise<void> {
  if (!process.stdin.isTTY) {
    console.error("rr menu requires an interactive terminal.");
    process.exit(1);
  }

  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdout.write(HIDE);

  let idx = 0;
  render(idx);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const key = await readKey();

    // quit
    if (key === "\x03" || key === "q" || key === "\x1b") {
      cleanup();
      process.exit(0);
    }

    // navigate
    if (key === "\x1b[A" || key === "k") {
      idx = (idx - 1 + ITEMS.length) % ITEMS.length;
      render(idx);
      continue;
    }
    if (key === "\x1b[B" || key === "j") {
      idx = (idx + 1) % ITEMS.length;
      render(idx);
      continue;
    }

    // select
    if (key === "\r" || key === "\n") {
      cleanup();
      const selected = ITEMS[idx]!.cmd;
      const bin = process.argv[0]!;
      const script = process.argv[1]!;
      const proc = Bun.spawn(
        [bin, script, selected],
        { stdin: "inherit", stdout: "inherit", stderr: "inherit" }
      );
      process.exit(await proc.exited ?? 0);
    }
  }
}
