/**
 * 2×2 linear-algebra helpers. Used by matrix-transformation and
 * gradient-descent (loss-surface eigenvectors).
 */

export type Mat2 = [number, number, number, number]; // row-major: [a,b,c,d]
export type Vec2 = [number, number];

export function det2(m: Mat2): number {
  return m[0] * m[3] - m[1] * m[2];
}

export function trace2(m: Mat2): number {
  return m[0] + m[3];
}

export function apply2(m: Mat2, v: Vec2): Vec2 {
  return [m[0] * v[0] + m[1] * v[1], m[2] * v[0] + m[3] * v[1]];
}

export interface Eig2 {
  l1: number;
  l2: number;
  v1: Vec2;
  v2: Vec2;
}

export function eig2(m: Mat2): Eig2 | null {
  const [a, b, c, d] = m;
  const tr = a + d;
  const det = a * d - b * c;
  const disc = tr * tr - 4 * det;
  if (disc < 0) return null;
  const r = Math.sqrt(disc);
  const l1 = (tr + r) / 2;
  const l2 = (tr - r) / 2;
  const evec = (l: number): Vec2 => {
    if (Math.abs(b) > 1e-9) return [b, l - a];
    if (Math.abs(c) > 1e-9) return [l - d, c];
    return [1, 0];
  };
  const norm = (v: Vec2): Vec2 => {
    const n = Math.hypot(v[0], v[1]) || 1;
    return [v[0] / n, v[1] / n];
  };
  return { l1, l2, v1: norm(evec(l1)), v2: norm(evec(l2)) };
}

/** Decompose 2×2 into rotation × scale × shear (approximate, for animation). */
export function decompose(m: Mat2): { rot: number; sx: number; sy: number; sh: number } {
  const [a, b, c, d] = m;
  const sx = Math.hypot(a, c);
  const rot = Math.atan2(c, a);
  const cosR = Math.cos(rot);
  const sinR = Math.sin(rot);
  // Rotate matrix back by -rot, then read remaining shear/scale
  const a2 = cosR * a + sinR * c;
  const b2 = cosR * b + sinR * d;
  const d2 = -sinR * b + cosR * d;
  const sh = a2 !== 0 ? b2 / a2 : 0;
  const sy = d2;
  return { rot, sx, sy, sh };
}
