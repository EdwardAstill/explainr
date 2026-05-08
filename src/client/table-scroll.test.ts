import { describe, expect, test } from "bun:test";
import { getTableWheelDelta } from "./table-scroll";

describe("table wheel scrolling", () => {
  test("maps vertical wheel movement to horizontal table scroll when room remains", () => {
    expect(getTableWheelDelta({ scrollLeft: 0, clientWidth: 400, scrollWidth: 900, deltaX: 0, deltaY: 120 })).toBe(120);
  });

  test("lets the page scroll when the table is already at an edge", () => {
    expect(getTableWheelDelta({ scrollLeft: 500, clientWidth: 400, scrollWidth: 900, deltaX: 0, deltaY: 120 })).toBe(0);
    expect(getTableWheelDelta({ scrollLeft: 0, clientWidth: 400, scrollWidth: 900, deltaX: 0, deltaY: -120 })).toBe(0);
  });
});
