function fmt(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  const s = rounded.toFixed(2).replace(/\.?0+$/, "");
  return s === "-0" ? "0" : s;
}

export interface ArcOpts {
  cx: number;
  cy: number;
  r: number;
  startAngle: number; // radians; 0 = +x axis
  endAngle: number;   // radians
  largeArc?: boolean; // default auto: true if span > π
  sweep?: 0 | 1;      // SVG sweep flag, default 1 (clockwise)
}

/**
 * Build an SVG path string for a circular arc.
 * For full circles (span === 2π), returns two concatenated semi-arcs.
 * Coordinates are rounded to 2 decimal places.
 */
export function arc(opts: ArcOpts): string {
  const { cx, cy, r, startAngle, endAngle, sweep = 1 } = opts;

  if (r <= 0) {
    throw new Error(`arc: r must be > 0, got ${r}`);
  }

  const span = endAngle - startAngle;
  const TWO_PI = 2 * Math.PI;

  // Full circle: SVG can't draw a full circle with one A command (start === end).
  // Split into two semi-arcs.
  if (Math.abs(Math.abs(span) - TWO_PI) < 1e-10) {
    const midAngle = startAngle + Math.PI * Math.sign(span || 1);
    const sx = cx + r * Math.cos(startAngle);
    const sy = cy + r * Math.sin(startAngle);
    const mx = cx + r * Math.cos(midAngle);
    const my = cy + r * Math.sin(midAngle);
    const ex = cx + r * Math.cos(endAngle);
    const ey = cy + r * Math.sin(endAngle);

    return (
      `M ${fmt(sx)} ${fmt(sy)} ` +
      `A ${fmt(r)} ${fmt(r)} 0 0 ${sweep} ${fmt(mx)} ${fmt(my)} ` +
      `A ${fmt(r)} ${fmt(r)} 0 0 ${sweep} ${fmt(ex)} ${fmt(ey)}`
    );
  }

  const sx = cx + r * Math.cos(startAngle);
  const sy = cy + r * Math.sin(startAngle);
  const ex = cx + r * Math.cos(endAngle);
  const ey = cy + r * Math.sin(endAngle);

  // Auto large-arc: true if span strictly > π (in absolute value)
  const largeArc =
    opts.largeArc !== undefined ? (opts.largeArc ? 1 : 0) : Math.abs(span) > Math.PI ? 1 : 0;

  return `M ${fmt(sx)} ${fmt(sy)} A ${fmt(r)} ${fmt(r)} 0 ${largeArc} ${sweep} ${fmt(ex)} ${fmt(ey)}`;
}
