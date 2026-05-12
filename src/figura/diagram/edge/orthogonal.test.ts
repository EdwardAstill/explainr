import { describe, it, expect } from "bun:test";
import { orthogonal } from "./orthogonal";

/**
 * Parse all numeric coordinates from an SVG path string.
 * Returns pairs of [x, y] for each point (M and each L).
 */
function parsePoints(d: string): Array<[number, number]> {
  const tokens = d.trim().split(/\s+/);
  const points: Array<[number, number]> = [];
  let i = 0;
  while (i < tokens.length) {
    const cmd = tokens[i];
    if (cmd === "M" || cmd === "L") {
      const x = parseFloat(tokens[i + 1]!);
      const y = parseFloat(tokens[i + 2]!);
      points.push([x, y]);
      i += 3;
    } else {
      i++;
    }
  }
  return points;
}

describe("orthogonal", () => {
  it("horizontal-first: goes right then down for (0,0)→(100,50)", () => {
    const d = orthogonal({ x: 0, y: 0 }, { x: 100, y: 50 }, { axis: "horizontal-first" });
    const pts = parsePoints(d);
    // Should have 3 points: start, elbow, end
    expect(pts.length).toBe(3);
    const [start, elbow, end] = pts;
    // horizontal-first: elbow has same y as start and same x as end
    expect(start![0]).toBeCloseTo(0);
    expect(start![1]).toBeCloseTo(0);
    expect(elbow![0]).toBeCloseTo(100); // x moves first
    expect(elbow![1]).toBeCloseTo(0);   // y unchanged
    expect(end![0]).toBeCloseTo(100);
    expect(end![1]).toBeCloseTo(50);
  });

  it("vertical-first: goes down then right for (0,0)→(100,50)", () => {
    const d = orthogonal({ x: 0, y: 0 }, { x: 100, y: 50 }, { axis: "vertical-first" });
    const pts = parsePoints(d);
    expect(pts.length).toBe(3);
    const [start, elbow, end] = pts;
    expect(start![0]).toBeCloseTo(0);
    expect(start![1]).toBeCloseTo(0);
    expect(elbow![0]).toBeCloseTo(0);   // x unchanged
    expect(elbow![1]).toBeCloseTo(50);  // y moves first
    expect(end![0]).toBeCloseTo(100);
    expect(end![1]).toBeCloseTo(50);
  });

  it("auto with |dx| > |dy| uses horizontal-first", () => {
    // dx=100, dy=20 → horizontal-first
    const d = orthogonal({ x: 0, y: 0 }, { x: 100, y: 20 }, { axis: "auto" });
    const pts = parsePoints(d);
    const elbow = pts[1]!;
    // horizontal-first elbow: x at destination, y at source
    expect(elbow[0]).toBeCloseTo(100);
    expect(elbow[1]).toBeCloseTo(0);
  });

  it("auto with |dy| > |dx| uses vertical-first", () => {
    // dx=20, dy=100 → vertical-first
    const d = orthogonal({ x: 0, y: 0 }, { x: 20, y: 100 }, { axis: "auto" });
    const pts = parsePoints(d);
    const elbow = pts[1]!;
    // vertical-first elbow: x at source, y at destination
    expect(elbow[0]).toBeCloseTo(0);
    expect(elbow[1]).toBeCloseTo(100);
  });

  it("same-row case (from.y === to.y) returns 2-point straight path", () => {
    const d = orthogonal({ x: 0, y: 50 }, { x: 100, y: 50 });
    const pts = parsePoints(d);
    expect(pts.length).toBe(2);
    expect(pts[0]![1]).toBeCloseTo(50);
    expect(pts[1]![1]).toBeCloseTo(50);
  });

  it("same-column case (from.x === to.x) returns 2-point straight path", () => {
    const d = orthogonal({ x: 50, y: 0 }, { x: 50, y: 100 });
    const pts = parsePoints(d);
    expect(pts.length).toBe(2);
    expect(pts[0]![0]).toBeCloseTo(50);
    expect(pts[1]![0]).toBeCloseTo(50);
  });
});
