import React, { useEffect, useRef, useState } from "react";
import {
  Shell,
  Sub,
  Stage,
  Panel,
  SectionLabel,
  Btn,
  Notice,
  Stat,
  ToggleRow,
} from "@readrun/widgets/primitives";
import { decompose, eig2, type Mat2 } from "@readrun/widgets/math/linalg";

// Local SVG vector arrow — figura keeps Vec as a widget-local helper rather
// than a primitive because only this widget uses it.
function Vec({
  from,
  to,
  color,
  label,
  width = 3,
}: {
  from: [number, number];
  to: [number, number];
  color: string;
  label?: string;
  width?: number;
}) {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const len = Math.hypot(x2 - x1, y2 - y1);
  const back = Math.max(len - 10, 0.001);
  const tipX = x1 + back * Math.cos(ang);
  const tipY = y1 + back * Math.sin(ang);
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={tipX}
        y2={tipY}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
      />
      <polygon
        points={`${x2},${y2} ${tipX - 6 * Math.sin(ang)},${tipY + 6 * Math.cos(ang)} ${tipX + 6 * Math.sin(ang)},${tipY - 6 * Math.cos(ang)}`}
        fill={color}
      />
      {label && (
        <text
          x={x2 + 14 * Math.cos(ang) - 6}
          y={y2 + 14 * Math.sin(ang) + 5}
          fontSize="11"
          fontWeight="700"
          fill={color}
          fontFamily="var(--font-body, ui-sans-serif, system-ui, sans-serif)"
        >
          {label}
        </text>
      )}
    </g>
  );
}

export function MatrixTransformation() {
  const W = 520;
  const H = 520;
  const S = 52;
  const cx = W / 2;
  const cy = H / 2;
  const toS = (x: number, y: number): [number, number] => [cx + x * S, cy - y * S];
  const toW = (sx: number, sy: number): [number, number] => [(sx - cx) / S, -(sy - cy) / S];

  const [M, setM] = useState<Mat2>([1, 0, 0, 1]);
  const [pt, setPt] = useState<[number, number]>([1.2, 0.8]);
  const [drag, setDrag] = useState<"i" | "j" | "p" | null>(null);
  const [tween, setTween] = useState<Mat2 | null>(null);
  const [showEig, setShowEig] = useState(true);
  const [decomposeMode, setDecomposeMode] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!tween) return;
    const t0 = performance.now();
    const from: Mat2 = [...M] as Mat2;
    let raf = 0;
    const dur = decomposeMode ? 1400 : 420;
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const step = (now: number) => {
      const tt = Math.min(1, (now - t0) / dur);
      let next: Mat2;
      if (!decomposeMode) {
        const e = easeOut(tt);
        next = from.map((v, i) => v + (tween[i]! - v) * e) as Mat2;
      } else {
        // 3-phase animation: identity -> rotate -> rotate+scale -> full target
        const tgt = decompose(tween);
        const r = tgt.rot * Math.min(1, tt * 3);
        const sx = 1 + (tgt.sx - 1) * Math.max(0, Math.min(1, tt * 3 - 1));
        const sy = 1 + (tgt.sy - 1) * Math.max(0, Math.min(1, tt * 3 - 1));
        const sh = tgt.sh * Math.max(0, Math.min(1, tt * 3 - 2));
        const cosR = Math.cos(r);
        const sinR = Math.sin(r);
        const a = cosR * sx;
        const b = cosR * (sx * sh) - sinR * sy;
        const c = sinR * sx;
        const d = sinR * (sx * sh) + cosR * sy;
        next = [a, b, c, d];
      }
      setM(next);
      if (tt < 1) raf = requestAnimationFrame(step);
      else setTween(null);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tween]);

  const [a, b, c, d] = M;
  const det = a * d - b * c;
  const tr = a + d;
  const eig = eig2(M);

  const onPointerDown = (which: "i" | "j" | "p") => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDrag(which);
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const sx = (e.clientX - rect.left) * (W / rect.width);
    const sy = (e.clientY - rect.top) * (H / rect.height);
    const [wx, wy] = toW(sx, sy);
    const round = (v: number) => Math.round(v * 10) / 10;
    if (drag === "i") setM([round(wx), b, round(wy), d]);
    else if (drag === "j") setM([a, round(wx), c, round(wy)]);
    else if (drag === "p") setPt([round(wx), round(wy)]);
  };
  const onPointerUp = () => setDrag(null);

  const presets: { name: string; m: Mat2 }[] = [
    { name: "Identity", m: [1, 0, 0, 1] },
    {
      name: "Rotate 30°",
      m: (() => {
        const t = Math.PI / 6;
        return [Math.cos(t), -Math.sin(t), Math.sin(t), Math.cos(t)] as Mat2;
      })(),
    },
    { name: "Rotate 90°", m: [0, -1, 1, 0] },
    { name: "Shear x", m: [1, 1, 0, 1] },
    { name: "Scale 2×", m: [2, 0, 0, 2] },
    { name: "Reflect x", m: [1, 0, 0, -1] },
    { name: "Squeeze", m: [2, 0, 0, 0.5] },
    { name: "Singular", m: [1, 1, 1, 1] },
  ];

  const N = 6;
  const gridLines: { p1: [number, number]; p2: [number, number]; vert: boolean; k: number }[] = [];
  for (let i = -N; i <= N; i++) {
    gridLines.push({ p1: [a * i + b * -N, c * i + d * -N], p2: [a * i + b * N, c * i + d * N], vert: true, k: i });
    gridLines.push({ p1: [a * -N + b * i, c * -N + d * i], p2: [a * N + b * i, c * N + d * i], vert: false, k: i });
  }

  const Mp = [a * pt[0] + b * pt[1], c * pt[0] + d * pt[1]];
  const [iSx, iSy] = toS(a, c);
  const [jSx, jSy] = toS(b, d);
  const [pSx, pSy] = toS(pt[0], pt[1]);
  const [mpSx, mpSy] = toS(Mp[0]!, Mp[1]!);

  const detColor =
    det < 0 ? "var(--viz-warn)" : Math.abs(det) < 0.001 ? "var(--viz-violet)" : "var(--viz-positive)";
  const fmt = (v: number) => (Math.abs(v) < 0.005 ? "0.00" : v.toFixed(2));

  const meta = (
    <>
      <Stat label="det" value={fmt(det)} color={detColor} />
      <Stat label="tr" value={fmt(tr)} />
      {eig ? (
        <Stat label="λ" value={`${fmt(eig.l1)}, ${fmt(eig.l2)}`} />
      ) : (
        <Stat label="λ" value="complex" color="var(--viz-violet)" />
      )}
    </>
  );

  return (
    <Shell title="Matrix Transformation" meta={meta}>
      <Sub>
        Drag <span style={{ color: "var(--viz-trace)", fontWeight: 600 }}>î</span> and{" "}
        <span style={{ color: "var(--viz-trace-2)", fontWeight: 600 }}>ĵ</span> — they form the columns
        of <em>M</em>. The grid warps. Drag the yellow point to see its image (purple).
      </Sub>

      <div className="viz-row">
        <Stage>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            width={W}
            height={H}
            style={{ display: "block", touchAction: "none", maxWidth: "100%" }}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            <g opacity="0.18">
              {Array.from({ length: 2 * N + 1 }, (_, i) => {
                const v = i - N;
                const [x1, y1] = toS(v, -N);
                const [x2, y2] = toS(v, N);
                return (
                  <line key={"ov" + v} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--viz-grid)" strokeWidth="1" />
                );
              })}
              {Array.from({ length: 2 * N + 1 }, (_, i) => {
                const v = i - N;
                const [x1, y1] = toS(-N, v);
                const [x2, y2] = toS(N, v);
                return (
                  <line key={"oh" + v} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--viz-grid)" strokeWidth="1" />
                );
              })}
            </g>

            <g>
              {gridLines.map((l, i) => {
                const [x1, y1] = toS(l.p1[0], l.p1[1]);
                const [x2, y2] = toS(l.p2[0], l.p2[1]);
                const isAxis = l.k === 0;
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={l.vert ? "var(--viz-trace)" : "var(--viz-trace-2)"}
                    strokeWidth={isAxis ? 2 : 1}
                    opacity={isAxis ? 0.7 : 0.32}
                  />
                );
              })}
            </g>

            <polygon
              points={[
                toS(0, 0).join(","),
                toS(a, c).join(","),
                toS(a + b, c + d).join(","),
                toS(b, d).join(","),
              ].join(" ")}
              fill={detColor}
              fillOpacity="0.12"
              stroke={detColor}
              strokeWidth="1.5"
              strokeDasharray="2 4"
            />

            {showEig && eig &&
              [eig.v1, eig.v2].map((v, i) => {
                const [x1, y1] = toS(-N * v[0], -N * v[1]);
                const [x2, y2] = toS(N * v[0], N * v[1]);
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="var(--viz-violet)"
                    strokeWidth="1.5"
                    strokeDasharray="6 5"
                    opacity="0.6"
                  />
                );
              })}

            <line
              x1={pSx}
              y1={pSy}
              x2={mpSx}
              y2={mpSy}
              stroke="var(--viz-violet)"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.5"
            />
            <circle
              cx={pSx}
              cy={pSy}
              r={9}
              fill="var(--viz-warn)"
              stroke="var(--viz-violet)"
              strokeWidth="2"
              style={{ cursor: "grab" }}
              onPointerDown={onPointerDown("p")}
            />
            <circle cx={mpSx} cy={mpSy} r={6} fill="var(--viz-violet)" />

            <Vec from={toS(0, 0)} to={[iSx, iSy]} color="var(--viz-trace)" label="î" />
            <Vec from={toS(0, 0)} to={[jSx, jSy]} color="var(--viz-trace-2)" label="ĵ" />

            <circle
              cx={iSx}
              cy={iSy}
              r={11}
              fill="var(--viz-trace)"
              stroke="var(--bg)"
              strokeWidth="2.5"
              style={{ cursor: "grab" }}
              onPointerDown={onPointerDown("i")}
            />
            <circle
              cx={jSx}
              cy={jSy}
              r={11}
              fill="var(--viz-trace-2)"
              stroke="var(--bg)"
              strokeWidth="2.5"
              style={{ cursor: "grab" }}
              onPointerDown={onPointerDown("j")}
            />
          </svg>
        </Stage>

        <Panel minWidth={260}>
          <SectionLabel>Matrix</SectionLabel>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontFamily: "var(--font-mono, ui-monospace, monospace)",
              fontSize: 11,
              marginBottom: 16,
              color: "var(--text)",
            }}
          >
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>[</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0 16px" }}>
              <span style={{ color: "var(--viz-trace)" }}>{fmt(a)}</span>
              <span style={{ color: "var(--viz-trace-2)" }}>{fmt(b)}</span>
              <span style={{ color: "var(--viz-trace)" }}>{fmt(c)}</span>
              <span style={{ color: "var(--viz-trace-2)" }}>{fmt(d)}</span>
            </div>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>]</span>
          </div>

          <SectionLabel>Presets</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
            {presets.map((p) => (
              <Btn key={p.name} kind="tag" onClick={() => setTween(p.m)}>
                {p.name}
              </Btn>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            <ToggleRow checked={showEig} onChange={setShowEig}>
              show eigenvector directions
            </ToggleRow>
            <ToggleRow checked={decomposeMode} onChange={setDecomposeMode}>
              decompose preset → rotate · scale · shear
            </ToggleRow>
          </div>

          <Notice>
            <strong>What to notice.</strong> The shaded parallelogram is the image of the unit square — its
            signed area equals det(M). When det = 0 the plane collapses to a line. Negative det flips
            orientation. Eigenvector lines mark directions M only stretches.
            {decomposeMode && " · Decompose mode breaks each preset into a 3-phase animation."}
          </Notice>
        </Panel>
      </div>
    </Shell>
  );
}
