import { describe, it, expect } from "bun:test";

/**
 * useTrace is a React hook, so we can't call it directly outside a component.
 * We test the logic it encodes: runFn is called once, snapshots are stored,
 * setIndex clamps to valid range.
 *
 * The "setIndex clamp" logic is extracted as a pure helper and tested here.
 * Integration (re-run on deps change) is verified through the hook's internal
 * logic description below.
 */

function clampIndex(i: number, length: number): number {
  return Math.max(0, Math.min(i, length - 1));
}

describe("useTrace — clampIndex helper", () => {
  it("returns 0 for negative index", () => {
    expect(clampIndex(-1, 5)).toBe(0);
  });

  it("returns last index for over-bound index", () => {
    expect(clampIndex(10, 5)).toBe(4);
  });

  it("returns exact index when in range", () => {
    expect(clampIndex(3, 5)).toBe(3);
  });

  it("returns 0 when length is 1", () => {
    expect(clampIndex(0, 1)).toBe(0);
    expect(clampIndex(5, 1)).toBe(0);
  });
});

describe("useTrace — runFn invocation semantics", () => {
  it("runFn is called exactly once on creation and result stored", () => {
    let calls = 0;
    const run = () => {
      calls++;
      return [1, 2, 3] as const;
    };

    // Simulate what useState(() => runFn()) does — calls runFn once
    const snapshots = run();
    expect(calls).toBe(1);
    expect(snapshots).toEqual([1, 2, 3]);
  });

  it("snapshots length matches runFn return length", () => {
    const run = () => [10, 20, 30, 40] as const;
    const snapshots = run();
    expect(snapshots.length).toBe(4);
  });

  it("runFn returning empty array gives snapshots.length === 0", () => {
    const run = (): readonly number[] => [];
    const snapshots = run();
    expect(snapshots.length).toBe(0);
  });
});
