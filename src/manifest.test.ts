import { describe, it, expect } from "bun:test";
import type { PageRecord } from "./siteIndex";
import { parseManifest, applyManifestFilter, applyManifestMappings } from "./manifest";

describe("parseManifest", () => {
  it("returns empty config for null/empty YAML", () => {
    const r = parseManifest("");
    expect(r.config.include).toEqual([]);
    expect(r.config.exclude).toEqual([]);
    expect(r.config.mappings).toEqual({});
    expect(r.issues).toHaveLength(0);
  });

  it("parses include, exclude, and mappings", () => {
    const yaml = [
      "include:",
      "  - courses/**",
      "  - units/**",
      "exclude:",
      "  - docs/**",
      "mappings:",
      "  courses: Courses",
      "  units: Units",
    ].join("\n");
    const r = parseManifest(yaml);
    expect(r.config.include).toEqual(["courses/**", "units/**"]);
    expect(r.config.exclude).toEqual(["docs/**"]);
    expect(r.config.mappings).toEqual({ courses: "Courses", units: "Units" });
    expect(r.issues).toHaveLength(0);
  });

  it("emits parse_error for malformed YAML", () => {
    const r = parseManifest("include: [unterminated");
    expect(r.issues.some((i) => i.kind === "parse_error")).toBe(true);
    expect(r.config.include).toEqual([]);
  });

  it("emits wrong_type when include is not an array", () => {
    const r = parseManifest("include: not-a-list");
    expect(r.issues.some((i) => i.kind === "wrong_type" && i.field === "include")).toBe(true);
  });

  it("emits unknown_field for unrecognised keys", () => {
    const r = parseManifest("sections:\n  - home");
    expect(r.issues.some((i) => i.kind === "unknown_field" && i.field === "sections")).toBe(true);
  });

  it("emits wrong_type when a mappings value is not a string", () => {
    const r = parseManifest("mappings:\n  courses:\n    - nested: bad");
    expect(r.issues.some((i) => i.kind === "wrong_type")).toBe(true);
  });
});

function mkPage(relPath: string, virtualPath: string | null = null): PageRecord {
  const stem = relPath.replace(/\.[^.]+$/, "");
  return {
    url: "/" + stem,
    filePath: "/root/" + relPath,
    relPath,
    ext: ".md",
    title: stem,
    filename: stem.split("/").at(-1)!,
    virtualPath,
    tags: [],
    body: "",
    outboundLinks: [],
    mtimeMs: 0,
  };
}

describe("applyManifestFilter", () => {
  const pages = [
    mkPage("courses/ai/intro.md"),
    mkPage("courses/math/basics.md"),
    mkPage("docs/planning.md"),
    mkPage("wiki/notes.md"),
    mkPage("units/algebra.md"),
  ];

  it("returns all pages when include and exclude are both empty", () => {
    const r = applyManifestFilter(pages, { include: [], exclude: [], mappings: {} });
    expect(r).toHaveLength(5);
  });

  it("keeps only pages matching include patterns", () => {
    const r = applyManifestFilter(pages, { include: ["courses/**", "units/**"], exclude: [], mappings: {} });
    expect(r.map((p) => p.relPath).sort()).toEqual([
      "courses/ai/intro.md",
      "courses/math/basics.md",
      "units/algebra.md",
    ]);
  });

  it("removes pages matching exclude patterns", () => {
    const r = applyManifestFilter(pages, { include: [], exclude: ["docs/**", "wiki/**"], mappings: {} });
    expect(r.map((p) => p.relPath).sort()).toEqual([
      "courses/ai/intro.md",
      "courses/math/basics.md",
      "units/algebra.md",
    ]);
  });

  it("applies include then exclude when both are set", () => {
    const r = applyManifestFilter(pages, {
      include: ["courses/**", "units/**", "docs/**"],
      exclude: ["docs/**"],
      mappings: {},
    });
    expect(r.map((p) => p.relPath).sort()).toEqual([
      "courses/ai/intro.md",
      "courses/math/basics.md",
      "units/algebra.md",
    ]);
  });

  it("does not mutate the input array", () => {
    const original = [...pages];
    applyManifestFilter(pages, { include: ["courses/**"], exclude: [], mappings: {} });
    expect(pages).toHaveLength(original.length);
  });
});

describe("applyManifestMappings", () => {
  it("returns pages unchanged when mappings is empty", () => {
    const pages = [mkPage("courses/ai/intro.md")];
    const r = applyManifestMappings(pages, { include: [], exclude: [], mappings: {} });
    expect(r[0]!.virtualPath).toBeNull();
  });

  it("remaps relPath prefix to virtual prefix", () => {
    const pages = [mkPage("courses/ai/intro.md")];
    const r = applyManifestMappings(pages, {
      include: [],
      exclude: [],
      mappings: { courses: "Courses" },
    });
    expect(r[0]!.virtualPath).toBe("Courses/ai/intro");
  });

  it("strips the file extension from the remapped path", () => {
    const pages = [mkPage("units/math/algebra.md")];
    const r = applyManifestMappings(pages, {
      include: [],
      exclude: [],
      mappings: { units: "Units" },
    });
    expect(r[0]!.virtualPath).toBe("Units/math/algebra");
  });

  it("frontmatter virtualPath takes precedence over manifest mapping", () => {
    const pages = [mkPage("courses/ai/intro.md", "manual/override")];
    const r = applyManifestMappings(pages, {
      include: [],
      exclude: [],
      mappings: { courses: "Courses" },
    });
    expect(r[0]!.virtualPath).toBe("manual/override");
  });

  it("mapping key with trailing slash works the same as without", () => {
    const pages = [mkPage("courses/ai/intro.md")];
    const r = applyManifestMappings(pages, {
      include: [],
      exclude: [],
      mappings: { "courses/": "Courses" },
    });
    expect(r[0]!.virtualPath).toBe("Courses/ai/intro");
  });

  it("pages not matching any mapping key are unchanged", () => {
    const pages = [mkPage("docs/planning.md")];
    const r = applyManifestMappings(pages, {
      include: [],
      exclude: [],
      mappings: { courses: "Courses" },
    });
    expect(r[0]!.virtualPath).toBeNull();
  });

  it("does not mutate input page objects", () => {
    const page = mkPage("courses/ai/intro.md");
    applyManifestMappings([page], { include: [], exclude: [], mappings: { courses: "Courses" } });
    expect(page.virtualPath).toBeNull();
  });

  it("prefers the most specific mapping prefix when multiple match", () => {
    const pages = [mkPage("courses/math/linear-algebra.md")];
    const r = applyManifestMappings(pages, {
      include: [],
      exclude: [],
      mappings: {
        courses: "Courses",
        "courses/math": "Mathematics",
      },
    });
    expect(r[0]!.virtualPath).toBe("Mathematics/linear-algebra");
  });
});
