import { describe, it, expect } from "bun:test";
import { force } from "./force";
import type { DiagramNode, DiagramEdge } from "../types";

describe("force layout", () => {
  it("determinism: same input + same seed → identical output", () => {
    const nodes: DiagramNode[] = [
      { id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" },
    ];
    const edges: DiagramEdge[] = [
      { id: "e1", from: "a", to: "b" },
      { id: "e2", from: "b", to: "c" },
      { id: "e3", from: "c", to: "d" },
      { id: "e4", from: "d", to: "e" },
    ];

    const r1 = force(nodes, edges, { seed: 42 });
    const r2 = force(nodes, edges, { seed: 42 });

    for (let i = 0; i < r1.length; i++) {
      expect(r1[i]!.x).toBeCloseTo(r2[i]!.x, 6);
      expect(r1[i]!.y).toBeCloseTo(r2[i]!.y, 6);
    }
  });

  it("different seeds produce different positions", () => {
    const nodes: DiagramNode[] = [
      { id: "a" }, { id: "b" }, { id: "c" },
    ];
    const edges: DiagramEdge[] = [];
    const r1 = force(nodes, edges, { seed: 1 });
    const r2 = force(nodes, edges, { seed: 99 });

    // At least one node should differ between seeds
    const allSame = r1.every((n, i) =>
      Math.abs(n.x - r2[i]!.x) < 1e-6 && Math.abs(n.y - r2[i]!.y) < 1e-6
    );
    expect(allSame).toBe(false);
  });

  it("connected graph spreads out: not all positions identical", () => {
    const nodes: DiagramNode[] = [
      { id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" },
    ];
    // Fully-connected graph
    const edges: DiagramEdge[] = [
      { id: "e1", from: "a", to: "b" },
      { id: "e2", from: "a", to: "c" },
      { id: "e3", from: "a", to: "d" },
      { id: "e4", from: "a", to: "e" },
      { id: "e5", from: "b", to: "c" },
      { id: "e6", from: "b", to: "d" },
      { id: "e7", from: "b", to: "e" },
      { id: "e8", from: "c", to: "d" },
      { id: "e9", from: "c", to: "e" },
      { id: "e10", from: "d", to: "e" },
    ];

    const result = force(nodes, edges, { seed: 42, iterations: 300 });

    // Collect pairwise distances
    let hasSpread = false;
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const dx = result[i]!.x - result[j]!.x;
        const dy = result[i]!.y - result[j]!.y;
        if (Math.hypot(dx, dy) > 10) {
          hasSpread = true;
          break;
        }
      }
      if (hasSpread) break;
    }
    expect(hasSpread).toBe(true);
  });

  it("returns all input nodes with required PositionedNode fields", () => {
    const nodes: DiagramNode[] = [{ id: "x" }, { id: "y" }];
    const result = force(nodes, [], { seed: 1 });
    expect(result.length).toBe(2);
    for (const n of result) {
      expect(typeof n.x).toBe("number");
      expect(typeof n.y).toBe("number");
      expect(typeof n.width).toBe("number");
      expect(typeof n.height).toBe("number");
    }
  });

  it("empty nodes returns empty array", () => {
    const result = force([], [], { seed: 1 });
    expect(result.length).toBe(0);
  });
});
