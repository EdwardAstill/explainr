import React, { useEffect, useMemo, useRef, useState } from "react";
import { Shell, Sub, Stage, Panel, SectionLabel, Btn, Notice, Stat, Tabs } from "@readrun/widgets/primitives";
import { degreeOf, forceStep, makeRandomGraph, makeRingGraph, makeScaleFree, makeSmallWorld, type ForceEdge, type ForceNode } from "@readrun/widgets/math/force";

type Topology = "random" | "ring" | "smallWorld" | "scaleFree";

const TOPOS: { id: Topology; label: string }[] = [
  { id: "random", label: "Random" },
  { id: "ring", label: "Ring" },
  { id: "smallWorld", label: "Small-world" },
  { id: "scaleFree", label: "Scale-free" },
];

export function ForceGraph() {
  const W = 540;
  const H = 420;
  const [topo, setTopo] = useState<Topology>("scaleFree");
  const [n, setN] = useState(28);
  const [seed, setSeed] = useState(7);
  const [freeze, setFreeze] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const [, force] = useState(0);
  const stateRef = useRef<{ nodes: ForceNode[]; edges: ForceEdge[] }>({ nodes: [], edges: [] });
  const dragRef = useRef<{ id: number | null; offX: number; offY: number }>({ id: null, offX: 0, offY: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rafRef = useRef(0);

  // Build / rebuild graph
  useEffect(() => {
    let g;
    if (topo === "random") g = makeRandomGraph(n, 0.12, W, H, seed);
    else if (topo === "ring") g = makeRingGraph(n, W, H);
    else if (topo === "smallWorld") g = makeSmallWorld(n, 0.15, W, H, seed);
    else g = makeScaleFree(n, W, H, seed);
    stateRef.current = g;
    force((x) => x + 1);
  }, [topo, n, seed]);

  useEffect(() => {
    if (freeze) return;
    const tick = () => {
      forceStep(stateRef.current.nodes, stateRef.current.edges, { width: W, height: H });
      force((x) => x + 1);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [freeze]);

  const degree = degreeOf(stateRef.current.nodes, stateRef.current.edges);
  const maxDeg = Math.max(...degree, 1);

  // Histogram
  const histBins = 10;
  const hist = new Array(histBins).fill(0);
  for (const d of degree) {
    const i = Math.min(histBins - 1, Math.floor((d / (maxDeg + 1)) * histBins));
    hist[i]++;
  }
  const histMax = Math.max(...hist, 1);

  function pos(e: React.PointerEvent<SVGSVGElement>): [number, number] {
    const rect = svgRef.current!.getBoundingClientRect();
    return [(e.clientX - rect.left) * (W / rect.width), (e.clientY - rect.top) * (H / rect.height)];
  }

  function down(e: React.PointerEvent<SVGSVGElement>) {
    const [x, y] = pos(e);
    let best = -1;
    let bd = 30;
    for (const node of stateRef.current.nodes) {
      const d = Math.hypot(node.x - x, node.y - y);
      if (d < bd) {
        bd = d;
        best = node.id;
      }
    }
    if (best >= 0) {
      dragRef.current = { id: best, offX: stateRef.current.nodes[best]!.x - x, offY: stateRef.current.nodes[best]!.y - y };
      stateRef.current.nodes[best]!.fixed = true;
    }
  }
  function move(e: React.PointerEvent<SVGSVGElement>) {
    const [x, y] = pos(e);
    if (dragRef.current.id !== null) {
      const node = stateRef.current.nodes[dragRef.current.id];
      if (node) {
        node.x = x + dragRef.current.offX;
        node.y = y + dragRef.current.offY;
        node.vx = 0;
        node.vy = 0;
      }
      return;
    }
    let h: number | null = null;
    let bd = 24;
    for (const node of stateRef.current.nodes) {
      const d = Math.hypot(node.x - x, node.y - y);
      if (d < bd) {
        bd = d;
        h = node.id;
      }
    }
    setHover(h);
  }
  function up() {
    if (dragRef.current.id !== null) {
      const node = stateRef.current.nodes[dragRef.current.id];
      if (node) node.fixed = false;
    }
    dragRef.current.id = null;
  }

  const highlightSet = useMemo(() => {
    if (hover === null) return new Set<number>();
    const s = new Set<number>([hover]);
    for (const e of stateRef.current.edges) {
      if (e.s === hover) s.add(e.t);
      if (e.t === hover) s.add(e.s);
    }
    return s;
  }, [hover]);

  return (
    <Shell
      title="Force-Directed Graph"
      meta={
        <>
          <Stat label="nodes" value={stateRef.current.nodes.length} />
          <Stat label="edges" value={stateRef.current.edges.length} />
          <Stat label="max deg" value={maxDeg} color="var(--viz-warn)" />
        </>
      }
    >
      <Sub>
        Four classic topologies. Drag a node to fix it (and let the rest settle around it). Hover
        to highlight neighbours; the histogram on the right shows the degree distribution.
      </Sub>

      <Tabs value={topo} onChange={(id) => setTopo(id as Topology)} items={TOPOS} />

      <div className="viz-row">
        <Stage>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            width={W}
            height={H}
            style={{ display: "block", maxWidth: "100%", touchAction: "none" }}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerLeave={up}
          >
            {stateRef.current.edges.map((e, i) => {
              const a = stateRef.current.nodes[e.s];
              const b = stateRef.current.nodes[e.t];
              if (!a || !b) return null;
              const dim = hover !== null && !(highlightSet.has(e.s) && highlightSet.has(e.t));
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="var(--viz-axis)"
                  strokeWidth={dim ? 0.6 : 1.2}
                  opacity={dim ? 0.18 : 0.7}
                />
              );
            })}
            {stateRef.current.nodes.map((node) => {
              const d = degree[node.id]!;
              const r = 4 + (d / (maxDeg + 1)) * 8;
              const isHover = hover === node.id;
              const inHL = highlightSet.has(node.id);
              const fill = hover !== null && !inHL ? "var(--text-muted)" : "var(--viz-trace)";
              return (
                <circle
                  key={node.id}
                  cx={node.x}
                  cy={node.y}
                  r={r}
                  fill={fill}
                  stroke="var(--bg)"
                  strokeWidth={isHover ? 2.5 : 1.5}
                  opacity={hover !== null && !inHL ? 0.35 : 1}
                  style={{ cursor: "grab" }}
                />
              );
            })}
          </svg>
        </Stage>

        <Panel minWidth={220}>
          <SectionLabel>Controls</SectionLabel>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            <Btn kind="primary" onClick={() => setSeed((s) => s + 1)}>
              Regenerate
            </Btn>
            <Btn kind="ghost" onClick={() => setFreeze((f) => !f)}>
              {freeze ? "Unfreeze" : "Freeze"}
            </Btn>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {[12, 20, 28, 40, 60].map((v) => (
              <Btn key={v} kind="tag" active={n === v} onClick={() => setN(v)}>
                {v}
              </Btn>
            ))}
          </div>

          <SectionLabel>Degree distribution</SectionLabel>
          <svg viewBox="0 0 200 80" width="100%" height={80} style={{ display: "block" }}>
            {hist.map((c, i) => {
              const bw = 200 / histBins;
              const h = (c / histMax) * 70;
              return <rect key={i} x={i * bw + 2} y={75 - h} width={bw - 4} height={h} fill="var(--viz-warn)" />;
            })}
            <line x1={0} y1={75} x2={200} y2={75} stroke="var(--viz-axis)" strokeWidth="1" />
          </svg>

          <Notice>
            <strong>What to notice.</strong> Random graphs have Poisson-shaped degree distributions.
            Scale-free graphs (preferential attachment) produce hubs — a long-tailed distribution
            visible in the histogram. Small-world keeps short paths despite local clustering.
          </Notice>
        </Panel>
      </div>
    </Shell>
  );
}
