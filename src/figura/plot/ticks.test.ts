import { describe, it, expect } from "bun:test";
import { scale } from "./scale";
import { ticks } from "./ticks";

describe("ticks(linear)", () => {
  it("produces nice ticks for [0, 100]", () => {
    const s = scale.linear({ domain: [0, 100], range: [0, 1] });
    const t = ticks(s, 5) as number[];
    // Should be nice round numbers
    expect(t.length).toBeGreaterThanOrEqual(2);
    // All ticks should be within domain
    expect(t[0]).toBeGreaterThanOrEqual(0);
    expect(t[t.length - 1]).toBeLessThanOrEqual(100);
    // Should be round numbers (multiples of step)
    const step = t[1]! - t[0]!;
    for (let i = 1; i < t.length; i++) {
      expect(t[i]! - t[i - 1]!).toBeCloseTo(step);
    }
  });

  it("[0, 100] n=5 produces exactly [0, 20, 40, 60, 80, 100] or [0, 25, 50, 75, 100]", () => {
    const s = scale.linear({ domain: [0, 100], range: [0, 1] });
    const t = ticks(s, 5) as number[];
    const valid1 = JSON.stringify(t) === JSON.stringify([0, 20, 40, 60, 80, 100]);
    const valid2 = JSON.stringify(t) === JSON.stringify([0, 25, 50, 75, 100]);
    expect(valid1 || valid2).toBe(true);
  });

  it("handles non-integer domains", () => {
    const s = scale.linear({ domain: [0, 1], range: [0, 1] });
    const t = ticks(s, 5) as number[];
    expect(t.length).toBeGreaterThanOrEqual(2);
    expect(t[0]).toBeGreaterThanOrEqual(0);
    expect(t[t.length - 1]).toBeLessThanOrEqual(1);
  });

  it("returns at least 2 ticks for any range", () => {
    const s = scale.linear({ domain: [0, 1], range: [0, 1] });
    expect((ticks(s, 1) as number[]).length).toBeGreaterThanOrEqual(2);
    expect((ticks(s, 0) as number[]).length).toBeGreaterThanOrEqual(2);
  });

  it("handles large domain", () => {
    const s = scale.linear({ domain: [0, 1000], range: [0, 1] });
    const t = ticks(s, 5) as number[];
    expect(t.length).toBeGreaterThanOrEqual(2);
    // All values should be round
    t.forEach((v) => expect(v % 1).toBe(0));
  });
});

describe("ticks(log)", () => {
  it("produces powers of 10 for [1, 1000]", () => {
    const s = scale.log({ domain: [1, 1000], range: [0, 1] });
    expect(ticks(s, 0)).toEqual([1, 10, 100, 1000]);
  });

  it("produces powers of 10 for [1, 100]", () => {
    const s = scale.log({ domain: [1, 100], range: [0, 1] });
    expect(ticks(s, 0)).toEqual([1, 10, 100]);
  });

  it("works with non-round domain start", () => {
    const s = scale.log({ domain: [2, 200], range: [0, 1] });
    const t = ticks(s, 0) as number[];
    // Should include powers of 10 within range: 10, 100
    expect(t).toContain(10);
    expect(t).toContain(100);
  });
});

describe("ticks(ordinal)", () => {
  it("returns the domain", () => {
    const s = scale.ordinal({ domain: ["a", "b", "c"], range: [0, 300] });
    expect(ticks(s, 0)).toEqual(["a", "b", "c"]);
  });

  it("ignores n parameter", () => {
    const s = scale.ordinal({ domain: ["x", "y"], range: [0, 200] });
    expect(ticks(s, 100)).toEqual(["x", "y"]);
  });
});
