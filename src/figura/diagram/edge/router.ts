import type { Port } from "./ports";

/** Straight line between two ports. Marker auto-orients along the line. */
export function straightWithPorts(from: Port, to: Port): string {
  return `M ${num(from.x)} ${num(from.y)} L ${num(to.x)} ${num(to.y)}`;
}

/** Cubic Bézier with control points along port directions. */
export function curveWithPorts(from: Port, to: Port): string {
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  const offset = Math.max(20, 0.4 * dist);
  const c1x = from.x + from.dir.dx * offset;
  const c1y = from.y + from.dir.dy * offset;
  const c2x = to.x + to.dir.dx * offset;
  const c2y = to.y + to.dir.dy * offset;
  return `M ${num(from.x)} ${num(from.y)} C ${num(c1x)} ${num(c1y)} ${num(c2x)} ${num(c2y)} ${num(to.x)} ${num(to.y)}`;
}

/** Smoothstep-style orthogonal path. Buffer 20px in port direction, Manhattan between. */
export function orthogonalWithPorts(from: Port, to: Port, opts?: { buffer?: number }): string {
  const buffer = opts?.buffer ?? 20;
  const sx = from.x;
  const sy = from.y;
  const tx = to.x;
  const ty = to.y;
  const sgx = sx + from.dir.dx * buffer;
  const sgy = sy + from.dir.dy * buffer;
  const tgx = tx + to.dir.dx * buffer;
  const tgy = ty + to.dir.dy * buffer;

  // Manhattan between (sgx, sgy) and (tgx, tgy):
  // - If source dir is horizontal (dx != 0): exit horizontal, then maybe vertical, then maybe horizontal back.
  //   Simplest: H to mid-x, V to tgy, H to tgx. (3 segments)
  // - If source dir is vertical (dy != 0): exit vertical, V to mid-y, H to tgx, V to tgy. (3 segments)
  // - When source and target dirs are aligned axes, the 3-segment route is correct.
  // - When mixed (source horizontal, target vertical), use 2 segments: H to tgx, V to tgy.

  const srcHoriz = from.dir.dx !== 0;
  const tgtHoriz = to.dir.dx !== 0;

  let mid: string;
  if (srcHoriz && tgtHoriz) {
    // H → V → H
    const midX = (sgx + tgx) / 2;
    mid = `L ${num(midX)} ${num(sgy)} L ${num(midX)} ${num(tgy)}`;
  } else if (!srcHoriz && !tgtHoriz) {
    // V → H → V
    const midY = (sgy + tgy) / 2;
    mid = `L ${num(sgx)} ${num(midY)} L ${num(tgx)} ${num(midY)}`;
  } else if (srcHoriz && !tgtHoriz) {
    // H → V (2 segments via corner at (tgx, sgy))
    mid = `L ${num(tgx)} ${num(sgy)}`;
  } else {
    // V → H (2 segments via corner at (sgx, tgy))
    mid = `L ${num(sgx)} ${num(tgy)}`;
  }

  return `M ${num(sx)} ${num(sy)} L ${num(sgx)} ${num(sgy)} ${mid} L ${num(tgx)} ${num(tgy)} L ${num(tx)} ${num(ty)}`;
}

function num(n: number): string {
  return n.toFixed(2).replace(/\.?0+$/, "");
}
