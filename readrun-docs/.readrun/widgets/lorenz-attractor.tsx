import React, { useEffect, useRef, useState } from "react";
import { Shell, Sub, Stage, Panel, SectionLabel, Btn, Slider, Notice, Stat } from "@readrun/widgets/primitives";

type V3 = [number, number, number];

function lorenzStep(p: V3, sigma: number, rho: number, beta: number, dt: number): V3 {
  const [x, y, z] = p;
  const dx = sigma * (y - x);
  const dy = x * (rho - z) - y;
  const dz = x * y - beta * z;
  return [x + dx * dt, y + dy * dt, z + dz * dt];
}

export function LorenzAttractor() {
  const W = 540;
  const H = 420;
  const [sigma, setSigma] = useState(10);
  const [rho, setRho] = useState(28);
  const [beta, setBeta] = useState(8 / 3);
  const [running, setRunning] = useState(true);
  const [angle, setAngle] = useState(0.6);

  const trail1 = useRef<V3[]>([[1, 1, 1]]);
  const trail2 = useRef<V3[]>([[1.0001, 1, 1]]);
  const stateRef = useRef<{ p1: V3; p2: V3 }>({ p1: [1, 1, 1], p2: [1.0001, 1, 1] });
  const [, force] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const dt = 0.008;
    const tick = () => {
      const s = stateRef.current;
      for (let k = 0; k < 5; k++) {
        s.p1 = lorenzStep(s.p1, sigma, rho, beta, dt);
        s.p2 = lorenzStep(s.p2, sigma, rho, beta, dt);
      }
      trail1.current.push(s.p1);
      trail2.current.push(s.p2);
      const max = 1500;
      if (trail1.current.length > max) trail1.current.splice(0, trail1.current.length - max);
      if (trail2.current.length > max) trail2.current.splice(0, trail2.current.length - max);
      force((n) => n + 1);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, sigma, rho, beta]);

  function reset() {
    stateRef.current = { p1: [1, 1, 1], p2: [1.0001, 1, 1] };
    trail1.current = [[1, 1, 1]];
    trail2.current = [[1.0001, 1, 1]];
    force((n) => n + 1);
  }

  // Project 3D -> 2D with rotation around y-axis
  const proj = (p: V3): [number, number] => {
    const [x, y, z] = p;
    const cx = W / 2;
    const cy = H / 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const X = x * cosA - y * sinA;
    const Y = x * sinA + y * cosA;
    const scale = 9;
    return [cx + X * scale, cy - (z - 25) * scale + Y * 0.3 * scale];
  };

  const distance = (() => {
    const a = stateRef.current.p1;
    const b = stateRef.current.p2;
    return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  })();

  return (
    <Shell
      title="Lorenz Attractor"
      meta={
        <>
          <Stat label="δ" value={distance.toExponential(2)} color="var(--viz-warn)" />
          <Stat label="points" value={trail1.current.length} />
        </>
      }
    >
      <Sub>
        Two trajectories start one part in 10⁴ apart and diverge exponentially —
        a textbook chaotic system. Drag the angle slider to rotate.
      </Sub>

      <div className="viz-row">
        <Stage>
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: "block", maxWidth: "100%" }}>
            <polyline
              points={trail1.current.map((p) => proj(p).join(",")).join(" ")}
              fill="none"
              stroke="var(--viz-trace)"
              strokeWidth="1"
              opacity="0.7"
            />
            <polyline
              points={trail2.current.map((p) => proj(p).join(",")).join(" ")}
              fill="none"
              stroke="var(--viz-warn)"
              strokeWidth="1"
              opacity="0.6"
            />
            {(() => {
              const [x1, y1] = proj(stateRef.current.p1);
              const [x2, y2] = proj(stateRef.current.p2);
              return (
                <g>
                  <circle cx={x1} cy={y1} r={4} fill="var(--viz-trace)" stroke="var(--bg)" strokeWidth="1.5" />
                  <circle cx={x2} cy={y2} r={4} fill="var(--viz-warn)" stroke="var(--bg)" strokeWidth="1.5" />
                </g>
              );
            })()}
          </svg>
        </Stage>

        <Panel minWidth={220}>
          <SectionLabel>Parameters</SectionLabel>
          <Slider label="σ" min={1} max={20} step={0.5} value={sigma} onChange={setSigma} />
          <Slider label="ρ" min={1} max={50} step={0.5} value={rho} onChange={setRho} />
          <Slider label="β" min={0.5} max={5} step={0.05} value={beta} onChange={setBeta} />
          <Slider label="view angle" min={0} max={Math.PI * 2} step={0.05} value={angle} onChange={setAngle} />

          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <Btn kind="primary" onClick={() => setRunning((r) => !r)}>
              {running ? "Pause" : "Play"}
            </Btn>
            <Btn kind="ghost" onClick={reset}>
              Reset
            </Btn>
          </div>

          <Notice>
            <strong>What to notice.</strong> The two-lobed butterfly is the famous strange attractor.
            Trajectories never repeat or self-intersect, but stay bounded. Tiny initial differences
            (δ ≈ 10⁻⁴) become full-attractor scale within seconds.
          </Notice>
        </Panel>
      </div>
    </Shell>
  );
}
