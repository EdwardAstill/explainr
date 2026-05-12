/**
 * Force-directed layout for diagram nodes.
 *
 * Wraps `src/math/force.ts` (`forceStep`) with a diagram-shaped API.
 * Initialises node positions with a seeded mulberry32 RNG so the layout
 * is deterministic for the same seed.
 */

import type { DiagramNode, DiagramEdge, PositionedNode } from "../types";
import { forceStep } from "../../math/force";
import { mulberry32 } from "../../math/random";

interface ForceOpts {
  iterations?: number;
  width?: number;
  height?: number;
  seed?: number;
  defaultWidth?: number;
  defaultHeight?: number;
}

export function force(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  opts?: ForceOpts,
): PositionedNode[] {
  if (nodes.length === 0) return [];

  const iterations = opts?.iterations ?? 300;
  const width = opts?.width ?? 800;
  const height = opts?.height ?? 600;
  const seed = opts?.seed ?? 1;
  const defW = opts?.defaultWidth ?? 100;
  const defH = opts?.defaultHeight ?? 50;

  const rng = mulberry32(seed);

  // Build index of node ids → numeric indices
  const indexById = new Map<string, number>(nodes.map((n, i) => [n.id, i]));

  // Initialise ForceNode positions randomly (seeded)
  const forceNodes = nodes.map((_n, i) => ({
    id: i,
    x: width / 2 + (rng() - 0.5) * 200,
    y: height / 2 + (rng() - 0.5) * 200,
    vx: 0,
    vy: 0,
  }));

  // Map DiagramEdge ids to numeric ForceEdge indices
  const forceEdges = edges
    .map((e) => {
      const s = indexById.get(e.from);
      const t = indexById.get(e.to);
      if (s === undefined || t === undefined) return null;
      return { s, t };
    })
    .filter((e): e is { s: number; t: number } => e !== null);

  const cfg = { width, height };

  for (let i = 0; i < iterations; i++) {
    forceStep(forceNodes, forceEdges, cfg);
  }

  // Map back to PositionedNodes
  return nodes.map((node, i) => ({
    ...node,
    x: forceNodes[i]!.x,
    y: forceNodes[i]!.y,
    width: (node.width as number | undefined) ?? defW,
    height: (node.height as number | undefined) ?? defH,
  }));
}
