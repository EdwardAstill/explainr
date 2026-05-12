import { useState, useRef, useEffect } from "react";

/**
 * Runs a deterministic snapshot generator once on mount (or when deps change).
 * Returns the full snapshot array plus a scrubber index.
 */
export function useTrace<S>(
  runFn: () => readonly S[],
  deps: readonly unknown[] = []
): { snapshots: readonly S[]; index: number; setIndex: (i: number) => void } {
  const [snapshots, setSnapshots] = useState<readonly S[]>(() => runFn());
  const [index, setIndexState] = useState(0);
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const result = runFn();
    setSnapshots(result);
    setIndexState(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  function setIndex(i: number) {
    setIndexState(Math.max(0, Math.min(i, snapshots.length - 1)));
  }

  return { snapshots, index, setIndex };
}
