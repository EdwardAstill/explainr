export interface DiagramNode {
  id: string;
  /** Filled by layout helpers; users may pre-supply for manual mode. */
  x?: number;
  y?: number;
  /** Render dimensions for edge endpoint calculation. Defaults applied by layout. */
  width?: number;
  height?: number;
  /** Shape for the default node renderer. Defaults to "rect". */
  shape?: "rect" | "circle" | "ellipse" | "diamond";
  /** Optional label rendered inside the node by the default renderer. */
  label?: string;
  [key: string]: unknown;
}

export interface DiagramEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  [key: string]: unknown;
}

export interface PositionedNode extends DiagramNode {
  x: number;
  y: number;
  width: number;
  height: number;
}
