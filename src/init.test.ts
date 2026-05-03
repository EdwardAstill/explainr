import { test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, stat, readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { initReadrun } from "./init";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "readrun-init-test-"));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

test("creates .readrun subdirs when none exist", async () => {
  const result = await initReadrun(tmpDir);
  for (const d of ["images", "scripts", "files"]) {
    const s = await stat(join(tmpDir, ".readrun", d));
    expect(s.isDirectory()).toBe(true);
  }
  expect(result.created).toContain(".readrun/images");
  expect(result.created).toContain(".readrun/scripts");
  expect(result.created).toContain(".readrun/files");
});

test("creates .readrun/.ignore when absent", async () => {
  await initReadrun(tmpDir);
  const content = await readFile(join(tmpDir, ".readrun", ".ignore"), "utf-8");
  expect(content).toContain("one pattern per line");
});

test("is additive — does not overwrite existing .ignore", async () => {
  const readrunDir = join(tmpDir, ".readrun");
  await import("fs/promises").then(fs => fs.mkdir(readrunDir, { recursive: true }));
  await Bun.write(join(readrunDir, ".ignore"), "my-custom-ignore");

  const result = await initReadrun(tmpDir);
  const content = await readFile(join(readrunDir, ".ignore"), "utf-8");
  expect(content).toBe("my-custom-ignore");
  expect(result.existing).toContain(".readrun/.ignore");
});

test("reports existing dirs as already present", async () => {
  await initReadrun(tmpDir);
  const result = await initReadrun(tmpDir);
  expect(result.created).toHaveLength(0);
  expect(result.existing.length).toBeGreaterThan(0);
});

test("creates .readrun/virtual-paths.yaml on init", async () => {
  const result = await initReadrun(tmpDir);
  expect(result.created).toContain(".readrun/virtual-paths.yaml");
  const content = await readFile(join(tmpDir, ".readrun", "virtual-paths.yaml"), "utf-8");
  expect(content).toContain("include:");
  expect(content).toContain("exclude:");
  expect(content).toContain("mappings:");
});

test("reports virtual-paths.yaml as existing on second init", async () => {
  await initReadrun(tmpDir);
  const result = await initReadrun(tmpDir);
  expect(result.existing).toContain(".readrun/virtual-paths.yaml");
});
