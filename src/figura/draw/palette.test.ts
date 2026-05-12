import { describe, expect, test } from "bun:test";
import { palette } from "./palette";

function isHex(s: string): boolean {
  return /^#[0-9a-f]{6}$/.test(s);
}

const FIELDS = ["accent", "accent2", "dim", "surface", "text", "textDim"] as const;

describe("named palettes", () => {
  for (const name of ["math", "neuro", "network", "algo"] as const) {
    test(`palette.${name} has all 6 fields as valid hex strings`, () => {
      const p = palette[name];
      for (const field of FIELDS) {
        expect(typeof p[field]).toBe("string");
        expect(isHex(p[field])).toBe(true);
      }
    });
  }
});

describe("sequential", () => {
  test("t=0 returns first stop", () => {
    expect(palette.sequential(["#000000", "#ffffff"], 0)).toBe("#000000");
  });

  test("t=1 returns last stop", () => {
    expect(palette.sequential(["#000000", "#ffffff"], 1)).toBe("#ffffff");
  });

  test("t=0.5 returns midpoint ±1 per channel", () => {
    const result = palette.sequential(["#000000", "#ffffff"], 0.5);
    // expect #808080 or #7f7f7f
    expect(["#808080", "#7f7f7f"]).toContain(result);
  });

  test("three stops: t=0.5 lands exactly on middle stop", () => {
    // With 3 stops, t=0.5 maps to the middle stop exactly
    const result = palette.sequential(["#000000", "#ff0000", "#ffffff"], 0.5);
    expect(result).toBe("#ff0000");
  });

  test("three stops: t=0.25 is midpoint of first segment", () => {
    // t=0.25 → scaled=0.5 in segment [0,1] → halfway between #000000 and #ff0000
    const result = palette.sequential(["#000000", "#ff0000", "#ffffff"], 0.25);
    expect(["#7f0000", "#800000"]).toContain(result);
  });

  test("three stops: t=1 returns last stop", () => {
    expect(palette.sequential(["#000000", "#ff0000", "#ffffff"], 1)).toBe("#ffffff");
  });

  test("three stops: t=0 returns first stop", () => {
    expect(palette.sequential(["#000000", "#ff0000", "#ffffff"], 0)).toBe("#000000");
  });

  test("t > 1 clamps to last stop", () => {
    expect(palette.sequential(["#000000", "#ffffff"], 1.5)).toBe("#ffffff");
  });

  test("t < 0 clamps to first stop", () => {
    expect(palette.sequential(["#000000", "#ffffff"], -0.5)).toBe("#000000");
  });

  test("shorthand hex throws", () => {
    expect(() => palette.sequential(["#fff"], 0)).toThrow();
  });
});
