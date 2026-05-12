import { useEffect, useRef } from "react";

/** Maximum dt to pass to the callback — prevents huge jumps after tab inactivity. */
export const RAF_MAX_DT = 100;

/** Clamp dt to [0, RAF_MAX_DT]. Exported for testing. */
export function clampDt(dt: number): number {
  return Math.min(Math.max(dt, 0), RAF_MAX_DT);
}

/**
 * Runs `callback(dt)` on every animation frame while `enabled` is true.
 * Cancels the loop on unmount or when `enabled` becomes false.
 * Stores the callback in a ref so the loop is not re-created on every render.
 */
export function useRaf(callback: (dt: number) => void, opts?: { enabled?: boolean }): void {
  const enabled = opts?.enabled ?? true;
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;

    let rafId: number;
    let last: number | null = null;

    function frame(now: number) {
      const dt = last === null ? 0 : clampDt(now - last);
      last = now;
      callbackRef.current(dt);
      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [enabled]);
}
