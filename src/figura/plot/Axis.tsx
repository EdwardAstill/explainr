import React from "react";
import type { Scale } from "./scale";
import { ticks } from "./ticks";

const TICK_SIZE = 6;
const AXIS_COLOR = "#64748b";
const LABEL_COLOR = "#475569";
const FONT = "ui-monospace, monospace";
const FONT_SIZE = 11;

interface AxisProps {
  scale: Scale;
  side: "bottom" | "left" | "top" | "right";
  label?: string;
  tickFormat?: (value: number | string) => string;
  numTicks?: number;
}

export function Axis({
  scale,
  side,
  label,
  tickFormat = String,
  numTicks = 5,
}: AxisProps): JSX.Element {
  const isHorizontal = side === "bottom" || side === "top";
  const tickValues = ticks(scale, numTicks);

  // Map tick domain values to pixel positions
  function tickPos(value: number | string): number {
    if (scale.type === "ordinal") {
      return (scale as Extract<typeof scale, { type: "ordinal" }>)(value as string);
    }
    return (scale as Extract<typeof scale, { type: "linear" | "log" }>)(value as number);
  }

  // Determine axis line length from scale range
  const [r0, r1] = scale.range;
  const lineLength = r1 - r0; // may be negative (flipped)

  // Tick direction: which way do ticks point
  const tickDir = side === "bottom" || side === "right" ? 1 : -1;

  if (isHorizontal) {
    // Horizontal axis (bottom or top)
    // Line along x from r0 to r1 at y=0
    const labelOffset = side === "bottom" ? TICK_SIZE + 14 : -(TICK_SIZE + 14);
    const axisLabelY = side === "bottom" ? TICK_SIZE + 28 : -(TICK_SIZE + 28);

    return (
      <g>
        {/* Axis line */}
        <line
          x1={r0}
          y1={0}
          x2={r1}
          y2={0}
          stroke={AXIS_COLOR}
          strokeWidth={1}
        />

        {/* Ticks and labels */}
        {tickValues.map((v) => {
          const x = tickPos(v);
          return (
            <g key={String(v)} transform={`translate(${x}, 0)`}>
              <line
                x1={0}
                y1={0}
                x2={0}
                y2={tickDir * TICK_SIZE}
                stroke={AXIS_COLOR}
                strokeWidth={1}
              />
              <text
                x={0}
                y={labelOffset}
                textAnchor="middle"
                dominantBaseline={side === "bottom" ? "hanging" : "auto"}
                style={{
                  fontFamily: FONT,
                  fontSize: FONT_SIZE,
                  fill: LABEL_COLOR,
                }}
              >
                {tickFormat(v)}
              </text>
            </g>
          );
        })}

        {/* Optional axis label */}
        {label && (
          <text
            x={(r0 + r1) / 2}
            y={axisLabelY}
            textAnchor="middle"
            dominantBaseline={side === "bottom" ? "hanging" : "auto"}
            style={{
              fontFamily: FONT,
              fontSize: FONT_SIZE,
              fill: LABEL_COLOR,
              fontWeight: 500,
            }}
          >
            {label}
          </text>
        )}
      </g>
    );
  } else {
    // Vertical axis (left or right)
    // Line along y from r0 to r1 at x=0
    const labelOffset = side === "left" ? -(TICK_SIZE + 6) : TICK_SIZE + 6;
    const textAnchor = side === "left" ? "end" : "start";
    const axisLabelOffset = side === "left" ? -(TICK_SIZE + 36) : TICK_SIZE + 36;

    return (
      <g>
        {/* Axis line */}
        <line
          x1={0}
          y1={r0}
          x2={0}
          y2={lineLength < 0 ? r0 + lineLength : r1}
          stroke={AXIS_COLOR}
          strokeWidth={1}
        />

        {/* Ticks and labels */}
        {tickValues.map((v) => {
          const y = tickPos(v);
          return (
            <g key={String(v)} transform={`translate(0, ${y})`}>
              <line
                x1={0}
                y1={0}
                x2={tickDir * -TICK_SIZE}
                y2={0}
                stroke={AXIS_COLOR}
                strokeWidth={1}
              />
              <text
                x={labelOffset}
                y={0}
                textAnchor={textAnchor}
                dominantBaseline="middle"
                style={{
                  fontFamily: FONT,
                  fontSize: FONT_SIZE,
                  fill: LABEL_COLOR,
                }}
              >
                {tickFormat(v)}
              </text>
            </g>
          );
        })}

        {/* Optional axis label */}
        {label && (
          <text
            x={axisLabelOffset}
            y={(r0 + (lineLength < 0 ? r0 + lineLength : r1)) / 2}
            textAnchor="middle"
            transform={`rotate(-90, ${axisLabelOffset}, ${(r0 + (lineLength < 0 ? r0 + lineLength : r1)) / 2})`}
            style={{
              fontFamily: FONT,
              fontSize: FONT_SIZE,
              fill: LABEL_COLOR,
              fontWeight: 500,
            }}
          >
            {label}
          </text>
        )}
      </g>
    );
  }
}
