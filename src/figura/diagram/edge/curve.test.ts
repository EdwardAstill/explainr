import { describe, it, expect } from "bun:test";
import { curve } from "./curve";

/** Parse the 6 control/endpoint numbers from a cubic bezier path "M fx fy C cp1x cp1y cp2x cp2y tx ty" */
function parseCurve(d: string): { fx: number; fy: number; cp1x: number; cp1y: number; cp2x: number; cp2y: number; tx: number; ty: number } {
  const m = d.match(/^M ([\d.-]+) ([\d.-]+) C ([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+)$/);
  if (!m) throw new Error(`Not a cubic bezier path: ${d}`);
  return {
    fx: parseFloat(m[1]!), fy: parseFloat(m[2]!),
    cp1x: parseFloat(m[3]!), cp1y: parseFloat(m[4]!),
    cp2x: parseFloat(m[5]!), cp2y: parseFloat(m[6]!),
    tx: parseFloat(m[7]!), ty: parseFloat(m[8]!),
  };
}

describe("curve", () => {
  it("output starts with M", () => {
    const d = curve({ x: 0, y: 0 }, { x: 100, y: 0 });
    expect(d.startsWith("M")).toBe(true);
  });

  it("output contains exactly one C", () => {
    const d = curve({ x: 0, y: 0 }, { x: 100, y: 0 });
    const matches = d.match(/\bC\b/g);
    expect(matches?.length).toBe(1);
  });

  it("degenerate: from === to returns straight path-like result", () => {
    const d = curve({ x: 50, y: 50 }, { x: 50, y: 50 });
    // Should not throw and should be a valid path starting with M
    expect(d.startsWith("M")).toBe(true);
  });

  it("higher tension produces more distant control point from midpoint", () => {
    const from = { x: 0, y: 0 };
    const to = { x: 100, y: 0 };
    const midX = 50, midY = 0;

    const dLow = curve(from, to, { tension: 0.1 });
    const dHigh = curve(from, to, { tension: 0.8 });

    const low = parseCurve(dLow);
    const high = parseCurve(dHigh);

    // Distance of cp1 from midpoint
    const distLow = Math.hypot(low.cp1x - midX, low.cp1y - midY);
    const distHigh = Math.hypot(high.cp1x - midX, high.cp1y - midY);

    expect(distHigh).toBeGreaterThan(distLow);
  });

  it("endpoints match from and to", () => {
    const from = { x: 10, y: 20 };
    const to = { x: 80, y: 60 };
    const d = curve(from, to);
    const p = parseCurve(d);
    expect(p.fx).toBeCloseTo(10, 1);
    expect(p.fy).toBeCloseTo(20, 1);
    expect(p.tx).toBeCloseTo(80, 1);
    expect(p.ty).toBeCloseTo(60, 1);
  });
});
