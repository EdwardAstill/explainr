import React, { useEffect, useRef, useState } from "react";
import { Shell, Sub, Stage, Panel, SectionLabel, Btn, Slider, Notice, Stat } from "@readrun/widgets/primitives";
import { mulberry32, sampleNormal } from "@readrun/widgets/math";

export interface Pt {
  x: number;
  y: number;
  c?: number;
}

type DragTarget = { kind: "point" | "centroid"; index: number };
type ToolMode = "draw" | "erase";

interface DecisionCell {
  x: number;
  y: number;
  c: number;
  size: number;
}

const COLORS = ["var(--viz-trace)", "var(--viz-warn)", "var(--viz-positive)", "var(--viz-violet)", "var(--viz-pink)"];
const DEFAULT_SPEED_MS = 350;

export function clearClusterAssignments(points: Pt[]): Pt[] {
  return points.map(({ x, y }) => ({ x, y }));
}

export function calculateInertia(points: Pt[], centroids: Pt[]): number {
  return points.reduce((acc, p) => {
    if (p.c === undefined) return acc;
    const c = centroids[p.c];
    if (!c) return acc;
    return acc + (p.x - c.x) ** 2 + (p.y - c.y) ** 2;
  }, 0);
}

export function clampToStage(p: Pt, w: number, h: number): Pt {
  return {
    x: Math.min(w, Math.max(0, p.x)),
    y: Math.min(h, Math.max(0, p.y)),
  };
}

export function nearestIndex(points: Pt[], target: Pt, maxDistance: number): number | undefined {
  let best: number | undefined;
  let bestDistance = maxDistance ** 2;

  points.forEach((p, i) => {
    const d = (p.x - target.x) ** 2 + (p.y - target.y) ** 2;
    if (d <= bestDistance) {
      best = i;
      bestDistance = d;
    }
  });

  return best;
}

export function updatePointAt(points: Pt[], index: number, nextPoint: Pt): Pt[] {
  return points.map((p, i) => (i === index ? { x: nextPoint.x, y: nextPoint.y } : p));
}

export function buildDecisionCells(centroids: Pt[], w: number, h: number, size: number): DecisionCell[] {
  if (centroids.length === 0) return [];

  const cells: DecisionCell[] = [];
  for (let y = 0; y < h; y += size) {
    for (let x = 0; x < w; x += size) {
      const sample = { x: x + size / 2, y: y + size / 2 };
      cells.push({ x, y, c: nearestIndex(centroids, sample, Infinity) ?? 0, size });
    }
  }
  return cells;
}

export function KmeansClustering() {
  const W = 540;
  const H = 420;
  const [k, setK] = useState(3);
  const [points, setPoints] = useState<Pt[]>(() => seedPoints(W, H));
  const [centroids, setCentroids] = useState<Pt[]>(() => randomCentroids(3, W, H, 1));
  const [running, setRunning] = useState(false);
  const [iter, setIter] = useState(0);
  const [speed, setSpeed] = useState(DEFAULT_SPEED_MS);
  const [showRegions, setShowRegions] = useState(true);
  const [toolMode, setToolMode] = useState<ToolMode>("draw");
  const [dragging, setDragging] = useState<DragTarget | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  function seedPoints(w: number, h: number): Pt[] {
    const rng = mulberry32(7);
    const cluster = (cx: number, cy: number, n: number, sd: number): Pt[] =>
      Array.from({ length: n }, () => ({
        x: cx + sampleNormal(0, sd, rng),
        y: cy + sampleNormal(0, sd, rng),
      }));
    return [
      ...cluster(w * 0.3, h * 0.3, 30, 28),
      ...cluster(w * 0.7, h * 0.35, 30, 28),
      ...cluster(w * 0.55, h * 0.75, 30, 32),
    ];
  }

  function randomCentroids(kk: number, w: number, h: number, seed: number): Pt[] {
    const rng = mulberry32(seed);
    return Array.from({ length: kk }, () => ({ x: rng() * w, y: rng() * h }));
  }

  function step() {
    // assign
    const assigned = points.map((p) => {
      let best = 0;
      let bd = Infinity;
      for (let i = 0; i < centroids.length; i++) {
        const c = centroids[i]!;
        const d = (p.x - c.x) ** 2 + (p.y - c.y) ** 2;
        if (d < bd) {
          bd = d;
          best = i;
        }
      }
      return { ...p, c: best };
    });
    // recompute
    const next: Pt[] = [];
    for (let i = 0; i < centroids.length; i++) {
      const ps = assigned.filter((p) => p.c === i);
      if (ps.length === 0) next.push(centroids[i]!);
      else next.push({ x: ps.reduce((a, b) => a + b.x, 0) / ps.length, y: ps.reduce((a, b) => a + b.y, 0) / ps.length });
    }
    setPoints(assigned);
    setCentroids(next);
    setIter((i) => i + 1);
  }

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(step, speed);
    return () => window.clearInterval(id);
  }, [running, points, centroids, speed]);

  const eventPoint = (e: React.PointerEvent<SVGSVGElement>): Pt | undefined => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    return clampToStage(
      {
        x: (e.clientX - rect.left) * (W / rect.width),
        y: (e.clientY - rect.top) * (H / rect.height),
      },
      W,
      H,
    );
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const p = eventPoint(e);
    if (!p || !svgRef.current) return;

    if (toolMode === "erase") {
      const hit = nearestIndex(points, p, 14);
      if (hit !== undefined) {
        setPoints((ps) => ps.filter((_, i) => i !== hit));
        setIter(0);
      }
      return;
    }

    const centroidHit = nearestIndex(centroids, p, 18);
    if (centroidHit !== undefined) {
      setDragging({ kind: "centroid", index: centroidHit });
      svgRef.current.setPointerCapture(e.pointerId);
      return;
    }

    const pointHit = nearestIndex(points, p, 11);
    if (pointHit !== undefined) {
      setDragging({ kind: "point", index: pointHit });
      svgRef.current.setPointerCapture(e.pointerId);
      return;
    }

    setPoints((ps) => [...ps, p]);
    setIter(0);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const p = eventPoint(e);
    if (!p || !dragging) return;

    if (dragging.kind === "point") {
      setPoints((ps) => updatePointAt(ps, dragging.index, p));
    } else {
      setCentroids((cs) => updatePointAt(cs, dragging.index, p));
    }
    setIter(0);
  };

  const stopDragging = (e: React.PointerEvent<SVGSVGElement>) => {
    if (dragging && svgRef.current?.hasPointerCapture(e.pointerId)) {
      svgRef.current.releasePointerCapture(e.pointerId);
    }
    setDragging(null);
  };

  function reset() {
    setPoints(seedPoints(W, H));
    setCentroids(randomCentroids(k, W, H, Math.floor(Math.random() * 1e6)));
    setIter(0);
  }

  function clearPoints() {
    setPoints([]);
    setIter(0);
  }

  function changeK(nk: number) {
    setK(nk);
    setPoints((ps) => clearClusterAssignments(ps));
    setCentroids(randomCentroids(nk, W, H, Math.floor(Math.random() * 1e6)));
    setIter(0);
  }

  const inertia = calculateInertia(points, centroids);
  const decisionCells = showRegions ? buildDecisionCells(centroids, W, H, 18) : [];

  return (
    <Shell
      title="K-Means Clustering"
      meta={
        <>
          <Stat label="k" value={k} />
          <Stat label="iter" value={iter} />
          <Stat label="inertia" value={(inertia / 1000).toFixed(1)} color="var(--viz-warn)" />
        </>
      }
    >
      <Sub>
        Click empty space to add points. Drag points or centroids to reshape the problem, then run
        Lloyd iterations to watch the clusters settle.
      </Sub>

      <div className="viz-row">
        <Stage>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            width={W}
            height={H}
            style={{
              display: "block",
              maxWidth: "100%",
              cursor: toolMode === "erase" ? "not-allowed" : dragging ? "grabbing" : "crosshair",
              touchAction: "none",
              userSelect: "none",
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
            onPointerLeave={stopDragging}
          >
            {decisionCells.map((cell, i) => (
              <rect
                key={i}
                x={cell.x}
                y={cell.y}
                width={cell.size}
                height={cell.size}
                fill={COLORS[cell.c % COLORS.length]}
                opacity={0.08}
              />
            ))}
            {points.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={dragging?.kind === "point" && dragging.index === i ? 6 : 4}
                fill={p.c !== undefined ? COLORS[p.c % COLORS.length] : "var(--text-muted)"}
                opacity={p.c !== undefined ? 0.85 : 0.5}
                stroke={dragging?.kind === "point" && dragging.index === i ? "var(--bg)" : "none"}
                strokeWidth={dragging?.kind === "point" && dragging.index === i ? 2 : 0}
              />
            ))}
            {centroids.map((c, i) => (
              <g key={i} style={{ cursor: toolMode === "erase" ? "not-allowed" : "grab" }}>
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={dragging?.kind === "centroid" && dragging.index === i ? 15 : 11}
                  fill={COLORS[i % COLORS.length]}
                  stroke="var(--bg)"
                  strokeWidth="2.5"
                />
                <circle cx={c.x} cy={c.y} r={3} fill="var(--bg)" />
              </g>
            ))}
          </svg>
        </Stage>

        <Panel minWidth={220}>
          <SectionLabel>Clusters</SectionLabel>
          <Slider label="k" min={2} max={5} step={1} value={k} onChange={(v) => changeK(v)} format={(v) => `${v}`} />
          <Slider label="speed" min={80} max={650} step={10} value={speed} onChange={setSpeed} format={(v) => `${v}ms`} />

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            <Btn kind="tag" active={toolMode === "draw"} onClick={() => setToolMode("draw")}>
              Draw / drag
            </Btn>
            <Btn kind="tag" active={toolMode === "erase"} onClick={() => setToolMode("erase")}>
              Erase
            </Btn>
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 10,
              fontSize: 11,
              color: "var(--text-muted)",
            }}
          >
            <input type="checkbox" checked={showRegions} onChange={(e) => setShowRegions(e.currentTarget.checked)} />
            Show decision regions
          </label>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            <Btn kind="primary" onClick={step}>
              Step
            </Btn>
            <Btn kind={running ? "ghost" : "primary"} onClick={() => setRunning((r) => !r)}>
              {running ? "Stop" : "Run"}
            </Btn>
            <Btn kind="ghost" onClick={reset}>
              Reset
            </Btn>
            <Btn kind="ghost" onClick={clearPoints}>
              Clear
            </Btn>
          </div>

          <Notice>
            <strong>What to notice.</strong> Lloyd's algorithm always converges, but to a *local*
            minimum of inertia — different random initialisations land different cluster
            assignments. Click to add outliers and watch how single far points pull a centroid.
          </Notice>
        </Panel>
      </div>
    </Shell>
  );
}
