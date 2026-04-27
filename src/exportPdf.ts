// Export every page of a built static site to PDF via headless system
// Chromium. Detects the binary at runtime; never bundles one. Caller
// has already built the static site; this module starts a local
// static server and prints each page.

import { spawn } from "bun";
import { join, dirname } from "path";
import { mkdir } from "fs/promises";

const CHROMIUM_CANDIDATES = [
  "chromium",
  "chromium-browser",
  "google-chrome",
  "google-chrome-stable",
  "chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
];

async function which(bin: string): Promise<boolean> {
  try {
    const proc = spawn({ cmd: ["which", bin], stdout: "pipe", stderr: "pipe" });
    return (await proc.exited) === 0;
  } catch {
    return false;
  }
}

export async function detectChromium(): Promise<string | null> {
  for (const c of CHROMIUM_CANDIDATES) {
    if (c.startsWith("/")) {
      if (await Bun.file(c).exists()) return c;
    } else if (await which(c)) {
      return c;
    }
  }
  return null;
}

export function chromiumInstallHints(): string {
  return [
    "No chromium binary found. Install one of:",
    "  Arch:    sudo pacman -S chromium",
    "  Debian:  sudo apt install chromium",
    "  macOS:   brew install --cask chromium  (or use installed Google Chrome)",
    "  Windows: install Google Chrome from https://www.google.com/chrome/",
  ].join("\n");
}

export interface PdfExportOptions {
  chromium: string;
  baseUrl: string;            // e.g. http://localhost:3002
  pages: { url: string; relPath: string }[];   // url is /notes/topic, relPath is notes/topic
  outDir: string;             // pdf output root
}

export interface PdfExportResult {
  written: string[];
  failed: { page: string; reason: string }[];
}

export async function exportPagesAsPdf(opts: PdfExportOptions): Promise<PdfExportResult> {
  const { chromium, baseUrl, pages, outDir } = opts;
  const written: string[] = [];
  const failed: { page: string; reason: string }[] = [];

  for (const page of pages) {
    const target = `${baseUrl}${page.url}`;
    const outPath = join(outDir, page.relPath + ".pdf");
    await mkdir(dirname(outPath), { recursive: true });

    const proc = spawn({
      cmd: [
        chromium,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--virtual-time-budget=3000",
        "--print-to-pdf-no-header",
        `--print-to-pdf=${outPath}`,
        target,
      ],
      stdout: "pipe",
      stderr: "pipe",
    });

    const code = await proc.exited;
    if (code === 0 && (await Bun.file(outPath).exists())) {
      written.push(outPath);
    } else {
      const errBuf = proc.stderr instanceof ReadableStream ? await new Response(proc.stderr).text() : "";
      failed.push({ page: page.url, reason: `chromium exited ${code}: ${errBuf.slice(0, 200)}` });
    }
  }

  return { written, failed };
}
