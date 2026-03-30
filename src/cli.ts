#!/usr/bin/env bun

import { resolve } from "path";
import { runTui } from "./tui";

function openBrowser(url: string) {
  const cmd = process.platform === "darwin" ? "open"
    : process.platform === "win32" ? "start"
    : "xdg-open";
  Bun.spawn([cmd, url], { stdout: "ignore", stderr: "ignore" });
}

const result = await runTui();

if (result.command === "quit") {
  process.exit(0);
}

if (result.command === "update") {
  const readrunRoot = resolve(import.meta.dirname, "..");
  console.log("Installing dependencies...\n");
  const proc = Bun.spawn(["bun", "install"], {
    cwd: readrunRoot,
    stdout: "inherit",
    stderr: "inherit",
  });
  await proc.exited;
  if (proc.exitCode === 0) {
    console.log("\nDependencies updated. Restart readrun to use the latest version.");
  } else {
    console.error("\nFailed to install dependencies.");
    process.exit(1);
  }
  process.exit(0);
}

const docsDir = resolve(import.meta.dirname, "..", "readrun-docs");
const contentDir = result.testMode ? docsDir : result.contentDir;

switch (result.command) {
  case "dev": {
    const { startServer } = await import("./server");
    const port = result.port || 3001;
    await startServer({ contentDir, port });
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
}
