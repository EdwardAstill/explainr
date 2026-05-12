import React, { useEffect, useRef, useState } from "react";
import { Shell, Sub, Stage, Panel, SectionLabel, Btn, Slider, Notice, Stat, Tabs } from "@readrun/widgets/primitives";

interface NeuronState {
  v: number;
  spikes: number[];
  injection: number;
}

const Vrest = -65;
const Vthresh = -50;
const Vreset = -75;
const Vspike = 30;

function tickNeuron(s: NeuronState, dt: number, leak: number, baseI: number, coupledI: number): NeuronState {
  const I = baseI + coupledI + s.injection;
  const dv = (-(s.v - Vrest) / leak + I) * dt;
  let v = s.v + dv;
  let spikes = s.spikes;
  if (v >= Vthresh) {
    v = Vreset;
    spikes = [...spikes, performance.now()];
  }
  // Decay injection
  const inj = s.injection > 0 ? s.injection - 4 * dt : 0;
  return { v, spikes, injection: inj };
}

export function NeuronFiring() {
  const W = 700;
  const H = 320;
  const [mode, setMode] = useState<"single" | "coupled">("single");
  const [leak, setLeak] = useState(20);
  const [baseI, setBaseI] = useState(1.4);
  const [coupling, setCoupling] = useState(0.6);
  const [running, setRunning] = useState(true);

  const single = useRef<NeuronState>({ v: Vrest, spikes: [], injection: 0 });
  const triple = useRef<NeuronState[]>([
    { v: Vrest, spikes: [], injection: 0 },
    { v: Vrest, spikes: [], injection: 0 },
    { v: Vrest, spikes: [], injection: 0 },
  ]);
  const traceRef = useRef<number[][]>([[], [], []]);
  const [, force] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const dt = 0.5;
    const tick = () => {
      const now = performance.now();
      if (mode === "single") {
        single.current = tickNeuron(single.current, dt, leak, baseI, 0);
        traceRef.current[0]!.push(single.current.v);
        if (traceRef.current[0]!.length > 320) traceRef.current[0]!.shift();
      } else {
        const ns = triple.current;
        const t = ns.map((n) => n.v);
        for (let i = 0; i < 3; i++) {
          // Simple coupling: each neuron gets a positive kick from neighbour spikes within 30ms
          const recentSpikes = ns
            .filter((_, j) => j !== i)
            .reduce((acc, n) => acc + n.spikes.filter((s) => now - s < 50).length, 0);
          const cI = recentSpikes * coupling * 0.5;
          ns[i] = tickNeuron(ns[i]!, dt, leak, baseI, cI);
          traceRef.current[i]!.push(ns[i]!.v);
          if (traceRef.current[i]!.length > 320) traceRef.current[i]!.shift();
        }
      }
      // Trim spike history
      const cutoff = now - 4000;
      single.current.spikes = single.current.spikes.filter((s) => s > cutoff);
      triple.current.forEach((n) => (n.spikes = n.spikes.filter((s) => s > cutoff)));

      force((n) => n + 1);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, leak, baseI, mode, coupling]);

  function zap(i: number) {
    if (mode === "single") {
      single.current = { ...single.current, injection: single.current.injection + 4 };
    } else {
      triple.current[i] = { ...triple.current[i]!, injection: triple.current[i]!.injection + 4 };
    }
  }
  function reset() {
    single.current = { v: Vrest, spikes: [], injection: 0 };
    triple.current = [
      { v: Vrest, spikes: [], injection: 0 },
      { v: Vrest, spikes: [], injection: 0 },
      { v: Vrest, spikes: [], injection: 0 },
    ];
    traceRef.current = [[], [], []];
    force((n) => n + 1);
  }

  const TC = ["var(--viz-trace)", "var(--viz-warn)", "var(--viz-positive)"];

  function tracePath(t: number[]) {
    if (t.length < 2) return "";
    const ymin = Vreset - 5;
    const ymax = Vspike + 5;
    return t
      .map((v, i) => {
        const x = (i / 320) * W;
        const y = H * 0.6 - ((v - ymin) / (ymax - ymin)) * H * 0.55;
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");
  }

  function rasterRow(spikes: number[], y: number, color: string) {
    const now = performance.now();
    return spikes.map((s, i) => {
      const age = now - s;
      if (age > 4000) return null;
      const x = W - (age / 4000) * W;
      return <line key={i} x1={x} y1={y - 8} x2={x} y2={y + 8} stroke={color} strokeWidth="1.5" />;
    });
  }

  return (
    <Shell
      title="Neuron Firing"
      meta={
        <>
          <Stat
            label="V"
            value={(mode === "single" ? single.current.v : triple.current[0]!.v).toFixed(1)}
            color="var(--viz-trace)"
          />
          <Stat label="spikes" value={(mode === "single" ? single.current.spikes : triple.current.flatMap((n) => n.spikes)).length} />
        </>
      }
    >
      <Sub>
        Leaky integrate-and-fire neuron(s). Membrane voltage decays toward rest unless input
        current pushes it past threshold — then a spike, then a reset. Click <strong>Zap</strong>{" "}
        to inject extra current.
      </Sub>

      <Tabs
        value={mode}
        onChange={(id) => setMode(id as "single" | "coupled")}
        items={[
          { id: "single", label: "Single neuron" },
          { id: "coupled", label: "3 coupled" },
        ]}
      />

      <div className="viz-row">
        <Stage>
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: "block", maxWidth: "100%" }}>
            {/* Threshold + rest lines */}
            <line x1={0} y1={H * 0.6 - ((Vthresh - (Vreset - 5)) / (Vspike + 5 - (Vreset - 5))) * H * 0.55} x2={W} y2={H * 0.6 - ((Vthresh - (Vreset - 5)) / (Vspike + 5 - (Vreset - 5))) * H * 0.55} stroke="var(--viz-warn)" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
            <line x1={0} y1={H * 0.6 - ((Vrest - (Vreset - 5)) / (Vspike + 5 - (Vreset - 5))) * H * 0.55} x2={W} y2={H * 0.6 - ((Vrest - (Vreset - 5)) / (Vspike + 5 - (Vreset - 5))) * H * 0.55} stroke="var(--viz-axis)" strokeWidth="1" strokeDasharray="2 4" opacity="0.4" />

            {/* Voltage traces */}
            {(mode === "single" ? [traceRef.current[0]!] : traceRef.current).map((t, i) => (
              <path key={i} d={tracePath(t)} fill="none" stroke={TC[i]} strokeWidth="2" opacity="0.92" />
            ))}

            {/* Spike raster */}
            <g>
              <line x1={0} y1={H - 60} x2={W} y2={H - 60} stroke="var(--viz-axis)" strokeWidth="1" opacity="0.4" />
              {(mode === "single" ? [single.current.spikes] : triple.current.map((n) => n.spikes)).map((sp, i) => {
                const y = H - 30 - i * 12;
                return <g key={i}>{rasterRow(sp, y, TC[i]!)}</g>;
              })}
            </g>
          </svg>
        </Stage>

        <Panel minWidth={240}>
          <SectionLabel>Parameters</SectionLabel>
          <Slider label="leak τ" min={5} max={50} step={1} value={leak} onChange={setLeak} format={(v) => `${v.toFixed(0)} ms`} />
          <Slider label="base I" min={0} max={3} step={0.05} value={baseI} onChange={setBaseI} />
          {mode === "coupled" && (
            <Slider label="coupling" min={0} max={2} step={0.05} value={coupling} onChange={setCoupling} />
          )}

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
            <Btn kind="primary" onClick={() => zap(0)}>
              ⚡ Zap {mode === "coupled" ? "n1" : ""}
            </Btn>
            {mode === "coupled" && (
              <>
                <Btn kind="primary" onClick={() => zap(1)}>
                  ⚡ n2
                </Btn>
                <Btn kind="primary" onClick={() => zap(2)}>
                  ⚡ n3
                </Btn>
              </>
            )}
            <Btn kind="ghost" onClick={() => setRunning((r) => !r)}>
              {running ? "Pause" : "Play"}
            </Btn>
            <Btn kind="ghost" onClick={reset}>
              Reset
            </Btn>
          </div>

          <Notice>
            <strong>What to notice.</strong> The orange dashed line is the firing threshold (V_th =
            -50 mV). When voltage crosses it, the neuron emits a spike and resets to V_reset (-75 mV).
            In coupled mode, each spike from a neighbour gives a small bump — you can see waves
            propagate.
          </Notice>
        </Panel>
      </div>
    </Shell>
  );
}
