import type { PositionedNode } from "../types";

export type PortName = "top" | "right" | "bottom" | "left";

export interface Port {
  x: number;
  y: number;
  dir: { dx: number; dy: number };
}

/** Compute the 4 cardinal ports for a node (midpoints of bounding-box sides). */
export function nodePorts(node: Pick<PositionedNode, "x" | "y" | "width" | "height">): Record<PortName, Port> {
  const { x: cx, y: cy, width, height } = node;
  const w2 = width / 2;
  const h2 = height / 2;
  return {
    top:    { x: cx,       y: cy - h2, dir: { dx: 0,  dy: -1 } },
    right:  { x: cx + w2,  y: cy,      dir: { dx: 1,  dy: 0  } },
    bottom: { x: cx,       y: cy + h2, dir: { dx: 0,  dy: 1  } },
    left:   { x: cx - w2,  y: cy,      dir: { dx: -1, dy: 0  } },
  };
}

/** Pick the port whose outward direction is most aligned with `targetVec`.
 *  If `exclude` is provided, ports in the set are skipped. If all four are
 *  excluded, returns the highest-scoring port anyway (best-effort fallback). */
export function selectPort(
  ports: Record<PortName, Port>,
  targetVec: { x: number; y: number },
  exclude?: ReadonlySet<PortName>,
): { name: PortName; port: Port } {
  const len = Math.hypot(targetVec.x, targetVec.y) || 1;
  const tx = targetVec.x / len;
  const ty = targetVec.y / len;

  const ranked = (Object.keys(ports) as PortName[])
    .map((name) => ({
      name,
      port: ports[name],
      score: ports[name].dir.dx * tx + ports[name].dir.dy * ty,
    }))
    .sort((a, b) => b.score - a.score);

  if (exclude && exclude.size > 0) {
    const free = ranked.find((r) => !exclude.has(r.name));
    if (free) return { name: free.name, port: free.port };
    // Fallback: all excluded — return the top-scoring one anyway so an edge
    // is still drawn even in over-saturated nodes.
  }
  const top = ranked[0]!;
  return { name: top.name, port: top.port };
}

/** Select source + target ports for an edge between two nodes. Optionally
 *  exclude already-used ports on each side so two edges sharing a node don't
 *  collide on the same port. Returns names so callers can record usage. */
export function selectEdgePorts(
  fromNode: Pick<PositionedNode, "x" | "y" | "width" | "height">,
  toNode: Pick<PositionedNode, "x" | "y" | "width" | "height">,
  opts?: {
    excludeFrom?: ReadonlySet<PortName>;
    excludeTo?: ReadonlySet<PortName>;
  },
): { from: Port; to: Port; fromName: PortName; toName: PortName } {
  const dx = toNode.x - fromNode.x;
  const dy = toNode.y - fromNode.y;
  const fromPorts = nodePorts(fromNode);
  const toPorts = nodePorts(toNode);
  const fromSel = selectPort(fromPorts, { x: dx, y: dy }, opts?.excludeFrom);
  const toSel = selectPort(toPorts, { x: -dx, y: -dy }, opts?.excludeTo);
  return { from: fromSel.port, to: toSel.port, fromName: fromSel.name, toName: toSel.name };
}
