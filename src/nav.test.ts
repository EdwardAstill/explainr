import { describe, it, expect, afterEach } from "bun:test";
import { buildNavTree } from "./nav";
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
