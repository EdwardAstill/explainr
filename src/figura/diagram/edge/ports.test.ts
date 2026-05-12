import { describe, test, expect } from "bun:test";
import { nodePorts, selectPort, selectEdgePorts } from "./ports";

describe("nodePorts", () => {
  test("returns correct positions for a 100x40 node centered at (50, 30)", () => {
    const ports = nodePorts({ x: 50, y: 30, width: 100, height: 40 });

    // top: midpoint of top edge → (50, 30 - 20) = (50, 10)
    expect(ports.top.x).toBe(50);
    expect(ports.top.y).toBe(10);
    expect(ports.top.dir).toEqual({ dx: 0, dy: -1 });

    // right: midpoint of right edge → (50 + 50, 30) = (100, 30)
    expect(ports.right.x).toBe(100);
    expect(ports.right.y).toBe(30);
    expect(ports.right.dir).toEqual({ dx: 1, dy: 0 });

    // bottom: midpoint of bottom edge → (50, 30 + 20) = (50, 50)
    expect(ports.bottom.x).toBe(50);
    expect(ports.bottom.y).toBe(50);
    expect(ports.bottom.dir).toEqual({ dx: 0, dy: 1 });

    // left: midpoint of left edge → (50 - 50, 30) = (0, 30)
    expect(ports.left.x).toBe(0);
    expect(ports.left.y).toBe(30);
    expect(ports.left.dir).toEqual({ dx: -1, dy: 0 });
  });
});

describe("selectPort", () => {
  const ports = nodePorts({ x: 0, y: 0, width: 100, height: 40 });

  test("picks right when target is (100, 0)", () => {
    const result = selectPort(ports, { x: 100, y: 0 });
    expect(result.name).toBe("right");
  });

  test("picks bottom when target is (0, 100)", () => {
    const result = selectPort(ports, { x: 0, y: 100 });
    expect(result.name).toBe("bottom");
  });

  test("picks left when target is (-100, 0)", () => {
    const result = selectPort(ports, { x: -100, y: 0 });
    expect(result.name).toBe("left");
  });

  test("picks top when target is (0, -100)", () => {
    const result = selectPort(ports, { x: 0, y: -100 });
    expect(result.name).toBe("top");
  });
});

describe("selectEdgePorts", () => {
  test("A at (0,0) 100x40, B at (200,0) 100x40 → from=right, to=left", () => {
    const A = { x: 0, y: 0, width: 100, height: 40 };
    const B = { x: 200, y: 0, width: 100, height: 40 };
    const { from, to } = selectEdgePorts(A, B);

    // from should be A.right: (0 + 50, 0) = (50, 0)
    expect(from.x).toBe(50);
    expect(from.y).toBe(0);
    expect(from.dir).toEqual({ dx: 1, dy: 0 });

    // to should be B.left: (200 - 50, 0) = (150, 0)
    expect(to.x).toBe(150);
    expect(to.y).toBe(0);
    expect(to.dir).toEqual({ dx: -1, dy: 0 });
  });

  test("A at (0,0), B at (0,200) → from=bottom, to=top", () => {
    const A = { x: 0, y: 0, width: 100, height: 40 };
    const B = { x: 0, y: 200, width: 100, height: 40 };
    const { from, to } = selectEdgePorts(A, B);

    expect(from.dir).toEqual({ dx: 0, dy: 1 });   // bottom
    expect(to.dir).toEqual({ dx: 0, dy: -1 });     // top
  });

  test("diagonal: A at (0,0), B at (200,100) → dx dominates → from=right, to=left", () => {
    const A = { x: 0, y: 0, width: 100, height: 40 };
    const B = { x: 200, y: 100, width: 100, height: 40 };
    const { from, to } = selectEdgePorts(A, B);

    // dx=200, dy=100 → rightward component dominates
    expect(from.dir).toEqual({ dx: 1, dy: 0 });    // right
    expect(to.dir).toEqual({ dx: -1, dy: 0 });     // left
  });

  test("excludeFrom forces a different source port even if first-best is taken", () => {
    const A = { x: 0, y: 0, width: 100, height: 40 };
    const B = { x: 200, y: 0, width: 100, height: 40 };
    // Without exclusion, A→B would pick A.right.
    // Mark A.right as already used; selector should pick the next-best port that
    // still aligns with the target direction (here: A.top or A.bottom — either
    // is acceptable since they're equally aligned with the +x displacement).
    const { fromName } = selectEdgePorts(A, B, { excludeFrom: new Set(["right"]) });
    expect(fromName).not.toBe("right");
  });

  test("excludeTo forces a different target port", () => {
    const A = { x: 0, y: 0, width: 100, height: 40 };
    const B = { x: 200, y: 0, width: 100, height: 40 };
    // Without exclusion, target picks B.left. Mark left as used.
    const { toName } = selectEdgePorts(A, B, { excludeTo: new Set(["left"]) });
    expect(toName).not.toBe("left");
  });

  test("when all ports excluded, falls back to top-scoring (best-effort)", () => {
    const A = { x: 0, y: 0, width: 100, height: 40 };
    const B = { x: 200, y: 0, width: 100, height: 40 };
    const all = new Set(["top", "right", "bottom", "left"] as const);
    const { fromName } = selectEdgePorts(A, B, { excludeFrom: all });
    // Falls back to right (best-scoring) even though it's in the exclusion set.
    expect(fromName).toBe("right");
  });
});
