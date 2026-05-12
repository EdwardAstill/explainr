import { describe, it, expect } from "bun:test";
import { scale } from "./scale";

describe("scale.linear", () => {
  it("identity case maps domain to range", () => {
    const s = scale.linear({ domain: [0, 1], range: [0, 1] });
    expect(s(0)).toBe(0);
    expect(s(0.5)).toBe(0.5);
    expect(s(1)).toBe(1);
  });

  it("maps domain to different range", () => {
    const s = scale.linear({ domain: [0, 1], range: [0, 100] });
    expect(s(0)).toBe(0);
    expect(s(0.5)).toBe(50);
    expect(s(1)).toBe(100);
  });

  it("inverts round-trip", () => {
    const s = scale.linear({ domain: [0, 100], range: [0, 500] });
    expect(s(s.invert(250))).toBeCloseTo(250);
    expect(s(s.invert(0))).toBeCloseTo(0);
    expect(s(s.invert(500))).toBeCloseTo(500);
  });

  it("handles negative domain", () => {
    const s = scale.linear({ domain: [-10, 10], range: [0, 100] });
    expect(s(-10)).toBe(0);
    expect(s(0)).toBe(50);
    expect(s(10)).toBe(100);
  });

  it("handles inverted range (y-axis flip)", () => {
    const s = scale.linear({ domain: [0, 1], range: [100, 0] });
    expect(s(0)).toBe(100);
    expect(s(0.5)).toBe(50);
    expect(s(1)).toBe(0);
  });

  it("exposes domain and range", () => {
    const s = scale.linear({ domain: [0, 1], range: [0, 100] });
    expect(s.domain).toEqual([0, 1]);
    expect(s.range).toEqual([0, 100]);
    expect(s.type).toBe("linear");
  });
});

describe("scale.log", () => {
  it("base 10: domain [1, 100] → range [0, 1]", () => {
    const s = scale.log({ domain: [1, 100], range: [0, 1] });
    expect(s(1)).toBe(0);
    expect(s(10)).toBeCloseTo(0.5);
    expect(s(100)).toBe(1);
  });

  it("base 10: domain [1, 1000] → range [0, 1]", () => {
    const s = scale.log({ domain: [1, 1000], range: [0, 1] });
    expect(s(1)).toBe(0);
    expect(s(10)).toBeCloseTo(1 / 3);
    expect(s(100)).toBeCloseTo(2 / 3);
    expect(s(1000)).toBe(1);
  });

  it("inverts round-trip", () => {
    const s = scale.log({ domain: [1, 100], range: [0, 1] });
    expect(s(s.invert(0.5))).toBeCloseTo(0.5);
  });

  it("rejects domain value <= 0", () => {
    expect(() => scale.log({ domain: [0, 100], range: [0, 1] })).toThrow();
    expect(() => scale.log({ domain: [-1, 100], range: [0, 1] })).toThrow();
  });

  it("exposes type and domain", () => {
    const s = scale.log({ domain: [1, 100], range: [0, 1] });
    expect(s.type).toBe("log");
    expect(s.domain).toEqual([1, 100]);
  });
});

describe("scale.ordinal", () => {
  it("returns band centers", () => {
    const s = scale.ordinal({ domain: ["a", "b", "c"], range: [0, 300] });
    expect(s("a")).toBe(50);
    expect(s("b")).toBe(150);
    expect(s("c")).toBe(250);
  });

  it("exposes bandwidth", () => {
    const s = scale.ordinal({ domain: ["a", "b", "c"], range: [0, 300] });
    expect(s.bandwidth).toBe(100);
  });

  it("exposes domain and range", () => {
    const s = scale.ordinal({ domain: ["a", "b", "c"], range: [0, 300] });
    expect(s.domain).toEqual(["a", "b", "c"]);
    expect(s.range).toEqual([0, 300]);
    expect(s.type).toBe("ordinal");
  });

  it("throws on unknown domain value", () => {
    const s = scale.ordinal({ domain: ["a", "b", "c"], range: [0, 300] });
    expect(() => s("d" as "a" | "b" | "c")).toThrow();
  });

  it("works with numeric domain", () => {
    const s = scale.ordinal({ domain: [1, 2, 3], range: [0, 300] });
    expect(s(1)).toBe(50);
    expect(s(2)).toBe(150);
    expect(s(3)).toBe(250);
  });
});
