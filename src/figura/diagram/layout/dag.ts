/**
 * Top-down DAG layout (Sugiyama-lite).
 *
 * Algorithm:
 * 1. Topological sort using Kahn's algorithm (detects cycles).
 *    Each node's rank = the length of the longest path from any root to that node.
 * 2. Within each rank, nodes are ordered by their id string (deterministic).
 * 3. Position:
 *    y = rank * rankSeparation
 *    x = centered within the rank:
 *      offset = -(totalRankWidth - nodeWidth) / 2  (leftmost)
 *      then each node placed at: offset + index * (defaultWidth + nodeSeparation)
 * 4. Throws on cycles, mentioning the edge id that introduced the cycle.
 */

import type { DiagramNode, DiagramEdge, PositionedNode } from "../types";

interface DagOpts {
  rankSeparation?: number;
  nodeSeparation?: number;
  defaultWidth?: number;
  defaultHeight?: number;
}

export function dag(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  opts?: DagOpts,
): PositionedNode[] {
  const rankSep = opts?.rankSeparation ?? 120;
  const nodeSep = opts?.nodeSeparation ?? 40;
  const defW = opts?.defaultWidth ?? 100;
  const defH = opts?.defaultHeight ?? 50;

  if (nodes.length === 0) return [];

  const nodeIds = new Set(nodes.map((n) => n.id));

  // Build adjacency and in-degree maps
  const outEdges = new Map<string, string[]>(); // id → child ids
  const inDegree = new Map<string, number>();
  const edgeByTo = new Map<string, DiagramEdge>(); // first edge arriving at each node

  for (const n of nodes) {
    outEdges.set(n.id, []);
    inDegree.set(n.id, 0);
  }

  for (const e of edges) {
    if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) continue;
    outEdges.get(e.from)!.push(e.to);
    inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
    if (!edgeByTo.has(e.to)) edgeByTo.set(e.to, e);
  }

  // Kahn's topological sort + longest-path rank assignment
  const rank = new Map<string, number>();
  const queue: string[] = [];

  for (const n of nodes) {
    if ((inDegree.get(n.id) ?? 0) === 0) {
      queue.push(n.id);
      rank.set(n.id, 0);
    }
  }

  const sorted: string[] = [];

  while (queue.length > 0) {
    // Sort queue for determinism (process alphabetically)
    queue.sort();
    const id = queue.shift()!;
    sorted.push(id);

    for (const childId of (outEdges.get(id) ?? [])) {
      // Longest path: rank[child] = max(rank[child], rank[id] + 1)
      const newRank = (rank.get(id) ?? 0) + 1;
      if (!rank.has(childId) || rank.get(childId)! < newRank) {
        rank.set(childId, newRank);
      }

      const newIn = (inDegree.get(childId) ?? 0) - 1;
      inDegree.set(childId, newIn);
      if (newIn === 0) {
        queue.push(childId);
      }
    }
  }

  // Cycle detection: any node not in sorted has a cycle
  if (sorted.length !== nodes.length) {
    // Find a node involved in the cycle and a back-edge
    for (const e of edges) {
      if ((rank.get(e.from) ?? -1) >= (rank.get(e.to) ?? -1) && sorted.includes(e.from)) {
        // This edge points to an unprocessed or lower-rank node
      }
    }
    // Find edges whose "to" node was never processed (still has in-degree > 0)
    const unprocessed = new Set(nodes.map((n) => n.id).filter((id) => !sorted.includes(id)));
    for (const e of edges) {
      if (unprocessed.has(e.to) || unprocessed.has(e.from)) {
        throw new Error(
          `dag layout: cycle detected. Edge "${e.id}" (${e.from} → ${e.to}) is part of a cycle.`,
        );
      }
    }
    throw new Error("dag layout: cycle detected in the graph.");
  }

  // Group nodes by rank
  const rankGroups = new Map<number, string[]>();
  for (const [id, r] of rank.entries()) {
    if (!rankGroups.has(r)) rankGroups.set(r, []);
    rankGroups.get(r)!.push(id);
  }

  // Sort within each rank by id (deterministic)
  for (const group of rankGroups.values()) {
    group.sort();
  }

  // Build indexed node lookup
  const nodeById = new Map<string, DiagramNode>(nodes.map((n) => [n.id, n]));

  // Compute positions
  const positioned = new Map<string, PositionedNode>();

  for (const [r, group] of rankGroups.entries()) {
    const n = group.length;
    // Total width of this rank
    const totalWidth = n * defW + (n - 1) * nodeSep;
    const startX = -totalWidth / 2 + defW / 2; // x of center of first node

    for (let i = 0; i < group.length; i++) {
      const id = group[i]!;
      const node = nodeById.get(id)!;
      const w = (node.width as number | undefined) ?? defW;
      const h = (node.height as number | undefined) ?? defH;
      positioned.set(id, {
        ...node,
        x: startX + i * (defW + nodeSep),
        y: r * rankSep,
        width: w,
        height: h,
      });
    }
  }

  // Return in original node order
  return nodes.map((n) => positioned.get(n.id)!);
}
