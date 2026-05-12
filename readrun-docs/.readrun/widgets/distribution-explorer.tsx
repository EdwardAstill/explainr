import React, { useMemo, useRef, useState } from "react";
import { Shell, Sub, Stage, Panel, SectionLabel, Btn, Slider, Notice, Stat, Tabs, ToggleRow } from "@readrun/widgets/primitives";
import {
  betaPdf,
  exponentialPdf,
  gammaPdf,
  normalPdf,
  sampleBeta,
  sampleExponential,
  sampleGamma,
  sampleNormal,
} from "@readrun/widgets/math";

type Dist = "normal" | "beta" | "gamma" | "exponential";

const DISTS: { id: Dist; label: string }[] = [
  { id: "normal", label: "Normal" },
  { id: "beta", label: "Beta" },
  { id: "gamma", label: "Gamma" },
  { id: "exponential", label: "Exponential" },
];

interface DistState {
  mu: number;
  sigma: number;
  alpha: number;
  beta: number;
  k: number;
  theta: number;
  lambda: number;
}

const DEFAULTS: DistState = {
  mu: 0,
  sigma: 1,
  alpha: 2,
  beta: 5,
  k: 2,
  theta: 1.5,
  lambda: 1,
};

export function DistributionExplorer() {
  const W = 620;
  const H = 320;
  const [dist, setDist] = useState<Dist>("normal");
  const [s, setS] = useState<DistState>(DEFAULTS);
  const [view, setView] = useState<"pdf" | "cdf">("pdf");
  const [logY, setLogY] = useState(false);
  const [a, setA] = useState(-0.5);
  const [b, setB] = useState(0.5);
  const [hist, setHist] = useState<number[]>([]);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const range = useMemo<[number, number]>(() => {
    if (dist === "normal") return [s.mu - 4 * s.sigma, s.mu + 4 * s.sigma];
    if (dist === "beta") return [0, 1];
    if (dist === "gamma") return [0, Math.max(8, s.k * s.theta * 4)];
    return [0, Math.max(6, 6 / s.lambda)];
  }, [dist, s]);

  const pdfFn = (x: number): number => {
    if (dist === "normal") return normalPdf(x, s.mu, s.sigma);
    if (dist === "beta") return betaPdf(x, s.alpha, s.beta);
    if (dist === "gamma") return gammaPdf(x, s.k, s.theta);
    return exponentialPdf(x, s.lambda);
  };

  const samples: number[] = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < 600; i++) {
      if (dist === "normal") out.push(sampleNormal(s.mu, s.sigma));
      else if (dist === "beta") out.push(sampleBeta(s.alpha, s.beta));
      else if (dist === "gamma") out.push(sampleGamma(s.k, s.theta));
      else out.push(sampleExponential(s.lambda));
    }
    return out;
  }, [dist, s, hist]);

  const N = 220;
  const pts = useMemo(() => {
    const ys = new Array(N);
    let yMax = 0;
    let cum = 0;
    const step = (range[1] - range[0]) / N;
    for (let i = 0; i < N; i++) {
      const x = range[0] + i * step;
      ys[i] = pdfFn(x);
      if (ys[i] > yMax) yMax = ys[i];
    }
    if (view === "cdf") {
      let acc = 0;
      const total = ys.reduce((a, b) => a + b, 0) * step;
      for (let i = 0; i < N; i++) {
        acc += ys[i] * step;
        ys[i] = acc / total;
      }
      yMax = 1;
    }
    return { ys, yMax: yMax * 1.08, step };
  }, [pdfFn, range, view]);

  const toX = (x: number) => ((x - range[0]) / (range[1] - range[0])) * W;
  const toY = (y: number) => {
    if (logY && view === "pdf") {
      const ly = Math.log10(y + 1e-6);
      const lyMax = Math.log10(pts.yMax + 1e-6);
      const lyMin = -3;
      return H - ((ly - lyMin) / (lyMax - lyMin)) * H * 0.92 - 8;
    }
    return H - (y / pts.yMax) * H * 0.92 - 8;
  };

  // Build polyline
  const polyPts: string[] = [];
  for (let i = 0; i < N; i++) {
    const x = range[0] + i * pts.step;
    polyPts.push(`${toX(x)},${toY(pts.ys[i])}`);
  }

  // Shaded probability mass between a and b (PDF only)
  const shadeArea = (() => {
    if (view !== "pdf") return null;
    const aIdx = Math.max(0, Math.min(N - 1, Math.round(((a - range[0]) / (range[1] - range[0])) * N)));
    const bIdx = Math.max(0, Math.min(N - 1, Math.round(((b - range[0]) / (range[1] - range[0])) * N)));
    const lo = Math.min(aIdx, bIdx);
    const hi = Math.max(aIdx, bIdx);
    let prob = 0;
    const segs: string[] = [];
    segs.push(`${toX(range[0] + lo * pts.step)},${H - 8}`);
    for (let i = lo; i <= hi; i++) {
      const x = range[0] + i * pts.step;
      segs.push(`${toX(x)},${toY(pts.ys[i])}`);
      prob += pts.ys[i] * pts.step;
    }
    segs.push(`${toX(range[0] + hi * pts.step)},${H - 8}`);
    return { polygon: segs.join(" "), prob };
  })();

  // Histogram
  const bins = 26;
  const histCounts = new Array(bins).fill(0);
  const sMin = range[0];
  const sMax = range[1];
  const bw = (sMax - sMin) / bins;
  for (const v of samples) {
    if (v < sMin || v > sMax) continue;
    const i = Math.min(bins - 1, Math.floor((v - sMin) / bw));
    histCounts[i]++;
  }
  const histMaxNorm = Math.max(...histCounts) || 1;

  function setParam<K extends keyof DistState>(k: K, v: number) {
    setS((p) => ({ ...p, [k]: v }));
  }

  const onSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current || view !== "pdf") return;
    const rect = svgRef.current.getBoundingClientRect();
    const sx = (e.clientX - rect.left) * (W / rect.width);
    const wx = range[0] + (sx / W) * (range[1] - range[0]);
    const dA = Math.abs(wx - a);
    const dB = Math.abs(wx - b);
    const which = dA < dB ? "a" : "b";
    const move = (ev: PointerEvent) => {
      const sx2 = (ev.clientX - rect.left) * (W / rect.width);
      const wx2 = range[0] + (sx2 / W) * (range[1] - range[0]);
      if (which === "a") setA(wx2);
      else setB(wx2);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <Shell
      title="Distribution Explorer"
      meta={
        <>
          <Stat label="dist" value={dist} color="var(--viz-trace)" />
          {shadeArea && <Stat label="P(a<X<b)" value={shadeArea.prob.toFixed(3)} color="var(--viz-warn)" />}
        </>
      }
    >
      <Sub>
        Pick a distribution. Drag the cursors on the curve to compute P(a&lt;X&lt;b). Resample
        to refresh the histogram. Switch to CDF for a cumulative view.
      </Sub>

      <Tabs value={dist} onChange={(id) => setDist(id as Dist)} items={DISTS} />

      <div className="viz-row">
        <Stage>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            width={W}
            height={H}
            style={{ display: "block", touchAction: "none", maxWidth: "100%" }}
            onPointerDown={onSvgPointerDown}
          >
            {/* Histogram */}
            <g>
              {histCounts.map((c, i) => {
                const x = toX(sMin + i * bw);
                const w = (W / bins) - 2;
                const h = (c / histMaxNorm) * H * 0.55;
                return (
                  <rect
                    key={i}
                    x={x + 1}
                    y={H - 8 - h}
                    width={w}
                    height={h}
                    fill="var(--viz-trace-2)"
                    fillOpacity="0.3"
                  />
                );
              })}
            </g>

            {/* Axis */}
            <line x1={0} y1={H - 8} x2={W} y2={H - 8} stroke="var(--viz-axis)" strokeWidth="1" />

            {/* Shaded area */}
            {shadeArea && (
              <polygon points={shadeArea.polygon} fill="var(--viz-warn)" fillOpacity="0.28" />
            )}

            {/* PDF or CDF curve */}
            <polyline points={polyPts.join(" ")} fill="none" stroke="var(--viz-trace)" strokeWidth="2.4" />

            {/* Cursor handles */}
            {view === "pdf" && (
              <>
                <line x1={toX(a)} y1={0} x2={toX(a)} y2={H - 8} stroke="var(--viz-warn)" strokeWidth="1.5" strokeDasharray="3 3" />
                <line x1={toX(b)} y1={0} x2={toX(b)} y2={H - 8} stroke="var(--viz-warn)" strokeWidth="1.5" strokeDasharray="3 3" />
                <circle cx={toX(a)} cy={H - 8} r={6} fill="var(--viz-warn)" stroke="var(--bg)" strokeWidth="2" />
                <circle cx={toX(b)} cy={H - 8} r={6} fill="var(--viz-warn)" stroke="var(--bg)" strokeWidth="2" />
              </>
            )}
          </svg>
        </Stage>

        <Panel minWidth={240}>
          <SectionLabel>Parameters</SectionLabel>
          {dist === "normal" && (
            <>
              <Slider label="μ" min={-3} max={3} step={0.05} value={s.mu} onChange={(v) => setParam("mu", v)} />
              <Slider label="σ" min={0.1} max={3} step={0.05} value={s.sigma} onChange={(v) => setParam("sigma", v)} />
            </>
          )}
          {dist === "beta" && (
            <>
              <Slider label="α" min={0.5} max={10} step={0.1} value={s.alpha} onChange={(v) => setParam("alpha", v)} />
              <Slider label="β" min={0.5} max={10} step={0.1} value={s.beta} onChange={(v) => setParam("beta", v)} />
            </>
          )}
          {dist === "gamma" && (
            <>
              <Slider label="k" min={0.5} max={8} step={0.1} value={s.k} onChange={(v) => setParam("k", v)} />
              <Slider label="θ" min={0.2} max={3} step={0.05} value={s.theta} onChange={(v) => setParam("theta", v)} />
            </>
          )}
          {dist === "exponential" && (
            <Slider label="λ" min={0.2} max={4} step={0.05} value={s.lambda} onChange={(v) => setParam("lambda", v)} />
          )}

          <SectionLabel style={{ marginTop: 14 }}>View</SectionLabel>
          <Tabs
            value={view}
            onChange={(id) => setView(id as "pdf" | "cdf")}
            items={[
              { id: "pdf", label: "PDF" },
              { id: "cdf", label: "CDF" },
            ]}
          />
          <ToggleRow checked={logY} onChange={setLogY}>
            log y-axis (PDF)
          </ToggleRow>

          <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
            <Btn kind="primary" onClick={() => setHist((h) => [...h, 1])}>
              Resample
            </Btn>
            <Btn kind="ghost" onClick={() => setS(DEFAULTS)}>
              Reset params
            </Btn>
          </div>

          <Notice>
            <strong>What to notice.</strong> Beta(α,β) supports only [0,1] and shapes wildly with the
            two parameters. Gamma generalises Exponential (k=1). Resample to see how histogram noise
            settles toward the true PDF as N grows.
          </Notice>
        </Panel>
      </div>
    </Shell>
  );
}
