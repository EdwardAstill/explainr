/**
 * Produces a straight-line SVG path string from `from` to `to`.
 * Coordinates are rounded to 2 decimal places to keep paths short.
 */
export function straight(
  from: { x: number; y: number },
  to: { x: number; y: number },
): string {
  const fx = from.x.toFixed(2);
  const fy = from.y.toFixed(2);
  const tx = to.x.toFixed(2);
  const ty = to.y.toFixed(2);
  return `M ${fx} ${fy} L ${tx} ${ty}`;
}
