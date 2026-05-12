/** t → t (identity) */
export function linear(t: number): number {
  return t;
}

/** Cubic ease-out: 1 - (1-t)^3 */
export function cubicOut(t: number): number {
  const u = 1 - t;
  return 1 - u * u * u;
}

/** Quadratic ease-in-out */
export function quadInOut(t: number): number {
  if (t < 0.5) return 2 * t * t;
  const u = 1 - t;
  return 1 - 2 * u * u;
}

/** Linear interpolation: a + (b - a) * t. No clamp. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export interface TweenOpts {
  from: number;
  to: number;
  startedAt: number;
  durationMs: number;
  easing?: (t: number) => number;
}

/**
 * Returns a function that, when called with an absolute timestamp (ms),
 * returns the eased value and a done flag.
 */
export function tween(opts: TweenOpts): (now: number) => { value: number; done: boolean } {
  const { from, to, startedAt, durationMs, easing = cubicOut } = opts;

  if (durationMs <= 0) {
    return (_now: number) => ({ value: to, done: true });
  }

  return (now: number) => {
    const elapsed = Math.max(0, Math.min(durationMs, now - startedAt));
    const t = elapsed / durationMs;
    const easedT = easing(t);
    const value = lerp(from, to, easedT);
    return { value, done: elapsed >= durationMs };
  };
}
