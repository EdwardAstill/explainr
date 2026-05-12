export interface ContinuousScale {
  (value: number): number;
  invert(n: number): number;
  domain: readonly [number, number];
  range: readonly [number, number];
  type: "linear" | "log";
}

export interface OrdinalScale<T extends string | number = string | number> {
  (value: T): number;
  domain: readonly T[];
  range: readonly [number, number];
  bandwidth: number;
  type: "ordinal";
}

export type Scale = ContinuousScale | OrdinalScale;

function makeLinear(
  domain: readonly [number, number],
  range: readonly [number, number]
): ContinuousScale {
  const [d0, d1] = domain;
  const [r0, r1] = range;

  const fn = (value: number): number => {
    return ((value - d0) / (d1 - d0)) * (r1 - r0) + r0;
  };

  const s = fn as ContinuousScale;
  s.invert = (n: number): number => ((n - r0) / (r1 - r0)) * (d1 - d0) + d0;
  s.domain = domain;
  s.range = range;
  s.type = "linear";
  return s;
}

function makeLog(
  domain: readonly [number, number],
  range: readonly [number, number],
  base: number
): ContinuousScale {
  const [d0, d1] = domain;

  if (d0 <= 0 || d1 <= 0) {
    throw new Error(
      `scale.log: domain values must be > 0, got [${d0}, ${d1}]`
    );
  }

  const logBase = Math.log(base);
  const logD0 = Math.log(d0) / logBase;
  const logD1 = Math.log(d1) / logBase;
  const [r0, r1] = range;

  const fn = (value: number): number => {
    const logV = Math.log(value) / logBase;
    return ((logV - logD0) / (logD1 - logD0)) * (r1 - r0) + r0;
  };

  const s = fn as ContinuousScale;
  s.invert = (n: number): number => {
    const logV = ((n - r0) / (r1 - r0)) * (logD1 - logD0) + logD0;
    return Math.pow(base, logV);
  };
  s.domain = domain;
  s.range = range;
  s.type = "log";
  return s;
}

function makeOrdinal<T extends string | number>(
  domain: readonly T[],
  range: readonly [number, number]
): OrdinalScale<T> {
  const [r0, r1] = range;
  const bw = (r1 - r0) / domain.length;

  const fn = (value: T): number => {
    const idx = domain.indexOf(value);
    if (idx === -1) {
      throw new Error(
        `scale.ordinal: value ${String(value)} not in domain [${domain.join(", ")}]`
      );
    }
    return r0 + idx * bw + bw / 2;
  };

  const s = fn as OrdinalScale<T>;
  s.domain = domain;
  s.range = range;
  s.bandwidth = bw;
  s.type = "ordinal";
  return s;
}

export const scale = {
  linear({
    domain,
    range,
  }: {
    domain: readonly [number, number];
    range: readonly [number, number];
  }): ContinuousScale {
    return makeLinear(domain, range);
  },

  log({
    domain,
    range,
    base = 10,
  }: {
    domain: readonly [number, number];
    range: readonly [number, number];
    base?: number;
  }): ContinuousScale {
    return makeLog(domain, range, base);
  },

  ordinal<T extends string | number>({
    domain,
    range,
  }: {
    domain: readonly T[];
    range: readonly [number, number];
  }): OrdinalScale<T> {
    return makeOrdinal(domain, range);
  },
};
