#!/usr/bin/env bun

import { resolve, relative } from "path";
import { statSync } from "fs";
import { defineCommand, runMain } from "citty";
import pkg from "../package.json" with { type: "json" };
import { addRecent } from "./config";
import { detectRepoName } from "./utils";
import type { Platform } from "./build";

function openBrowser(url: string) {
  const cmd = process.platform === "darwin" ? "open"
    : process.platform === "win32" ? "start"
    : "xdg-open";
  Bun.spawn([cmd, url], { stdin: "ignore", stdout: "ignore", stderr: "ignore" });
}

function keepAlive(): Promise<never> {
  try { (process.stdin as any).unref?.(); } catch {}
  return new Promise<never>(() => {});
}

function resolvePath(p: string | undefined): string {
  return p ? resolve(process.cwd(), p) : process.cwd();
}

function parsePort(raw: unknown): number {
  if (raw === undefined || raw === null || raw === "") return 3001;
  const n = typeof raw === "number" ? raw : parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n < 0 || n > 65535) {
    console.error(`Invalid port: ${raw}`);
    process.exit(1);
  }
  return n;
}

// ─────────────────────────────────────────────────────────────
// Subcommands
// ─────────────────────────────────────────────────────────────

const serveCmd = defineCommand({
  meta: { name: "serve", description: "Serve a folder or .md file with runnable blocks." },
  args: {
    path: { type: "positional", required: false, description: "Folder or .md file (default: cwd)" },
    port: { type: "string", description: "Port (default: 3001)", default: "3001" },
    host: { type: "string", description: "Hostname (default: localhost)", default: "localhost" },
    "no-open": { type: "boolean", description: "Do not auto-open a browser", default: false },
  },
  async run({ args }) {
    const abs = resolvePath(args.path);
    let contentDir: string;
    let filePath: string | undefined;
    try {
      const s = statSync(abs);
      if (s.isDirectory()) {
        contentDir = abs;
      } else if (s.isFile() && abs.endsWith(".md")) {
        contentDir = resolve(abs, "..");
        filePath = abs;
      } else {
        console.error(`Not a folder or .md file: ${abs}`);
        process.exit(1);
      }
    } catch {
      console.error(`Not a valid path: ${abs}`);
      process.exit(1);
    }

    await addRecent(contentDir);

    const { startServer } = await import("./server");
    const handle = await startServer({
      contentDir,
      port: parsePort(args.port),
      host: args.host,
    });

    let openPath = "/";
    if (filePath) {
      const rel = filePath.slice(contentDir.length).replace(/\.md$/, "");
      openPath = rel.startsWith("/") ? rel : "/" + rel;
    }
    if (!args["no-open"]) openBrowser(`http://${handle.host}:${handle.port}${openPath}`);
    console.log("\nPress Ctrl+C to stop.");
    await keepAlive();
  },
});

const dashboardCmd = defineCommand({
  meta: { name: "dashboard", description: "Open the web dashboard (saved paths, recent folders, guide)." },
  args: {
    port: { type: "string", description: "Port (default: 3001)", default: "3001" },
    host: { type: "string", description: "Hostname (default: localhost)", default: "localhost" },
    "no-open": { type: "boolean", description: "Do not auto-open a browser", default: false },
  },
  async run({ args }) {
    const { startServer } = await import("./server");
    const handle = await startServer({ port: parsePort(args.port), host: args.host });
    if (!args["no-open"]) openBrowser(`http://${handle.host}:${handle.port}`);
    console.log(`readrun dashboard at http://${handle.host}:${handle.port}`);
    console.log("Press Ctrl+C to stop.");
    await keepAlive();
  },
});

const watchCmd = defineCommand({
  meta: { name: "watch", description: "Serve a folder and auto-reload the page when files change." },
  args: {
    path: { type: "positional", required: false, description: "Folder to watch (default: cwd)" },
    port: { type: "string", description: "Port (default: 3001)", default: "3001" },
    host: { type: "string", description: "Hostname (default: localhost)", default: "localhost" },
    "no-open": { type: "boolean", description: "Do not auto-open a browser", default: false },
  },
  async run({ args }) {
    const contentDir = resolvePath(args.path);
    try {
      const s = statSync(contentDir);
      if (!s.isDirectory()) {
        console.error(`Not a folder: ${contentDir}`);
        process.exit(1);
      }
    } catch {
      console.error(`Folder not found: ${contentDir}`);
      process.exit(1);
    }

    await addRecent(contentDir);
    const { startWatchServer } = await import("./watch");
    const handle = await startWatchServer({
      contentDir,
      port: parsePort(args.port),
      host: args.host,
    });
    if (!args["no-open"]) openBrowser(`http://${handle.host}:${handle.port}`);
    console.log("Press Ctrl+C to stop.");
    await keepAlive();
  },
});

const initCmd = defineCommand({
  meta: { name: "init", description: "Scaffold a .readrun/ structure in a folder." },
  args: {
    path: { type: "positional", required: false, description: "Target folder (default: cwd)" },
  },
  async run({ args }) {
    const target = resolvePath(args.path);
    const { initReadrun } = await import("./init");
    const result = await initReadrun(target);
    for (const p of result.created) console.log(`  created  ${p}`);
    for (const p of result.existing) console.log(`  exists   ${p}`);
    if (result.created.length === 0) console.log("Nothing to do — .readrun/ already set up.");
  },
});

const validateCmd = defineCommand({
  meta: { name: "validate", description: "Validate content and .readrun/ structure." },
  args: {
    path: { type: "positional", required: false, description: "Folder to validate (default: cwd)" },
  },
  async run({ args }) {
    const target = resolvePath(args.path);
    const { validateFolder } = await import("./validate");
    const result = await validateFolder(target);

    const RED = "\x1b[31m";
    const YELLOW = "\x1b[33m";
    const GREEN = "\x1b[32m";
    const RESET = "\x1b[0m";
    const DIM = "\x1b[2m";

    if (result.errors.length === 0 && result.warnings.length === 0) {
      console.log(`${GREEN}✓ No issues found${RESET}`);
      return;
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
    if (result.errors.length > 0) process.exit(1);
  },
});

const buildCmd = defineCommand({
  meta: { name: "build", description: "Build a static site from a folder." },
  args: {
    path: { type: "positional", required: true, description: "Content folder" },
    platform: { type: "string", description: "Target platform: github, vercel, netlify" },
    out: { type: "string", description: "Output folder (default: ./dist in cwd)" },
  },
  async run({ args }) {
    const contentDir = resolvePath(args.path);
    try { statSync(contentDir); } catch {
      console.error(`Folder not found: ${contentDir}`);
      process.exit(1);
    }

    let platform: Platform = null;
    if (args.platform) {
      const p = args.platform.toLowerCase();
      if (p === "github" || p === "vercel" || p === "netlify") platform = p;
      else if (p !== "none" && p !== "plain") {
        console.error(`Unknown platform: ${args.platform} (expected: github | vercel | netlify)`);
        process.exit(1);
      }
    }

    const outDir = args.out
      ? resolvePath(args.out)
      : resolve(process.cwd(), "dist");

    let basePath: string | undefined;
    if (platform === "github") {
      const repoName = detectRepoName(process.cwd());
      if (repoName) basePath = "/" + repoName;
    }

    const { build } = await import("./build");
    await build({ contentDir, outDir, platform, basePath });
  },
});

const serveStaticCmd = defineCommand({
  meta: { name: "preview", description: "Preview a built static site (the output of `rr build`)." },
  args: {
    path: { type: "positional", required: false, description: "Build output folder (default: ./dist)" },
    port: { type: "string", description: "Port (default: 3002)", default: "3002" },
    host: { type: "string", description: "Hostname (default: localhost)", default: "localhost" },
    "no-open": { type: "boolean", description: "Do not auto-open a browser", default: false },
  },
  async run({ args }) {
    const dir = args.path ? resolvePath(args.path) : resolve(process.cwd(), "dist");
    const { startStaticServer } = await import("./serve-static");
    const handle = await startStaticServer({ rootDir: dir, port: parsePort(args.port), host: args.host });
    if (!args["no-open"]) openBrowser(`http://${handle.host}:${handle.port}`);
    console.log("Press Ctrl+C to stop.");
    await keepAlive();
  },
});

const newCmd = defineCommand({
  meta: { name: "new", description: "Scaffold a new Markdown page." },
  args: {
    path: { type: "positional", required: true, description: "Path for the new page (e.g. ./notes/topic.md)" },
    title: { type: "string", description: "Page title (default: derived from filename)" },
    force: { type: "boolean", description: "Overwrite an existing file", default: false },
  },
  async run({ args }) {
    const target = resolve(process.cwd(), args.path);
    const { newPage } = await import("./new");
    const res = await newPage({ targetFile: target, title: args.title, force: args.force });
    const rel = relative(process.cwd(), res.path) || res.path;
    if (res.skipped === "exists") {
      console.error(`File already exists: ${rel} (use --force to overwrite)`);
      process.exit(1);
    }
    console.log(`  created  ${rel}`);
  },
});

const cleanCmd = defineCommand({
  meta: { name: "clean", description: "Remove the built `dist/` folder; optionally remove orphan scripts/images." },
  args: {
    path: { type: "positional", required: false, description: "Content folder (default: cwd)" },
    orphans: { type: "boolean", description: "Also remove unreferenced files in .readrun/scripts and .readrun/images", default: false },
    out: { type: "string", description: "Explicit dist folder to remove (default: <cwd>/dist)" },
    "dry-run": { type: "boolean", description: "Print what would be removed without deleting", default: false },
  },
  async run({ args }) {
    const contentDir = resolvePath(args.path);
    const outDir = args.out ? resolvePath(args.out) : resolve(process.cwd(), "dist");
    const { clean } = await import("./clean");
    const res = await clean({
      contentDir,
      outDir,
      orphans: args.orphans,
      dryRun: args["dry-run"],
    });
    const prefix = args["dry-run"] ? "[dry-run] " : "";
    if (res.removedDist) console.log(`${prefix}removed  ${res.removedDist}`);
    for (const f of res.orphanScripts) console.log(`${prefix}orphan   .readrun/scripts/${f}`);
    for (const f of res.orphanImages) console.log(`${prefix}orphan   .readrun/images/${f}`);
    if (!res.removedDist && res.orphanScripts.length === 0 && res.orphanImages.length === 0) {
      console.log("Nothing to clean.");
    }
  },
});

const doctorCmd = defineCommand({
  meta: { name: "doctor", description: "Check environment: Bun version, KaTeX, config, port availability." },
  async run() {
    const { doctor } = await import("./doctor");
    const res = await doctor();
    const GREEN = "\x1b[32m", YELLOW = "\x1b[33m", RED = "\x1b[31m", RESET = "\x1b[0m", DIM = "\x1b[2m";
    for (const c of res.checks) {
      const mark = c.status === "ok" ? `${GREEN}✓${RESET}` : c.status === "warn" ? `${YELLOW}!${RESET}` : `${RED}✗${RESET}`;
      console.log(`  ${mark}  ${c.name}${DIM}  —  ${c.detail}${RESET}`);
    }
    if (!res.ok) process.exit(1);
  },
});

const guideCmd = defineCommand({
  meta: { name: "guide", description: "Open the built-in architecture guide in a browser." },
  args: {
    port: { type: "string", description: "Port (default: 3001)", default: "3001" },
    host: { type: "string", description: "Hostname (default: localhost)", default: "localhost" },
    "no-open": { type: "boolean", description: "Do not auto-open a browser", default: false },
  },
  async run({ args }) {
    const { startServer } = await import("./server");
    const handle = await startServer({ port: parsePort(args.port), host: args.host });
    const url = `http://${handle.host}:${handle.port}/guide`;
    if (!args["no-open"]) openBrowser(url);
    console.log(`\nGuide at ${url}`);
    console.log("Press Ctrl+C to stop.");
    await keepAlive();
  },
});

const migrateCmd = defineCommand({
  meta: { name: "migrate", description: "Rewrite ::: block syntax to [block] syntax in all .md files." },
  args: {
    path: { type: "positional", required: false, description: "Content folder (default: cwd)" },
    "dry-run": { type: "boolean", description: "Print what would change without writing files", default: false },
  },
  async run({ args }) {
    const contentDir = resolvePath(args.path);
    const { migrate } = await import("./migrate");
    const res = await migrate({ contentDir, dryRun: args["dry-run"] });
    const prefix = args["dry-run"] ? "[dry-run] " : "";
    for (const f of res.filesModified) console.log(`${prefix}modified  ${f}`);
    for (const f of res.filesSkipped) console.log(`${prefix}skipped   ${f}`);
    console.log(`\n${res.filesScanned} file(s) scanned, ${res.filesModified.length} modified, ${res.filesSkipped.length} skipped.`);
  },
});

const selfUpdateCmd = defineCommand({
  meta: { name: "self-update", description: "Reinstall readrun dependencies in place (runs `bun install` in the readrun install dir)." },
  async run() {
    const readrunRoot = resolve(import.meta.dirname, "..");
    console.log(`Installing dependencies in ${readrunRoot}...\n`);
    const proc = Bun.spawn(["bun", "install"], {
      cwd: readrunRoot,
      stdout: "inherit",
      stderr: "inherit",
    });
    await proc.exited;
    process.exit(proc.exitCode ?? 1);
  },
});

// ─────────────────────────────────────────────────────────────
// Path shortcut dispatch — `rr <folder|file.md>` stays a power-user alias
// ─────────────────────────────────────────────────────────────

const KNOWN = new Set([
  "serve", "dashboard", "watch", "init", "validate", "build",
  "preview", "new", "clean", "doctor", "guide", "self-update", "migrate",
  "help", "--help", "-h", "--version", "-v",
]);

const first = process.argv[2];
if (first && !first.startsWith("-") && !KNOWN.has(first)) {
  const maybePath = resolve(process.cwd(), first);
  try {
    statSync(maybePath);
    // Rewrite argv so citty sees `serve <path> ...rest`
    process.argv.splice(2, 0, "serve");
  } catch {
    // Unknown — let citty surface the error
  }
}

// ─────────────────────────────────────────────────────────────
// Root command
// ─────────────────────────────────────────────────────────────

const main = defineCommand({
  meta: {
    name: "rr",
    version: pkg.version,
    description: "readrun — turn Markdown folders into interactive sites",
  },
  subCommands: {
    serve: serveCmd,
    dashboard: dashboardCmd,
    watch: watchCmd,
    init: initCmd,
    validate: validateCmd,
    build: buildCmd,
    preview: serveStaticCmd,
    new: newCmd,
    clean: cleanCmd,
    doctor: doctorCmd,
    guide: guideCmd,
    "self-update": selfUpdateCmd,
    migrate: migrateCmd,
  },
  async run({ args }) {
    // `rr` with no subcommand — fall back to dashboard so the bare command stays useful.
    if ((args._ as string[]).length === 0) {
      await dashboardCmd.run!({ args: { port: "3001", host: "localhost", "no-open": false } as any, cmd: dashboardCmd, rawArgs: [] });
    }
  },
});

await runMain(main);
