import { describe, expect, test } from "bun:test";
import { arc } from "./arc";

describe("arc", () => {
  test("quarter arc 0 to π/2: starts at (10,0), ends at (0,10)", () => {
    const d = arc({ cx: 0, cy: 0, r: 10, startAngle: 0, endAngle: Math.PI / 2 });
    expect(d).toMatch(/^M 10 0/);
    // end point: cos(π/2)=0, sin(π/2)=1 → (0, 10)
    expect(d).toMatch(/0 10$/);
  });

  test("quarter arc contains 'A 10 10 0'", () => {
    const d = arc({ cx: 0, cy: 0, r: 10, startAngle: 0, endAngle: Math.PI / 2 });
    expect(d).toContain("A 10 10 0");
  });

  test("half arc 0 to π: largeArc auto = 0 (not strictly > π)", () => {
    const d = arc({ cx: 0, cy: 0, r: 10, startAngle: 0, endAngle: Math.PI });
    // span === π, not strictly greater, so largeArc = 0
    expect(d).toContain("A 10 10 0 0");
  });

  test("three-quarter arc 0 to 3π/2: largeArc auto = 1", () => {
    const d = arc({ cx: 0, cy: 0, r: 10, startAngle: 0, endAngle: (3 * Math.PI) / 2 });
    expect(d).toContain("A 10 10 0 1");
  });

  test("negative r throws", () => {
    expect(() => arc({ cx: 0, cy: 0, r: -5, startAngle: 0, endAngle: 1 })).toThrow();
    expect(() => arc({ cx: 0, cy: 0, r: 0, startAngle: 0, endAngle: 1 })).toThrow();
  });

  test("full circle (2π): returns two semi-arcs", () => {
    const d = arc({ cx: 0, cy: 0, r: 10, startAngle: 0, endAngle: 2 * Math.PI });
    // Should have two A commands
    const aCount = (d.match(/\bA\b/g) || []).length;
    expect(aCount).toBe(2);
  });

  test("output has 2-decimal precision on coords", () => {
    const d = arc({ cx: 0, cy: 0, r: 10, startAngle: 0, endAngle: Math.PI / 4 });
    // cos(π/4) = sin(π/4) ≈ 7.07 (2dp)
    expect(d).toMatch(/7\.07/);
  });

  test("cx/cy offset is applied to start and end points", () => {
    const d = arc({ cx: 5, cy: 5, r: 10, startAngle: 0, endAngle: Math.PI / 2 });
    // start: (5+10, 5+0) = (15, 5); end: (5+0, 5+10) = (5, 15)
    expect(d).toMatch(/^M 15 5/);
    expect(d).toMatch(/5 15$/);
  });
});
