import { describe, it, expect } from "bun:test";
import { extractTitle } from "./utils";

describe("extractTitle", () => {
  it("prefers frontmatter title over H1", () => {
    const src = ["---", 'title: "From Frontmatter"', "---", "# From H1", "body"].join("\n");
    expect(extractTitle(src, "fallback")).toBe("From Frontmatter");
  });

  it("falls back to H1 when no frontmatter title", () => {
    const src = ["---", "virtual_path: a/b", "---", "# Only H1", "body"].join("\n");
    expect(extractTitle(src, "fallback")).toBe("Only H1");
  });

  it("falls back to H1 when no frontmatter at all", () => {
    expect(extractTitle("# Heading\nbody", "fallback")).toBe("Heading");
  });

  it("falls back to fallback when nothing matches", () => {
    expect(extractTitle("no heading at all", "default")).toBe("default");
  });

  it("ignores malformed frontmatter and still uses H1", () => {
    const src = ["---", "title: [unterminated", "---", "# Real", "body"].join("\n");
    expect(extractTitle(src, "fallback")).toBe("Real");
  });
});
