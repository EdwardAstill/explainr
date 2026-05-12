import { describe, it, expect } from "bun:test";
import { tree } from "./tree";
import type { DiagramNode } from "../types";

describe("tree layout", () => {
  it("single node: placed at origin (x=0, y=0)", () => {
    const root: DiagramNode = { id: "root" };
    const result = tree(root, () => [], {});
    expect(result.length).toBe(1);
    expect(result[0]!.id).toBe("root");
    expect(result[0]!.x).toBe(0);
    expect(result[0]!.y).toBe(0);
  });

  it("linear chain of 3 levels: nodes form a straight vertical line", () => {
    const nodes: Record<string, DiagramNode> = {
      a: { id: "a" },
      b: { id: "b" },
      c: { id: "c" },
    };
    const childrenOf = (n: DiagramNode) => {
      if (n.id === "a") return [nodes["b"]!];
      if (n.id === "b") return [nodes["c"]!];
      return [];
    };
    const result = tree(nodes["a"]!, childrenOf);
    const byId = Object.fromEntries(result.map((n) => [n.id, n]));

    // All x positions should be equal (straight line)
    expect(byId["a"]!.x).toBeCloseTo(byId["b"]!.x);
    expect(byId["b"]!.x).toBeCloseTo(byId["c"]!.x);

    // y positions should increase by levelSeparation
    expect(byId["a"]!.y).toBe(0);
    expect(byId["b"]!.y).toBe(100); // default levelSeparation
    expect(byId["c"]!.y).toBe(200);
  });

  it("balanced binary tree depth 2: root centered above two children", () => {
    const nodes: Record<string, DiagramNode> = {
      root: { id: "root" },
      left: { id: "left" },
      right: { id: "right" },
    };
    const childrenOf = (n: DiagramNode) => {
      if (n.id === "root") return [nodes["left"]!, nodes["right"]!];
      return [];
    };
    const result = tree(nodes["root"]!, childrenOf);
    const byId = Object.fromEntries(result.map((n) => [n.id, n]));

    // Root should be centered between left and right
    const midX = (byId["left"]!.x + byId["right"]!.x) / 2;
    expect(byId["root"]!.x).toBeCloseTo(midX);

    // Root at y=0, children at y=100
    expect(byId["root"]!.y).toBe(0);
    expect(byId["left"]!.y).toBe(100);
    expect(byId["right"]!.y).toBe(100);

    // Left and right separated by siblingSeparation
    expect(byId["right"]!.x - byId["left"]!.x).toBeGreaterThan(0);
  });

  it("asymmetric: root→child1, child1→grandchild1, child1→grandchild2 — root x between grandchildren range", () => {
    const nodes: Record<string, DiagramNode> = {
      root: { id: "root" },
      child1: { id: "child1" },
      gc1: { id: "gc1" },
      gc2: { id: "gc2" },
    };
    const childrenOf = (n: DiagramNode) => {
      if (n.id === "root") return [nodes["child1"]!];
      if (n.id === "child1") return [nodes["gc1"]!, nodes["gc2"]!];
      return [];
    };
    const result = tree(nodes["root"]!, childrenOf);
    const byId = Object.fromEntries(result.map((n) => [n.id, n]));

    const gcMinX = Math.min(byId["gc1"]!.x, byId["gc2"]!.x);
    const gcMaxX = Math.max(byId["gc1"]!.x, byId["gc2"]!.x);

    // Root x should be within grandchildren's x range
    expect(byId["root"]!.x).toBeGreaterThanOrEqual(gcMinX);
    expect(byId["root"]!.x).toBeLessThanOrEqual(gcMaxX);
  });

  it("applies default dimensions to nodes", () => {
    const root: DiagramNode = { id: "root" };
    const result = tree(root, () => []);
    expect(result[0]!.width).toBe(100);
    expect(result[0]!.height).toBe(50);
  });

  it("respects custom levelSeparation", () => {
    const nodes: Record<string, DiagramNode> = {
      a: { id: "a" },
      b: { id: "b" },
    };
    const childrenOf = (n: DiagramNode) => n.id === "a" ? [nodes["b"]!] : [];
    const result = tree(nodes["a"]!, childrenOf, { levelSeparation: 200 });
    const byId = Object.fromEntries(result.map((n) => [n.id, n]));
    expect(byId["b"]!.y).toBe(200);
  });
});
