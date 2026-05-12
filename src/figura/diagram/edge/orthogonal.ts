/**
 * Produces an orthogonal (Manhattan) L-shaped SVG path.
 * Uses sharp corners (M and L only, no Q rounding — keep it simple).
 *
 * `auto` picks the longer dimension first:
 *   |dx| >= |dy| → horizontal-first
 *   |dy| > |dx|  → vertical-first
 *
 * When from and to share the same row or column, a straight 2-point
 * path is returned.
 */
export function orthogonal(
  from: { x: number; y: number },
  to: { x: number; y: number },
  opts?: { axis?: "horizontal-first" | "vertical-first" | "auto" },
): string {
  const axis = opts?.axis ?? "auto";
  const fx = from.x;
  const fy = from.y;
  const tx = to.x;
  const ty = to.y;

  const dx = Math.abs(tx - fx);
  const dy = Math.abs(ty - fy);

  // Degenerate: same row
  if (Math.abs(ty - fy) < 1e-9) {
    return `M ${fx.toFixed(2)} ${fy.toFixed(2)} L ${tx.toFixed(2)} ${ty.toFixed(2)}`;
  }

  // Degenerate: same column
  if (Math.abs(tx - fx) < 1e-9) {
    return `M ${fx.toFixed(2)} ${fy.toFixed(2)} L ${tx.toFixed(2)} ${ty.toFixed(2)}`;
  }

  // Resolve axis
  let resolved: "horizontal-first" | "vertical-first";
  if (axis === "horizontal-first") {
    resolved = "horizontal-first";
  } else if (axis === "vertical-first") {
    resolved = "vertical-first";
  } else {
    // auto: longer dimension first
    resolved = dx >= dy ? "horizontal-first" : "vertical-first";
  }

  if (resolved === "horizontal-first") {
    // Go horizontal to (tx, fy) then vertical to (tx, ty)
    return `M ${fx.toFixed(2)} ${fy.toFixed(2)} L ${tx.toFixed(2)} ${fy.toFixed(2)} L ${tx.toFixed(2)} ${ty.toFixed(2)}`;
  } else {
    // Go vertical to (fx, ty) then horizontal to (tx, ty)
    return `M ${fx.toFixed(2)} ${fy.toFixed(2)} L ${fx.toFixed(2)} ${ty.toFixed(2)} L ${tx.toFixed(2)} ${ty.toFixed(2)}`;
  }
}
