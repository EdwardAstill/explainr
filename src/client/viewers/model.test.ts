import { test, expect } from "bun:test";

// The model viewer has no unit-testable pure functions —
// all logic is DOM + WebGL dependent.
// Verify the module exports the right surface and doesn't throw on import.

test("model viewer module exports initModelViewers", async () => {
  const mod = await import("./model");
  expect(typeof mod.initModelViewers).toBe("function");
});
