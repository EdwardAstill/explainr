import React, { useRef } from "react";
import { useDrag } from "./useDrag";

export interface HandleProps {
  x: number;
  y: number;
  onMove: (x: number, y: number) => void;
  /** Half-side of the square handle, in viewBox units. Default 6. */
  r?: number;
  fill?: string;
  ariaLabel?: string;
}

/**
 * Draggable SVG handle. A small square rect with no stroke — flat aesthetic.
 * Intended to be rendered inside an `<svg>` element.
 */
export function Handle({
  x,
  y,
  onMove,
  r = 6,
  fill = "var(--text, #1f2328)",
  ariaLabel,
}: HandleProps): React.JSX.Element {
  const ref = useRef<SVGRectElement>(null);
  useDrag(ref, onMove);

  const size = r * 2;
  return (
    <rect
      ref={ref}
      x={x - r}
      y={y - r}
      width={size}
      height={size}
      fill={fill}
      style={{ cursor: "grab" }}
      aria-label={ariaLabel}
      role={ariaLabel ? "slider" : undefined}
    />
  );
}
