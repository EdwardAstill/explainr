import React, { useMemo, useState } from "react";
import { Shell, Sub, Stage, Panel, SectionLabel, Btn, Slider, Notice, Stat, Tabs, LegendDot } from "@readrun/widgets/primitives";
import { mulberry32 } from "@readrun/widgets/math";

type Algo = "bubble" | "insertion" | "selection" | "quick" | "merge" | "heap";

const ALGOS: { id: Algo; label: string }[] = [
  { id: "bubble", label: "Bubble" },
  { id: "insertion", label: "Insertion" },
  { id: "selection", label: "Selection" },
  { id: "quick", label: "Quick" },
  { id: "merge", label: "Merge" },
  { id: "heap", label: "Heap" },
];

interface Frame {
  arr: number[];
  cmp: [number, number] | null;
  swap: [number, number] | null;
  pivot?: number;
  locked: number[];
  cmpCount: number;
  swapCount: number;
}

function bubble(arr: number[]): Frame[] {
  const a = arr.slice();
  const frames: Frame[] = [];
  let cmpCount = 0;
  let swapCount = 0;
  const locked: number[] = [];
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < a.length - i - 1; j++) {
      cmpCount++;
      frames.push({ arr: a.slice(), cmp: [j, j + 1], swap: null, locked: locked.slice(), cmpCount, swapCount });
      if (a[j]! > a[j + 1]!) {
        [a[j], a[j + 1]] = [a[j + 1]!, a[j]!];
        swapCount++;
        frames.push({ arr: a.slice(), cmp: null, swap: [j, j + 1], locked: locked.slice(), cmpCount, swapCount });
      }
    }
    locked.unshift(a.length - i - 1);
  }
  frames.push({ arr: a.slice(), cmp: null, swap: null, locked: a.map((_, i) => i), cmpCount, swapCount });
  return frames;
}

function insertion(arr: number[]): Frame[] {
  const a = arr.slice();
  const frames: Frame[] = [];
  let cmpCount = 0;
  let swapCount = 0;
  for (let i = 1; i < a.length; i++) {
    let j = i;
    while (j > 0) {
      cmpCount++;
      frames.push({ arr: a.slice(), cmp: [j - 1, j], swap: null, locked: [], cmpCount, swapCount });
      if (a[j - 1]! > a[j]!) {
        [a[j - 1], a[j]] = [a[j]!, a[j - 1]!];
        swapCount++;
        frames.push({ arr: a.slice(), cmp: null, swap: [j - 1, j], locked: [], cmpCount, swapCount });
        j--;
      } else break;
    }
  }
  frames.push({ arr: a.slice(), cmp: null, swap: null, locked: a.map((_, i) => i), cmpCount, swapCount });
  return frames;
}

function selection(arr: number[]): Frame[] {
  const a = arr.slice();
  const frames: Frame[] = [];
  let cmpCount = 0;
  let swapCount = 0;
  const locked: number[] = [];
  for (let i = 0; i < a.length; i++) {
    let min = i;
    for (let j = i + 1; j < a.length; j++) {
      cmpCount++;
      frames.push({ arr: a.slice(), cmp: [min, j], swap: null, locked: locked.slice(), cmpCount, swapCount });
      if (a[j]! < a[min]!) min = j;
    }
    if (min !== i) {
      [a[i], a[min]] = [a[min]!, a[i]!];
      swapCount++;
      frames.push({ arr: a.slice(), cmp: null, swap: [i, min], locked: locked.slice(), cmpCount, swapCount });
    }
    locked.push(i);
  }
  frames.push({ arr: a.slice(), cmp: null, swap: null, locked: a.map((_, i) => i), cmpCount, swapCount });
  return frames;
}

function quick(arr: number[]): Frame[] {
  const a = arr.slice();
  const frames: Frame[] = [];
  let cmpCount = 0;
  let swapCount = 0;
  const locked: number[] = [];
  function qs(lo: number, hi: number) {
    if (lo >= hi) {
      if (lo === hi) locked.push(lo);
      return;
    }
    const pivot = hi;
    let i = lo;
    for (let j = lo; j < hi; j++) {
      cmpCount++;
      frames.push({ arr: a.slice(), cmp: [j, pivot], swap: null, pivot, locked: locked.slice(), cmpCount, swapCount });
      if (a[j]! < a[pivot]!) {
        if (i !== j) {
          [a[i], a[j]] = [a[j]!, a[i]!];
          swapCount++;
          frames.push({ arr: a.slice(), cmp: null, swap: [i, j], pivot, locked: locked.slice(), cmpCount, swapCount });
        }
        i++;
      }
    }
    if (i !== pivot) {
      [a[i], a[pivot]] = [a[pivot]!, a[i]!];
      swapCount++;
      frames.push({ arr: a.slice(), cmp: null, swap: [i, pivot], pivot: i, locked: locked.slice(), cmpCount, swapCount });
    }
    locked.push(i);
    qs(lo, i - 1);
    qs(i + 1, hi);
  }
  qs(0, a.length - 1);
  frames.push({ arr: a.slice(), cmp: null, swap: null, locked: a.map((_, i) => i), cmpCount, swapCount });
  return frames;
}

function merge(arr: number[]): Frame[] {
  const a = arr.slice();
  const frames: Frame[] = [];
  let cmpCount = 0;
  let swapCount = 0;
  function ms(lo: number, hi: number) {
    if (hi - lo < 1) return;
    const mid = Math.floor((lo + hi) / 2);
    ms(lo, mid);
    ms(mid + 1, hi);
    const merged: number[] = [];
    let i = lo;
    let j = mid + 1;
    while (i <= mid && j <= hi) {
      cmpCount++;
      frames.push({ arr: a.slice(), cmp: [i, j], swap: null, locked: [], cmpCount, swapCount });
      if (a[i]! <= a[j]!) merged.push(a[i++]!);
      else merged.push(a[j++]!);
    }
    while (i <= mid) merged.push(a[i++]!);
    while (j <= hi) merged.push(a[j++]!);
    for (let k = 0; k < merged.length; k++) {
      a[lo + k] = merged[k]!;
      swapCount++;
    }
    frames.push({ arr: a.slice(), cmp: null, swap: [lo, hi], locked: [], cmpCount, swapCount });
  }
  ms(0, a.length - 1);
  frames.push({ arr: a.slice(), cmp: null, swap: null, locked: a.map((_, i) => i), cmpCount, swapCount });
  return frames;
}

function heap(arr: number[]): Frame[] {
  const a = arr.slice();
  const frames: Frame[] = [];
  let cmpCount = 0;
  let swapCount = 0;
  const locked: number[] = [];
  const sift = (start: number, end: number) => {
    let root = start;
    while (root * 2 + 1 <= end) {
      let child = root * 2 + 1;
      if (child + 1 <= end) {
        cmpCount++;
        if (a[child]! < a[child + 1]!) child++;
      }
      cmpCount++;
      frames.push({ arr: a.slice(), cmp: [root, child], swap: null, locked: locked.slice(), cmpCount, swapCount });
      if (a[root]! < a[child]!) {
        [a[root], a[child]] = [a[child]!, a[root]!];
        swapCount++;
        frames.push({ arr: a.slice(), cmp: null, swap: [root, child], locked: locked.slice(), cmpCount, swapCount });
        root = child;
      } else break;
    }
  };
  for (let i = Math.floor(a.length / 2) - 1; i >= 0; i--) sift(i, a.length - 1);
  for (let end = a.length - 1; end > 0; end--) {
    [a[0], a[end]] = [a[end]!, a[0]!];
    swapCount++;
    locked.unshift(end);
    frames.push({ arr: a.slice(), cmp: null, swap: [0, end], locked: locked.slice(), cmpCount, swapCount });
    sift(0, end - 1);
  }
  locked.unshift(0);
  frames.push({ arr: a.slice(), cmp: null, swap: null, locked: a.map((_, i) => i), cmpCount, swapCount });
  return frames;
}

const RUNNERS: Record<Algo, (arr: number[]) => Frame[]> = {
  bubble,
  insertion,
  selection,
  quick,
  merge,
  heap,
};

export function SortTracer() {
  const W = 720;
  const H = 320;
  const [algo, setAlgo] = useState<Algo>("quick");
  const [size, setSize] = useState(20);
  const [seed, setSeed] = useState(7);
  const [step, setStep] = useState(0);

  const arr = useMemo(() => {
    const rng = mulberry32(seed);
    return Array.from({ length: size }, () => Math.floor(rng() * 100) + 1);
  }, [size, seed]);

  const frames = useMemo(() => RUNNERS[algo](arr), [algo, arr]);
  const safeStep = Math.min(step, frames.length - 1);
  const f = frames[safeStep]!;

  const max = Math.max(...f.arr);
  const bw = W / f.arr.length;

  return (
    <Shell
      title="Sort Tracer"
      meta={
        <>
          <Stat label="cmps" value={f.cmpCount} color="var(--viz-trace)" />
          <Stat label="swaps" value={f.swapCount} color="var(--viz-warn)" />
          <Stat label="step" value={`${safeStep + 1}/${frames.length}`} />
        </>
      }
    >
      <Sub>
        Step through six classical sorting algorithms. Color codes: comparisons are blue, swaps
        are orange, the active pivot is violet, locked-in (sorted) positions are green.
      </Sub>

      <Tabs value={algo} onChange={(id) => { setAlgo(id as Algo); setStep(0); }} items={ALGOS} />

      <div className="viz-row">
        <Stage>
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: "block", maxWidth: "100%" }}>
            {f.arr.map((v, i) => {
              const x = i * bw;
              const h = (v / max) * (H - 30);
              let fill = "var(--viz-axis)";
              if (f.locked.includes(i)) fill = "var(--viz-positive)";
              if (f.cmp && (f.cmp[0] === i || f.cmp[1] === i)) fill = "var(--viz-trace)";
              if (f.swap && (f.swap[0] === i || f.swap[1] === i)) fill = "var(--viz-warn)";
              if (f.pivot === i) fill = "var(--viz-violet)";
              return (
                <g key={i}>
                  <rect x={x + 1} y={H - 18 - h} width={bw - 2} height={h} fill={fill} />
                  <text
                    x={x + bw / 2}
                    y={H - 4}
                    fontSize="11"
                    textAnchor="middle"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono, monospace)"
                  >
                    {v}
                  </text>
                </g>
              );
            })}
          </svg>
        </Stage>

        <Panel minWidth={240}>
          <SectionLabel>Controls</SectionLabel>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            <Btn kind="primary" onClick={() => setStep((s) => Math.max(0, s - 1))}>
              ‹ Back
            </Btn>
            <Btn kind="primary" onClick={() => setStep((s) => Math.min(frames.length - 1, s + 1))}>
              Step ›
            </Btn>
            <Btn kind="ghost" onClick={() => setStep(frames.length - 1)}>
              End ⏭
            </Btn>
            <Btn kind="ghost" onClick={() => setStep(0)}>
              Reset
            </Btn>
          </div>

          <SectionLabel>Array</SectionLabel>
          <Slider label="size" min={6} max={36} step={1} value={size} onChange={(v) => { setSize(v); setStep(0); }} format={(v) => `${v}`} />
          <Slider label="seed" min={1} max={50} step={1} value={seed} onChange={(v) => { setSeed(v); setStep(0); }} format={(v) => `${v}`} />

          <SectionLabel style={{ marginTop: 8 }}>Legend</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <LegendDot color="var(--viz-trace)" label="comparing" />
            <LegendDot color="var(--viz-warn)" label="swapping" />
            <LegendDot color="var(--viz-violet)" label="pivot" />
            <LegendDot color="var(--viz-positive)" label="locked" />
          </div>

          <Notice>
            <strong>What to notice.</strong> Bubble and insertion are O(n²); merge and heap are
            O(n log n) worst-case; quick is O(n log n) average but O(n²) on adversarial input.
            Watch the swap count — merge sort uses no in-place swaps but it does write every
            element back.
          </Notice>
        </Panel>
      </div>
    </Shell>
  );
}
