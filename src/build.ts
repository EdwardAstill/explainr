import { join, dirname } from "path";
import { mkdir } from "fs/promises";
import { ensureMarkdownReady } from "./markdown";
import { getSiteIndex } from "./siteIndex";
import { tagsIndexBody, tagPageBody, statsBody } from "./synthetic-pages";
import { buildSearchIndex } from "./searchIndex";
import { getClientJs, getClientCss } from "./clientBundle";
import { buildNavTree, renderNav, type NavNode } from "./nav";
import { htmlPage } from "./template";
import { findFirstFile, listEmbeddedFiles } from "./utils";
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
  await ensureMarkdownReady();
  const tree = await buildNavTree(contentDir);
  const pages = collectPages(tree);
  const embeddedFiles = await listEmbeddedFiles(contentDir);
  if (embeddedFiles.length > 0) {
    // Copy files into dist/_readrun/files/ for runtime fetch
    const distFilesDir = join(outDir, "_readrun", "files");
    await mkdir(distFilesDir, { recursive: true });
    const srcFilesDir = join(contentDir, ".readrun", "files");
    for (const f of embeddedFiles) {
      const data = await Bun.file(join(srcFilesDir, f.name)).bytes();
      await Bun.write(join(distFilesDir, f.name), data);
    }
    console.log(`  Copied ${embeddedFiles.length} file(s) into _readrun/files/`);
  }
  const siteIdx = await getSiteIndex(contentDir);

  if (pages.length === 0) {
    console.log("No .md files found.");
    return;
  }

  const firstPage = findFirstFile(tree);

  for (const page of pages) {
    const mdPath = join(contentDir, page.path + ".md");

    try {
      const source = await Bun.file(mdPath).text();
      const { renderPage } = await import("./renderPage");
      const { html } = await renderPage({
        contentDir,
        pagePath: page.path,
        source,
        siteIndex: siteIdx,
        config,
        embeddedFiles,
        tree,
        basePath,
        fallbackTitle: page.name,
      });

      const outPath = join(outDir, page.path, "index.html");
      await mkdir(dirname(outPath), { recursive: true });
      await Bun.write(outPath, html);
      console.log(`  ${page.path}/index.html`);
    } catch (err) {
      console.error(`  Error building ${page.path}:`, err);
    }
  }

  // Synthetic pages
  await emitSyntheticPage(outDir, "/tags", tagsIndexBody(siteIdx), tree, basePath, config, embeddedFiles);
  for (const tag of siteIdx.tags.keys()) {
    const body = tagPageBody(siteIdx, tag);
    if (body) await emitSyntheticPage(outDir, `/tags/${tag}`, body, tree, basePath, config, embeddedFiles);
  }
  await emitSyntheticPage(outDir, "/__stats", statsBody(siteIdx), tree, basePath, config, embeddedFiles);

  // Search index + client bundle
  await mkdir(join(outDir, "_readrun"), { recursive: true });
  await Bun.write(join(outDir, "_readrun", "search-index.json"), JSON.stringify(buildSearchIndex(siteIdx)));
  console.log(`  _readrun/search-index.json`);
  await Bun.write(join(outDir, "_readrun", "client.js"), getClientJs());
  await Bun.write(join(outDir, "_readrun", "client.css"), getClientCss());
  console.log(`  _readrun/client.js`);
  console.log(`  _readrun/client.css`);

  // Index redirect
  if (firstPage) {
    const base = basePath?.replace(/\/$/, "") ?? "";
    const redirectUrl = base + firstPage;
    const indexHtml = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${redirectUrl}"></head></html>`;
    await Bun.write(join(outDir, "index.html"), indexHtml);
    console.log(`  index.html -> ${firstPage}`);
  }

  // Platform-specific files
  if (platform) {
    await writePlatformFiles(outDir, platform, basePath);
  }

  console.log(`\nBuilt ${pages.length} pages.`);
}

async function emitSyntheticPage(
  outDir: string,
  urlPath: string,
  body: { title: string; html: string },
  tree: NavNode[],
  basePath: string | undefined,
  config: any,
  embeddedFiles: any[],
): Promise<void> {
  const nav = renderNav(tree, urlPath);
  const html = htmlPage(nav, body.html, body.title, basePath, config, embeddedFiles, [], {});
  const outPath = join(outDir, urlPath, "index.html");
  await mkdir(dirname(outPath), { recursive: true });
  await Bun.write(outPath, html);
  console.log(`  ${urlPath}/index.html`);
}

async function writePlatformFiles(outDir: string, platform: Platform, _basePath?: string) {
  switch (platform) {
    case "github": {
      // .nojekyll prevents GitHub Pages from processing with Jekyll
      await Bun.write(join(outDir, ".nojekyll"), "");
      console.log(`  .nojekyll`);

      // Generate GitHub Actions workflow
      const workflowDir = join(outDir, ".github", "workflows");
      await mkdir(workflowDir, { recursive: true });
      await Bun.write(join(workflowDir, "deploy.yml"), githubActionsWorkflow());
      console.log(`  .github/workflows/deploy.yml`);
      break;
    }
    case "vercel": {
      const config = {
        buildCommand: "bunx rr build vercel",
        outputDirectory: "dist",
      };
      await Bun.write(join(outDir, "vercel.json"), JSON.stringify(config, null, 2) + "\n");
      console.log(`  vercel.json`);
      break;
    }
    case "netlify": {
      const toml = `[build]
  command = "bunx rr build netlify"
  publish = "dist"
`;
      await Bun.write(join(outDir, "netlify.toml"), toml);
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
