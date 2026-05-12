import React, { useEffect, useRef, useState } from "react";
import { Shell, Sub, Stage, Panel, SectionLabel, Btn, Slider, Notice, Stat, Tabs } from "@readrun/widgets/primitives";

type Optimizer = "sgd" | "momentum" | "adam";

const OPTS: { id: Optimizer; label: string }[] = [
  { id: "sgd", label: "SGD" },
  { id: "momentum", label: "Momentum" },
  { id: "adam", label: "Adam" },
];

// Loss surface: f(x,y) = a*(x-1)^2 + b*(y+0.5)^2 + 0.6*sin(2x)*cos(2y)
function loss(x: number, y: number) {
  return 1.2 * (x - 1) * (x - 1) + 0.6 * (y + 0.5) * (y + 0.5) + 0.6 * Math.sin(2 * x) * Math.cos(2 * y);
}
function grad(x: number, y: number): [number, number] {
  return [
    2 * 1.2 * (x - 1) + 1.2 * Math.cos(2 * x) * Math.cos(2 * y),
    2 * 0.6 * (y + 0.5) - 1.2 * Math.sin(2 * x) * Math.sin(2 * y),
  ];
}

export function GradientDescent() {
  const W = 520;
  const H = 420;
  const xMin = -2;
  const xMax = 4;
  const yMin = -2;
  const yMax = 2;
  const toS = (x: number, y: number): [number, number] => [
    ((x - xMin) / (xMax - xMin)) * W,
    H - ((y - yMin) / (yMax - yMin)) * H,
  ];
  const toW = (sx: number, sy: number): [number, number] => [
    xMin + (sx / W) * (xMax - xMin),
    yMin + ((H - sy) / H) * (yMax - yMin),
  ];

  const [start, setStart] = useState<[number, number]>([-1, 1.5]);
  const [opt, setOpt] = useState<Optimizer>("sgd");
  const [lr, setLr] = useState(0.06);
  const [steps, setSteps] = useState(60);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Compute path
  const path: [number, number][] = [];
  let x = start[0];
  let y = start[1];
  let mx = 0;
  let my = 0;
  let vx2 = 0;
  let vy2 = 0;
  const beta1 = 0.9;
  const beta2 = 0.999;
  const eps = 1e-8;
  path.push([x, y]);
  for (let i = 1; i <= steps; i++) {
    const [gx, gy] = grad(x, y);
    if (opt === "sgd") {
      x -= lr * gx;
      y -= lr * gy;
    } else if (opt === "momentum") {
      mx = 0.9 * mx + gx;
      my = 0.9 * my + gy;
      x -= lr * mx;
      y -= lr * my;
    } else {
      mx = beta1 * mx + (1 - beta1) * gx;
      my = beta1 * my + (1 - beta1) * gy;
      vx2 = beta2 * vx2 + (1 - beta2) * gx * gx;
      vy2 = beta2 * vy2 + (1 - beta2) * gy * gy;
      const mhx = mx / (1 - Math.pow(beta1, i));
      const mhy = my / (1 - Math.pow(beta1, i));
      const vhx = vx2 / (1 - Math.pow(beta2, i));
      const vhy = vy2 / (1 - Math.pow(beta2, i));
      x -= (lr * 4) * (mhx / (Math.sqrt(vhx) + eps));
      y -= (lr * 4) * (mhy / (Math.sqrt(vhy) + eps));
    }
    path.push([x, y]);
  }
  const finalLoss = loss(path.at(-1)![0], path.at(-1)![1]);

  // Heatmap as SVG rectangles (coarse for speed)
  const cells = 60;
  const cw = W / cells;
  const ch = H / cells;
  const heat: { x: number; y: number; v: number }[] = [];
  let lMin = Infinity;
  let lMax = -Infinity;
  for (let i = 0; i < cells; i++) {
    for (let j = 0; j < cells; j++) {
      const wx = xMin + ((i + 0.5) / cells) * (xMax - xMin);
      const wy = yMin + ((j + 0.5) / cells) * (yMax - yMin);
      const v = loss(wx, wy);
      if (v < lMin) lMin = v;
      if (v > lMax) lMax = v;
      heat.push({ x: i * cw, y: H - (j + 1) * ch, v });
    }
  }

  // Drag start
  const [drag, setDrag] = useState(false);
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const sx = (e.clientX - rect.left) * (W / rect.width);
    const sy = (e.clientY - rect.top) * (H / rect.height);
    setStart(toW(sx, sy));
  };

  const meta = (
    <>
      <Stat label="step" value={steps} />
      <Stat label="loss" value={finalLoss.toFixed(4)} color="var(--viz-trace)" />
    </>
  );

  return (
    <Shell title="Gradient Descent" meta={meta}>
      <Sub>
        Drag the marble to choose a starting point. Three optimizers race over the same loss surface
        — vanilla SGD, momentum (β = 0.9), and Adam.
      </Sub>

      <div className="viz-row">
        <Stage>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            width={W}
            height={H}
            style={{ display: "block", touchAction: "none", maxWidth: "100%" }}
            onPointerDown={(e) => {
              setDrag(true);
              const rect = svgRef.current!.getBoundingClientRect();
              setStart(toW((e.clientX - rect.left) * (W / rect.width), (e.clientY - rect.top) * (H / rect.height)));
            }}
            onPointerMove={onMove}
            onPointerUp={() => setDrag(false)}
            onPointerLeave={() => setDrag(false)}
          >
            {heat.map((c, i) => {
              const t = (c.v - lMin) / (lMax - lMin + 1e-9);
              const a = 0.18 + t * 0.55;
              return (
                <rect
                  key={i}
                  x={c.x}
                  y={c.y}
                  width={cw + 0.5}
                  height={ch + 0.5}
                  fill="var(--viz-trace)"
                  fillOpacity={a}
                />
              );
            })}

            {[5, 10, 20, 40].map((iso) => (
              <g key={iso}>
                {/* Skip true contour lines for simplicity — heatmap conveys it */}
              </g>
            ))}

            {/* Path */}
            <polyline
              points={path.map(([px, py]) => toS(px, py).join(",")).join(" ")}
              fill="none"
              stroke="var(--viz-warn)"
              strokeWidth="2.5"
              opacity="0.95"
            />
            {path.map((p, i) =>
              i % 4 === 0 ? (
                <circle key={i} cx={toS(p[0], p[1])[0]} cy={toS(p[0], p[1])[1]} r={2.5} fill="var(--viz-warn)" />
              ) : null,
            )}

            {/* Start */}
            <circle
              cx={toS(start[0], start[1])[0]}
              cy={toS(start[0], start[1])[1]}
              r={9}
              fill="var(--viz-warn)"
              stroke="var(--bg)"
              strokeWidth="2.5"
              style={{ cursor: "grab" }}
            />

            {/* End */}
            <circle
              cx={toS(path.at(-1)![0], path.at(-1)![1])[0]}
              cy={toS(path.at(-1)![0], path.at(-1)![1])[1]}
              r={6}
              fill="var(--viz-positive)"
              stroke="var(--bg)"
              strokeWidth="2"
            />
          </svg>
        </Stage>

        <Panel minWidth={240}>
          <SectionLabel>Optimizer</SectionLabel>
          <Tabs value={opt} onChange={(id) => setOpt(id as Optimizer)} items={OPTS} />

          <Slider label="learning rate" min={0.005} max={0.25} step={0.005} value={lr} onChange={setLr} />
          <Slider
            label="steps"
            min={5}
            max={250}
            step={5}
            value={steps}
            onChange={setSteps}
            format={(v) => `${v}`}
          />

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
            <Btn kind="tag" onClick={() => setStart([-1, 1.5])}>
              top-left
            </Btn>
            <Btn kind="tag" onClick={() => setStart([3, 1.5])}>
              top-right
            </Btn>
            <Btn kind="tag" onClick={() => setStart([3, -1.5])}>
              bottom-right
            </Btn>
            <Btn kind="tag" onClick={() => setStart([-1, -1.5])}>
              bottom-left
            </Btn>
          </div>

          <Notice>
            <strong>What to notice.</strong> SGD with high learning rate oscillates across the valley.
            Momentum smooths it out by accumulating gradient history. Adam adapts the step size per
            dimension — robust to starting point and lr.
          </Notice>
        </Panel>
      </div>
    </Shell>
  );
}
