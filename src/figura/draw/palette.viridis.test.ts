import { describe, expect, test } from "bun:test";
import { palette } from "./palette";

function isHex(s: string): boolean {
  return /^#[0-9a-f]{6}$/.test(s);
}

describe("perceptual colormaps", () => {
  for (const name of ["viridis", "magma", "plasma"] as const) {
    test(`${name}(0) returns first stop`, () => {
      const stops = palette[`${name}Stops` as const];
      expect(palette[name](0)).toBe(stops[0]);
    });

    test(`${name}(1) returns last stop`, () => {
      const stops = palette[`${name}Stops` as const];
      expect(palette[name](1)).toBe(stops[stops.length - 1]);
    });

    test(`${name}(t) returns valid hex for 11 sample points`, () => {
      for (let i = 0; i <= 10; i++) {
        expect(isHex(palette[name](i / 10))).toBe(true);
      }
    });

    test(`${name} clamps below 0`, () => {
      const stops = palette[`${name}Stops` as const];
      expect(palette[name](-0.5)).toBe(stops[0]);
    });

    test(`${name} clamps above 1`, () => {
      const stops = palette[`${name}Stops` as const];
      expect(palette[name](1.5)).toBe(stops[stops.length - 1]);
    });
  }
});
