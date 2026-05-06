// Shared per-page render pipeline used by both the dev server and the static
// builder. Reads source, resolves file refs, expands queries, rewrites
// wikilinks, renders to HTML, builds nav/TOC/backlinks/tags, and stitches
// everything through htmlPage.

import { join } from "path";
import {
  renderMarkdown,
  resolveFileReferences,
  extractToc,
} from "./markdown";
import { rewriteWikilinks } from "./wikilinks";
import { expandQueryBlocks } from "./queryBlock";
import { renderNav, renderPanesNav, type NavNode } from "./nav";
import { htmlPage, type EmbeddedFile, type PageMeta } from "./template";
import { extractTitle } from "./utils";
import { parseFrontmatter } from "./frontmatter";
import type { ReadrunConfig } from "./config";
import type { SiteIndex } from "./siteIndex";
import { loadNavConfig, type NavConfigLoad } from "./navConfig";

export interface RenderPageOptions {
  contentDir: string;
  pagePath: string; // URL path WITH leading slash, e.g. /notes/intro
  source: string;
  siteIndex: SiteIndex;
  config: ReadrunConfig;
  embeddedFiles: EmbeddedFile[];
  tree: NavNode[];
  basePath?: string;
  fallbackTitle?: string;
  navConfig?: NavConfigLoad;
}

export interface RenderedPage {
  html: string;
  title: string;
}

export async function renderPage(opts: RenderPageOptions): Promise<RenderedPage> {
  const { contentDir, pagePath, source, siteIndex, config, embeddedFiles, tree, basePath, fallbackTitle } = opts;

  const navCfg = opts.navConfig ?? await loadNavConfig(contentDir);

  const scriptsDir = join(contentDir, ".readrun", "scripts");
  const imagesDir = join(contentDir, ".readrun", "images");

  const { fm, body } = parseFrontmatter(source);
  const titleFromBody = extractTitle(source, fallbackTitle ?? pagePath.split("/").pop() ?? "readrun");
  const title = fm.title ?? titleFromBody;

  const resolved = await resolveFileReferences(source, scriptsDir, imagesDir, contentDir);
  const queried = expandQueryBlocks(resolved, siteIndex);
  const linked = rewriteWikilinks(queried, { byKey: siteIndex.byKey, all: siteIndex.all });
  const rendered = renderMarkdown(linked);
  const toc = extractToc(linked);

  const sitePage = siteIndex.byUrl.get(pagePath);
  const tags = sitePage?.tags ?? fm.tags ?? [];
  const backlinks = (siteIndex.backlinks.get(pagePath) ?? []).map((p) => ({ url: p.url, title: p.title }));
  const pageMeta: PageMeta = { tags, backlinks };

  const useTreeMode =
    navCfg.config.mode !== "panes" ||
    typeof navCfg.config.panes !== "number" ||
    navCfg.config.panes < 2 ||
    navCfg.config.panes > 4;

  const nav = useTreeMode
    ? renderNav(tree, pagePath)
    : renderPanesNav(tree, pagePath, { panes: navCfg.config.panes, labels: navCfg.config.labels });

  const navConfigJson = JSON.stringify(navCfg.config);
  const html = htmlPage(nav, rendered, title, basePath, config, embeddedFiles, toc, pageMeta, navConfigJson);

  // Reference body so the linter knows we honour parseFrontmatter's other side.
  void body;

  return { html, title };
}
