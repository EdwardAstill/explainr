import { describe, expect, test } from "bun:test";
import { renderMarkdown, resolveFileReferences } from "./markdown";
import { mkdtemp, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

describe("markdown tables", () => {
  test("wraps tables and labels cells for responsive display modes", () => {
    const html = renderMarkdown(`
| Item | Status |
| --- | --- |
| Weld group elastic demand | verified |
`);

    expect(html).toContain('<div class="rr-table-wrap"');
    expect(html).toContain('<table class="rr-table"');
    expect(html).toContain('data-label="Item"');
    expect(html).toContain('data-label="Status"');
  });

  test("supports a per-table scroll-only directive", () => {
    const html = renderMarkdown(`
<!-- rr-table: scroll -->
| Item | Status |
| --- | --- |
| Weld group elastic demand | verified |
`);

    expect(html).toContain('<div class="rr-table-wrap" data-table-mode="scroll" tabindex="0">');
  });

  test("supports a per-table sticky directive", () => {
    const html = renderMarkdown(`
<!-- rr-table: sticky -->
| Item | Status |
| --- | --- |
| Weld group elastic demand | verified |
`);

    expect(html).toContain('<div class="rr-table-wrap" data-table-mode="sticky" tabindex="0">');
  });
});

describe("resolveFileReferences — viewer blocks", () => {
  async function makeContentDir(files: Record<string, string>): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), "rr-test-"));
    const filesDir = join(dir, ".readrun", "files");
    await mkdir(filesDir, { recursive: true });
    for (const [name, content] of Object.entries(files)) {
      await writeFile(join(filesDir, name), content);
    }
    const scriptsDir = join(dir, ".readrun", "scripts");
    const imagesDir = join(dir, ".readrun", "images");
    await mkdir(scriptsDir, { recursive: true });
    await mkdir(imagesDir, { recursive: true });
    return dir;
  }

  test("[pdf=doc.pdf] resolves to iframe HTML", async () => {
    const contentDir = await makeContentDir({ "doc.pdf": "%PDF-1.4" });
    const scriptsDir = join(contentDir, ".readrun", "scripts");
    const imagesDir = join(contentDir, ".readrun", "images");
    const result = await resolveFileReferences("[pdf=doc.pdf]", scriptsDir, imagesDir, contentDir);
    expect(result).toContain("<iframe");
    expect(result).toContain("/_readrun/files/doc.pdf");
  });

  test("[audio=talk.mp3] resolves to audio element", async () => {
    const contentDir = await makeContentDir({ "talk.mp3": "fake-mp3" });
    const scriptsDir = join(contentDir, ".readrun", "scripts");
    const imagesDir = join(contentDir, ".readrun", "images");
    const result = await resolveFileReferences("[audio=talk.mp3]", scriptsDir, imagesDir, contentDir);
    expect(result).toContain("<audio");
  });

  test("[video=demo.mp4] resolves to video element", async () => {
    const contentDir = await makeContentDir({ "demo.mp4": "fake-mp4" });
    const scriptsDir = join(contentDir, ".readrun", "scripts");
    const imagesDir = join(contentDir, ".readrun", "images");
    const result = await resolveFileReferences("[video=demo.mp4]", scriptsDir, imagesDir, contentDir);
    expect(result).toContain("<video");
  });

  test("[stl=bracket.stl] resolves to model-viewer div", async () => {
    const contentDir = await makeContentDir({ "bracket.stl": "solid\nendsolid" });
    const scriptsDir = join(contentDir, ".readrun", "scripts");
    const imagesDir = join(contentDir, ".readrun", "images");
    const result = await resolveFileReferences("[stl=bracket.stl]", scriptsDir, imagesDir, contentDir);
    expect(result).toContain('class="model-viewer"');
    expect(result).toContain('data-format="stl"');
  });

  test("[model=scene.glb] resolves to model-viewer div", async () => {
    const contentDir = await makeContentDir({ "scene.glb": "glTF" });
    const scriptsDir = join(contentDir, ".readrun", "scripts");
    const imagesDir = join(contentDir, ".readrun", "images");
    const result = await resolveFileReferences("[model=scene.glb]", scriptsDir, imagesDir, contentDir);
    expect(result).toContain('class="model-viewer"');
    expect(result).toContain('data-format="glb"');
  });

  test("[csv=data.csv] resolves to csv-viewer with embedded JSON", async () => {
    const contentDir = await makeContentDir({ "data.csv": "name,value\nAlpha,1240" });
    const scriptsDir = join(contentDir, ".readrun", "scripts");
    const imagesDir = join(contentDir, ".readrun", "images");
    const result = await resolveFileReferences("[csv=data.csv]", scriptsDir, imagesDir, contentDir);
    expect(result).toContain('class="csv-viewer"');
    expect(result).toContain('"headers":["name","value"]');
  });

  test("[csv=../etc/passwd] produces viewer-error, not crash", async () => {
    const contentDir = await makeContentDir({});
    const scriptsDir = join(contentDir, ".readrun", "scripts");
    const imagesDir = join(contentDir, ".readrun", "images");
    const result = await resolveFileReferences("[csv=../etc/passwd]", scriptsDir, imagesDir, contentDir);
    expect(result).toContain("viewer-error");
    expect(result).not.toContain('class="csv-viewer"');
  });
});
