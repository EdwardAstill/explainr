import { describe, it, expect, afterEach } from "bun:test";
import { buildNavTree, renderPanesNav } from "./nav";
import { invalidateSiteIndex } from "./siteIndex";
import { mkdtemp, rm, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

async function makeTempRepo(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "rr-nav-test-"));
  for (const [rel, content] of Object.entries(files)) {
    const full = join(dir, rel);
    await mkdir(full.slice(0, full.lastIndexOf("/")), { recursive: true });
    await Bun.write(full, content);
  }
  return dir;
}

describe("renderPanesNav", () => {
  const dirs: string[] = [];
  afterEach(async () => {
    for (const d of dirs.splice(0)) {
      invalidateSiteIndex(d);
      await rm(d, { recursive: true, force: true });
    }
  });

  it("renders N pane wrappers with data-pane-depth attributes", async () => {
    const dir = await makeTempRepo({
      "courses/ai/intro.md": "# Intro",
      "courses/math/vectors.md": "# Vectors",
      "units/ai/embeddings.md": "# Emb",
    });
    dirs.push(dir);
    const tree = await buildNavTree(dir);
    const html = renderPanesNav(tree, "/courses/ai/intro", { panes: 3 });
    expect(html).toContain('data-pane-depth="0"');
    expect(html).toContain('data-pane-depth="1"');
    expect(html).toContain('data-pane-depth="2"');
    expect(html).not.toContain('data-pane-depth="3"');
  });

  it("emits items with searchable text in data attribute for client-side reorder", async () => {
    const dir = await makeTempRepo({ "courses/ai/intro.md": "# Intro" });
    dirs.push(dir);
    const tree = await buildNavTree(dir);
    const html = renderPanesNav(tree, "/courses/ai/intro", { panes: 2 });
    expect(html).toMatch(/data-search-label="[^"]+"/);
  });

  it("marks the active path with aria-current on every ancestor pane row", async () => {
    const dir = await makeTempRepo({ "courses/ai/intro.md": "# Intro" });
    dirs.push(dir);
    const tree = await buildNavTree(dir);
    const html = renderPanesNav(tree, "/courses/ai/intro", { panes: 3 });
    expect((html.match(/aria-current/g) || []).length).toBeGreaterThanOrEqual(3);
  });

  it("uses the rr-panes wrapper class with data-panes attribute", async () => {
    const dir = await makeTempRepo({ "courses/ai/intro.md": "# Intro" });
    dirs.push(dir);
    const tree = await buildNavTree(dir);
    const html = renderPanesNav(tree, "/courses/ai/intro", { panes: 3 });
    expect(html).toContain('class="sidebar-nav rr-panes"');
    expect(html).toContain('data-panes="3"');
  });

  it("does not throw on empty tree", () => {
    const html = renderPanesNav([], "/", { panes: 3 });
    expect(html).toContain('rr-panes');
  });

  it("uses aria-current=\"page\" only on the active file, aria-current=\"true\" on ancestor dirs", async () => {
    const dir = await makeTempRepo({ "courses/ai/intro.md": "# Intro" });
    dirs.push(dir);
    const tree = await buildNavTree(dir);
    const html = renderPanesNav(tree, "/courses/ai/intro", { panes: 3 });
    expect((html.match(/aria-current="page"/g) || []).length).toBe(1);
    expect((html.match(/aria-current="true"/g) || []).length).toBeGreaterThanOrEqual(1);
  });
});

describe("buildNavTree with manifest", () => {
  const dirs: string[] = [];
  afterEach(async () => {
    for (const d of dirs.splice(0)) {
      invalidateSiteIndex(d);
      await rm(d, { recursive: true, force: true });
    }
  });

  it("shows all pages when no manifest exists", async () => {
    const dir = await makeTempRepo({
      "courses/intro.md": "# Intro",
      "docs/planning.md": "# Planning",
    });
    dirs.push(dir);
    const tree = await buildNavTree(dir);
    const flat = JSON.stringify(tree);
    expect(flat).toContain("intro");
    expect(flat).toContain("planning");
  });

  it("excludes pages matching manifest exclude patterns from the nav tree", async () => {
    const dir = await makeTempRepo({
      "courses/intro.md": "# Intro",
      "docs/planning.md": "# Planning",
      ".readrun/virtual-paths.yaml": "exclude:\n  - docs/**\n",
    });
    dirs.push(dir);
    const tree = await buildNavTree(dir);
    const flat = JSON.stringify(tree);
    expect(flat).toContain("intro");
    expect(flat).not.toContain("planning");
  });

  it("remaps page positions in nav tree via manifest mappings", async () => {
    const dir = await makeTempRepo({
      "courses/intro.md": "# Intro",
      "courses/advanced.md": "# Advanced",
      ".readrun/virtual-paths.yaml": "mappings:\n  courses: Learning\n",
    });
    dirs.push(dir);
    const tree = await buildNavTree(dir);
    const topLevelNames = tree.map((n) => n.name);
    expect(topLevelNames).toContain("Learning");
    expect(topLevelNames).not.toContain("courses");
  });
});
