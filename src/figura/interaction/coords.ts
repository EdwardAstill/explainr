/**
 * Pure coordinate-conversion helper.
 * Converts client-space (browser screen) coordinates to SVG viewBox coordinates.
 *
 * Uses `getScreenCTM()`, which returns the transform from the element's local
 * coordinate system to the BROWSER SCREEN — the right matrix for inverting
 * `clientX`/`clientY` from a PointerEvent into SVG viewBox space. (`getCTM()`
 * only returns the SVG-internal transform up to the nearest `<svg>` viewport,
 * which does not account for the SVG's position on the page.)
 *
 * The SVGMatrix-like interface is kept minimal so we can provide test mocks
 * without a full DOM.
 */
export interface SVGMatrixLike {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
  inverse(): SVGMatrixLike;
}

export interface GetScreenCTMTarget {
  getScreenCTM(): SVGMatrixLike | null;
}

/** Backwards-compatible alias. Prefer `GetScreenCTMTarget`. */
export type GetCTMTarget = GetScreenCTMTarget;

/**
 * Apply a 2-D affine matrix to a point.
 *
 *   | a  c  e |   | x |
 *   | b  d  f | × | y |
 *   | 0  0  1 |   | 1 |
 */
export function applyMatrix(m: SVGMatrixLike, x: number, y: number): { x: number; y: number } {
  return {
    x: m.a * x + m.c * y + m.e,
    y: m.b * x + m.d * y + m.f,
  };
}

/**
 * Convert client (screen) coords to viewBox coords for `target`.
 * Returns null if getScreenCTM() is unavailable (e.g., detached element).
 */
export function screenToViewBox(
  target: GetScreenCTMTarget,
  clientX: number,
  clientY: number
): { x: number; y: number } | null {
  const ctm = target.getScreenCTM();
  if (!ctm) return null;
  const inv = ctm.inverse();
  return applyMatrix(inv, clientX, clientY);
}
