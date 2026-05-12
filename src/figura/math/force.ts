/**
 * Tiny force-directed layout step. Used by force-graph and any other
 * graph viz. Mutates positions in place.
 */

export interface ForceNode {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fixed?: boolean;
}

export interface ForceEdge {
  s: number;
  t: number;
}

export interface ForceConfig {
  width: number;
  height: number;
  repulsion?: number;
  springK?: number;
  springRest?: number;
  damping?: number;
  centerPull?: number;
  dt?: number;
}

export function forceStep(
  nodes: ForceNode[],
  edges: ForceEdge[],
  cfg: ForceConfig,
): void {
  const repulsion = cfg.repulsion ?? 4500;
  const springK = cfg.springK ?? 0.04;
  const springRest = cfg.springRest ?? 70;
  const damping = cfg.damping ?? 0.85;
  const centerPull = cfg.centerPull ?? 0.005;
  const dt = cfg.dt ?? 1;
  const cx = cfg.width / 2;
  const cy = cfg.height / 2;

  // Repulsion: O(N^2) — fine for N <= ~120
  for (let i = 0; i < nodes.length; i++) {
    const ni = nodes[i]!;
    if (ni.fixed) continue;
    let fx = 0;
    let fy = 0;
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const nj = nodes[j]!;
      const dx = ni.x - nj.x;
      const dy = ni.y - nj.y;
      const d2 = dx * dx + dy * dy + 0.01;
      const f = repulsion / d2;
      const d = Math.sqrt(d2);
      fx += (dx / d) * f;
      fy += (dy / d) * f;
    }
    fx += (cx - ni.x) * centerPull;
    fy += (cy - ni.y) * centerPull;
    ni.vx = (ni.vx + fx * dt) * damping;
    ni.vy = (ni.vy + fy * dt) * damping;
  }

  // Springs
  for (const e of edges) {
    const a = nodes[e.s];
    const b = nodes[e.t];
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy) + 0.01;
    const f = springK * (d - springRest);
    const fx = (dx / d) * f;
    const fy = (dy / d) * f;
    if (!a.fixed) {
      a.vx += fx * dt;
      a.vy += fy * dt;
    }
    if (!b.fixed) {
      b.vx -= fx * dt;
      b.vy -= fy * dt;
    }
  }

  // Integrate
  for (const n of nodes) {
    if (n.fixed) continue;
    n.x += n.vx * dt;
    n.y += n.vy * dt;
    const m = 24;
    if (n.x < m) {
      n.x = m;
      n.vx *= -0.4;
    }
    if (n.x > cfg.width - m) {
      n.x = cfg.width - m;
      n.vx *= -0.4;
    }
    if (n.y < m) {
      n.y = m;
      n.vy *= -0.4;
    }
    if (n.y > cfg.height - m) {
      n.y = cfg.height - m;
      n.vy *= -0.4;
    }
  }
}

export function makeRandomGraph(
  n: number,
  edgeProb: number,
  width: number,
  height: number,
  seed = 1,
): { nodes: ForceNode[]; edges: ForceEdge[] } {
  let s = seed >>> 0;
  const rng = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const nodes: ForceNode[] = [];
  for (let i = 0; i < n; i++) {
    nodes.push({
      id: i,
      x: width / 2 + (rng() - 0.5) * 200,
      y: height / 2 + (rng() - 0.5) * 200,
      vx: 0,
      vy: 0,
    });
  }
  const edges: ForceEdge[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (rng() < edgeProb) edges.push({ s: i, t: j });
    }
  }
  return { nodes, edges };
}

export function makeRingGraph(
  n: number,
  width: number,
  height: number,
): { nodes: ForceNode[]; edges: ForceEdge[] } {
  const nodes: ForceNode[] = [];
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) * 0.32;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    nodes.push({ id: i, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, vx: 0, vy: 0 });
  }
  const edges: ForceEdge[] = [];
  for (let i = 0; i < n; i++) edges.push({ s: i, t: (i + 1) % n });
  return { nodes, edges };
}

export function makeSmallWorld(
  n: number,
  rewireProb: number,
  width: number,
  height: number,
  seed = 1,
): { nodes: ForceNode[]; edges: ForceEdge[] } {
  let s = seed >>> 0;
  const rng = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const { nodes, edges } = makeRingGraph(n, width, height);
  // Add k=2 nearest neighbours
  for (let i = 0; i < n; i++) edges.push({ s: i, t: (i + 2) % n });
  // Rewire with probability rewireProb
  for (const e of edges) {
    if (rng() < rewireProb) {
      let nt = Math.floor(rng() * n);
      if (nt === e.s) nt = (nt + 1) % n;
      e.t = nt;
    }
  }
  return { nodes, edges };
}

export function makeScaleFree(
  n: number,
  width: number,
  height: number,
  seed = 1,
): { nodes: ForceNode[]; edges: ForceEdge[] } {
  let s = seed >>> 0;
  const rng = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const nodes: ForceNode[] = [];
  for (let i = 0; i < n; i++) {
    nodes.push({
      id: i,
      x: width / 2 + (rng() - 0.5) * 200,
      y: height / 2 + (rng() - 0.5) * 200,
      vx: 0,
      vy: 0,
    });
  }
  const edges: ForceEdge[] = [];
  // Start with a triangle
  edges.push({ s: 0, t: 1 });
  edges.push({ s: 1, t: 2 });
  edges.push({ s: 2, t: 0 });
  const degree = new Array(n).fill(0);
  degree[0] = 2;
  degree[1] = 2;
  degree[2] = 2;
  for (let i = 3; i < n; i++) {
    const totalDeg = degree.reduce((a, b) => a + b, 0);
    const targets = new Set<number>();
    while (targets.size < Math.min(2, i)) {
      let r = rng() * totalDeg;
      for (let j = 0; j < i; j++) {
        r -= degree[j];
        if (r <= 0) {
          targets.add(j);
          break;
        }
      }
    }
    for (const t of targets) {
      edges.push({ s: i, t });
      degree[i]++;
      degree[t]++;
    }
  }
  return { nodes, edges };
}

export function degreeOf(nodes: ForceNode[], edges: ForceEdge[]): number[] {
  const d = new Array(nodes.length).fill(0);
  for (const e of edges) {
    d[e.s]++;
    d[e.t]++;
  }
  return d;
}
