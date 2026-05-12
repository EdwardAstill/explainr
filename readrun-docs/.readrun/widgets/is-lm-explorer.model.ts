export interface ISLMParams {
  c0: number; // autonomous consumption
  c1: number; // marginal propensity to consume (0 < c1 < 1)
  i0: number; // autonomous investment
  b: number;  // investment sensitivity to r
  G: number;  // government spending
  T: number;  // taxes
  k: number;  // money demand sensitivity to Y
  h: number;  // money demand sensitivity to r
  M: number;  // real money supply (M/P with P=1)
}

export const DEFAULT_PARAMS: ISLMParams = {
  c0: 100, c1: 0.6, i0: 200, b: 20,
  G: 100, T: 50,
  k: 0.5, h: 10, M: 200,
};

/** Closed-form simultaneous-equilibrium solution. Returns null if the
 *  parameter combo gives a degenerate or infeasible (negative) equilibrium. */
export function equilibrium(p: ISLMParams): { Yeq: number; rEq: number } | null {
  const A = p.c0 + p.i0 + p.G - p.c1 * p.T;
  const denom = p.h * (1 - p.c1) + p.b * p.k;
  if (denom <= 0) return null;
  const Yeq = (A * p.h + p.b * p.M) / denom;
  const rEq = (p.k * Yeq - p.M) / p.h;
  if (!Number.isFinite(Yeq) || !Number.isFinite(rEq)) return null;
  if (Yeq < 0 || rEq < 0) return null;
  return { Yeq, rEq };
}

/** IS curve: list of (Y, r) points for plotting.
 *  r is sampled across rRange; Y is computed for each r. */
export function isCurvePoints(
  p: ISLMParams,
  rRange: [number, number],
  n = 60,
): Array<[number, number]> {
  const A = p.c0 + p.i0 + p.G - p.c1 * p.T;
  const out: Array<[number, number]> = [];
  for (let i = 0; i <= n; i++) {
    const r = rRange[0] + (rRange[1] - rRange[0]) * (i / n);
    const Y = (A - p.b * r) / (1 - p.c1);
    out.push([Y, r]);
  }
  return out;
}

/** LM curve: list of (Y, r) points.
 *  Y is sampled across yRange; r is computed for each Y. */
export function lmCurvePoints(
  p: ISLMParams,
  yRange: [number, number],
  n = 60,
): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i <= n; i++) {
    const Y = yRange[0] + (yRange[1] - yRange[0]) * (i / n);
    const r = (p.k * Y - p.M) / p.h;
    out.push([Y, r]);
  }
  return out;
}

/** Money demand at fixed Y: list of (M_demanded, r) points.
 *  r is sampled across rRange; M_demanded = k*yFixed - h*r. */
export function moneyDemandPoints(
  p: ISLMParams,
  yFixed: number,
  rRange: [number, number],
  n = 60,
): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i <= n; i++) {
    const r = rRange[0] + (rRange[1] - rRange[0]) * (i / n);
    const M = p.k * yFixed - p.h * r;
    out.push([M, r]);
  }
  return out;
}
