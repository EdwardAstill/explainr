function fmt(n: number): string {
  // Round to 2 decimal places, then strip unnecessary trailing zeros
  const rounded = Math.round(n * 100) / 100;
  // Use toFixed to handle -0 and ensure consistent decimal representation,
  // then strip trailing zeros and unnecessary decimal point
  const s = rounded.toFixed(2).replace(/\.?0+$/, "");
  return s === "-0" ? "0" : s;
}

/**
 * Build an SVG path string for a polyline.
 * Returns "M x y L x y L x y ..." with coordinates rounded to 2dp.
 * Empty array → ""; single point → "M x y".
 */
export function polyline(points: readonly (readonly [number, number])[]): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points as [readonly [number, number], ...(readonly [number, number])[]];
  const parts: string[] = [`M ${fmt(first[0])} ${fmt(first[1])}`];
  for (const [x, y] of rest) {
    parts.push(`L ${fmt(x)} ${fmt(y)}`);
  }
  return parts.join(" ");
}
