/**
 * Produces a cubic Bézier SVG path string.
 *
 * Control points are placed perpendicular to the from→to direction,
 * each offset by `tension * distance` in the direction perpendicular
 * and rotated 90° to the RIGHT of the from→to vector. This means
 * for a left-to-right edge the curve bows downward, and for a
 * top-to-bottom edge the curve bows to the right.
 *
 * The two control points are placed at 1/3 and 2/3 along the line,
 * offset perpendicularly — giving a smooth S-shape for curves going
 * in the same direction, and a nice arc for straight edges.
 */
export function curve(
  from: { x: number; y: number },
  to: { x: number; y: number },
  opts?: { tension?: number },
): string {
  const tension = opts?.tension ?? 0.4;
  const fx = from.x;
  const fy = from.y;
  const tx = to.x;
  const ty = to.y;

  const dx = tx - fx;
  const dy = ty - fy;
  const dist = Math.hypot(dx, dy);

  if (dist < 1e-9) {
    // Degenerate case: from and to are the same point.
    return `M ${fx.toFixed(2)} ${fy.toFixed(2)} C ${fx.toFixed(2)} ${fy.toFixed(2)} ${fx.toFixed(2)} ${fy.toFixed(2)} ${tx.toFixed(2)} ${ty.toFixed(2)}`;
  }

  // Unit vector along from→to
  const ux = dx / dist;
  const uy = dy / dist;

  // Perpendicular unit vector (right of from→to direction)
  const px = uy;   // rotate 90° clockwise: (ux, uy) → (uy, -ux)
  const py = -ux;

  // Offset magnitude
  const offset = tension * dist;

  // cp1: 1/3 along the line + perpendicular offset
  const cp1x = fx + dx / 3 + px * offset;
  const cp1y = fy + dy / 3 + py * offset;

  // cp2: 2/3 along the line + perpendicular offset
  const cp2x = fx + (2 * dx) / 3 + px * offset;
  const cp2y = fy + (2 * dy) / 3 + py * offset;

  return `M ${fx.toFixed(2)} ${fy.toFixed(2)} C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)} ${cp2x.toFixed(2)} ${cp2y.toFixed(2)} ${tx.toFixed(2)} ${ty.toFixed(2)}`;
}
