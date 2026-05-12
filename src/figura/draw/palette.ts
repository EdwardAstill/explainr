export interface TopicPalette {
  accent: string;
  accent2: string;
  dim: string;
  surface: string;
  text: string;
  textDim: string;
}

function parseHex(hex: string): [number, number, number] {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    throw new Error(
      `palette.sequential: invalid hex colour "${hex}". Only 6-digit hex (#rrggbb) is accepted.`
    );
  }
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
}

function toHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)]
      .map((c) => c.toString(16).padStart(2, "0"))
      .join("")
  );
}

// Perceptual sequential colormaps — 9-stop sampled approximations of matplotlib's
// viridis, magma, plasma. Stops were sampled at t = 0, 0.125, …, 1 from the
// reference Python implementations, preserving the perceptually-uniform shape.

const VIRIDIS_STOPS: readonly string[] = [
  "#440154", "#482475", "#414487", "#355f8d", "#2a788e",
  "#21918c", "#22a884", "#44bf70", "#7ad151", "#bddf26", "#fde725",
];

const MAGMA_STOPS: readonly string[] = [
  "#000004", "#180f3d", "#440f76", "#721f81", "#9e2f7f",
  "#cd4071", "#f1605d", "#fd9668", "#feca8d", "#fcfdbf",
];

const PLASMA_STOPS: readonly string[] = [
  "#0d0887", "#46039f", "#7201a8", "#9c179e", "#bd3786",
  "#d8576b", "#ed7953", "#fb9f3a", "#fdc926", "#f0f921",
];

function sequential(stops: readonly string[], t: number): string {
  // Validate all stops first (will throw on shorthand)
  const parsed = stops.map(parseHex);

  const clamped = Math.max(0, Math.min(1, t));
  const n = parsed.length;

  if (n === 1) return toHex(...parsed[0]!);

  // Map t into segment index
  const scaled = clamped * (n - 1);
  const lo = Math.min(Math.floor(scaled), n - 2);
  const hi = lo + 1;
  const localT = scaled - lo;

  const [r0, g0, b0] = parsed[lo]!;
  const [r1, g1, b1] = parsed[hi]!;

  return toHex(r0 + (r1 - r0) * localT, g0 + (g1 - g0) * localT, b0 + (b1 - b0) * localT);
}

export const palette: {
  math: TopicPalette;
  neuro: TopicPalette;
  network: TopicPalette;
  algo: TopicPalette;
  sequential(stops: readonly string[], t: number): string;
  viridis(t: number): string;
  magma(t: number): string;
  plasma(t: number): string;
  viridisStops: readonly string[];
  magmaStops: readonly string[];
  plasmaStops: readonly string[];
} = {
  math: {
    accent: "#4f46e5",   // indigo-600
    accent2: "#0ea5e9",  // sky-500
    dim: "#cbd5e1",      // slate-300
    surface: "#ffffff",
    text: "#0f172a",     // slate-900
    textDim: "#475569",  // slate-600
  },

  neuro: {
    accent: "#f87171",   // red-400 — spike colour
    accent2: "#fbbf24",  // amber-400 — threshold marker
    dim: "#475569",      // slate-600 — axis lines on dark bg
    surface: "#1e293b",  // slate-800 — dark stage
    text: "#f1f5f9",     // slate-100
    textDim: "#94a3b8",  // slate-400
  },

  network: {
    // six-stop sequential for degree-coloured nodes lives in sequential();
    // these fields cover axes, labels, stage
    accent: "#6366f1",   // indigo-500 — low-degree nodes
    accent2: "#ef4444",  // red-500 — high-degree nodes
    dim: "#334155",      // slate-700
    surface: "#0f172a",  // slate-900
    text: "#f8fafc",     // slate-50
    textDim: "#94a3b8",  // slate-400
  },

  algo: {
    accent: "#0ea5e9",   // sky-500 — compare highlight
    accent2: "#f43f5e",  // rose-500 — swap highlight
    dim: "#334155",      // slate-700
    surface: "#0f172a",  // slate-900
    text: "#f8fafc",
    textDim: "#94a3b8",
  },

  sequential,
  viridis: (t: number) => sequential(VIRIDIS_STOPS, t),
  magma: (t: number) => sequential(MAGMA_STOPS, t),
  plasma: (t: number) => sequential(PLASMA_STOPS, t),
  viridisStops: VIRIDIS_STOPS,
  magmaStops: MAGMA_STOPS,
  plasmaStops: PLASMA_STOPS,
};
