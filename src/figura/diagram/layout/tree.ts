/**
 * Tree layout using a "midpoint of children" recursive algorithm.
 *
 * This is a simplified variant of Reingold–Tilford. The full RT algorithm
 * uses contour-based spacing which guarantees no overlap even for unbalanced
 * trees. This simpler version:
 * - Recursively lays out each subtree.
 * - A leaf node is placed at the next available x slot for its level.
 * - An internal node is centered above its children (midpoint of leftmost
 *   and rightmost child x).
 *
 * The algorithm uses a per-level "cursor" to track the next available x
 * position, ensuring no siblings overlap while maintaining left-to-right
 * sibling order.
 *
 * Parents are always centered above their children. This satisfies the
 * Reingold–Tilford aesthetic criteria for the common cases (balanced and
 * moderately unbalanced trees).
 */

import type { DiagramNode, PositionedNode } from "../types";

interface TreeOpts {
  levelSeparation?: number;
  siblingSeparation?: number;
  defaultWidth?: number;
  defaultHeight?: number;
}

interface InternalNode {
  source: DiagramNode;
  children: InternalNode[];
  depth: number;
  x: number;
  y: number;
}

export function tree(
  rootNode: DiagramNode,
  childrenOf: (node: DiagramNode) => DiagramNode[],
  opts?: TreeOpts,
): PositionedNode[] {
  const levelSep = opts?.levelSeparation ?? 100;
  const siblingSep = opts?.siblingSeparation ?? 40;
  const defW = opts?.defaultWidth ?? 100;
  const defH = opts?.defaultHeight ?? 50;

  // Per-depth cursor: tracks the next available x position at each depth
  const nextX: Map<number, number> = new Map();

  function buildTree(node: DiagramNode, depth: number): InternalNode {
    const children = childrenOf(node).map((c) => buildTree(c, depth + 1));

    const internal: InternalNode = {
      source: node,
      children,
      depth,
      x: 0,
      y: depth * levelSep,
    };

    if (children.length === 0) {
      // Leaf: place at the next available slot for this depth
      const cur = nextX.get(depth) ?? 0;
      internal.x = cur;
      nextX.set(depth, cur + defW + siblingSep);
    } else {
      // Internal: center above children
      const leftX = children[0]!.x;
      const rightX = children[children.length - 1]!.x;
      internal.x = (leftX + rightX) / 2;

      // Ensure internal node doesn't regress the depth cursor
      const cur = nextX.get(depth) ?? 0;
      if (internal.x + defW / 2 > cur) {
        nextX.set(depth, internal.x + defW + siblingSep);
      }
    }

    return internal;
  }

  const root = buildTree(rootNode, 0);

  // Collect all nodes in a flat list
  const result: PositionedNode[] = [];
  function collect(n: InternalNode): void {
    const node = n.source;
    result.push({
      ...node,
      x: n.x,
      y: n.y,
      width: (node.width as number | undefined) ?? defW,
      height: (node.height as number | undefined) ?? defH,
    });
    for (const c of n.children) collect(c);
  }
  collect(root);

  return result;
}
