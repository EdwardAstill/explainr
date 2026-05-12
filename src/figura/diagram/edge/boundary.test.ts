import { describe, it, expect } from "bun:test";
import { nodeBoundaryPoint } from "./boundary";

const approx = (n: number) => Math.round(n * 1000) / 1000;

describe("nodeBoundaryPoint – rect", () => {
  const rect = { x: 0, y: 0, width: 100, height: 40 };

  it("toward (200, 0) → right edge (50, 0)", () => {
    const pt = nodeBoundaryPoint(rect, 200, 0);
    expect(approx(pt.x)).toBe(50);
    expect(approx(pt.y)).toBe(0);
  });

  it("toward (0, 200) → bottom edge (0, 20)", () => {
    const pt = nodeBoundaryPoint(rect, 0, 200);
    expect(approx(pt.x)).toBe(0);
    expect(approx(pt.y)).toBe(20);
  });

  it("toward (200, 200) → hits bottom edge first → (20, 20)", () => {
    // dx=200, dy=200; sx = 50/200 = 0.25, sy = 20/200 = 0.1; t = 0.1; result (20, 20)
    const pt = nodeBoundaryPoint(rect, 200, 200);
    expect(approx(pt.x)).toBe(20);
    expect(approx(pt.y)).toBe(20);
  });

  it("zero-length ray → returns center", () => {
    const pt = nodeBoundaryPoint(rect, 0, 0);
    expect(pt.x).toBe(0);
    expect(pt.y).toBe(0);
  });
});

describe("nodeBoundaryPoint – circle", () => {
  const circle = { x: 0, y: 0, width: 60, height: 60, shape: "circle" as const };

  it("toward (100, 0) → (30, 0)", () => {
    const pt = nodeBoundaryPoint(circle, 100, 0);
    expect(approx(pt.x)).toBe(30);
    expect(approx(pt.y)).toBe(0);
  });

  it("3-4-5 triangle: toward (3, 4) → (18, 24)", () => {
    // r = 30; len = 5; x = 30 * 3/5 = 18, y = 30 * 4/5 = 24
    const pt = nodeBoundaryPoint(circle, 3, 4);
    expect(approx(pt.x)).toBe(18);
    expect(approx(pt.y)).toBe(24);
  });
});

describe("nodeBoundaryPoint – ellipse", () => {
  const ellipse = { x: 0, y: 0, width: 100, height: 40, shape: "ellipse" as const };

  it("toward (100, 0) → (50, 0)", () => {
    const pt = nodeBoundaryPoint(ellipse, 100, 0);
    expect(approx(pt.x)).toBe(50);
    expect(approx(pt.y)).toBe(0);
  });

  it("toward (0, 100) → (0, 20)", () => {
    const pt = nodeBoundaryPoint(ellipse, 0, 100);
    expect(approx(pt.x)).toBe(0);
    expect(approx(pt.y)).toBe(20);
  });
});

describe("nodeBoundaryPoint – diamond", () => {
  const diamond = { x: 0, y: 0, width: 100, height: 40, shape: "diamond" as const };

  it("toward (100, 0) → (50, 0)", () => {
    const pt = nodeBoundaryPoint(diamond, 100, 0);
    expect(approx(pt.x)).toBe(50);
    expect(approx(pt.y)).toBe(0);
  });

  it("toward (50, 20) → boundary point on diamond edge", () => {
    // dx=50, dy=20; t = 1 / (|50|/50 + |20|/20) = 1 / (1 + 1) = 0.5
    // result: x = 50 * 0.5 = 25, y = 20 * 0.5 = 10
    const pt = nodeBoundaryPoint(diamond, 50, 20);
    expect(approx(pt.x)).toBe(25);
    expect(approx(pt.y)).toBe(10);
  });
});
