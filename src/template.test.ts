import { describe, expect, test } from "bun:test";
import { htmlPage } from "./template";

describe("page settings", () => {
  test("includes table view mode choices", () => {
    const html = htmlPage("", "<p>body</p>", "Test page");

    expect(html).toContain("Table view");
    expect(html).toContain('data-table-mode-choice="auto"');
    expect(html).toContain('data-table-mode-choice="scroll"');
    expect(html).toContain('data-table-mode-choice="sticky"');
    expect(html).toContain('data-table-mode-choice="cards"');
  });
});
