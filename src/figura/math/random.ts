/**
 * RNG primitives used by viz.
 *   - mulberry32 — small seedable PRNG so demos can be reproducible
 *   - boxMuller — standard normal samples
 *   - sampleGamma — Marsaglia–Tsang (k>=1) + boost for k<1
 *   - sampleBeta — via two gamma samples
 *   - sampleExponential — inverse-CDF
 */

export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function boxMuller(rng: () => number = Math.random): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function sampleNormal(mu = 0, sigma = 1, rng: () => number = Math.random): number {
  return mu + sigma * boxMuller(rng);
}

export function sampleGamma(
  k: number,
  theta = 1,
  rng: () => number = Math.random,
): number {
  if (k < 1) {
    return sampleGamma(k + 1, theta, rng) * Math.pow(rng(), 1 / k);
  }
  const d = k - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x: number;
    let v: number;
    do {
      x = boxMuller(rng);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rng();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v * theta;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * theta;
  }
}

export function sampleBeta(
  a: number,
  b: number,
  rng: () => number = Math.random,
): number {
  const x = sampleGamma(a, 1, rng);
  const y = sampleGamma(b, 1, rng);
  return x / (x + y);
}

export function sampleExponential(lambda: number, rng: () => number = Math.random): number {
  return -Math.log(1 - rng()) / lambda;
}
