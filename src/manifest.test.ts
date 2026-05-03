import { describe, it, expect } from "bun:test";
import { parseManifest } from "./manifest";

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
