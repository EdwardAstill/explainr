#!/usr/bin/env bun

import { resolve } from "path";
import { runTui } from "./tui";

const args = process.argv.slice(2);

function openBrowser(url: string) {
  const cmd = process.platform === "darwin" ? "open"
    : process.platform === "win32" ? "start"
    : "xdg-open";
  Bun.spawn([cmd, url], { stdout: "ignore", stderr: "ignore" });
}

// If no arguments, launch the interactive TUI
if (args.includes("--help") || args.includes("-h")) {
  console.log(`explainr — turn Markdown into interactive websites

Usage:
  explainr                        Launch interactive TUI
  explainr dev [port]             Start dev server on specified port (default: 3001)
  explainr build [out]            Build static site to directory (default: ./dist)
  explainr build github [out]     Build for GitHub Pages (.nojekyll + Actions workflow)
  explainr build vercel [out]     Build for Vercel (vercel.json)
  explainr build netlify [out]    Build for Netlify (netlify.toml)

Options:
  -t                              Use built-in demo content for testing
  -t --live                       Use live demo (includes .explainr/files/ with sample data)
  --live                          Enable live server mode (native Python execution, file uploads)
  --guide                         Open the explainr documentation in your browser
  --base <path>                   Set base path for GitHub Pages project sites
                                  (e.g., --base /my-repo/)`);
  process.exit(0);
} else if (args.length === 0 && process.stdin.isTTY) {
  const result = await runTui();

  if (result.command === "quit") {
    process.exit(0);
  }

  if (result.command === "update") {
    const explainrRoot = resolve(import.meta.dirname, "..");
    console.log("Installing dependencies...\n");
    const proc = Bun.spawn(["bun", "install"], {
      cwd: explainrRoot,
      stdout: "inherit",
      stderr: "inherit",
    });
    await proc.exited;
    if (proc.exitCode === 0) {
      console.log("\nDependencies updated. Restart explainr to use the latest version.");
    } else {
      console.error("\nFailed to install dependencies.");
      process.exit(1);
    }
    process.exit(0);
  }

  const demoDir = resolve(import.meta.dirname, "..", result.testMode && result.liveMode ? "explainr-demo-live" : "explainr-demo");
  const guideDir = resolve(import.meta.dirname, "..", "docs");
  const contentDir = result.command === "guide" ? guideDir : result.testMode ? demoDir : result.contentDir;

  switch (result.command) {
    case "dev": {
      const { startServer } = await import("./server");
      const port = result.port || 3001;
      if (result.testMode) console.log(`Using built-in demo: ${demoDir}`);
      await startServer(contentDir, port, result.liveMode || false);
      openBrowser(`http://localhost:${port}`);
      break;
    }
    case "build": {
      const { build } = await import("./build");
      await build({
        contentDir,
        outDir: result.outDir || resolve(contentDir, "dist"),
        platform: result.platform || null,
        basePath: result.basePath,
      });
      break;
    }
    case "guide": {
      const { startServer } = await import("./server");
      console.log("Opening explainr guide...");
      const port = 3001;
      await startServer(contentDir, port, false);
      openBrowser(`http://localhost:${port}`);
      break;
    }
  }
} else {
  // CLI mode — parse flags as before
  const testMode = args.includes("-t");
  const liveMode = args.includes("--live");
  const guideMode = args.includes("--guide");
  const baseFlagIndex = args.indexOf("--base");
  const basePath = baseFlagIndex !== -1 ? args[baseFlagIndex + 1] : undefined;
  const filteredArgs = args.filter(
    (a, i) => a !== "-t" && a !== "--live" && a !== "--guide" && a !== "--base" && i !== baseFlagIndex + 1
  );
  const command = guideMode ? "dev" : (filteredArgs[0] ?? "dev");

  const demoName = testMode && liveMode ? "explainr-demo-live" : "explainr-demo";
  const demoDir = resolve(import.meta.dirname, "..", demoName);
  const guideDir = resolve(import.meta.dirname, "..", "docs");
  const contentDir = guideMode ? guideDir : testMode ? demoDir : resolve(process.cwd());

  const platforms = ["github", "vercel", "netlify"] as const;

  switch (command) {
    case "dev": {
      const { startServer } = await import("./server");
      const port = Number(filteredArgs[1]) || 3001;
      if (guideMode) console.log(`Opening explainr guide...`);
      else if (testMode) console.log(`Using built-in demo: ${demoDir}`);
      await startServer(contentDir, port, liveMode);
      if (guideMode) openBrowser(`http://localhost:${port}`);
      break;
    }
    case "build": {
      const { build } = await import("./build");
      const platformArg = filteredArgs[1] as "github" | "vercel" | "netlify";
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
  explainr                        Launch interactive TUI
  explainr dev [port]             Start dev server on specified port (default: 3001)
  explainr build [out]            Build static site to directory (default: ./dist)
  explainr build github [out]     Build for GitHub Pages (.nojekyll + Actions workflow)
  explainr build vercel [out]     Build for Vercel (vercel.json)
  explainr build netlify [out]    Build for Netlify (netlify.toml)

Options:
  -t                              Use built-in demo content for testing
  -t --live                       Use live demo (includes .explainr/files/ with sample data)
  --live                          Enable live server mode (native Python execution, file uploads)
  --guide                         Open the explainr documentation in your browser
  --base <path>                   Set base path for GitHub Pages project sites
                                  (e.g., --base /my-repo/)`);
  }
}
