import React, { useEffect, useRef, useState } from "react";
import { Shell, Sub, Stage, Panel, SectionLabel, Btn, Slider, Notice, Stat } from "@readrun/widgets/primitives";

export function WaveInterference() {
  const W = 540;
  const H = 360;
  const [s1, setS1] = useState<[number, number]>([180, 120]);
  const [s2, setS2] = useState<[number, number]>([360, 240]);
  const [freq, setFreq] = useState(0.06);
  const [phase, setPhase] = useState(0);
  const [t, setT] = useState(0);
  const [running, setRunning] = useState(true);
  const dragRef = useRef<"s1" | "s2" | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setT((tt) => tt + 0.15), 60);
    return () => window.clearInterval(id);
  }, [running]);

  // Render to canvas for performance
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cw = W;
    const ch = H;
    if (canvas.width !== cw) canvas.width = cw;
    if (canvas.height !== ch) canvas.height = ch;
    const ctx = canvas.getContext("2d")!;
    const img = ctx.createImageData(cw, ch);
    const accent = getCss("--viz-trace") || "#3b82f6";
    const accent2 = getCss("--viz-warn") || "#f59e0b";
    const [r1, g1, b1] = hexToRgb(resolveColor(accent));
    const [r2, g2, b2] = hexToRgb(resolveColor(accent2));
    const stride = 2;
    for (let y = 0; y < ch; y += stride) {
      for (let x = 0; x < cw; x += stride) {
        const d1 = Math.hypot(x - s1[0], y - s1[1]);
        const d2 = Math.hypot(x - s2[0], y - s2[1]);
        const v = Math.sin(d1 * freq - t) + Math.sin(d2 * freq - t + phase);
        const norm = (v + 2) / 4;
        const r = Math.round(r1 * norm + r2 * (1 - norm));
        const g = Math.round(g1 * norm + g2 * (1 - norm));
        const b = Math.round(b1 * norm + b2 * (1 - norm));
        for (let dy = 0; dy < stride; dy++) {
          for (let dx = 0; dx < stride; dx++) {
            const idx = ((y + dy) * cw + (x + dx)) * 4;
            img.data[idx] = r;
            img.data[idx + 1] = g;
            img.data[idx + 2] = b;
            img.data[idx + 3] = 255;
          }
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  });

  function pos(e: React.PointerEvent): [number, number] {
    const rect = svgRef.current!.getBoundingClientRect();
    return [(e.clientX - rect.left) * (W / rect.width), (e.clientY - rect.top) * (H / rect.height)];
  }

  function down(e: React.PointerEvent<SVGSVGElement>) {
    const [x, y] = pos(e);
    const d1 = Math.hypot(x - s1[0], y - s1[1]);
    const d2 = Math.hypot(x - s2[0], y - s2[1]);
    if (d1 < 24 && d1 < d2) dragRef.current = "s1";
    else if (d2 < 24) dragRef.current = "s2";
  }
  function move(e: React.PointerEvent<SVGSVGElement>) {
    if (!dragRef.current) return;
    const [x, y] = pos(e);
    if (dragRef.current === "s1") setS1([x, y]);
    else setS2([x, y]);
  }
  function up() {
    dragRef.current = null;
  }

  return (
    <Shell
      title="Wave Interference"
      meta={
        <>
          <Stat label="freq" value={freq.toFixed(3)} color="var(--viz-trace)" />
          <Stat label="Δφ" value={phase.toFixed(2)} color="var(--viz-warn)" />
        </>
      }
    >
      <Sub>
        Two coherent point sources. Where peaks meet peaks (constructive interference) you see the
        accent colour; where peaks meet troughs (destructive) you see the warn colour. Drag either
        source.
      </Sub>

      <div className="viz-row">
        <Stage>
          <div style={{ position: "relative", width: W, height: H, maxWidth: "100%" }}>
            <canvas
              ref={canvasRef}
              style={{ display: "block", width: "100%", height: "100%", borderRadius: 8 }}
            />
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              width={W}
              height={H}
              style={{ display: "block", position: "absolute", top: 0, left: 0, touchAction: "none", maxWidth: "100%" }}
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerLeave={up}
            >
              <circle cx={s1[0]} cy={s1[1]} r={10} fill="var(--bg)" stroke="var(--text)" strokeWidth="2" style={{ cursor: "grab" }} />
              <circle cx={s2[0]} cy={s2[1]} r={10} fill="var(--bg)" stroke="var(--text)" strokeWidth="2" style={{ cursor: "grab" }} />
            </svg>
          </div>
        </Stage>

        <Panel minWidth={220}>
          <SectionLabel>Wave parameters</SectionLabel>
          <Slider label="frequency" min={0.02} max={0.18} step={0.005} value={freq} onChange={setFreq} />
          <Slider label="phase Δ" min={0} max={Math.PI * 2} step={0.05} value={phase} onChange={setPhase} />

          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <Btn kind="primary" onClick={() => setRunning((r) => !r)}>
              {running ? "Pause" : "Play"}
            </Btn>
            <Btn kind="ghost" onClick={() => { setS1([180, 120]); setS2([360, 240]); setPhase(0); }}>
              Reset
            </Btn>
          </div>

          <Notice>
            <strong>What to notice.</strong> Hyperbolic fringes appear because constructive
            interference happens where path-length difference is a whole multiple of wavelength.
            Move the sources together — the fringes spread; pull them apart — they tighten.
          </Notice>
        </Panel>
      </div>
    </Shell>
  );
}

/* ── Colour helpers (resolve CSS vars at paint time for canvas) ── */

function getCss(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function resolveColor(s: string): string {
  if (!s) return "#3b82f6";
  if (s.startsWith("#")) return s;
  if (s.startsWith("rgb")) {
    const m = s.match(/\d+/g);
    if (m && m.length >= 3) {
      const [r, g, b] = m.map((v) => parseInt(v, 10));
      return "#" + [r, g, b].map((v) => v!.toString(16).padStart(2, "0")).join("");
    }
  }
  return "#3b82f6";
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  if (h.length === 3) {
    return [parseInt(h[0]! + h[0], 16), parseInt(h[1]! + h[1], 16), parseInt(h[2]! + h[2], 16)];
  }
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
