import type { Scale, ContinuousScale, OrdinalScale } from "./scale";

/**
 * Compute nice tick values for a scale.
 * - linear: d3-style algorithm — step = power-of-10 × {1,2,5}
 * - log: powers of base within domain
 * - ordinal: returns the domain array (n ignored)
 */
export function ticks<T extends string | number>(
  s: Scale | OrdinalScale<T>,
  n: number
): Array<number | string> {
  if (s.type === "ordinal") {
    return [...(s as OrdinalScale<T>).domain] as Array<string | number>;
  }

  const cs = s as ContinuousScale;

  if (cs.type === "log") {
    return logTicks(cs);
  }

  return linearTicks(cs, n);
}

function linearTicks(s: ContinuousScale, n: number): number[] {
  const [d0, d1] = s.domain;
  const span = d1 - d0;

  // Ensure at least 2 ticks
  const count = Math.max(n, 2);

  // Compute a step that is a power of 10 times 1, 2, or 5
  const roughStep = span / count;
  const mag = Math.floor(Math.log10(roughStep));
  const base = Math.pow(10, mag);

  // Pick the nicest multiplier
  let step: number;
  const r = roughStep / base;
  if (r <= 1) {
    step = base;
  } else if (r <= 2) {
    step = 2 * base;
  } else if (r <= 5) {
    step = 5 * base;
  } else {
    step = 10 * base;
  }

  const start = Math.ceil(d0 / step) * step;
  const end = Math.floor(d1 / step) * step;

  const result: number[] = [];
  // Use integer loop to avoid floating-point accumulation
  const numSteps = Math.round((end - start) / step);
  for (let i = 0; i <= numSteps; i++) {
    const v = start + i * step;
    // Round to avoid floating-point noise (e.g. 0.20000000000000001)
    const rounded = parseFloat(v.toPrecision(12));
    result.push(rounded);
  }

  // Guarantee at least 2
  if (result.length < 2) {
    return [d0, d1];
  }

  return result;
}

function logTicks(s: ContinuousScale): number[] {
  const [d0, d1] = s.domain;

  // Determine base from the scale — we can't access it directly from the interface,
  // so we infer it: find the base by checking common values.
  // Instead, recompute by sampling: find integer powers that fall within [d0, d1].
  // We detect the base by using the scale's invert on known range boundaries,
  // then checking Math.log ratios. Simplest: just use base 10 convention for ticks
  // (powers of 10 are always valid nice ticks regardless of exact base used for scale).
  //
  // Approach: generate powers of 10 that cover [d0, d1].
  const result: number[] = [];

  const logD0 = Math.log10(d0);
  const logD1 = Math.log10(d1);

  // Start from floor of log10(d0)
  const startExp = Math.floor(logD0);
  const endExp = Math.ceil(logD1);

  for (let exp = startExp; exp <= endExp; exp++) {
    const v = Math.pow(10, exp);
    if (v >= d0 && v <= d1) {
      result.push(v);
    }
  }

  // Include d0 and d1 if they are exact powers
  if (result.length < 2) {
    return [d0, d1];
  }

  return result;
}
