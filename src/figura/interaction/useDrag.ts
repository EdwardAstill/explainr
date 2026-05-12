import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { screenToViewBox } from "./coords";

export interface UseDragOptions {
  onStart?: (x: number, y: number) => void;
  onEnd?: (x: number, y: number) => void;
}

export function useDrag(
  ref: RefObject<SVGGraphicsElement | null>,
  onMove: (x: number, y: number) => void,
  opts?: UseDragOptions
): { isDragging: boolean } {
  const [isDragging, setIsDragging] = useState(false);
  // Keep latest callbacks in refs so listeners don't need to be re-created.
  const onMoveRef = useRef(onMove);
  const optsRef = useRef(opts);
  onMoveRef.current = onMove;
  optsRef.current = opts;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Prevent browser scroll/touch-pan interfering with drag.
    el.style.touchAction = "none";

    let dragging = false;

    function toViewBox(clientX: number, clientY: number) {
      return screenToViewBox(el as SVGGraphicsElement, clientX, clientY);
    }

    function onPointerDown(e: PointerEvent) {
      e.preventDefault();
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      dragging = true;
      setIsDragging(true);
      const pt = toViewBox(e.clientX, e.clientY);
      if (pt) optsRef.current?.onStart?.(pt.x, pt.y);
    }

    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      const pt = toViewBox(e.clientX, e.clientY);
      if (pt) onMoveRef.current(pt.x, pt.y);
    }

    function onPointerUp(e: PointerEvent) {
      if (!dragging) return;
      dragging = false;
      setIsDragging(false);
      const pt = toViewBox(e.clientX, e.clientY);
      if (pt) optsRef.current?.onEnd?.(pt.x, pt.y);
    }

    function onPointerCancel() {
      dragging = false;
      setIsDragging(false);
    }

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerCancel);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerCancel);
      el.style.touchAction = "";
    };
  }, [ref]);

  return { isDragging };
}
