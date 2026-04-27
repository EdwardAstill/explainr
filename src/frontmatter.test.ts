import { describe, it, expect } from "bun:test";
import { parseFrontmatter, splitFrontmatter } from "./frontmatter";

describe("splitFrontmatter", () => {
  it("returns null block when source has no frontmatter", () => {
    const r = splitFrontmatter("# just a heading\n\nbody");
    expect(r.block).toBeNull();
    expect(r.body).toBe("# just a heading\n\nbody");
  });

  it("strips a well-formed block", () => {
    const r = splitFrontmatter("---\ntitle: X\n---\n# heading");
    expect(r.block).toBe("title: X");
    expect(r.body).toBe("# heading");
  });

  it("accepts CRLF line endings", () => {
    const r = splitFrontmatter("---\r\ntitle: X\r\n---\r\n# h");
    expect(r.block).toBe("title: X");
    expect(r.body).toBe("# h");
  });
});

describe("parseFrontmatter", () => {
  it("returns empty frontmatter and no issues for bare markdown", () => {
    const r = parseFrontmatter("# heading\nbody");
    expect(r.fm.title).toBeUndefined();
    expect(r.fm.virtualPath).toBeUndefined();
    expect(r.issues).toHaveLength(0);
  });

  it("parses title and virtual_path", () => {
    const r = parseFrontmatter(
      ["---", 'title: "Contour Integration"', "virtual_path: math/analysis/contour-integration", "---", "# body"].join("\n"),
    );
    expect(r.fm.title).toBe("Contour Integration");
    expect(r.fm.virtualPath).toBe("math/analysis/contour-integration");
    expect(r.issues).toHaveLength(0);
    expect(r.body).toBe("# body");
  });

  it("handles YAML folded-string title", () => {
    const r = parseFrontmatter(["---", "title: >", "  long title that", "  wraps", "---", "body"].join("\n"));
    expect(r.fm.title).toBe("long title that wraps\n");
  });

  it("emits parse_error for malformed YAML", () => {
    const r = parseFrontmatter(["---", "title: [unterminated", "---", "body"].join("\n"));
    expect(r.issues.some((i) => i.kind === "parse_error")).toBe(true);
  });

  it("emits unknown_field for unrecognised keys", () => {
    const r = parseFrontmatter(["---", "title: X", "author: me", "tags: [a, b]", "---", "body"].join("\n"));
    const unknown = r.issues.filter((i) => i.kind === "unknown_field").map((i) => (i as { name: string }).name);
    expect(unknown.sort()).toEqual(["author"]);
    expect(r.fm.tags).toEqual(["a", "b"]);
  });

  it("emits wrong_type when title is not a string", () => {
    const r = parseFrontmatter(["---", "title: 42", "---", "body"].join("\n"));
    expect(r.issues.some((i) => i.kind === "wrong_type")).toBe(true);
    expect(r.fm.title).toBeUndefined();
  });

  it("emits parse_error when root is an array", () => {
    const r = parseFrontmatter(["---", "- a", "- b", "---", "body"].join("\n"));
    expect(r.issues.some((i) => i.kind === "parse_error")).toBe(true);
  });

  it("treats null YAML root (empty block) as empty frontmatter", () => {
    const r = parseFrontmatter(["---", "---", "body"].join("\n"));
    expect(r.fm.title).toBeUndefined();
    expect(r.issues).toHaveLength(0);
  });
});
