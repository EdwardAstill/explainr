#!/usr/bin/env bun

import { resolve } from "path";
import { startServer } from "./server";
import { build, type Platform } from "./build";

const args = process.argv.slice(2);
const testMode = args.includes("-t");
const liveMode = args.includes("--live");
const baseFlagIndex = args.indexOf("--base");
const basePath = baseFlagIndex !== -1 ? args[baseFlagIndex + 1] : undefined;
const filteredArgs = args.filter(
  (a, i) => a !== "-t" && a !== "--live" && a !== "--base" && i !== baseFlagIndex + 1
);
const command = filteredArgs[0] ?? "dev";

const demoDir = resolve(import.meta.dirname, "..", "explainr-demo");
const contentDir = testMode ? demoDir : resolve(process.cwd());

const platforms = ["github", "vercel", "netlify"] as const;

switch (command) {
  case "dev": {
    const port = Number(filteredArgs[1]) || 3001;
    if (testMode) console.log(`Using built-in demo: ${demoDir}`);
    await startServer(contentDir, port, liveMode);
    break;
  }
  case "build": {
    const platformArg = filteredArgs[1] as Platform;
    const platform = platforms.includes(platformArg as any) ? platformArg : null;
    const outDirArg = platform ? filteredArgs[2] : filteredArgs[1];
    const outDir = outDirArg ? resolve(outDirArg) : resolve(contentDir, "dist");

    if (testMode) console.log(`Using built-in demo: ${demoDir}`);
    await build({ contentDir, outDir, platform, basePath });
    break;
  }
  default:
    console.log(`explainr — turn Markdown into interactive websites

Usage:
  explainr                        Start dev server (serves current directory)
  explainr dev [port]             Start dev server on specified port (default: 3001)
  explainr build [out]            Build static site to directory (default: ./dist)
  explainr build github [out]     Build for GitHub Pages (.nojekyll + Actions workflow)
  explainr build vercel [out]     Build for Vercel (vercel.json)
  explainr build netlify [out]    Build for Netlify (netlify.toml)

Options:
  -t                              Use built-in demo content for testing
  --live                          Enable live server mode (native Python execution, file uploads)
  --base <path>                   Set base path for GitHub Pages project sites
                                  (e.g., --base /my-repo/)`);
}
