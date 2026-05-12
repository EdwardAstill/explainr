import { describe, expect, test } from "bun:test";
import { polyline } from "./polyline";

describe("polyline", () => {
  test("empty array returns empty string", () => {
    expect(polyline([])).toBe("");
  });

  test("single point returns M x y", () => {
    expect(polyline([[0, 0]])).toBe("M 0 0");
  });

  test("three points returns M ... L ... L ...", () => {
    expect(polyline([[0, 0], [10, 10], [20, 0]])).toBe("M 0 0 L 10 10 L 20 0");
  });

  test("rounds to 2 decimal places", () => {
    expect(polyline([[0.123, 0.456]])).toBe("M 0.12 0.46");
  });

  test("two points returns M ... L ...", () => {
    expect(polyline([[5, 5], [15, 25]])).toBe("M 5 5 L 15 25");
  });
});
