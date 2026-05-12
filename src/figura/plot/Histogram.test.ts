import { describe, it, expect } from "bun:test";
import { binCounts } from "./Histogram";

describe("binCounts", () => {
  it("uniformly distributes values across bins", () => {
    const r = binCounts([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 10, [0, 10]);
    expect(r.counts).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(r.lo).toBe(0);
    expect(r.hi).toBe(10);
    expect(r.binW).toBe(1);
  });

  it("right-edge value falls in last bin (not n+1)", () => {
    const r = binCounts([10], 10, [0, 10]);
    expect(r.counts[9]).toBe(1);
    expect(r.counts.reduce((a, b) => a + b, 0)).toBe(1);
  });

  it("ignores values outside the domain", () => {
    const r = binCounts([-1, 0, 5, 10, 11], 10, [0, 10]);
    expect(r.counts.reduce((a, b) => a + b, 0)).toBe(3);
  });

  it("ignores non-finite values", () => {
    const r = binCounts([1, NaN, Infinity, -Infinity, 2], 4, [0, 4]);
    expect(r.counts.reduce((a, b) => a + b, 0)).toBe(2);
  });

  it("returns empty result for empty input", () => {
    const r = binCounts([], 10);
    expect(r.counts).toEqual([]);
  });

  it("derives domain from values when not given", () => {
    const r = binCounts([2, 4, 6, 8], 4);
    expect(r.lo).toBe(2);
    expect(r.hi).toBe(8);
    expect(r.counts.length).toBe(4);
    expect(r.counts.reduce((a, b) => a + b, 0)).toBe(4);
  });

  it("returns empty for bins <= 0", () => {
    const r = binCounts([1, 2, 3], 0);
    expect(r.counts).toEqual([]);
  });
});
