import { describe, it, expect } from "bun:test";
import { dataExtent } from "./Heatmap";

describe("dataExtent", () => {
  it("returns [min, max] of finite cells", () => {
    const data = [[1, 2, 3], [4, 5, 6]];
    expect(dataExtent(data)).toEqual([1, 6]);
  });

  it("ignores NaN by default", () => {
    const data = [[NaN, 1], [2, NaN]];
    expect(dataExtent(data)).toEqual([1, 2]);
  });

  it("ignores Infinity by default", () => {
    const data = [[Infinity, 1], [2, -Infinity]];
    expect(dataExtent(data)).toEqual([1, 2]);
  });

  it("returns null for empty grid", () => {
    expect(dataExtent([])).toBeNull();
    expect(dataExtent([[]])).toBeNull();
  });

  it("returns null when all cells invalid", () => {
    expect(dataExtent([[NaN, Infinity]])).toBeNull();
  });

  it("respects custom invalid predicate", () => {
    const data = [[0, 1, 2, 3]];
    // skip everything <= 1
    expect(dataExtent(data, (v) => v <= 1)).toEqual([2, 3]);
  });

  it("handles single-cell grid", () => {
    expect(dataExtent([[42]])).toEqual([42, 42]);
  });
});
