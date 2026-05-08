import { describe, expect, test } from "bun:test";
import { baseStyles } from "./base";

describe("table styles", () => {
  test("auto and sticky modes keep the first column fixed unless a table opts into scroll-only", () => {
    expect(baseStyles).toContain('html[data-table-mode="auto"] .markdown-body .rr-table-wrap:not([data-table-mode="scroll"])');
    expect(baseStyles).toContain('html[data-table-mode="sticky"] .markdown-body .rr-table-wrap:not([data-table-mode="scroll"])');
    expect(baseStyles).toContain('position: sticky');
    expect(baseStyles).toContain('html[data-table-mode="auto"] .markdown-body .rr-table-wrap[data-table-mode="scroll"]');
  });
});
