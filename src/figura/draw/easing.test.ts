import { describe, expect, test } from "bun:test";
import { linear, cubicOut, quadInOut, lerp, tween } from "./easing";

describe("linear", () => {
  test("linear(0) === 0", () => expect(linear(0)).toBe(0));
  test("linear(0.5) === 0.5", () => expect(linear(0.5)).toBe(0.5));
  test("linear(1) === 1", () => expect(linear(1)).toBe(1));
});

describe("cubicOut", () => {
  test("cubicOut(0) === 0", () => expect(cubicOut(0)).toBe(0));
  test("cubicOut(1) === 1", () => expect(cubicOut(1)).toBe(1));

  test("cubicOut(0.5) === 1 - (1-0.5)^3 = 0.875", () => {
    // 1 - (0.5)^3 = 1 - 0.125 = 0.875
    expect(cubicOut(0.5)).toBeCloseTo(0.875, 10);
  });

  test("cubicOut is monotonically increasing on [0,1]", () => {
    const pts = Array.from({ length: 11 }, (_, i) => i / 10);
    for (let i = 1; i < pts.length; i++) {
      expect(cubicOut(pts[i]!)).toBeGreaterThan(cubicOut(pts[i - 1]!));
    }
  });
});

describe("quadInOut", () => {
  test("quadInOut(0) === 0", () => expect(quadInOut(0)).toBe(0));
  test("quadInOut(1) === 1", () => expect(quadInOut(1)).toBe(1));
  test("quadInOut(0.5) === 0.5", () => expect(quadInOut(0.5)).toBeCloseTo(0.5));
  test("quadInOut(0.25) = 2*0.0625 = 0.125", () => expect(quadInOut(0.25)).toBeCloseTo(0.125));
  test("quadInOut(0.75) = 1 - 2*(0.25)^2 = 0.875", () =>
    expect(quadInOut(0.75)).toBeCloseTo(0.875));
});

describe("lerp", () => {
  test("lerp(0, 100, 0.25) === 25", () => expect(lerp(0, 100, 0.25)).toBe(25));
  test("lerp(0, 100, 0) === 0", () => expect(lerp(0, 100, 0)).toBe(0));
  test("lerp(0, 100, 1) === 100", () => expect(lerp(0, 100, 1)).toBe(100));
  test("lerp(10, 20, 0.5) === 15", () => expect(lerp(10, 20, 0.5)).toBe(15));
});

describe("tween", () => {
  test("returns from value at startedAt", () => {
    const tick = tween({ from: 0, to: 100, startedAt: 1000, durationMs: 500 });
    const { value, done } = tick(1000);
    expect(value).toBeCloseTo(0);
    expect(done).toBe(false);
  });

  test("returns to value at startedAt + durationMs", () => {
    const tick = tween({ from: 0, to: 100, startedAt: 1000, durationMs: 500 });
    const { value, done } = tick(1500);
    expect(value).toBeCloseTo(100);
    expect(done).toBe(true);
  });

  test("done is true past the end", () => {
    const tick = tween({ from: 0, to: 100, startedAt: 1000, durationMs: 500 });
    const { done } = tick(2000);
    expect(done).toBe(true);
  });

  test("value is clamped to to past the end", () => {
    const tick = tween({ from: 0, to: 100, startedAt: 1000, durationMs: 500 });
    const { value } = tick(2000);
    expect(value).toBeCloseTo(100);
  });

  test("durationMs: 0 returns to immediately with done true", () => {
    const tick = tween({ from: 0, to: 100, startedAt: 1000, durationMs: 0 });
    const { value, done } = tick(1000);
    expect(value).toBe(100);
    expect(done).toBe(true);
  });

  test("uses custom easing function when provided", () => {
    const alwaysHalf = (_t: number) => 0.5;
    const tick = tween({ from: 0, to: 100, startedAt: 0, durationMs: 1000, easing: alwaysHalf });
    const { value } = tick(500);
    expect(value).toBeCloseTo(50);
  });
});
