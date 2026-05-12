import { useEffect, useState } from "react";
import type { RefObject } from "react";
import { screenToViewBox } from "./coords";

export interface PointerState {
  x: number;
  y: number;
  over: boolean;
}

/**
 * Tracks the current pointer position in the SVG's viewBox coordinate space.
 * Returns { x, y, over } where `over` is true while the pointer is inside the element.
 */
export function usePointer(ref: RefObject<SVGGraphicsElement | null>): PointerState {
  const [state, setState] = useState<PointerState>({ x: 0, y: 0, over: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function toViewBox(clientX: number, clientY: number) {
      return screenToViewBox(el as SVGGraphicsElement, clientX, clientY);
    }

    function onPointerMove(e: PointerEvent) {
      const pt = toViewBox(e.clientX, e.clientY);
      if (pt) setState((s) => ({ ...s, x: pt.x, y: pt.y }));
    }

    function onPointerEnter(e: PointerEvent) {
      const pt = toViewBox(e.clientX, e.clientY);
      setState(pt ? { x: pt.x, y: pt.y, over: true } : (s) => ({ ...s, over: true }));
    }

    function onPointerLeave() {
      setState((s) => ({ ...s, over: false }));
    }

    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerenter", onPointerEnter);
    el.addEventListener("pointerleave", onPointerLeave);

    return () => {
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerenter", onPointerEnter);
      el.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [ref]);

  return state;
}
