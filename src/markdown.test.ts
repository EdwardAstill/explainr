import { describe, expect, test } from "bun:test";
import { renderMarkdown } from "./markdown";

describe("markdown tables", () => {
  test("wraps tables and labels cells for responsive display modes", () => {
    const html = renderMarkdown(`
| Item | Status |
| --- | --- |
| Weld group elastic demand | verified |
`);

    expect(html).toContain('<div class="rr-table-wrap"');
    expect(html).toContain('<table class="rr-table"');
    expect(html).toContain('data-label="Item"');
    expect(html).toContain('data-label="Status"');
  });

  test("supports a per-table scroll-only directive", () => {
    const html = renderMarkdown(`
<!-- rr-table: scroll -->
| Item | Status |
| --- | --- |
| Weld group elastic demand | verified |
`);

    expect(html).toContain('<div class="rr-table-wrap" data-table-mode="scroll" tabindex="0">');
  });

  test("supports a per-table sticky directive", () => {
    const html = renderMarkdown(`
<!-- rr-table: sticky -->
| Item | Status |
| --- | --- |
| Weld group elastic demand | verified |
`);

    expect(html).toContain('<div class="rr-table-wrap" data-table-mode="sticky" tabindex="0">');
  });
});
