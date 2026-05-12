import React, { useMemo, useState } from "react";
import { WidgetLayout, Slider, Stat, Btn, Tabs } from "@readrun/widgets/primitives";
import { Frame, Heatmap, scale } from "@readrun/widgets/plot";
import { palette } from "@readrun/widgets/draw";

type ColorMap = "viridis" | "magma" | "plasma";
type Optimizer = "sgd" | "momentum";

const CMAPS: { id: ColorMap; label: string }[] = [
  { id: "viridis", label: "viridis" },
  { id: "magma", label: "magma" },
  { id: "plasma", label: "plasma" },
];

const OPTS: { id: Optimizer; label: string }[] = [
  { id: "sgd", label: "SGD" },
  { id: "momentum", label: "Momentum" },
];

const X_DOMAIN: readonly [number, number] = [-2, 4];
const Y_DOMAIN: readonly [number, number] = [-2, 2];

function loss(x: number, y: number): number {
  return (
    1.2 * (x - 1) * (x - 1) +
    0.6 * (y + 0.5) * (y + 0.5) +
    0.6 * Math.sin(2 * x) * Math.cos(2 * y)
  );
}

function grad(x: number, y: number): [number, number] {
  return [
    2 * 1.2 * (x - 1) + 1.2 * Math.cos(2 * x) * Math.cos(2 * y),
    2 * 0.6 * (y + 0.5) - 1.2 * Math.sin(2 * x) * Math.sin(2 * y),
  ];
}

const W = 520;
const H = 380;
const INNER_W = W - 50;
const INNER_H = H - 40;
const N = 80;

export function LossLandscape() {
  const [start, setStart] = useState<[number, number]>([-1, 1.5]);
  const [cmap, setCmap] = useState<ColorMap>("viridis");
  const [opt, setOpt] = useState<Optimizer>("momentum");
  const [lr, setLr] = useState(0.06);
  const [steps, setSteps] = useState(80);

  const xScale = scale.linear({ domain: X_DOMAIN, range: [0, INNER_W] });
  const yScale = scale.linear({ domain: Y_DOMAIN, range: [INNER_H, 0] });

  const grid = useMemo(() => {
    const g: number[][] = [];
    for (let i = 0; i < N; i++) {
      g[i] = [];
      for (let j = 0; j < N; j++) {
        const x = X_DOMAIN[0] + (i / (N - 1)) * (X_DOMAIN[1] - X_DOMAIN[0]);
        const y = Y_DOMAIN[0] + (j / (N - 1)) * (Y_DOMAIN[1] - Y_DOMAIN[0]);
        g[i]![j] = loss(x, y);
      }
    }
    return g;
  }, []);

  const path: [number, number][] = useMemo(() => {
    let x = start[0];
    let y = start[1];
    let mx = 0;
    let my = 0;
    const out: [number, number][] = [[x, y]];
    for (let i = 0; i < steps; i++) {
      const [gx, gy] = grad(x, y);
      if (opt === "sgd") {
        x -= lr * gx;
        y -= lr * gy;
      } else {
        mx = 0.9 * mx + gx;
        my = 0.9 * my + gy;
        x -= lr * mx;
        y -= lr * my;
      }
      out.push([x, y]);
    }
    return out;
  }, [start, steps, opt, lr]);

  const finalLoss = loss(path[path.length - 1]![0], path[path.length - 1]![1]);

  const cellToData = (i: number, j: number): [number, number] => [
    X_DOMAIN[0] + (i / (N - 1)) * (X_DOMAIN[1] - X_DOMAIN[0]),
    Y_DOMAIN[0] + (j / (N - 1)) * (Y_DOMAIN[1] - Y_DOMAIN[0]),
  ];

  const toScreen = (x: number, y: number): [number, number] => [xScale(x), yScale(y)];
  const pathPoly = path.map(([x, y]) => toScreen(x, y).join(",")).join(" ");

  return (
    <WidgetLayout
      arrangement="visual-left"
      title="Loss Landscape"
      subtitle="Click anywhere on the heatmap to drop the start point. The optimiser path overlays in real time."
    >
      <WidgetLayout.Visual>
        <Frame
          width={W}
          height={H}
          xScale={xScale}
          yScale={yScale}
          margin={{ top: 10, right: 10, bottom: 30, left: 40 }}
          xLabel="x"
          yLabel="y"
        >
          {({ innerWidth, innerHeight }) => (
            <>
              <Heatmap
                data={grid}
                width={innerWidth}
                height={innerHeight}
                colorScale={palette[cmap]}
                onCellClick={(i, j) => setStart(cellToData(i, j))}
              />
              <polyline
                points={pathPoly}
                fill="none"
                stroke="var(--viz-warn)"
                strokeWidth={2.5}
                opacity={0.95}
                pointerEvents="none"
              />
              <circle
                cx={xScale(start[0])}
                cy={yScale(start[1])}
                r={7}
                fill="var(--viz-warn)"
                stroke="var(--bg)"
                strokeWidth={2}
                pointerEvents="none"
              />
              <circle
                cx={xScale(path[path.length - 1]![0])}
                cy={yScale(path[path.length - 1]![1])}
                r={5}
                fill="var(--viz-positive)"
                stroke="var(--bg)"
                strokeWidth={1.5}
                pointerEvents="none"
              />
            </>
          )}
        </Frame>
      </WidgetLayout.Visual>

      <WidgetLayout.Controls>
        <div style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
          <Stat label="loss" value={finalLoss.toFixed(4)} />
          <Stat label="x" value={path[path.length - 1]![0].toFixed(3)} />
          <Stat label="y" value={path[path.length - 1]![1].toFixed(3)} />
        </div>

        <Tabs value={opt} onChange={(id) => setOpt(id as Optimizer)} items={OPTS} />
        <Tabs value={cmap} onChange={(id) => setCmap(id as ColorMap)} items={CMAPS} />

        <Slider label="learning rate" value={lr} min={0.005} max={0.25} step={0.005} onChange={setLr} />
        <Slider label="steps" value={steps} min={5} max={250} step={1} onChange={setSteps} />

        <div style={{ marginTop: 8 }}>
          <Btn kind="ghost" onClick={() => setStart([-1, 1.5])}>Reset start</Btn>
        </div>
      </WidgetLayout.Controls>

      <WidgetLayout.Aside>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.55 }}>
          <li>The surface is a paraboloid + a sin·cos ripple, so optimisers can stall in local dips.</li>
          <li>Click placements update the start; the path recomputes from there.</li>
          <li>Momentum smooths through ripples that trap plain SGD.</li>
        </ul>
      </WidgetLayout.Aside>
    </WidgetLayout>
  );
}
