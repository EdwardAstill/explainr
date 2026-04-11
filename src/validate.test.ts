import { test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, mkdir, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { validateFolder, type ValidationResult } from "./validate";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "readrun-validate-test-"));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

async function write(rel: string, content: string) {
  const full = join(tmpDir, rel);
  await mkdir(join(full, ".."), { recursive: true });
  await writeFile(full, content);
}

test("clean project produces no issues", async () => {
  await write(".readrun/scripts/demo.py", "print('hello')");
  await write("index.md", "# Hello\n\n:::python\nprint('hi')\n:::\n");
  const result = await validateFolder(tmpDir);
  expect(result.errors).toHaveLength(0);
  expect(result.warnings).toHaveLength(0);
});

test("detects unclosed ::: block", async () => {
  await write("index.md", "# Hello\n\n:::python\nprint('hi')\n");
  const result = await validateFolder(tmpDir);
  expect(result.errors.some(e => e.message.includes("unclosed") && e.file === "index.md")).toBe(true);
});

test("detects unclosed fenced code block", async () => {
  await write("index.md", "# Hello\n\n```python\nprint('hi')\n");
  const result = await validateFolder(tmpDir);
  expect(result.errors.some(e => e.message.includes("unclosed") && e.file === "index.md")).toBe(true);
});

test("detects malformed heading", async () => {
  await write("index.md", "#BadHeading\n\nsome text\n");
  const result = await validateFolder(tmpDir);
  expect(result.warnings.some(w => w.message.includes("heading") && w.file === "index.md")).toBe(true);
});

test("warns on unknown block identifier", async () => {
  await write("index.md", "# Hello\n\n:::mermaid\ngraph LR\n:::\n");
  const result = await validateFolder(tmpDir);
  expect(result.warnings.some(w => w.message.includes("mermaid") && w.file === "index.md")).toBe(true);
});

test("errors on missing file reference", async () => {
  await write("index.md", "# Hello\n\n:::missing.py\n:::\n");
  const result = await validateFolder(tmpDir);
  expect(result.errors.some(e => e.message.includes("missing.py") && e.file === "missing.py")).toBe(true);
});

test("resolves valid file reference in scripts/", async () => {
  await write(".readrun/scripts/plot.py", "import matplotlib");
  await write("index.md", "# Hello\n\n:::plot.py\n:::\n");
  const result = await validateFolder(tmpDir);
  expect(result.errors).toHaveLength(0);
});

test("warns on unexpected .readrun/ subdir", async () => {
  await mkdir(join(tmpDir, ".readrun", "cache"), { recursive: true });
  const result = await validateFolder(tmpDir);
  expect(result.warnings.some(w => w.message.includes("cache"))).toBe(true);
});

test("errors when file ref target is missing", async () => {
  await write("index.md", "# Hello\n\n:::demo.py\n:::\n");
  const result = await validateFolder(tmpDir);
  expect(result.errors.some(e => e.message.includes("demo.py"))).toBe(true);
});
