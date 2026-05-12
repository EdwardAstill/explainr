import React from "react";

/**
 * Pure extent helper. Returns `null` when the grid is empty or contains no
 * finite cells. Exported for testability and so widgets can share a domain
 * across multiple heatmaps.
 */
export function dataExtent(
  data: readonly (readonly number[])[],
  invalid: (v: number) => boolean = (v) => !Number.isFinite(v)
): readonly [number, number] | null {
  const nx = data.length;
  if (nx === 0) return null;
  const ny = data[0]!.length;
  if (ny === 0) return null;
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < nx; i++) {
    const col = data[i]!;
    for (let j = 0; j < ny; j++) {
      const v = col[j]!;
      if (invalid(v)) continue;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  return [lo, hi];
}

export interface HeatmapProps {
  /**
   * Data grid as `data[i][j]`. `i` indexes columns (x), `j` indexes rows (y).
   * `j = 0` is rendered at the bottom by default (math-plot orientation);
   * pass `flipY={false}` for image-style top-left origin.
   */
  data: readonly (readonly number[])[];

  /** Total width in viewBox units. */
  width: number;
  /** Total height in viewBox units. */
  height: number;

  /** Map a normalized value (0..1) to a CSS colour. Required. */
  colorScale: (t: number) => string;

  /**
   * Value range mapped to t = 0..1. Defaults to data extent (excluding
   * non-finite cells). Values outside the domain clamp to 0 or 1.
   */
  domain?: readonly [number, number];

  /** Skip rendering of cells where this returns true (default: !isFinite). */
  invalid?: (v: number) => boolean;

  /**
   * j = 0 at the bottom (default, math orientation). Set `false` for
   * image / matrix orientation (j = 0 at top).
   */
  flipY?: boolean;

  /**
   * Click handler. Receives column `i`, row `j`, and the cell value.
   * When set, cells get `cursor: pointer` and `pointer-events: all`.
   */
  onCellClick?: (i: number, j: number, value: number) => void;
}

const defaultInvalid = (v: number) => !Number.isFinite(v);

export function Heatmap({
  data,
  width,
  height,
  colorScale,
  domain,
  invalid = defaultInvalid,
  flipY = true,
  onCellClick,
}: HeatmapProps): JSX.Element {
  const nx = data.length;
  const ny = nx > 0 ? data[0]!.length : 0;

  if (nx === 0 || ny === 0) {
    return <g />;
  }

  let lo: number;
  let hi: number;
  if (domain) {
    [lo, hi] = domain;
  } else {
    const ex = dataExtent(data, invalid);
    if (!ex) return <g />;
    [lo, hi] = ex;
  }
  const span = hi - lo || 1;
  const cw = width / nx;
  const ch = height / ny;
  // 0.5px overlap kills sub-pixel gaps between cells at any zoom level.
  const eps = 0.5;

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < nx; i++) {
    const col = data[i]!;
    for (let j = 0; j < ny; j++) {
      const v = col[j]!;
      if (invalid(v)) continue;
      const t = Math.max(0, Math.min(1, (v - lo) / span));
      const x = i * cw;
      const y = flipY ? height - (j + 1) * ch : j * ch;
      cells.push(
        <rect
          key={`${i}-${j}`}
          x={x}
          y={y}
          width={cw + eps}
          height={ch + eps}
          fill={colorScale(t)}
          {...(onCellClick && {
            style: { cursor: "pointer" },
            onClick: () => onCellClick(i, j, v),
          })}
        />
      );
    }
  }

  return <g>{cells}</g>;
}
