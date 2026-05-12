import { describe, it, expect } from "bun:test";
import { routeAround } from "./routeAround";
import { orthogonal } from "./orthogonal";

type Box = { x: number; y: number; width: number; height: number };

/**
 * Parse all [x, y] points from a path string (handles M, L only).
 */
function parsePoints(d: string): Array<[number, number]> {
  const tokens = d.trim().split(/\s+/);
  const points: Array<[number, number]> = [];
  let i = 0;
  while (i < tokens.length) {
    const cmd = tokens[i];
    if (cmd === "M" || cmd === "L") {
      points.push([parseFloat(tokens[i + 1]!), parseFloat(tokens[i + 2]!)]);
      i += 3;
    } else {
      i++;
    }
  }
  return points;
}

/**
 * Checks whether any segment of the polyline defined by `points`
 * passes through the interior of `box`. Uses a simple axis-aligned
 * segment-vs-box intersection test.
 */
function polylineIntersectsBox(points: Array<[number, number]>, box: Box): boolean {
  const bx0 = box.x;
  const by0 = box.y;
  const bx1 = box.x + box.width;
  const by1 = box.y + box.height;

  for (let i = 0; i < points.length - 1; i++) {
    const [ax, ay] = points[i]!;
    const [bx, by] = points[i + 1]!;

    // Check AABB of segment vs box (necessary condition)
    if (Math.max(ax, bx) < bx0 || Math.min(ax, bx) > bx1) continue;
    if (Math.max(ay, by) < by0 || Math.min(ay, by) > by1) continue;

    // For axis-aligned segments (horizontal or vertical), do exact check
    if (Math.abs(ay - by) < 1e-9) {
      // horizontal segment y=ay: intersects if bx0 < x_range and by0 <= ay <= by1
      if (ay > by0 && ay < by1) {
        const x0 = Math.min(ax, bx);
        const x1 = Math.max(ax, bx);
        if (x0 < bx1 && x1 > bx0) return true;
      }
    } else if (Math.abs(ax - bx) < 1e-9) {
      // vertical segment x=ax
      if (ax > bx0 && ax < bx1) {
        const y0 = Math.min(ay, by);
        const y1 = Math.max(ay, by);
        if (y0 < by1 && y1 > by0) return true;
      }
    }
  }
  return false;
}

describe("routeAround", () => {
  it("no obstacles → same as orthogonal(from, to, opts)", () => {
    const from = { x: 0, y: 0 };
    const to = { x: 200, y: 100 };
    const result = routeAround([], from, to);
    const expected = orthogonal(from, to);
    expect(result).toBe(expected);
  });

  it("no obstacles, horizontal-first → same as orthogonal horizontal-first", () => {
    const from = { x: 0, y: 0 };
    const to = { x: 200, y: 100 };
    const result = routeAround([], from, to, { axis: "horizontal-first" });
    const expected = orthogonal(from, to, { axis: "horizontal-first" });
    expect(result).toBe(expected);
  });

  it("obstacle directly between from and to: path does not intersect obstacle", () => {
    // from (0,50) to (300, 50) with an obstacle at (100, 10, 100, 80)
    // The direct horizontal path would go right through x=100..200
    const from = { x: 0, y: 50 };
    const to = { x: 300, y: 50 };
    const obstacle = { x: 100, y: 10, width: 100, height: 80 };

    const d = routeAround([obstacle], from, to, { padding: 10 });
    const pts = parsePoints(d);

    expect(polylineIntersectsBox(pts, obstacle)).toBe(false);
  });

  it("multiple obstacles: path avoids all of them", () => {
    const from = { x: 0, y: 100 };
    const to = { x: 400, y: 100 };
    const obstacles = [
      { x: 80, y: 60, width: 80, height: 80 },
      { x: 240, y: 60, width: 80, height: 80 },
    ];

    const d = routeAround(obstacles, from, to);
    const pts = parsePoints(d);

    for (const obs of obstacles) {
      expect(polylineIntersectsBox(pts, obs)).toBe(false);
    }
  });

  it("obstacle not on path: returns simple orthogonal path", () => {
    // from (0,0) to (100,100), obstacle way off to the side
    const from = { x: 0, y: 0 };
    const to = { x: 100, y: 100 };
    const obstacle = { x: 500, y: 500, width: 50, height: 50 };

    const result = routeAround([obstacle], from, to);
    const expected = orthogonal(from, to);
    expect(result).toBe(expected);
  });
});
