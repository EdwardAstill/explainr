import { describe, it, expect } from "bun:test";
import { dag } from "./dag";
import type { DiagramNode, DiagramEdge } from "../types";

describe("dag layout", () => {
  it("1-node graph: node at rank 0 with default dimensions", () => {
    const nodes: DiagramNode[] = [{ id: "a" }];
    const edges: DiagramEdge[] = [];
    const result = dag(nodes, edges);

    expect(result.length).toBe(1);
    const a = result[0]!;
    expect(a.id).toBe("a");
    // Rank 0, only node in rank → centered (offset = 0 from the rank center)
    expect(a.y).toBe(0); // rank 0 * rankSeparation 120 = 0
    expect(a.width).toBe(100);
    expect(a.height).toBe(50);
  });

  it("3-node line a→b→c: assigns ranks 0, 1, 2", () => {
    const nodes: DiagramNode[] = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const edges: DiagramEdge[] = [
      { id: "e1", from: "a", to: "b" },
      { id: "e2", from: "b", to: "c" },
    ];
    const result = dag(nodes, edges);
    const byId = Object.fromEntries(result.map((n) => [n.id, n]));

    expect(byId["a"]!.y).toBe(0);   // rank 0
    expect(byId["b"]!.y).toBe(120); // rank 1
    expect(byId["c"]!.y).toBe(240); // rank 2

    // All single-node ranks → same x (centered)
    expect(byId["a"]!.x).toBe(byId["b"]!.x);
    expect(byId["b"]!.x).toBe(byId["c"]!.x);
  });

  it("diamond a→b, a→c, b→d, c→d: b and c on rank 1, d on rank 2", () => {
    const nodes: DiagramNode[] = [
      { id: "a" }, { id: "b" }, { id: "c" }, { id: "d" },
    ];
    const edges: DiagramEdge[] = [
      { id: "e1", from: "a", to: "b" },
      { id: "e2", from: "a", to: "c" },
      { id: "e3", from: "b", to: "d" },
      { id: "e4", from: "c", to: "d" },
    ];
    const result = dag(nodes, edges);
    const byId = Object.fromEntries(result.map((n) => [n.id, n]));

    expect(byId["a"]!.y).toBe(0);   // rank 0
    expect(byId["b"]!.y).toBe(120); // rank 1
    expect(byId["c"]!.y).toBe(120); // rank 1
    expect(byId["d"]!.y).toBe(240); // rank 2

    // b and c are in the same rank: different x positions
    expect(byId["b"]!.x).not.toBe(byId["c"]!.x);

    // d is in rank 2, a in rank 0, both single-node ranks: same x
    expect(byId["a"]!.x).toBe(byId["d"]!.x);
  });

  it("cycle a→b→a: throws with 'cycle' in the message", () => {
    const nodes: DiagramNode[] = [{ id: "a" }, { id: "b" }];
    const edges: DiagramEdge[] = [
      { id: "e1", from: "a", to: "b" },
      { id: "e2", from: "b", to: "a" },
    ];
    expect(() => dag(nodes, edges)).toThrow(/cycle/i);
  });

  it("cycle message mentions the edge id", () => {
    const nodes: DiagramNode[] = [{ id: "a" }, { id: "b" }];
    const edges: DiagramEdge[] = [
      { id: "edge-ab", from: "a", to: "b" },
      { id: "edge-ba", from: "b", to: "a" },
    ];
    let msg = "";
    try {
      dag(nodes, edges);
    } catch (e: unknown) {
      if (e instanceof Error) msg = e.message;
    }
    expect(msg).toMatch(/edge-ba|edge-ab/i);
  });

  it("custom opts applied: rankSeparation and nodeSeparation", () => {
    const nodes: DiagramNode[] = [{ id: "a" }, { id: "b" }];
    const edges: DiagramEdge[] = [{ id: "e1", from: "a", to: "b" }];
    const result = dag(nodes, edges, { rankSeparation: 200 });
    const byId = Object.fromEntries(result.map((n) => [n.id, n]));
    expect(byId["b"]!.y).toBe(200);
  });

  it("preserves user-supplied width/height on individual nodes", () => {
    const nodes: DiagramNode[] = [{ id: "a", width: 200, height: 80 }];
    const result = dag(nodes, []);
    expect(result[0]!.width).toBe(200);
    expect(result[0]!.height).toBe(80);
  });
});
