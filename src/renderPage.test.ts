import { describe, it, expect, afterEach } from "bun:test";
import { mkdtemp, mkdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { buildNavTree } from "./nav";
import { getSiteIndex, invalidateSiteIndex } from "./siteIndex";
import { defaultConfig } from "./config";
import { renderPage } from "./renderPage";

async function makeTempRepo(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "rr-renderpage-test-"));
  for (const [rel, content] of Object.entries(files)) {
    const full = join(dir, rel);
    await mkdir(full.slice(0, full.lastIndexOf("/")), { recursive: true });
    await Bun.write(full, content);
  }
  return dir;
}

describe("renderPage nav dispatch", () => {
  const dirs: string[] = [];

  afterEach(async () => {
    for (const d of dirs.splice(0)) {
      invalidateSiteIndex(d);
      await rm(d, { recursive: true, force: true });
    }
  });

  it("renders nav-tree class when no .readrun/nav.yaml exists", async () => {
    const dir = await makeTempRepo({ "intro.md": "# Intro" });
    dirs.push(dir);
    const tree = await buildNavTree(dir);
    const siteIndex = await getSiteIndex(dir);
    const { html } = await renderPage({
      contentDir: dir,
      pagePath: "/intro",
      source: "# Intro",
      siteIndex,
      config: defaultConfig,
      embeddedFiles: [],
      tree,
    });
    expect(html).toContain('class="sidebar-nav nav-tree"');
  });

  it("renders rr-panes class when .readrun/nav.yaml has panes: 3", async () => {
    const dir = await makeTempRepo({
      ".readrun/nav.yaml": "panes: 3",
      "courses/ai/intro.md": "# Intro",
    });
    dirs.push(dir);
    const tree = await buildNavTree(dir);
    const siteIndex = await getSiteIndex(dir);
    const { html } = await renderPage({
      contentDir: dir,
      pagePath: "/courses/ai/intro",
      source: "# Intro",
      siteIndex,
      config: defaultConfig,
      embeddedFiles: [],
      tree,
    });
    expect(html).toContain('class="sidebar-nav rr-panes"');
    expect(html).toContain('data-panes="3"');
  });

  it("injects rr-nav-config JSON script in body", async () => {
    const dir = await makeTempRepo({
      ".readrun/nav.yaml": "panes: 2",
      "intro.md": "# Intro",
    });
    dirs.push(dir);
    const tree = await buildNavTree(dir);
    const siteIndex = await getSiteIndex(dir);
    const { html } = await renderPage({
      contentDir: dir,
      pagePath: "/intro",
      source: "# Intro",
      siteIndex,
      config: defaultConfig,
      embeddedFiles: [],
      tree,
    });
    expect(html).toMatch(/<script id="rr-nav-config" type="application\/json">/);
    expect(html).toContain('"mode":"panes"');
    expect(html).toContain('"panes":2');
  });

  it("injects rr-nav-config with mode:tree when no nav.yaml", async () => {
    const dir = await makeTempRepo({ "intro.md": "# Intro" });
    dirs.push(dir);
    const tree = await buildNavTree(dir);
    const siteIndex = await getSiteIndex(dir);
    const { html } = await renderPage({
      contentDir: dir,
      pagePath: "/intro",
      source: "# Intro",
      siteIndex,
      config: defaultConfig,
      embeddedFiles: [],
      tree,
    });
    expect(html).toMatch(/<script id="rr-nav-config" type="application\/json">/);
    expect(html).toContain('"mode":"tree"');
  });
});
