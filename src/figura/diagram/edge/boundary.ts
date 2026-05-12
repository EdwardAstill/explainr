import type { PositionedNode } from "../types";

/** Find the point on the boundary of `node` along the ray from the node's
 *  center toward (towardX, towardY). Shape-aware: rect / circle / ellipse / diamond.
 *  If the ray has zero length (toward == center), returns the center. */
export function nodeBoundaryPoint(
  node: Pick<PositionedNode, "x" | "y" | "width" | "height"> & { shape?: string },
  towardX: number,
  towardY: number,
): { x: number; y: number } {
  const cx = node.x;
  const cy = node.y;
  const dx = towardX - cx;
  const dy = towardY - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };

  const shape = node.shape ?? "rect";
  const w = node.width;
  const h = node.height;

  if (shape === "circle") {
    const r = Math.min(w, h) / 2;
    const len = Math.hypot(dx, dy);
    return { x: cx + (dx / len) * r, y: cy + (dy / len) * r };
  }

  if (shape === "ellipse") {
    const rx = w / 2;
    const ry = h / 2;
    // Solve ((dx*t)/rx)^2 + ((dy*t)/ry)^2 = 1 for t.
    const t = 1 / Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));
    return { x: cx + dx * t, y: cy + dy * t };
  }

  if (shape === "diamond") {
    // Diamond with vertices at (cx ± w/2, cy) and (cx, cy ± h/2).
    // Boundary equation: |x-cx|/(w/2) + |y-cy|/(h/2) = 1.
    const w2 = w / 2;
    const h2 = h / 2;
    const t = 1 / (Math.abs(dx) / w2 + Math.abs(dy) / h2);
    return { x: cx + dx * t, y: cy + dy * t };
  }

  // rect: clip to the rectangle.
  const w2 = w / 2;
  const h2 = h / 2;
  const sx = dx === 0 ? Infinity : w2 / Math.abs(dx);
  const sy = dy === 0 ? Infinity : h2 / Math.abs(dy);
  const t = Math.min(sx, sy);
  return { x: cx + dx * t, y: cy + dy * t };
}
