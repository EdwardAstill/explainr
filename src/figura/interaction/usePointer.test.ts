import { describe, it, expect } from "bun:test";
import { screenToViewBox, type SVGMatrixLike } from "./coords";

/**
 * usePointer uses the same screenToViewBox helper as useDrag.
 * The hook-level DOM integration is not tested here (no DOM environment).
 * We verify the coordinate-conversion path that usePointer relies on.
 */

function makeOffsetCTM(offsetX: number, offsetY: number): SVGMatrixLike {
  const fwd: SVGMatrixLike = {
    a: 1, b: 0, c: 0, d: 1, e: offsetX, f: offsetY,
    inverse() {
      return { a: 1, b: 0, c: 0, d: 1, e: -offsetX, f: -offsetY, inverse: () => fwd };
    },
  };
  return fwd;
}

describe("screenToViewBox in pointer context", () => {
  it("returns correct x/y for a pointer at known screen coords", () => {
    // Simulate an SVG whose top-left corner is at screen (200, 300).
    const target = { getScreenCTM: () => makeOffsetCTM(200, 300) };
    const pt = screenToViewBox(target, 250, 350);
    expect(pt).not.toBeNull();
    expect(pt!.x).toBeCloseTo(50);
    expect(pt!.y).toBeCloseTo(50);
  });

  it("returns (0, 0) when pointer is exactly at viewBox origin", () => {
    const target = { getScreenCTM: () => makeOffsetCTM(100, 150) };
    const pt = screenToViewBox(target, 100, 150);
    expect(pt!.x).toBeCloseTo(0);
    expect(pt!.y).toBeCloseTo(0);
  });

  it("handles negative viewBox coords (pointer above/left of SVG)", () => {
    const target = { getScreenCTM: () => makeOffsetCTM(100, 100) };
    const pt = screenToViewBox(target, 50, 60);
    expect(pt!.x).toBeCloseTo(-50);
    expect(pt!.y).toBeCloseTo(-40);
  });

  it("returns null when element has no CTM (detached element)", () => {
    const target = { getScreenCTM: () => null };
    expect(screenToViewBox(target, 100, 200)).toBeNull();
  });
});
