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

test("detects unclosed [block]", async () => {
  await write("index.md", "# Hello\n\n[python]\nprint('hi')\n");
  const result = await validateFolder(tmpDir);
  expect(result.errors.some(e => e.message.includes("unclosed") && e.file === "index.md")).toBe(true);
});

test("errors on legacy ::: block syntax", async () => {
  await write("index.md", "# Hello\n\n:::python\nprint('hi')\n:::\n");
  const result = await validateFolder(tmpDir);
  expect(result.errors.some(e => e.message.includes("legacy") && e.file === "index.md")).toBe(true);
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

test("errors on missing file reference", async () => {
  await write("index.md", "# Hello\n\n[python=missing.py]\n");
  const result = await validateFolder(tmpDir);
  expect(result.errors.some(e => e.message.includes("missing.py") && e.file === "missing.py")).toBe(true);
});

test("resolves valid file reference in scripts/", async () => {
  await write(".readrun/scripts/plot.py", "import matplotlib");
  await write("index.md", "# Hello\n\n[python=plot.py]\n");
  const result = await validateFolder(tmpDir);
  expect(result.errors).toHaveLength(0);
});

test("warns on unexpected .readrun/ subdir", async () => {
  await mkdir(join(tmpDir, ".readrun", "cache"), { recursive: true });
  const result = await validateFolder(tmpDir);
  expect(result.warnings.some(w => w.message.includes("cache"))).toBe(true);
});

test("does not warn on .readrun/quizzes", async () => {
  await mkdir(join(tmpDir, ".readrun", "quizzes"), { recursive: true });
  const result = await validateFolder(tmpDir);
  expect(result.warnings.some((w) => w.message.includes(".readrun/quizzes"))).toBe(false);
});

test("errors when file ref target is missing", async () => {
  await write("index.md", "# Hello\n\n[python=demo.py]\n");
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

test("skips markdown files excluded by .readrun/.ignore", async () => {
  await write(".readrun/.ignore", "drafts/**\n");
  await write("drafts/private.md", "---\nauthor: me\n---\n# Private\n");
  const result = await validateFolder(tmpDir);
  expect(result.warnings.some((w) => w.file === "drafts/private.md")).toBe(false);
  expect(result.errors.some((e) => e.file === "drafts/private.md")).toBe(false);
});

test("skips markdown files excluded by the virtual-paths manifest", async () => {
  await write(".readrun/virtual-paths.yaml", "exclude:\n  - docs/**\n");
  await write("docs/internal.md", "---\nauthor: me\n---\n# Internal\n");
  const result = await validateFolder(tmpDir);
  expect(result.warnings.some((w) => w.file === "docs/internal.md")).toBe(false);
  expect(result.errors.some((e) => e.file === "docs/internal.md")).toBe(false);
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

test("no errors when manifest is absent", async () => {
  await write("notes.md", "# Hello");
  const r = await validateFolder(tmpDir);
  expect(r.errors).toHaveLength(0);
});

test("reports error for malformed manifest YAML", async () => {
  await write("notes.md", "# Hello");
  await write(".readrun/virtual-paths.yaml", "include: [unterminated");
  const r = await validateFolder(tmpDir);
  expect(r.errors.some((e) => e.file === ".readrun/virtual-paths.yaml")).toBe(true);
});

test("reports warning for unknown manifest field", async () => {
  await write("notes.md", "# Hello");
  await write(".readrun/virtual-paths.yaml", "sections:\n  - home\n");
  const r = await validateFolder(tmpDir);
  expect(r.warnings.some((w) => w.file === ".readrun/virtual-paths.yaml")).toBe(true);
});

test("reports error for manifest-mapped virtual path collision", async () => {
  await write("courses/intro.md", "# Intro");
  await write("units/intro.md", "# Intro");
  await write(".readrun/virtual-paths.yaml", "mappings:\n  courses: Learning\n  units: Learning\n");
  const r = await validateFolder(tmpDir);
  expect(r.errors.some((e) => e.message.includes("collides"))).toBe(true);
});
