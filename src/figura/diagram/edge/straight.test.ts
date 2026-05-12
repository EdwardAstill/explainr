import { describe, it, expect } from "bun:test";
import { straight } from "./straight";

describe("straight", () => {
  it("basic case: (0,0) to (100,100)", () => {
    const d = straight({ x: 0, y: 0 }, { x: 100, y: 100 });
    expect(d).toBe("M 0.00 0.00 L 100.00 100.00");
  });

  it("negative coordinates work", () => {
    const d = straight({ x: -50, y: -25 }, { x: 50, y: 25 });
    expect(d).toBe("M -50.00 -25.00 L 50.00 25.00");
  });

  it("starts with M", () => {
    const d = straight({ x: 10, y: 20 }, { x: 30, y: 40 });
    expect(d.startsWith("M")).toBe(true);
  });

  it("contains L", () => {
    const d = straight({ x: 0, y: 0 }, { x: 1, y: 1 });
    expect(d).toContain(" L ");
  });

  it("fractional coordinates rounded to 2 decimals", () => {
    const d = straight({ x: 1.234, y: 5.678 }, { x: 9.101, y: 2.345 });
    expect(d).toBe("M 1.23 5.68 L 9.10 2.35");
  });
});
