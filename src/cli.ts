#!/usr/bin/env bun

import { resolve } from "path";
import { statSync } from "fs";
import { addRecent } from "./config";
import { detectRepoName } from "./utils";
import type { Platform } from "./build";

function openBrowser(url: string) {
  const cmd = process.platform === "darwin" ? "open"
    : process.platform === "win32" ? "start"
    : "xdg-open";
  Bun.spawn([cmd, url], { stdout: "ignore", stderr: "ignore" });
}

async function promptSelect(
  question: string,
  options: { label: string; value: string }[]
): Promise<string> {
  console.log(`\n${question}`);
  options.forEach((o, i) => console.log(`  ${i + 1}. ${o.label}`));
  process.stdout.write("\nChoice [1]: ");

  return new Promise((res) => {
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    let buf = "";
    const handler = (data: string) => {
      buf += data;
      if (buf.includes("\n") || buf.includes("\r")) {
        process.stdin.removeListener("data", handler);
        process.stdin.pause();
        const n = parseInt(buf.trim());
        const idx = Number.isFinite(n) && n >= 1 && n <= options.length ? n - 1 : 0;
        const chosen = options[idx] ?? options[0];
        res(chosen?.value ?? "");
      }
    };
    process.stdin.on("data", handler);
  });
}

const HELP = `
readrun — turn Markdown folders into interactive sites

USAGE
  rr                          Open browser dashboard
  rr <folder|file.md>         Serve a folder or file
  rr build <folder>           Build static site
  rr init [folder]            Scaffold .readrun/ structure (default: cwd)
  rr validate [folder]        Validate content and .readrun/ structure
  rr update                   Update dependencies
  rr guide                    Open architecture guide in browser
  rr help                     Show this help
`.trim();

const SUBCOMMANDS = new Set(["build", "init", "validate", "update", "guide", "help"]);

// --- No args → dashboard mode ---
if (process.argv.length === 2) {
  const { startServer } = await import("./server");
  const handle = await startServer({ port: 3001 });
  openBrowser(`http://localhost:${handle.port}`);
  console.log(`readrun dashboard at http://localhost:${handle.port}`);
  console.log("Press Ctrl+C to stop.");
  await new Promise(() => {}); // keep alive
}

const rawCmd = process.argv[2]!;
const rawArg = process.argv[3];

// --- Unknown flags → error ---
if (rawCmd.startsWith("-") && rawCmd !== "--help" && rawCmd !== "-h") {
  console.error(`Unknown flag: ${rawCmd}`);
  console.error("Run rr help for usage.");
  process.exit(1);
}

// --- Help ---
if (rawCmd === "help" || rawCmd === "--help" || rawCmd === "-h") {
  console.log(HELP);
  process.exit(0);
}

// --- Update ---
if (rawCmd === "update") {
  const readrunRoot = resolve(import.meta.dirname, "..");
  console.log("Installing dependencies...\n");
  const proc = Bun.spawn(["bun", "install"], {
    cwd: readrunRoot,
    stdout: "inherit",
    stderr: "inherit",
  });
  await proc.exited;
  process.exit(proc.exitCode ?? 1);
}

// --- Init ---
if (rawCmd === "init") {
  const target = rawArg ? resolve(process.cwd(), rawArg) : process.cwd();
  const { initReadrun } = await import("./init");
  const result = await initReadrun(target);
  for (const p of result.created) console.log(`  created  ${p}`);
  for (const p of result.existing) console.log(`  exists   ${p}`);
  if (result.created.length === 0) console.log("Nothing to do — .readrun/ already set up.");
  process.exit(0);
}

// --- Validate ---
if (rawCmd === "validate") {
  const target = rawArg ? resolve(process.cwd(), rawArg) : process.cwd();
  const { validateFolder } = await import("./validate");
  const result = await validateFolder(target);

  const RED = "\x1b[31m";
  const YELLOW = "\x1b[33m";
  const GREEN = "\x1b[32m";
  const RESET = "\x1b[0m";
  const DIM = "\x1b[2m";

  if (result.errors.length === 0 && result.warnings.length === 0) {
    console.log(`${GREEN}✓ No issues found${RESET}`);
    process.exit(0);
  }

  const byFile = new Map<string, { errors: typeof result.errors; warnings: typeof result.warnings }>();
  for (const e of result.errors) {
    if (!byFile.has(e.file)) byFile.set(e.file, { errors: [], warnings: [] });
    byFile.get(e.file)!.errors.push(e);
  }
  for (const w of result.warnings) {
    if (!byFile.has(w.file)) byFile.set(w.file, { errors: [], warnings: [] });
    byFile.get(w.file)!.warnings.push(w);
  }

  for (const [file, issues] of byFile) {
    console.log(`\n${file}`);
    for (const e of issues.errors) {
      const loc = e.line ? `${DIM}line ${e.line}  ${RESET}` : "        ";
      console.log(`  ${RED}ERROR${RESET}  ${loc}${e.message}`);
    }
    for (const w of issues.warnings) {
      const loc = w.line ? `${DIM}line ${w.line}  ${RESET}` : "        ";
      console.log(`  ${YELLOW}WARN${RESET}   ${loc}${w.message}`);
    }
  }

  console.log(`\n${result.errors.length} error(s), ${result.warnings.length} warning(s)`);
  process.exit(result.errors.length > 0 ? 1 : 0);
}

// --- Build ---
if (rawCmd === "build") {
  if (!rawArg) {
    console.error("Usage: rr build <folder> [--platform=github|vercel|netlify] [--out=<dir>]");
    process.exit(1);
  }
  const contentDir = resolve(process.cwd(), rawArg);
  try { statSync(contentDir); } catch {
    console.error(`Folder not found: ${contentDir}`);
    process.exit(1);
  }

  const flags = process.argv.slice(4);
  let platform: Platform = null;
  let outDir = resolve(contentDir, "dist");

  for (const flag of flags) {
    if (flag.startsWith("--platform=")) {
      const p = flag.slice("--platform=".length);
      if (p === "github" || p === "vercel" || p === "netlify") platform = p;
    }
    if (flag.startsWith("--out=")) {
      outDir = resolve(process.cwd(), flag.slice("--out=".length));
    }
  }

  if (!platform) {
    const chosen = await promptSelect("Target platform?", [
      { label: "Plain (no platform config)", value: "none" },
      { label: "GitHub Pages", value: "github" },
      { label: "Vercel", value: "vercel" },
      { label: "Netlify", value: "netlify" },
    ]);
    platform = chosen === "none" ? null : chosen as Platform;
  }

  let basePath: string | undefined;
  if (platform === "github") {
    const repoName = detectRepoName(process.cwd());
    if (repoName) basePath = "/" + repoName;
  }

  const { build } = await import("./build");
  await build({ contentDir, outDir, platform, basePath });
  process.exit(0);
}

// --- Guide ---
if (rawCmd === "guide") {
  const { startServer } = await import("./server");
  const handle = await startServer({ port: 3001 });
  openBrowser(`http://localhost:${handle.port}/guide`);
  console.log(`\nGuide open at http://localhost:${handle.port}/guide`);
  console.log("Press Ctrl+C to stop.");
  await new Promise(() => {}); // keep alive
}

// --- Unknown subcommand guard ---
if (SUBCOMMANDS.has(rawCmd)) {
  console.error(`Unknown usage of subcommand "${rawCmd}". Run rr help.`);
  process.exit(1);
}

// --- Path shortcut: rr <folder|file.md> ---
const abs = resolve(process.cwd(), rawCmd);
let pathStat;
try { pathStat = statSync(abs); } catch {
  console.error(`Not a valid path or command: ${rawCmd}`);
  console.error("Run rr help for usage.");
  process.exit(1);
}

let contentDirForDev: string;
let filePath: string | undefined;

if (pathStat.isDirectory()) {
  contentDirForDev = abs;
} else if (pathStat.isFile() && abs.endsWith(".md")) {
  contentDirForDev = resolve(abs, "..");
  filePath = abs;
} else {
  console.error(`Not a folder or .md file: ${abs}`);
  process.exit(1);
}

await addRecent(contentDirForDev);

const { startServer } = await import("./server");
const handle = await startServer({ contentDir: contentDirForDev, port: 3001 });
let openPath = "/";
if (filePath) {
  const rel = filePath.slice(contentDirForDev.length).replace(/\.md$/, "");
  openPath = rel.startsWith("/") ? rel : "/" + rel;
}
openBrowser(`http://localhost:${handle.port}${openPath}`);
console.log("\nPress Ctrl+C to stop.");
await new Promise(() => {}); // keep alive until Ctrl+C
