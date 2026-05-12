import React, { useState } from "react";
import { Shell, Sub, Stage, Panel, SectionLabel, Btn, Slider, Notice, Stat } from "@readrun/widgets/primitives";

type Target = "square" | "saw" | "triangle";

const TARGETS: { id: Target; label: string }[] = [
  { id: "square", label: "Square" },
  { id: "saw", label: "Sawtooth" },
  { id: "triangle", label: "Triangle" },
];

function targetCoef(target: Target, n: number): number {
  if (target === "square") {
    if (n % 2 === 0) return 0;
    return (4 / Math.PI) / n;
  }
  if (target === "saw") {
    return ((n % 2 === 0 ? -1 : 1) * 2) / (Math.PI * n);
  }
  // triangle: only odd, alternating sign, 1/n^2
  if (n % 2 === 0) return 0;
  const k = (n - 1) / 2;
  return ((k % 2 === 0 ? 1 : -1) * 8) / (Math.PI * Math.PI * n * n);
}

export function FourierBuilder() {
  const W = 620;
  const H = 320;
  const [target, setTarget] = useState<Target>("square");
  const [terms, setTerms] = useState(5);

  const N = 600;
  const points: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const x = (i / (N - 1)) * 2 * Math.PI;
    let y = 0;
    for (let n = 1; n <= terms; n++) {
      y += targetCoef(target, n) * Math.sin(n * x);
    }
    points.push([x, y]);
  }
  const yMax = Math.max(...points.map(([, y]) => Math.abs(y))) * 1.15 || 1.2;
  const toX = (x: number) => (x / (2 * Math.PI)) * W;
  const toY = (y: number) => H / 2 - (y / yMax) * (H * 0.42);

  // True target curve (for comparison)
  const truth: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const x = (i / (N - 1)) * 2 * Math.PI;
    let y = 0;
    if (target === "square") y = x < Math.PI ? 1 : -1;
    else if (target === "saw") y = 1 - x / Math.PI;
    else y = 1 - 4 * Math.abs(x / (2 * Math.PI) - 0.5);
    truth.push([x, y]);
  }

  const harmonics: { n: number; coef: number }[] = [];
  for (let n = 1; n <= terms; n++) {
    const c = targetCoef(target, n);
    if (c !== 0) harmonics.push({ n, coef: c });
  }

  return (
    <Shell
      title="Fourier Builder"
      meta={
        <>
          <Stat label="target" value={target} color="var(--viz-trace)" />
          <Stat label="terms" value={terms} />
        </>
      }
    >
      <Sub>
        Add sine harmonics to approximate a target waveform. The faint dashed line is the true
        target; the bold curve is the Fourier sum. Watch Gibbs phenomenon (overshoot at the
        discontinuity) refuse to vanish even at high N.
      </Sub>

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        {TARGETS.map((t) => (
          <Btn key={t.id} kind="tag" active={target === t.id} onClick={() => setTarget(t.id)}>
            {t.label}
          </Btn>
        ))}
      </div>

      <div className="viz-row">
        <Stage>
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: "block", maxWidth: "100%" }}>
            <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="var(--viz-axis)" strokeWidth="1" opacity="0.5" />

            {/* Truth */}
            <polyline
              points={truth.map(([x, y]) => `${toX(x)},${toY(y)}`).join(" ")}
              fill="none"
              stroke="var(--viz-axis)"
              strokeWidth="1.5"
              strokeDasharray="6 5"
              opacity="0.7"
            />

            {/* Fourier sum */}
            <polyline
              points={points.map(([x, y]) => `${toX(x)},${toY(y)}`).join(" ")}
              fill="none"
              stroke="var(--viz-trace)"
              strokeWidth="2.6"
            />

            {/* Individual harmonics (faint) */}
            {harmonics.slice(0, 6).map(({ n, coef }, i) => {
              const pts: string[] = [];
              for (let j = 0; j < N; j++) {
                const x = (j / (N - 1)) * 2 * Math.PI;
                const y = coef * Math.sin(n * x);
                pts.push(`${toX(x)},${toY(y)}`);
              }
              return (
                <polyline
                  key={n}
                  points={pts.join(" ")}
                  fill="none"
                  stroke="var(--viz-warn)"
                  strokeWidth="0.8"
                  opacity={0.3 - i * 0.04}
                />
              );
            })}
          </svg>
        </Stage>

        <Panel minWidth={220}>
          <SectionLabel>Harmonics</SectionLabel>
          <Slider label="terms" min={1} max={40} step={1} value={terms} onChange={setTerms} format={(v) => `${v}`} />

          <SectionLabel style={{ marginTop: 14 }}>Coefficients</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontFamily: "var(--font-mono, monospace)", color: "var(--text-muted)", maxHeight: 160, overflowY: "auto" }}>
            {harmonics.map(({ n, coef }) => (
              <div key={n}>
                a<sub>{n}</sub> = {coef.toFixed(4)}
              </div>
            ))}
          </div>

          <Notice>
            <strong>What to notice.</strong> Square waves use only odd harmonics with 1/n
            coefficients. Triangles fall off as 1/n² — much faster, no Gibbs. Bump the term
            count to 40 and the discontinuity overshoot stays at ~9% — that's Gibbs.
          </Notice>
        </Panel>
      </div>
    </Shell>
  );
}
