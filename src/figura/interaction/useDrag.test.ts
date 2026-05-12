import { describe, it, expect } from "bun:test";
import { applyMatrix, screenToViewBox, type SVGMatrixLike } from "./coords";

/** Build a simple identity-derived mock CTM with known translation. */
function makeCTM(tx: number, ty: number): SVGMatrixLike {
  // A CTM that represents a pure translation: e=tx, f=ty, a=d=1, b=c=0
  const fwd: SVGMatrixLike = {
    a: 1, b: 0, c: 0, d: 1, e: tx, f: ty,
    inverse() {
      // Inverse of a pure translation T(tx,ty) is T(-tx,-ty)
      return { a: 1, b: 0, c: 0, d: 1, e: -tx, f: -ty, inverse: () => fwd };
    },
  };
  return fwd;
}

/** Build a CTM with uniform scale and translation. */
function makeScaleCTM(scale: number, tx: number, ty: number): SVGMatrixLike {
  const fwd: SVGMatrixLike = {
    a: scale, b: 0, c: 0, d: scale, e: tx, f: ty,
    inverse() {
      // Inverse of scale(s)+translate(tx,ty): scale(1/s), translate(-tx/s, -ty/s)
      return {
        a: 1 / scale,
        b: 0,
        c: 0,
        d: 1 / scale,
        e: -tx / scale,
        f: -ty / scale,
        inverse: () => fwd,
      };
    },
  };
  return fwd;
}

describe("applyMatrix", () => {
  it("identity matrix returns same coords", () => {
    const id: SVGMatrixLike = {
      a: 1, b: 0, c: 0, d: 1, e: 0, f: 0,
      inverse() { return id; },
    };
    expect(applyMatrix(id, 10, 20)).toEqual({ x: 10, y: 20 });
  });

  it("pure translation offsets x and y", () => {
    const m: SVGMatrixLike = {
      a: 1, b: 0, c: 0, d: 1, e: 50, f: 100,
      inverse() { return m; },
    };
    expect(applyMatrix(m, 10, 20)).toEqual({ x: 60, y: 120 });
  });

  it("uniform scale doubles coords", () => {
    const m: SVGMatrixLike = {
      a: 2, b: 0, c: 0, d: 2, e: 0, f: 0,
      inverse() { return m; },
    };
    expect(applyMatrix(m, 3, 4)).toEqual({ x: 6, y: 8 });
  });
});

describe("screenToViewBox — coordinate conversion", () => {
  it("returns null when getCTM returns null", () => {
    const target = { getScreenCTM: () => null };
    expect(screenToViewBox(target, 100, 200)).toBeNull();
  });

  it("converts screen coords to viewBox with pure translation CTM", () => {
    // SVG viewport offset: top-left at screen (50, 80).
    // CTM fwd: translates (50, 80) into SVG space (0, 0).
    // Inverse should subtract that offset.
    const target = { getScreenCTM: () => makeCTM(50, 80) };
    const pt = screenToViewBox(target, 150, 180);
    // Expected: (150 - 50, 180 - 80) = (100, 100)
    expect(pt).not.toBeNull();
    expect(pt!.x).toBeCloseTo(100);
    expect(pt!.y).toBeCloseTo(100);
  });

  it("converts screen coords to viewBox with scale+translation CTM", () => {
    // SVG rendered at 2x zoom with offset (100, 200).
    const target = { getScreenCTM: () => makeScaleCTM(2, 100, 200) };
    const pt = screenToViewBox(target, 200, 400);
    // Inverse: x' = (200 - 100) / 2 = 50, y' = (400 - 200) / 2 = 100
    expect(pt).not.toBeNull();
    expect(pt!.x).toBeCloseTo(50);
    expect(pt!.y).toBeCloseTo(100);
  });

  it("identity CTM maps screen coords unchanged", () => {
    const id: SVGMatrixLike = {
      a: 1, b: 0, c: 0, d: 1, e: 0, f: 0,
      inverse() { return id; },
    };
    const target = { getScreenCTM: () => id };
    const pt = screenToViewBox(target, 75, 125);
    expect(pt!.x).toBeCloseTo(75);
    expect(pt!.y).toBeCloseTo(125);
  });
});
