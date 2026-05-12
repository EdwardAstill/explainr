import React, { useMemo, useRef, useState } from "react";
import { Shell, Sub, Stage, Panel, SectionLabel, Btn, Notice, Stat, Tabs, LegendDot } from "@readrun/widgets/primitives";

type Algo = "bfs" | "dijkstra" | "astar";

interface Cell {
  r: number;
  c: number;
  wall: boolean;
}

const COLS = 36;
const ROWS = 22;

function key(r: number, c: number) {
  return r * COLS + c;
}

function neighbours(r: number, c: number): [number, number][] {
  const out: [number, number][] = [];
  if (r > 0) out.push([r - 1, c]);
  if (r < ROWS - 1) out.push([r + 1, c]);
  if (c > 0) out.push([r, c - 1]);
  if (c < COLS - 1) out.push([r, c + 1]);
  return out;
}

function search(walls: Set<number>, start: [number, number], goal: [number, number], algo: Algo) {
  const visited = new Set<number>();
  const cameFrom = new Map<number, number>();
  const cost = new Map<number, number>();
  const queue: { k: number; r: number; c: number; pri: number }[] = [];
  cost.set(key(start[0], start[1]), 0);
  queue.push({ k: key(start[0], start[1]), r: start[0], c: start[1], pri: 0 });

  while (queue.length) {
    queue.sort((a, b) => a.pri - b.pri);
    const cur = queue.shift()!;
    if (visited.has(cur.k)) continue;
    visited.add(cur.k);
    if (cur.r === goal[0] && cur.c === goal[1]) break;
    for (const [nr, nc] of neighbours(cur.r, cur.c)) {
      const nk = key(nr, nc);
      if (walls.has(nk) || visited.has(nk)) continue;
      const newCost = (cost.get(cur.k) || 0) + 1;
      if (!cost.has(nk) || newCost < cost.get(nk)!) {
        cost.set(nk, newCost);
        cameFrom.set(nk, cur.k);
        let pri = newCost;
        if (algo === "bfs") pri = newCost; // FIFO
        if (algo === "dijkstra") pri = newCost;
        if (algo === "astar") pri = newCost + Math.abs(nr - goal[0]) + Math.abs(nc - goal[1]);
        queue.push({ k: nk, r: nr, c: nc, pri });
      }
    }
  }

  // Reconstruct path
  const path: number[] = [];
  const goalK = key(goal[0], goal[1]);
  if (visited.has(goalK)) {
    let k: number | undefined = goalK;
    while (k !== undefined) {
      path.push(k);
      k = cameFrom.get(k);
    }
    path.reverse();
  }
  return { visited, path };
}

export function DijkstraPathfinder() {
  const W = 540;
  const H = 340;
  const cellW = W / COLS;
  const cellH = H / ROWS;
  const [walls, setWalls] = useState<Set<number>>(() => new Set());
  const [start, setStart] = useState<[number, number]>([10, 4]);
  const [goal, setGoal] = useState<[number, number]>([10, 30]);
  const [algo, setAlgo] = useState<Algo>("astar");
  const dragRef = useRef<{ mode: "wall" | "erase" | "start" | "goal"; on: boolean }>({ mode: "wall", on: false });

  const result = useMemo(() => search(walls, start, goal, algo), [walls, start, goal, algo]);

  function pos(e: React.MouseEvent | React.PointerEvent, svg: SVGSVGElement): [number, number] {
    const rect = svg.getBoundingClientRect();
    const sx = (e.clientX - rect.left) * (W / rect.width);
    const sy = (e.clientY - rect.top) * (H / rect.height);
    return [Math.floor(sy / cellH), Math.floor(sx / cellW)];
  }

  function down(e: React.PointerEvent<SVGSVGElement>) {
    const [r, c] = pos(e, e.currentTarget);
    const k = key(r, c);
    if (r === start[0] && c === start[1]) {
      dragRef.current = { mode: "start", on: true };
      return;
    }
    if (r === goal[0] && c === goal[1]) {
      dragRef.current = { mode: "goal", on: true };
      return;
    }
    if (walls.has(k)) {
      dragRef.current = { mode: "erase", on: true };
      const ns = new Set(walls);
      ns.delete(k);
      setWalls(ns);
    } else {
      dragRef.current = { mode: "wall", on: true };
      const ns = new Set(walls);
      ns.add(k);
      setWalls(ns);
    }
  }
  function move(e: React.PointerEvent<SVGSVGElement>) {
    if (!dragRef.current.on) return;
    const [r, c] = pos(e, e.currentTarget);
    const k = key(r, c);
    if (dragRef.current.mode === "start") setStart([r, c]);
    else if (dragRef.current.mode === "goal") setGoal([r, c]);
    else if (dragRef.current.mode === "wall") {
      if (!walls.has(k) && !(r === start[0] && c === start[1]) && !(r === goal[0] && c === goal[1])) {
        const ns = new Set(walls);
        ns.add(k);
        setWalls(ns);
      }
    } else if (dragRef.current.mode === "erase") {
      if (walls.has(k)) {
        const ns = new Set(walls);
        ns.delete(k);
        setWalls(ns);
      }
    }
  }
  function up() {
    dragRef.current.on = false;
  }

  function clearWalls() {
    setWalls(new Set());
  }

  function maze() {
    const ns = new Set<number>();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (Math.random() < 0.3 && !(r === start[0] && c === start[1]) && !(r === goal[0] && c === goal[1])) {
          ns.add(key(r, c));
        }
      }
    }
    setWalls(ns);
  }

  return (
    <Shell
      title="Pathfinder"
      meta={
        <>
          <Stat label="visited" value={result.visited.size} color="var(--viz-trace)" />
          <Stat label="path" value={result.path.length} color="var(--viz-warn)" />
        </>
      }
    >
      <Sub>
        Click and drag to draw walls. Drag the green start or red goal to move them. Switch the
        search algorithm — BFS is uninformed, Dijkstra accounts for cost, A* uses a Manhattan
        heuristic.
      </Sub>

      <Tabs
        value={algo}
        onChange={(id) => setAlgo(id as Algo)}
        items={[
          { id: "bfs", label: "BFS" },
          { id: "dijkstra", label: "Dijkstra" },
          { id: "astar", label: "A*" },
        ]}
      />

      <div className="viz-row">
        <Stage>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            width={W}
            height={H}
            style={{ display: "block", maxWidth: "100%", touchAction: "none", cursor: "crosshair" }}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerLeave={up}
          >
            {Array.from({ length: ROWS }).map((_, r) =>
              Array.from({ length: COLS }).map((_, c) => {
                const k = key(r, c);
                let fill = "var(--bg)";
                if (walls.has(k)) fill = "var(--text)";
                else if (result.path.includes(k)) fill = "var(--viz-warn)";
                else if (result.visited.has(k)) fill = "var(--viz-trace)";
                if (r === start[0] && c === start[1]) fill = "var(--viz-positive)";
                if (r === goal[0] && c === goal[1]) fill = "var(--viz-negative)";
                const opacity = result.visited.has(k) && !result.path.includes(k) && !walls.has(k) ? 0.32 : 1;
                return (
                  <rect
                    key={k}
                    x={c * cellW}
                    y={r * cellH}
                    width={cellW - 0.5}
                    height={cellH - 0.5}
                    fill={fill}
                    fillOpacity={opacity}
                    stroke="var(--border)"
                    strokeWidth="0.5"
                  />
                );
              }),
            )}
          </svg>
        </Stage>

        <Panel minWidth={220}>
          <SectionLabel>Actions</SectionLabel>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Btn kind="ghost" onClick={clearWalls}>
              Clear walls
            </Btn>
            <Btn kind="primary" onClick={maze}>
              Random maze
            </Btn>
          </div>

          <SectionLabel style={{ marginTop: 16 }}>Legend</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <LegendDot color="var(--viz-positive)" label="start" />
            <LegendDot color="var(--viz-negative)" label="goal" />
            <LegendDot color="var(--text)" label="wall" />
            <LegendDot color="var(--viz-trace)" label="explored" />
            <LegendDot color="var(--viz-warn)" label="final path" />
          </div>

          <Notice>
            <strong>What to notice.</strong> BFS expands in a uniform circle (no edge weights). Dijkstra
            does the same on an unweighted grid. A* targets the goal — explored area shrinks
            dramatically because the heuristic prunes obviously-bad branches.
          </Notice>
        </Panel>
      </div>
    </Shell>
  );
}
