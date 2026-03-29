import { join, dirname } from "path";
import { readFile, readdir, mkdir, writeFile } from "fs/promises";
import { renderMarkdown, resolveFileReferences, extractToc } from "./markdown";
import { buildNavTree, renderNav, type NavNode } from "./nav";
import { htmlPage, type EmbeddedFile } from "./template";
import { extractTitle, findFirstFile } from "./utils";
import { loadConfig } from "./config";

export type Platform = "github" | "vercel" | "netlify" | null;

export interface BuildOptions {
  contentDir: string;
  outDir: string;
  platform: Platform;
  basePath?: string;
}

export async function build(options: BuildOptions) {
  const { contentDir, outDir, platform, basePath } = options;

  console.log(`Building static site...`);
  console.log(`  Content:  ${contentDir}`);
  console.log(`  Output:   ${outDir}`);
  if (platform) console.log(`  Platform: ${platform}`);
  if (basePath) console.log(`  Base path: ${basePath}`);

  const config = await loadConfig();
  const scriptsDir = join(contentDir, ".readrun", "scripts");
  const imagesDir = join(contentDir, ".readrun", "images");
  const tree = await buildNavTree(contentDir);
  const pages = collectPages(tree);
  const embeddedFiles = await loadEmbeddedFiles(contentDir);

  if (pages.length === 0) {
    console.log("No .md files found.");
    return;
  }

  const firstPage = findFirstFile(tree);

  for (const page of pages) {
    const mdPath = join(contentDir, page.path + ".md");

    try {
      const source = await readFile(mdPath, "utf-8");
      const resolved = await resolveFileReferences(source, scriptsDir, imagesDir);
      const rendered = renderMarkdown(resolved);
      const toc = extractToc(source);
      const nav = renderNav(tree, page.path);
      const title = extractTitle(source, page.name);

      const html = htmlPage(nav, rendered, title, basePath, false, config, embeddedFiles, toc);

      const outPath = join(outDir, page.path, "index.html");
      await mkdir(dirname(outPath), { recursive: true });
      await writeFile(outPath, html);
      console.log(`  ${page.path}/index.html`);
    } catch (err) {
      console.error(`  Error building ${page.path}:`, err);
    }
  }

  // Index redirect
  if (firstPage) {
    const base = basePath?.replace(/\/$/, "") ?? "";
    const redirectUrl = base + firstPage;
    const indexHtml = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${redirectUrl}"></head></html>`;
    await writeFile(join(outDir, "index.html"), indexHtml);
    console.log(`  index.html -> ${firstPage}`);
  }

  // Platform-specific files
  if (platform) {
    await writePlatformFiles(outDir, platform, basePath);
  }

  console.log(`\nBuilt ${pages.length} pages.`);
}

async function loadEmbeddedFiles(contentDir: string): Promise<EmbeddedFile[]> {
  const filesDir = join(contentDir, ".readrun", "files");
  try {
    const entries = await readdir(filesDir);
    const files: EmbeddedFile[] = [];
    for (const name of entries) {
      const content = await readFile(join(filesDir, name));
      files.push({ name, data: content.toString("base64") });
    }
    if (files.length > 0) {
      console.log(`  Embedded ${files.length} file(s) from .readrun/files/`);
    }
    return files;
  } catch {
    return [];
  }
}

async function writePlatformFiles(outDir: string, platform: Platform, basePath?: string) {
  switch (platform) {
    case "github": {
      // .nojekyll prevents GitHub Pages from processing with Jekyll
      await writeFile(join(outDir, ".nojekyll"), "");
      console.log(`  .nojekyll`);

      // Generate GitHub Actions workflow
      const workflowDir = join(outDir, ".github", "workflows");
      await mkdir(workflowDir, { recursive: true });
      await writeFile(join(workflowDir, "deploy.yml"), githubActionsWorkflow());
      console.log(`  .github/workflows/deploy.yml`);
      break;
    }
    case "vercel": {
      const config = {
        buildCommand: "bunx rr build vercel",
        outputDirectory: "dist",
      };
      await writeFile(join(outDir, "vercel.json"), JSON.stringify(config, null, 2) + "\n");
      console.log(`  vercel.json`);
      break;
    }
    case "netlify": {
      const toml = `[build]
  command = "bunx rr build netlify"
  publish = "dist"
`;
      await writeFile(join(outDir, "netlify.toml"), toml);
      console.log(`  netlify.toml`);
      break;
    }
  }
}

function githubActionsWorkflow(): string {
  return `name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1

      - run: bun install

      - run: bunx rr build github

      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

      - id: deployment
        uses: actions/deploy-pages@v4
`;
}

function collectPages(nodes: NavNode[]): NavNode[] {
  const pages: NavNode[] = [];
  for (const node of nodes) {
    if (!node.isDir) {
      pages.push(node);
    }
    if (node.children) {
      pages.push(...collectPages(node.children));
    }
  }
  return pages;
}
