import React from "react";

/**
 * Pure binning helper used by `Histogram`. Exported for testability and for
 * widgets that need the bin counts alongside the rendered chart.
 */
export function binCounts(
  values: readonly number[],
  bins: number,
  domain?: readonly [number, number]
): { counts: number[]; lo: number; hi: number; binW: number } {
  const finite: number[] = [];
  for (const v of values) if (Number.isFinite(v)) finite.push(v);
  if (finite.length === 0 || bins <= 0) {
    return { counts: [], lo: 0, hi: 0, binW: 0 };
  }
  let lo: number;
  let hi: number;
  if (domain) {
    [lo, hi] = domain;
  } else {
    lo = Infinity;
    hi = -Infinity;
    for (const v of finite) {
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  }
  const span = hi - lo || 1;
  const binW = span / bins;
  const counts = new Array(bins).fill(0) as number[];
  for (const v of finite) {
    let idx = Math.floor((v - lo) / binW);
    if (idx === bins) idx = bins - 1;
    if (idx >= 0 && idx < bins) counts[idx]!++;
  }
  return { counts, lo, hi, binW };
}

export interface HistogramProps {
  /** Raw values. Non-finite entries are dropped. */
  values: readonly number[];

  /** Number of equal-width bins. */
  bins: number;

  /** Plot region in viewBox units (matches the inner area of a Frame). */
  width: number;
  height: number;

  /** Bin range. Defaults to value extent. */
  domain?: readonly [number, number];

  /**
   * If provided, called for each bin's centre. Bars where it returns true
   * are drawn with `fillIn`; the rest with `fillOut`. Used e.g. to colour
   * residuals inside ±k·σ differently from those outside.
   */
  highlight?: (binCentre: number) => boolean;

  fillIn?: string;
  fillOut?: string;

  /** Override the count axis cap. Defaults to max bin count. */
  maxCount?: number;

  /** Gap between bars in viewBox units. */
  gap?: number;
}

export function Histogram({
  values,
  bins,
  width,
  height,
  domain,
  highlight,
  fillIn = "var(--accent)",
  fillOut = "var(--text-muted)",
  maxCount,
  gap = 1,
}: HistogramProps): JSX.Element {
  const { counts, lo, binW } = binCounts(values, bins, domain);
  if (counts.length === 0) return <g />;
  const cap = maxCount ?? Math.max(...counts, 1);
  const barWidth = width / bins;

  const bars: React.ReactNode[] = [];
  for (let i = 0; i < bins; i++) {
    const c = counts[i]!;
    const h = (c / cap) * height;
    const x = i * barWidth;
    const y = height - h;
    const centre = lo + (i + 0.5) * binW;
    const useIn = highlight ? highlight(centre) : true;
    bars.push(
      <rect
        key={i}
        x={x + gap / 2}
        y={y}
        width={Math.max(0, barWidth - gap)}
        height={h}
        fill={useIn ? fillIn : fillOut}
      />
    );
  }

  return <g>{bars}</g>;
}
