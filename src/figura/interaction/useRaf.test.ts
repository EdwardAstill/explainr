import { describe, it, expect } from "bun:test";
import { clampDt, RAF_MAX_DT } from "./useRaf";

describe("clampDt", () => {
  it("returns small dt unchanged", () => {
    expect(clampDt(16)).toBe(16);
    expect(clampDt(0)).toBe(0);
    expect(clampDt(33)).toBe(33);
  });

  it("clamps large dt to RAF_MAX_DT (tab-inactive case)", () => {
    expect(clampDt(500)).toBe(RAF_MAX_DT);
    expect(clampDt(1000)).toBe(RAF_MAX_DT);
    expect(clampDt(RAF_MAX_DT + 1)).toBe(RAF_MAX_DT);
  });

  it("clamps exactly at boundary", () => {
    expect(clampDt(RAF_MAX_DT)).toBe(RAF_MAX_DT);
  });

  it("clamps negative dt to 0", () => {
    expect(clampDt(-5)).toBe(0);
  });

  it("RAF_MAX_DT constant is 100ms", () => {
    expect(RAF_MAX_DT).toBe(100);
  });
});
