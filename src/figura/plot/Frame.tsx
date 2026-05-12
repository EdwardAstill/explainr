import React from "react";
import type { Scale } from "./scale";
import { Axis } from "./Axis";

interface Margin {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

interface RenderArgs<XS extends Scale, YS extends Scale> {
  xScale: XS;
  yScale: YS;
  innerWidth: number;
  innerHeight: number;
}

interface FrameProps<XS extends Scale = Scale, YS extends Scale = Scale> {
  width: number;
  height: number;
  margin?: Margin;
  xScale: XS;
  yScale: YS;
  xLabel?: string;
  yLabel?: string;
  xTickFormat?: (v: number | string) => string;
  yTickFormat?: (v: number | string) => string;
  xNumTicks?: number;
  yNumTicks?: number;
  children?:
    | React.ReactNode
    | ((args: RenderArgs<XS, YS>) => React.ReactNode);
}

const DEFAULT_MARGIN = { top: 10, right: 10, bottom: 30, left: 40 };

export function Frame<XS extends Scale, YS extends Scale>({
  width,
  height,
  margin: marginProp,
  xScale,
  yScale,
  xLabel,
  yLabel,
  xTickFormat,
  yTickFormat,
  xNumTicks,
  yNumTicks,
  children,
}: FrameProps<XS, YS>): JSX.Element {
  const margin = {
    top: marginProp?.top ?? DEFAULT_MARGIN.top,
    right: marginProp?.right ?? DEFAULT_MARGIN.right,
    bottom: marginProp?.bottom ?? DEFAULT_MARGIN.bottom,
    left: marginProp?.left ?? DEFAULT_MARGIN.left,
  };

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const renderArgs: RenderArgs<XS, YS> = {
    xScale,
    yScale,
    innerWidth,
    innerHeight,
  };

  const content =
    typeof children === "function" ? children(renderArgs) : children;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      style={{ display: "block", maxWidth: "100%" }}
    >
      <g transform={`translate(${margin.left}, ${margin.top})`}>
        {/* Data area */}
        {content}

        {/* X axis at bottom of inner area */}
        <g transform={`translate(0, ${innerHeight})`}>
          <Axis
            scale={xScale}
            side="bottom"
            label={xLabel}
            tickFormat={xTickFormat}
            numTicks={xNumTicks}
          />
        </g>

        {/* Y axis at left of inner area */}
        <g transform="translate(0, 0)">
          <Axis
            scale={yScale}
            side="left"
            label={yLabel}
            tickFormat={yTickFormat}
            numTicks={yNumTicks}
          />
        </g>
      </g>
    </svg>
  );
}
