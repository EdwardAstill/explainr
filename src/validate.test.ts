import { test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, mkdir, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { validateFolder } from "./validate";

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
  await write("index.md", "# Hello\n\n[python]\nprint('hi')\n[/python]\n");
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

test("errors on malformed frontmatter YAML", async () => {
  await write("bad.md", "---\ntitle: [unterminated\n---\n# body\n");
  const result = await validateFolder(tmpDir);
  expect(result.errors.some(e => e.file === "bad.md" && e.message.includes("frontmatter parse error"))).toBe(true);
});

test("warns on unknown frontmatter field", async () => {
  await write("page.md", "---\ntitle: X\nauthor: me\n---\n# body\n");
  const result = await validateFolder(tmpDir);
  expect(result.warnings.some(w => w.file === "page.md" && w.message.includes('"author"'))).toBe(true);
});

test("errors on virtual_path collision", async () => {
  await write("a.md", '---\nvirtual_path: "foo/bar"\n---\n# a\n');
  await write("b.md", '---\nvirtual_path: "foo/bar"\n---\n# b\n');
  const result = await validateFolder(tmpDir);
  expect(result.errors.some(e => e.message.includes("virtual_path") && e.message.includes("collides"))).toBe(true);
});

test("errors on wrong type for title", async () => {
  await write("num.md", "---\ntitle: 42\n---\n# body\n");
  const result = await validateFolder(tmpDir);
  expect(result.errors.some(e => e.file === "num.md" && e.message.includes("must be string"))).toBe(true);
});
