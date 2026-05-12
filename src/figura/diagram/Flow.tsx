import React from "react";
import type { DiagramNode, DiagramEdge, PositionedNode } from "./types";
import { dag, tree, force } from "./layout";
import { selectEdgePorts } from "./edge/ports";
import { straightWithPorts, curveWithPorts, orthogonalWithPorts } from "./edge/router";

interface FlowProps {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  layout: "manual" | "dag" | "tree" | "force";
  /** Required for "tree" layout mode. */
  childrenOf?: (node: DiagramNode) => DiagramNode[];
  /** Required for "tree" layout mode: id of the root node. */
  rootId?: string;
  /**
   * Edge path generator. Defaults to "orthogonal" for dag/tree,
   * "curve" for force, and "straight" for manual.
   */
  edgeRouter?: "straight" | "curve" | "orthogonal";
  /** Custom node renderer. If omitted, a default styled rect is drawn.
   *  Custom renderers do NOT receive drag — pass `draggable={false}` and
   *  handle interaction in the consumer if you need a custom render. */
  renderNode?: (node: PositionedNode) => React.ReactNode;
  /**
   * Custom edge renderer. If omitted, a default styled path with an
   * arrowhead is drawn.
   */
  renderEdge?: (
    path: string,
    edge: DiagramEdge,
    fromNode: PositionedNode,
    toNode: PositionedNode,
  ) => React.ReactNode;
  width: number;
  height: number;
  onNodeClick?: (node: PositionedNode) => void;
  onNodeHover?: (node: PositionedNode | null) => void;
  /** When false, disables interactive node dragging. Default true. */
  draggable?: boolean;
}

const ARROW_ID = "figura-flow-arrow";

const DEF_W = 100;
const DEF_H = 50;

const NODE_FILL = "var(--bg, #ffffff)";
const NODE_STROKE = "var(--text, #1f2328)";
const EDGE_STROKE = "var(--text-muted, #656d76)";

const INNER_DX_FACTOR = 0.5; // place layout origin at width/2
const INNER_DY = 20;

/** Convert a clientX,clientY pair into SVG viewBox coordinates using the SVG
 *  root's screenCTM. The root SVG never has its own transform, so the CTM is
 *  stable across drags — unlike the dragged <g>'s CTM, which moves with the
 *  element it's attached to. */
function clientToSvg(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } | null {
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const inv = ctm.inverse();
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const local = pt.matrixTransform(inv);
  return { x: local.x, y: local.y };
}

function NodeShape({
  shape,
  w,
  h,
}: {
  shape: string;
  w: number;
  h: number;
}): React.ReactElement {
  const sharedProps = {
    fill: NODE_FILL,
    stroke: NODE_STROKE,
    strokeWidth: 1,
  };

  if (shape === "circle") {
    return (
      <circle
        cx={w / 2}
        cy={h / 2}
        r={Math.min(w, h) / 2}
        {...sharedProps}
      />
    );
  }

  if (shape === "ellipse") {
    return (
      <ellipse
        cx={w / 2}
        cy={h / 2}
        rx={w / 2}
        ry={h / 2}
        {...sharedProps}
      />
    );
  }

  if (shape === "diamond") {
    return (
      <polygon
        points={`${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`}
        {...sharedProps}
      />
    );
  }

  // default: rect
  return (
    <rect
      width={w}
      height={h}
      x={0}
      y={0}
      {...sharedProps}
      rx={0}
    />
  );
}

function DraggableNode({
  node,
  svgRef,
  innerDx,
  innerDy,
  view,
  onClick,
  onHover,
  onDragMove,
  draggable,
}: {
  node: PositionedNode;
  svgRef: React.RefObject<SVGSVGElement | null>;
  innerDx: number;
  innerDy: number;
  view: { panX: number; panY: number; zoom: number };
  onClick?: (n: PositionedNode) => void;
  onHover?: (n: PositionedNode | null) => void;
  onDragMove: (x: number, y: number) => void;
  draggable: boolean;
}) {
  const offsetRef = React.useRef<{ ox: number; oy: number } | null>(null);
  const movedRef = React.useRef(false);

  const onPointerDown = (e: React.PointerEvent<SVGGElement>) => {
    if (!draggable || !svgRef.current) return;
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = clientToSvg(svgRef.current, e.clientX, e.clientY);
    if (!pt) return;
    // Convert SVG-root coords into the inner frame where node.x,y lives.
    // The inner frame has translate(innerDx + panX, innerDy + panY) scale(zoom),
    // so we need to invert that transform: subtract pan+translate, then divide by zoom.
    const innerX = (pt.x - innerDx - view.panX) / view.zoom;
    const innerY = (pt.y - innerDy - view.panY) / view.zoom;
    offsetRef.current = { ox: innerX - node.x, oy: innerY - node.y };
    movedRef.current = false;
  };

  const onPointerMove = (e: React.PointerEvent<SVGGElement>) => {
    if (!offsetRef.current || !svgRef.current) return;
    const pt = clientToSvg(svgRef.current, e.clientX, e.clientY);
    if (!pt) return;
    const innerX = (pt.x - innerDx - view.panX) / view.zoom;
    const innerY = (pt.y - innerDy - view.panY) / view.zoom;
    onDragMove(innerX - offsetRef.current.ox, innerY - offsetRef.current.oy);
    movedRef.current = true;
  };

  const onPointerUp = (e: React.PointerEvent<SVGGElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    offsetRef.current = null;
    // Only fire onClick if the pointer didn't move (a true click).
    if (!movedRef.current && onClick) {
      onClick(node);
    }
  };

  const isDragging = offsetRef.current !== null;
  const { x, y, width, height, id } = node;
  const label = typeof node["label"] === "string" ? node["label"] : id;
  const shape = (node.shape as string | undefined) ?? "rect";

  return (
    <g
      transform={`translate(${x - width / 2}, ${y - height / 2})`}
      style={{
        cursor: draggable ? (isDragging ? "grabbing" : "grab") : onClick ? "pointer" : "default",
        touchAction: "none",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onMouseEnter={onHover ? () => onHover(node) : undefined}
      onMouseLeave={onHover ? () => onHover(null) : undefined}
    >
      <NodeShape shape={shape} w={width} h={height} />
      <text
        x={width / 2}
        y={height / 2}
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize={11}
        fill="var(--text, #1f2328)"
        fontFamily="var(--font-body, ui-sans-serif, system-ui, sans-serif)"
        style={{ userSelect: "none", pointerEvents: "none" }}
      >
        {label}
      </text>
    </g>
  );
}

function defaultRenderEdge(
  pathStr: string,
  edge: DiagramEdge,
): React.ReactNode {
  return (
    <path
      key={edge.id}
      d={pathStr}
      stroke={EDGE_STROKE}
      strokeWidth={1.5}
      fill="none"
      markerEnd={`url(#${ARROW_ID})`}
    />
  );
}

function pathFromPorts(
  router: "straight" | "curve" | "orthogonal",
  from: { x: number; y: number; dir: { dx: number; dy: number } },
  to: { x: number; y: number; dir: { dx: number; dy: number } },
): string {
  switch (router) {
    case "straight":
      return straightWithPorts(from, to);
    case "curve":
      return curveWithPorts(from, to);
    case "orthogonal":
    default:
      return orthogonalWithPorts(from, to);
  }
}

export function Flow({
  nodes,
  edges,
  layout: layoutMode,
  childrenOf,
  rootId,
  edgeRouter,
  renderNode,
  renderEdge,
  width,
  height,
  onNodeClick,
  onNodeHover,
  draggable = true,
}: FlowProps): JSX.Element {
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const innerDx = width * INNER_DX_FACTOR;
  const innerDy = INNER_DY;

  const [overrides, setOverrides] = React.useState<
    Record<string, { x: number; y: number }>
  >({});

  const [view, setView] = React.useState<{ panX: number; panY: number; zoom: number }>({
    panX: 0,
    panY: 0,
    zoom: 1,
  });

  // Pan state stored in a ref to avoid stale closures in pointer handlers.
  const panStateRef = React.useRef<{
    active: boolean;
    startClientX: number;
    startClientY: number;
    startPanX: number;
    startPanY: number;
  }>({ active: false, startClientX: 0, startClientY: 0, startPanX: 0, startPanY: 0 });

  const updateOverride = React.useCallback((id: string, x: number, y: number) => {
    setOverrides((prev) => ({ ...prev, [id]: { x, y } }));
  }, []);

  let positioned: PositionedNode[];
  if (layoutMode === "manual") {
    positioned = nodes.map((n) => ({
      ...n,
      x: n.x ?? 0,
      y: n.y ?? 0,
      width: (n.width as number | undefined) ?? DEF_W,
      height: (n.height as number | undefined) ?? DEF_H,
    }));
  } else if (layoutMode === "dag") {
    positioned = dag(nodes, edges);
  } else if (layoutMode === "tree") {
    const root = nodes.find((n) => n.id === rootId);
    if (!root) {
      const fallbackRoot = nodes[0];
      positioned = fallbackRoot
        ? tree(fallbackRoot, childrenOf ?? (() => []), {
            levelSeparation: height / Math.max(4, nodes.length),
          })
        : [];
    } else {
      positioned = tree(root, childrenOf ?? (() => []), {
        levelSeparation: height / Math.max(4, nodes.length),
      });
    }
  } else {
    positioned = force(nodes, edges, { width, height });
  }

  positioned = positioned.map((n) => {
    const o = overrides[n.id];
    return o ? { ...n, x: o.x, y: o.y } : n;
  });

  const posById = new Map<string, PositionedNode>(positioned.map((n) => [n.id, n]));

  const router: "straight" | "curve" | "orthogonal" =
    edgeRouter ??
    (layoutMode === "force"
      ? "curve"
      : layoutMode === "manual"
        ? "straight"
        : "orthogonal");

  // Per-node port-usage tracker: greedy-assign ports so two edges sharing a
  // node don't collide on the same port. An edge's source side and target side
  // each consume one port; in/out are pooled — once a port is used by any edge
  // (either as input or output), later edges have to pick a different one.
  const usedPorts = new Map<string, Set<import("./edge/ports").PortName>>();
  const edgeElements = edges
    .map((e) => {
      const fromNode = posById.get(e.from);
      const toNode = posById.get(e.to);
      if (!fromNode || !toNode) return null;

      const fromUsed = usedPorts.get(e.from) ?? new Set();
      const toUsed = usedPorts.get(e.to) ?? new Set();
      const { from, to, fromName, toName } = selectEdgePorts(fromNode, toNode, {
        excludeFrom: fromUsed,
        excludeTo: toUsed,
      });
      fromUsed.add(fromName);
      toUsed.add(toName);
      usedPorts.set(e.from, fromUsed);
      usedPorts.set(e.to, toUsed);

      const pathStr = pathFromPorts(router, from, to);
      if (renderEdge) {
        return renderEdge(pathStr, e, fromNode, toNode);
      }
      return defaultRenderEdge(pathStr, e);
    })
    .filter(Boolean);

  const nodeElements = positioned.map((n) => {
    if (renderNode) return <React.Fragment key={n.id}>{renderNode(n)}</React.Fragment>;
    return (
      <DraggableNode
        key={n.id}
        node={n}
        svgRef={svgRef}
        innerDx={innerDx}
        innerDy={innerDy}
        view={view}
        draggable={draggable}
        onClick={onNodeClick}
        onHover={onNodeHover}
        onDragMove={(x, y) => updateOverride(n.id, x, y)}
      />
    );
  });

  const innerTransform = `translate(${innerDx + view.panX}, ${innerDy + view.panY}) scale(${view.zoom})`;

  const handleSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    // Only start panning if the target is the SVG root itself (not a node).
    if (e.target !== svgRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    panStateRef.current = {
      active: true,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPanX: view.panX,
      startPanY: view.panY,
    };
  };

  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const ps = panStateRef.current;
    if (!ps.active) return;
    // Convert screen-pixel deltas to SVG-viewBox deltas using the SVG's CTM.
    const svgEl = svgRef.current;
    let scale = 1;
    if (svgEl) {
      const ctm = svgEl.getScreenCTM();
      if (ctm) scale = ctm.a; // horizontal scale factor (same as vertical for uniform scale)
    }
    const newPanX = ps.startPanX + (e.clientX - ps.startClientX) / scale;
    const newPanY = ps.startPanY + (e.clientY - ps.startClientY) / scale;
    setView((v) => ({ ...v, panX: newPanX, panY: newPanY }));
  };

  const handleSvgPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    panStateRef.current.active = false;
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    setView((v) => {
      const newZoom = Math.max(0.25, Math.min(3, v.zoom * (1 + delta)));
      return { ...v, zoom: newZoom };
    });
  };

  return (
    <div
      style={{
        position: "relative",
        background: "var(--card-bg, #ffffff)",
        border: "1px solid var(--border, #d0d7de)",
        overflow: "hidden",
      }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        style={{ display: "block", maxWidth: "100%", touchAction: "none" }}
        onPointerDown={handleSvgPointerDown}
        onPointerMove={handleSvgPointerMove}
        onPointerUp={handleSvgPointerUp}
        onPointerCancel={handleSvgPointerUp}
        onWheel={handleWheel}
      >
        <defs>
          <marker
            id={ARROW_ID}
            viewBox="0 0 10 10"
            refX={10}
            refY={5}
            markerWidth={6}
            markerHeight={6}
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={EDGE_STROKE} />
          </marker>
        </defs>
        <g transform={innerTransform}>
          {edgeElements}
          {nodeElements}
        </g>
      </svg>
      {draggable && (
        <div
          style={{
            position: "absolute",
            bottom: 6,
            right: 8,
            fontSize: 11,
            color: "var(--text-muted, #656d76)",
            fontFamily: "var(--font-mono, ui-monospace, monospace)",
            letterSpacing: "0.04em",
            pointerEvents: "none",
          }}
        >
          drag nodes • drag empty • scroll to zoom
        </div>
      )}
    </div>
  );
}
