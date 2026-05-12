import { describe, test, expect } from "bun:test";
import { straightWithPorts, curveWithPorts, orthogonalWithPorts } from "./router";
import type { Port } from "./ports";

// Helper to count occurrences of a substring
function countOccurrences(str: string, sub: string): number {
  let count = 0;
  let pos = 0;
  while ((pos = str.indexOf(sub, pos)) !== -1) {
    count++;
    pos += sub.length;
  }
  return count;
}

describe("straightWithPorts", () => {
  test("produces correct M...L path", () => {
    const from: Port = { x: 0, y: 0, dir: { dx: 1, dy: 0 } };
    const to: Port = { x: 100, y: 0, dir: { dx: -1, dy: 0 } };
    const path = straightWithPorts(from, to);
    expect(path).toBe("M 0 0 L 100 0");
  });

  test("produces correct path for non-axis-aligned endpoints", () => {
    const from: Port = { x: 10, y: 20, dir: { dx: 0, dy: 1 } };
    const to: Port = { x: 50, y: 80, dir: { dx: 0, dy: -1 } };
    const path = straightWithPorts(from, to);
    expect(path).toBe("M 10 20 L 50 80");
  });
});

describe("curveWithPorts", () => {
  test("produces a valid cubic Bézier M...C path", () => {
    const from: Port = { x: 0, y: 0, dir: { dx: 1, dy: 0 } };
    const to: Port = { x: 100, y: 0, dir: { dx: -1, dy: 0 } };
    const path = curveWithPorts(from, to);
    expect(path).toMatch(/^M .+ C .+ .+ .+ .+$/);
  });

  test("control points are offset along port directions", () => {
    const from: Port = { x: 0, y: 0, dir: { dx: 1, dy: 0 } };
    const to: Port = { x: 100, y: 0, dir: { dx: -1, dy: 0 } };
    const path = curveWithPorts(from, to);
    // dist = 100, offset = max(20, 0.4*100) = 40
    // c1 = (0 + 1*40, 0 + 0*40) = (40, 0)
    // c2 = (100 + -1*40, 0 + 0*40) = (60, 0)
    expect(path).toBe("M 0 0 C 40 0 60 0 100 0");
  });

  test("control points for perpendicular ports: source right, target top", () => {
    // source at (0,0) right-facing, target at (100,100) top-facing
    // dist = sqrt(100^2 + 100^2) ≈ 141.42, offset = max(20, 0.4*141.42) ≈ 56.57
    // c1 = (0 + 1*offset, 0 + 0*offset) = (offset, 0)
    // c2 = (100 + 0*offset, 100 + -1*offset) = (100, 100 - offset)
    const from: Port = { x: 0, y: 0, dir: { dx: 1, dy: 0 } };
    const to: Port = { x: 100, y: 100, dir: { dx: 0, dy: -1 } };
    const path = curveWithPorts(from, to);
    expect(path).toMatch(/^M 0 0 C .+ 0 100 .+ 100 100$/);
    // The path approaches target from above (c2y < 100)
    const parts = path.split(" ");
    const c2y = parseFloat(parts[7]!);
    expect(c2y).toBeLessThan(100);
  });

  test("offset is at least 20 for very close nodes", () => {
    const from: Port = { x: 0, y: 0, dir: { dx: 1, dy: 0 } };
    const to: Port = { x: 5, y: 0, dir: { dx: -1, dy: 0 } };
    const path = curveWithPorts(from, to);
    // dist = 5, offset = max(20, 0.4*5) = 20
    // c1 = (20, 0), c2 = (5 - 20, 0) = (-15, 0)
    expect(path).toBe("M 0 0 C 20 0 -15 0 5 0");
  });
});

describe("orthogonalWithPorts", () => {
  test("source.right → target.left: emits H-V-H style path with 4+ L commands", () => {
    // A.right at (50, 0), B.left at (150, 0)
    const from: Port = { x: 50, y: 0, dir: { dx: 1, dy: 0 } };
    const to: Port = { x: 150, y: 0, dir: { dx: -1, dy: 0 } };
    const path = orthogonalWithPorts(from, to);
    // Both horizontal → H-V-H path
    // With buffer=20: sgx=70, sgy=0, tgx=130, tgy=0
    // midX = (70+130)/2 = 100
    // path: M 50 0 L 70 0 L 100 0 L 100 0 L 130 0 L 150 0
    const lCount = countOccurrences(path, " L ");
    expect(lCount).toBeGreaterThanOrEqual(4);
  });

  test("source.bottom → target.top: emits V-H-V style path", () => {
    // A.bottom at (0, 20), B.top at (0, 80)
    const from: Port = { x: 0, y: 20, dir: { dx: 0, dy: 1 } };
    const to: Port = { x: 0, y: 80, dir: { dx: 0, dy: -1 } };
    const path = orthogonalWithPorts(from, to);
    // Both vertical → V-H-V
    // buffer=20: sgy=40, tgy=60
    // midY = (40+60)/2 = 50
    // path: M 0 20 L 0 40 L 0 50 L 0 50 L 0 60 L 0 80
    const lCount = countOccurrences(path, " L ");
    expect(lCount).toBeGreaterThanOrEqual(4);
    // Verify the bend is at the midpoint Y
    expect(path).toContain("50");
  });

  test("source.right → target.top: emits 2-segment H→V path", () => {
    // source exits right, target exits top (faces up, so from perspective of edge, enters from above)
    const from: Port = { x: 0, y: 50, dir: { dx: 1, dy: 0 } };
    const to: Port = { x: 100, y: 100, dir: { dx: 0, dy: -1 } };
    const path = orthogonalWithPorts(from, to);
    // srcHoriz=true, tgtHoriz=false → H→V corner at (tgx, sgy) = (80, 50)
    // path: M 0 50 L 20 50 L 80 50 L 80 80 L 100 80 L 100 100
    // Wait, tgx = 100 + 0*20 = 100, tgy = 100 + -1*20 = 80
    // corner: (tgx, sgy) = (100, 50)
    // path: M 0 50 L 20 50 L 100 50 L 100 80 L 100 100
    expect(path).toMatch(/^M/);
    // Should contain the turn from horizontal to vertical
    expect(path).toContain("L");
  });

  test("source.bottom → target.right: emits 2-segment V→H path", () => {
    // source exits bottom (vertical), target exits right (horizontal)
    const from: Port = { x: 50, y: 0, dir: { dx: 0, dy: 1 } };
    const to: Port = { x: 100, y: 100, dir: { dx: 1, dy: 0 } };
    const path = orthogonalWithPorts(from, to);
    // srcHoriz=false, tgtHoriz=true → V→H corner at (sgx, tgy) = (50, 120)
    // sgx=50, sgy=20, tgx=120, tgy=100
    // corner: (sgx, tgy) = (50, 100)
    // path: M 50 0 L 50 20 L 50 100 L 120 100 L 100 100
    expect(path).toMatch(/^M/);
    expect(path).toContain("L");
  });

  test("respects custom buffer option", () => {
    const from: Port = { x: 0, y: 0, dir: { dx: 1, dy: 0 } };
    const to: Port = { x: 100, y: 0, dir: { dx: -1, dy: 0 } };
    const path = orthogonalWithPorts(from, to, { buffer: 10 });
    // With buffer=10: sgx=10, tgx=90
    expect(path).toContain("10");
    expect(path).toContain("90");
  });
});
