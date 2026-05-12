/**
 * routeAround: orthogonal path from `from` to `to` that avoids axis-aligned
 * bounding boxes.
 *
 * Algorithm:
 * 1. Try the direct orthogonal path. If it doesn't hit any obstacle, return it.
 * 2. Compute the union bounding box of all obstacles that intersect the
 *    direct path, padded by `padding`.
 * 3. Try four 2-elbow detour paths (route above/below/left/right of the
 *    combined obstacle bbox). Use the first path that doesn't intersect
 *    any obstacle.
 * 4. If all 2-elbow detours fail, try a 4-elbow path that routes around
 *    the full bbox of all obstacles combined (padded). If that fails too,
 *    return the 2-elbow path that avoids the most obstacles (best-effort).
 */

import { orthogonal } from "./orthogonal";

type Pt = { x: number; y: number };
type Box = { x: number; y: number; width: number; height: number };

function fmt(n: number): string {
  return n.toFixed(2);
}

/** Build path string from array of points using M + L commands. */
function buildPath(pts: Pt[]): string {
  if (pts.length === 0) return "";
  const parts: string[] = [`M ${fmt(pts[0]!.x)} ${fmt(pts[0]!.y)}`];
  for (let i = 1; i < pts.length; i++) {
    parts.push(`L ${fmt(pts[i]!.x)} ${fmt(pts[i]!.y)}`);
  }
  return parts.join(" ");
}

/**
 * Check whether an axis-aligned polyline (all segments horizontal or vertical)
 * intersects a box's interior (strictly inside, not edge-touching).
 */
function polylineHitsBox(pts: Pt[], box: Box): boolean {
  const bx0 = box.x;
  const by0 = box.y;
  const bx1 = box.x + box.width;
  const by1 = box.y + box.height;

  for (let i = 0; i < pts.length - 1; i++) {
    const ax = pts[i]!.x, ay = pts[i]!.y;
    const bx = pts[i + 1]!.x, by = pts[i + 1]!.y;

    if (Math.abs(ay - by) < 1e-9) {
      // horizontal segment at y=ay
      if (ay > by0 && ay < by1) {
        const x0 = Math.min(ax, bx);
        const x1 = Math.max(ax, bx);
        if (x0 < bx1 && x1 > bx0) return true;
      }
    } else if (Math.abs(ax - bx) < 1e-9) {
      // vertical segment at x=ax
      if (ax > bx0 && ax < bx1) {
        const y0 = Math.min(ay, by);
        const y1 = Math.max(ay, by);
        if (y0 < by1 && y1 > by0) return true;
      }
    }
  }
  return false;
}

function hitsAny(pts: Pt[], boxes: Box[]): boolean {
  return boxes.some((b) => polylineHitsBox(pts, b));
}

/**
 * Get bounding box of all boxes that the given polyline intersects.
 * Returns null if none intersect.
 */
function unionOfHitBoxes(pts: Pt[], boxes: Box[], padding: number): Box | null {
  const hitting = boxes.filter((b) => polylineHitsBox(pts, b));
  if (hitting.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const b of hitting) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }
  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + 2 * padding,
    height: maxY - minY + 2 * padding,
  };
}

/**
 * Try four 2-elbow detour paths around `obstacle`.
 * A 2-elbow path has 4 points: from → corner1 → corner2 → to.
 * We route around the 4 sides of the obstacle.
 */
function twoElbowPaths(from: Pt, to: Pt, obs: Box): Pt[][] {
  const ox0 = obs.x;
  const oy0 = obs.y;
  const ox1 = obs.x + obs.width;
  const oy1 = obs.y + obs.height;
  const midX = (from.x + to.x) / 2;

  return [
    // Route above (y = oy0): from → (midX, oy0) → (midX, from.y) ... actually use corner routing
    // Route above: go to (from.x, oy0) then (to.x, oy0) then (to.x, to.y)
    [from, { x: from.x, y: oy0 }, { x: to.x, y: oy0 }, to],
    // Route below: go to (from.x, oy1) then (to.x, oy1)
    [from, { x: from.x, y: oy1 }, { x: to.x, y: oy1 }, to],
    // Route left: go to (ox0, from.y) then (ox0, to.y)
    [from, { x: ox0, y: from.y }, { x: ox0, y: to.y }, to],
    // Route right: go to (ox1, from.y) then (ox1, to.y)
    [from, { x: ox1, y: from.y }, { x: ox1, y: to.y }, to],
    // Alternative: midpoint-based routes
    // Route above via midX
    [from, { x: midX, y: from.y }, { x: midX, y: oy0 }, { x: to.x, y: oy0 }, to],
    // Route below via midX
    [from, { x: midX, y: from.y }, { x: midX, y: oy1 }, { x: to.x, y: oy1 }, to],
  ];
}

/** 4-elbow path around a combined bbox — goes to a corner region then across. */
function fourElbowPaths(from: Pt, to: Pt, obs: Box): Pt[][] {
  const ox0 = obs.x;
  const oy0 = obs.y;
  const ox1 = obs.x + obs.width;
  const oy1 = obs.y + obs.height;

  return [
    // Route above entire bbox
    [from, { x: from.x, y: oy0 }, { x: to.x, y: oy0 }, to],
    // Route below entire bbox
    [from, { x: from.x, y: oy1 }, { x: to.x, y: oy1 }, to],
    // Route left of entire bbox
    [from, { x: ox0, y: from.y }, { x: ox0, y: to.y }, to],
    // Route right of entire bbox
    [from, { x: ox1, y: from.y }, { x: ox1, y: to.y }, to],
  ];
}

export function routeAround(
  obstacles: Box[],
  from: Pt,
  to: Pt,
  opts?: { axis?: "horizontal-first" | "vertical-first" | "auto"; padding?: number },
): string {
  const padding = opts?.padding ?? 8;

  // Try direct orthogonal path first
  const direct = orthogonal(from, to, { axis: opts?.axis });
  if (obstacles.length === 0) return direct;

  // Parse direct path to polyline for intersection check
  const directPts = parseOrthogonal(from, to, opts?.axis);
  if (!hitsAny(directPts, obstacles)) {
    return direct;
  }

  // Get union bbox of all obstacles that the direct path hits, padded
  const hitBbox = unionOfHitBoxes(directPts, obstacles, padding);
  if (!hitBbox) return direct;

  // Try 2-elbow paths
  const candidates2 = twoElbowPaths(from, to, hitBbox);
  for (const pts of candidates2) {
    if (!hitsAny(pts, obstacles)) {
      return buildPath(pts);
    }
  }

  // Fallback: compute full union of ALL obstacles and try 4-elbow paths
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const b of obstacles) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }
  const fullBbox: Box = {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + 2 * padding,
    height: maxY - minY + 2 * padding,
  };

  const candidates4 = fourElbowPaths(from, to, fullBbox);
  for (const pts of candidates4) {
    if (!hitsAny(pts, obstacles)) {
      return buildPath(pts);
    }
  }

  // Best-effort: pick whichever 2-elbow candidate hits fewest obstacles
  let bestPts = candidates2[0]!;
  let bestHits = obstacles.filter((b) => polylineHitsBox(bestPts, b)).length;
  for (const pts of [...candidates2, ...candidates4]) {
    const hits = obstacles.filter((b) => polylineHitsBox(pts, b)).length;
    if (hits < bestHits) {
      bestHits = hits;
      bestPts = pts;
    }
  }
  return buildPath(bestPts);
}

/** Convert orthogonal path params to polyline points (for intersection check). */
function parseOrthogonal(
  from: Pt,
  to: Pt,
  axis?: "horizontal-first" | "vertical-first" | "auto",
): Pt[] {
  const fx = from.x, fy = from.y;
  const tx = to.x, ty = to.y;
  const dx = Math.abs(tx - fx);
  const dy = Math.abs(ty - fy);

  if (Math.abs(ty - fy) < 1e-9 || Math.abs(tx - fx) < 1e-9) {
    return [from, to];
  }

  const resolved: "horizontal-first" | "vertical-first" =
    axis === "horizontal-first" ? "horizontal-first"
    : axis === "vertical-first" ? "vertical-first"
    : dx >= dy ? "horizontal-first" : "vertical-first";

  if (resolved === "horizontal-first") {
    return [from, { x: tx, y: fy }, to];
  } else {
    return [from, { x: fx, y: ty }, to];
  }
}
