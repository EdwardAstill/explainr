import { describe, it, expect } from "bun:test";
import { parseNavConfig, DEFAULT_NAV_CONFIG } from "./navConfig";

describe("parseNavConfig", () => {
  it("returns defaults for empty/null/missing input", () => {
    expect(parseNavConfig("").config).toEqual(DEFAULT_NAV_CONFIG);
    expect(parseNavConfig(null as any).config).toEqual(DEFAULT_NAV_CONFIG);
  });

  it("default mode is 'tree' with search enabled", () => {
    const r = parseNavConfig("");
    expect(r.config.mode).toBe("tree");
    expect(r.config.search.enabled).toBe(true);
  });

  it("`panes: 3` switches to panes mode with 3 columns", () => {
    const r = parseNavConfig("panes: 3");
    expect(r.config.mode).toBe("panes");
    expect(r.config.panes).toBe(3);
    expect(r.issues).toHaveLength(0);
  });

  it("clamps panes to [2, 4]", () => {
    expect(parseNavConfig("panes: 1").issues[0]?.kind).toBe("out_of_range");
    expect(parseNavConfig("panes: 7").issues[0]?.kind).toBe("out_of_range");
    expect(parseNavConfig("panes: 1").config.mode).toBe("tree");
  });

  it("labels are optional; absent labels => inferred from folder depth", () => {
    const r = parseNavConfig("panes: 3");
    expect(r.config.labels).toBeUndefined();
  });

  it("explicit labels override defaults", () => {
    const r = parseNavConfig("panes: 3\nlabels: [areas, books, chapters]");
    expect(r.config.labels).toEqual(["areas", "books", "chapters"]);
  });

  it("rejects unknown top-level fields with an issue, not a throw", () => {
    const r = parseNavConfig("panes: 2\nbogus: true");
    expect(r.issues.find(i => i.kind === "unknown_field")?.field).toBe("bogus");
  });

  it("accepts `mode` as a valid YAML key without warning (derived from panes anyway)", () => {
    const r = parseNavConfig("mode: panes\npanes: 3");
    expect(r.issues).toEqual([]);
    expect(r.config.mode).toBe("panes");
  });

  it("flags invalid mode values", () => {
    const r = parseNavConfig("mode: weird");
    expect(r.issues.find(i => i.kind === "wrong_type")?.field).toBe("mode");
  });

  it("mode: panes alone (no panes:) is incoherent — falls back to tree with an issue", () => {
    const r = parseNavConfig("mode: panes");
    expect(r.config.mode).toBe("tree");
    expect(r.issues.find(i => i.field === "mode")?.kind).toBe("wrong_type");
  });

  it("mode: tree with panes: 3 is an explicit opt-out — mode stays tree, panes preserved", () => {
    const r = parseNavConfig("mode: tree\npanes: 3");
    expect(r.config.mode).toBe("tree");
    expect(r.config.panes).toBe(3);
    expect(r.issues).toEqual([]);
  });

  it("mode: panes with panes: 3 is honored", () => {
    const r = parseNavConfig("mode: panes\npanes: 3");
    expect(r.config.mode).toBe("panes");
    expect(r.config.panes).toBe(3);
  });
});
