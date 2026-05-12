import React, { useMemo, useState } from "react";
import { Shell, Sub, Stage, Panel, SectionLabel, Btn, Slider, Notice, Stat } from "@readrun/widgets/primitives";
import { betaPdf } from "@readrun/widgets/math";

export function BayesCoin() {
  const W = 580;
  const H = 320;
  const [trueP, setTrueP] = useState(0.65);
  const [priorA, setPriorA] = useState(2);
  const [priorB, setPriorB] = useState(2);
  const [obs, setObs] = useState({ heads: 0, tails: 0 });

  function flip(n: number) {
    let h = 0;
    for (let i = 0; i < n; i++) if (Math.random() < trueP) h++;
    setObs((o) => ({ heads: o.heads + h, tails: o.tails + (n - h) }));
  }

  const a = priorA + obs.heads;
  const b = priorB + obs.tails;
  const N = 200;
  const xs = Array.from({ length: N }, (_, i) => i / (N - 1));
  const ys = xs.map((x) => betaPdf(x, a, b));
  const priorYs = xs.map((x) => betaPdf(x, priorA, priorB));
  const yMax = Math.max(...ys, ...priorYs) * 1.08;

  const toX = (x: number) => x * W;
  const toY = (y: number) => H - (y / yMax) * H * 0.9 - 12;
  const path = (vs: number[]) => xs.map((x, i) => `${toX(x)},${toY(vs[i]!)}`).join(" ");

  const mean = a / (a + b);
  const variance = (a * b) / ((a + b) * (a + b) * (a + b + 1));

  return (
    <Shell
      title="Bayesian Coin"
      meta={
        <>
          <Stat label="flips" value={obs.heads + obs.tails} />
          <Stat label="μ" value={mean.toFixed(3)} color="var(--viz-trace)" />
          <Stat label="σ" value={Math.sqrt(variance).toFixed(3)} color="var(--viz-warn)" />
        </>
      }
    >
      <Sub>
        Each flip updates a Beta posterior. Watch the curve concentrate around the true bias as
        evidence accumulates. The prior (dotted) reflects what you believed before any data.
      </Sub>

      <div className="viz-row">
        <Stage>
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: "block", maxWidth: "100%" }}>
            <line x1={0} y1={H - 12} x2={W} y2={H - 12} stroke="var(--viz-axis)" strokeWidth="1" />

            {/* True bias marker */}
            <line
              x1={toX(trueP)}
              y1={0}
              x2={toX(trueP)}
              y2={H - 12}
              stroke="var(--viz-positive)"
              strokeWidth="1.5"
              strokeDasharray="6 4"
            />
            <text x={toX(trueP) + 4} y={14} fontSize="11" fill="var(--viz-positive)">
              true p = {trueP.toFixed(2)}
            </text>

            {/* Prior */}
            <polyline points={path(priorYs)} fill="none" stroke="var(--viz-trace-2)" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.7" />

            {/* Posterior */}
            <polyline points={path(ys)} fill="none" stroke="var(--viz-trace)" strokeWidth="2.6" />
          </svg>
        </Stage>

        <Panel minWidth={240}>
          <SectionLabel>True Bias</SectionLabel>
          <Slider label="true p" min={0.05} max={0.95} step={0.01} value={trueP} onChange={setTrueP} />

          <SectionLabel style={{ marginTop: 12 }}>Prior Beta(α, β)</SectionLabel>
          <Slider label="α prior" min={0.5} max={10} step={0.1} value={priorA} onChange={setPriorA} />
          <Slider label="β prior" min={0.5} max={10} step={0.1} value={priorB} onChange={setPriorB} />

          <SectionLabel style={{ marginTop: 12 }}>Observations</SectionLabel>
          <div style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 11, color: "var(--text-muted)" }}>
            heads: <strong style={{ color: "var(--viz-positive)" }}>{obs.heads}</strong>
            tails: <strong style={{ color: "var(--viz-negative)" }}>{obs.tails}</strong>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Btn kind="primary" onClick={() => flip(1)}>
              Flip ×1
            </Btn>
            <Btn kind="primary" onClick={() => flip(10)}>
              ×10
            </Btn>
            <Btn kind="primary" onClick={() => flip(100)}>
              ×100
            </Btn>
            <Btn kind="ghost" onClick={() => setObs({ heads: 0, tails: 0 })}>
              Reset
            </Btn>
          </div>

          <Notice>
            <strong>What to notice.</strong> Beta(1,1) is the uninformative prior (flat). Stronger
            priors (e.g. α=β=10) take more evidence to overcome. The posterior mean = (α + h) / (α + β + h + t).
          </Notice>
        </Panel>
      </div>
    </Shell>
  );
}
