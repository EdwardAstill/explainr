import React, { useEffect, useMemo, useRef, useState } from "react";
import { Shell, Sub, Stage, Panel, SectionLabel, Btn, Slider, Notice, Stat, Tabs } from "@readrun/widgets/primitives";

type Mode = "1d" | "life";

function elementaryRule(rule: number, l: number, c: number, r: number): number {
  const idx = (l << 2) | (c << 1) | r;
  return (rule >> idx) & 1;
}

function lifeStep(grid: Uint8Array, w: number, h: number): Uint8Array {
  const next = new Uint8Array(grid.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = (x + dx + w) % w;
          const ny = (y + dy + h) % h;
          n += grid[ny * w + nx]!;
        }
      }
      const cur = grid[y * w + x]!;
      next[y * w + x] = (cur && (n === 2 || n === 3)) || (!cur && n === 3) ? 1 : 0;
    }
  }
  return next;
}

export function CellularAutomaton() {
  const W = 600;
  const H = 320;
  const [mode, setMode] = useState<Mode>("1d");

  // 1D
  const [rule, setRule] = useState(110);
  const cells1d = 120;
  const rows = 60;
  const grid1d = useMemo(() => {
    const out = new Uint8Array(cells1d * rows);
    out[Math.floor(cells1d / 2)] = 1;
    for (let r = 1; r < rows; r++) {
      for (let c = 0; c < cells1d; c++) {
        const l = out[(r - 1) * cells1d + ((c - 1 + cells1d) % cells1d)]!;
        const m = out[(r - 1) * cells1d + c]!;
        const right = out[(r - 1) * cells1d + ((c + 1) % cells1d)]!;
        out[r * cells1d + c] = elementaryRule(rule, l, m, right);
      }
    }
    return out;
  }, [rule]);

  // 2D Life
  const lifeW = 60;
  const lifeH = 32;
  const [life, setLife] = useState<Uint8Array>(() => randomLife(lifeW, lifeH));
  const [running, setRunning] = useState(false);
  const [gen, setGen] = useState(0);

  useEffect(() => {
    if (mode !== "life" || !running) return;
    const id = window.setInterval(() => {
      setLife((g) => lifeStep(g, lifeW, lifeH));
      setGen((g) => g + 1);
    }, 120);
    return () => window.clearInterval(id);
  }, [mode, running]);

  function randomLife(w: number, h: number): Uint8Array {
    const out = new Uint8Array(w * h);
    for (let i = 0; i < out.length; i++) out[i] = Math.random() < 0.32 ? 1 : 0;
    return out;
  }
  function clearLife() {
    setLife(new Uint8Array(lifeW * lifeH));
    setGen(0);
  }
  function step() {
    setLife((g) => lifeStep(g, lifeW, lifeH));
    setGen((g) => g + 1);
  }

  const cw = W / cells1d;
  const ch = H / rows;
  const lcw = W / lifeW;
  const lch = H / lifeH;

  function lifeClick(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = (e.clientX - rect.left) * (W / rect.width);
    const sy = (e.clientY - rect.top) * (H / rect.height);
    const c = Math.floor(sx / lcw);
    const r = Math.floor(sy / lch);
    const ng = new Uint8Array(life);
    ng[r * lifeW + c] = ng[r * lifeW + c] ? 0 : 1;
    setLife(ng);
  }

  return (
    <Shell
      title="Cellular Automaton"
      meta={
        mode === "1d" ? (
          <Stat label="rule" value={rule} color="var(--viz-trace)" />
        ) : (
          <>
            <Stat label="gen" value={gen} color="var(--viz-trace)" />
            <Stat label="alive" value={Array.from(life).reduce((a, b) => a + b, 0)} />
          </>
        )
      }
    >
      <Sub>
        Tiny rules, complex behaviour. Elementary CAs (Wolfram numbering) operate on a 1D row;
        Conway's Life on a 2D grid. Toggle modes; in Life mode, click cells to seed.
      </Sub>

      <Tabs
        value={mode}
        onChange={(id) => setMode(id as Mode)}
        items={[
          { id: "1d", label: "1D Elementary" },
          { id: "life", label: "Game of Life" },
        ]}
      />

      <div className="viz-row">
        <Stage>
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: "block", maxWidth: "100%", cursor: mode === "life" ? "pointer" : "default" }} onClick={mode === "life" ? lifeClick : undefined}>
            {mode === "1d"
              ? Array.from({ length: rows }).map((_, r) =>
                  Array.from({ length: cells1d }).map((_, c) =>
                    grid1d[r * cells1d + c] ? (
                      <rect key={`${r}-${c}`} x={c * cw} y={r * ch} width={cw + 0.5} height={ch + 0.5} fill="var(--viz-trace)" />
                    ) : null,
                  ),
                )
              : Array.from({ length: lifeH }).map((_, r) =>
                  Array.from({ length: lifeW }).map((_, c) =>
                    life[r * lifeW + c] ? (
                      <rect key={`${r}-${c}`} x={c * lcw} y={r * lch} width={lcw - 0.5} height={lch - 0.5} fill="var(--viz-positive)" />
                    ) : (
                      <rect key={`${r}-${c}`} x={c * lcw} y={r * lch} width={lcw - 0.5} height={lch - 0.5} fill="transparent" stroke="var(--border)" strokeWidth="0.3" />
                    ),
                  ),
                )}
          </svg>
        </Stage>

        <Panel minWidth={220}>
          {mode === "1d" ? (
            <>
              <SectionLabel>Rule (0–255)</SectionLabel>
              <Slider label="rule" min={0} max={255} step={1} value={rule} onChange={setRule} format={(v) => `${v}`} />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {[30, 90, 110, 150, 184].map((r) => (
                  <Btn key={r} kind="tag" onClick={() => setRule(r)}>
                    {r}
                  </Btn>
                ))}
              </div>
              <Notice>
                <strong>What to notice.</strong> Rule 30 is chaotic (used in some PRNGs). Rule 90
                produces a Sierpinski triangle. Rule 110 is Turing-complete. Rule 184 models simple
                traffic flow.
              </Notice>
            </>
          ) : (
            <>
              <SectionLabel>Life</SectionLabel>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                <Btn kind="primary" onClick={() => setRunning((r) => !r)}>
                  {running ? "Pause" : "Play"}
                </Btn>
                <Btn kind="ghost" onClick={step}>
                  Step
                </Btn>
                <Btn kind="ghost" onClick={() => { setLife(randomLife(lifeW, lifeH)); setGen(0); }}>
                  Random
                </Btn>
                <Btn kind="ghost" onClick={clearLife}>
                  Clear
                </Btn>
              </div>
              <Notice>
                <strong>What to notice.</strong> Click cells to draw. The four rules: live with
                2-3 neighbours survives; dead with exactly 3 neighbours becomes alive; everything
                else dies or stays dead. Simple rules → gliders, oscillators, methuselahs.
              </Notice>
            </>
          )}
        </Panel>
      </div>
    </Shell>
  );
}
