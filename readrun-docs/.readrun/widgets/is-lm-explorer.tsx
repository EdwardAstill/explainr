import React, { useState } from "react";
import { WidgetLayout, Stage, Btn, Slider, Stat, Notice } from "@readrun/widgets/primitives";
import { Frame, scale } from "@readrun/widgets/plot";
import {
  DEFAULT_PARAMS,
  equilibrium,
  isCurvePoints,
  lmCurvePoints,
  moneyDemandPoints,
} from "./is-lm-explorer.model";
import type { ISLMParams } from "./is-lm-explorer.model";

// ── Domain constants ──────────────────────────────────────────────────────────

const R_DOMAIN: readonly [number, number] = [0, 25];
const M_DOMAIN: readonly [number, number] = [0, 600];
const Y_DOMAIN: readonly [number, number] = [0, 1100];

// Frame dimensions reduced to fit the visual column (~500px wide):
//   two 240px panels + 16px gap = 496px
//   margin = { top: 10, right: 10, bottom: 30, left: 40 }
//   innerWidth  = 240 − 40 − 10 = 190
//   innerHeight = 280 − 10 − 30 = 240
const FRAME_W = 240;
const FRAME_H = 280;
const INNER_W = 190;
const INNER_H = 240;

// ── Helper: pixel-mapped scales ───────────────────────────────────────────────

// These are constructed once at module level because domain/range are fixed.
const mmXScale = scale.linear({ domain: M_DOMAIN, range: [0, INNER_W] });
const gmXScale = scale.linear({ domain: Y_DOMAIN, range: [0, INNER_W] });
// Y (r) scale: r=0 → bottom (INNER_H px), r=25 → top (0 px)
const rScale = scale.linear({ domain: R_DOMAIN, range: [INNER_H, 0] });

// ── Root component ────────────────────────────────────────────────────────────

export function IsLmExplorer() {
  const [params, setParams] = useState<ISLMParams>(DEFAULT_PARAMS);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const eq = equilibrium(params);
  const setP = (patch: Partial<ISLMParams>) =>
    setParams((p) => ({ ...p, ...patch }));
  const reset = () => setParams(DEFAULT_PARAMS);

  return (
    <WidgetLayout
      arrangement="visual-left"
      title="IS-LM Explorer"
      subtitle={
        <>
          Two side-by-side panels share interest rate <code>r</code> on the
          y-axis. Move the sliders to see how monetary policy (M) and fiscal
          policy (G, T) propagate through both markets.
        </>
      }
    >
      <WidgetLayout.Visual>
        {!eq ? (
          <Notice>
            No equilibrium in the feasible range. Try moving the sliders back
            toward the centre or click <strong>Reset</strong>.
          </Notice>
        ) : (
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <MoneyMarketPanel params={params} eq={eq} />
            <GoodsMarketPanel params={params} eq={eq} />
          </div>
        )}
      </WidgetLayout.Visual>

      <WidgetLayout.Controls>
        {/* Stat row */}
        {eq && (
          <div
            className="viz-stat-row"
            style={{ marginTop: 0, display: "flex", gap: 16, flexWrap: "wrap" }}
          >
            <Stat label="r*" value={eq.rEq.toFixed(2)} />
            <Stat label="Y*" value={eq.Yeq.toFixed(0)} />
            <Stat label="M" value={params.M.toFixed(0)} />
            <Stat label="G" value={params.G.toFixed(0)} />
            <Stat label="T" value={params.T.toFixed(0)} />
          </div>
        )}

        {/* Primary sliders rail */}
        <div
          style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 0 }}
        >
          <Slider
            label="M"
            value={params.M}
            min={50}
            max={500}
            step={5}
            onChange={(v) => setP({ M: v })}
          />
          <Slider
            label="G"
            value={params.G}
            min={0}
            max={300}
            step={5}
            onChange={(v) => setP({ G: v })}
          />
          <Slider
            label="T"
            value={params.T}
            min={0}
            max={200}
            step={5}
            onChange={(v) => setP({ T: v })}
          />
        </div>

        {/* Toggle + reset buttons */}
        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
          <Btn kind="ghost" onClick={() => setShowAdvanced((v) => !v)}>
            {showAdvanced ? "hide" : "show all parameters"}
          </Btn>
          <Btn kind="ghost" onClick={reset}>
            Reset
          </Btn>
        </div>

        {/* Advanced sliders (hidden until toggled) */}
        {showAdvanced && (
          <div
            style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 0 }}
          >
            <Slider
              label="c0"
              value={params.c0}
              min={50}
              max={200}
              step={5}
              onChange={(v) => setP({ c0: v })}
            />
            <Slider
              label="c1"
              value={params.c1}
              min={0.3}
              max={0.9}
              step={0.05}
              onChange={(v) => setP({ c1: v })}
            />
            <Slider
              label="i0"
              value={params.i0}
              min={100}
              max={400}
              step={5}
              onChange={(v) => setP({ i0: v })}
            />
            <Slider
              label="b"
              value={params.b}
              min={5}
              max={50}
              step={1}
              onChange={(v) => setP({ b: v })}
            />
            <Slider
              label="k"
              value={params.k}
              min={0.2}
              max={1.0}
              step={0.05}
              onChange={(v) => setP({ k: v })}
            />
            <Slider
              label="h"
              value={params.h}
              min={5}
              max={30}
              step={1}
              onChange={(v) => setP({ h: v })}
            />
          </div>
        )}
      </WidgetLayout.Controls>

      <WidgetLayout.Aside>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.55 }}>
          <li>
            <code>M</code> ↑ — LM shifts right, money supply line shifts right,{" "}
            <code>r*</code> falls and <code>Y*</code> rises. Monetary easing.
          </li>
          <li>
            <code>G</code> ↑ — IS shifts right, both <code>Y*</code> and{" "}
            <code>r*</code> rise. Fiscal multiplier raises output, higher
            activity pushes rates up.
          </li>
          <li>
            <code>T</code> ↑ — IS shifts left, both <code>Y*</code> and{" "}
            <code>r*</code> fall. Tax drag.
          </li>
        </ul>
      </WidgetLayout.Aside>
    </WidgetLayout>
  );
}

// ── Money market panel ────────────────────────────────────────────────────────

function MoneyMarketPanel({
  params,
  eq,
}: {
  params: ISLMParams;
  eq: { Yeq: number; rEq: number };
}) {
  const demandPts = moneyDemandPoints(params, eq.Yeq, [R_DOMAIN[0], R_DOMAIN[1]]);

  // Money demand path (filter to visible domain)
  const visibleDemand = demandPts.filter(
    ([m, r]) => m >= M_DOMAIN[0] && m <= M_DOMAIN[1] && r >= R_DOMAIN[0] && r <= R_DOMAIN[1],
  );
  const demandPath =
    visibleDemand.length > 0
      ? "M " +
        visibleDemand
          .map(([m, r]) => `${mmXScale(m).toFixed(1)} ${rScale(r).toFixed(1)}`)
          .join(" L ")
      : "";

  return (
    <Stage>
      <Frame
        width={FRAME_W}
        height={FRAME_H}
        xScale={mmXScale}
        yScale={rScale}
        xLabel="M / P"
        yLabel="r"
      >
        {() => (
          <>
            {/* Money demand curve */}
            {demandPath && (
              <path
                d={demandPath}
                fill="none"
                stroke="var(--accent, #0969da)"
                strokeWidth={2}
              />
            )}

            {/* Money supply vertical dashed line */}
            <line
              x1={mmXScale(params.M)}
              y1={rScale(R_DOMAIN[1])}
              x2={mmXScale(params.M)}
              y2={rScale(R_DOMAIN[0])}
              stroke="var(--text, #1f2328)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />

            {/* Equilibrium horizontal dashed guide at r* */}
            <line
              x1={0}
              y1={rScale(eq.rEq)}
              x2={INNER_W}
              y2={rScale(eq.rEq)}
              stroke="var(--text-muted, #656d76)"
              strokeWidth={1}
              strokeDasharray="2 4"
            />

            {/* Equilibrium marker (8×8 filled square at (M, r*)) */}
            <rect
              x={mmXScale(params.M) - 4}
              y={rScale(eq.rEq) - 4}
              width={8}
              height={8}
              fill="var(--text, #1f2328)"
            />
          </>
        )}
      </Frame>
    </Stage>
  );
}

// ── Goods market panel ────────────────────────────────────────────────────────

function GoodsMarketPanel({
  params,
  eq,
}: {
  params: ISLMParams;
  eq: { Yeq: number; rEq: number };
}) {
  const isPts = isCurvePoints(params, [R_DOMAIN[0], R_DOMAIN[1]]);
  const lmPts = lmCurvePoints(params, [Y_DOMAIN[0], Y_DOMAIN[1]]);

  // IS path (filter to visible domain)
  const visibleIS = isPts.filter(
    ([Y, r]) =>
      Y >= Y_DOMAIN[0] &&
      Y <= Y_DOMAIN[1] &&
      r >= R_DOMAIN[0] &&
      r <= R_DOMAIN[1],
  );
  const isPath =
    visibleIS.length > 0
      ? "M " +
        visibleIS
          .map(([Y, r]) => `${gmXScale(Y).toFixed(1)} ${rScale(r).toFixed(1)}`)
          .join(" L ")
      : "";

  // LM path (filter to visible domain)
  const visibleLM = lmPts.filter(
    ([Y, r]) =>
      Y >= Y_DOMAIN[0] &&
      Y <= Y_DOMAIN[1] &&
      r >= R_DOMAIN[0] &&
      r <= R_DOMAIN[1],
  );
  const lmPath =
    visibleLM.length > 0
      ? "M " +
        visibleLM
          .map(([Y, r]) => `${gmXScale(Y).toFixed(1)} ${rScale(r).toFixed(1)}`)
          .join(" L ")
      : "";

  return (
    <Stage>
      <Frame
        width={FRAME_W}
        height={FRAME_H}
        xScale={gmXScale}
        yScale={rScale}
        xLabel="Y"
        yLabel="r"
      >
        {() => (
          <>
            {/* IS curve */}
            {isPath && (
              <path
                d={isPath}
                fill="none"
                stroke="var(--accent, #0969da)"
                strokeWidth={2}
              />
            )}

            {/* LM curve */}
            {lmPath && (
              <path
                d={lmPath}
                fill="none"
                stroke="#10b981"
                strokeWidth={2}
              />
            )}

            {/* Equilibrium horizontal dashed guide at r* */}
            <line
              x1={0}
              y1={rScale(eq.rEq)}
              x2={INNER_W}
              y2={rScale(eq.rEq)}
              stroke="var(--text-muted, #656d76)"
              strokeWidth={1}
              strokeDasharray="2 4"
            />

            {/* Equilibrium vertical dashed guide at Y* */}
            <line
              x1={gmXScale(eq.Yeq)}
              y1={0}
              x2={gmXScale(eq.Yeq)}
              y2={INNER_H}
              stroke="var(--text-muted, #656d76)"
              strokeWidth={1}
              strokeDasharray="2 4"
            />

            {/* Equilibrium marker (8×8 filled square at (Y*, r*)) */}
            <rect
              x={gmXScale(eq.Yeq) - 4}
              y={rScale(eq.rEq) - 4}
              width={8}
              height={8}
              fill="var(--text, #1f2328)"
            />
          </>
        )}
      </Frame>
    </Stage>
  );
}
