import { test, expect, describe } from "bun:test";
import { parseCSV, renderCsvViewer } from "./csv";

describe("parseCSV", () => {
  test("parses headers and rows", () => {
    const result = parseCSV("name,value\nAlpha,1240\nBeta,875");
    expect(result.headers).toEqual(["name", "value"]);
    expect(result.rows).toEqual([["Alpha", "1240"], ["Beta", "875"]]);
  });

  test("handles quoted fields with commas", () => {
    const result = parseCSV('a,b\n"hello, world",42');
    expect(result.rows[0]).toEqual(["hello, world", "42"]);
  });

  test("handles escaped quotes inside quoted fields", () => {
    const result = parseCSV('a\n"say ""hi"""');
    expect(result.rows[0]).toEqual(['say "hi"']);
  });

  test("returns empty rows and headers for empty string", () => {
    const result = parseCSV("");
    expect(result.headers).toEqual([]);
    expect(result.rows).toEqual([]);
  });

  test("single-row CSV is treated as headers only", () => {
    const result = parseCSV("name,value");
    expect(result.headers).toEqual(["name", "value"]);
    expect(result.rows).toEqual([]);
  });
});

describe("renderCsvViewer", () => {
  test("embeds headers and rows as JSON", () => {
    const html = renderCsvViewer("name,value\nAlpha,1240\nBeta,875", "results.csv", []);
    const scriptMatch = html.match(/<script type="application\/json"[^>]*>([\s\S]*?)<\/script>/);
    expect(scriptMatch).not.toBeNull();
    const data = JSON.parse(scriptMatch![1]!);
    expect(data.headers).toEqual(["name", "value"]);
    expect(data.rows[0]).toEqual(["Alpha", "1240"]);
  });

  test("uses csv-viewer class with data-rows attr", () => {
    const html = renderCsvViewer("h1,h2\n1,2", "test.csv", []);
    expect(html).toContain('class="csv-viewer"');
    expect(html).toContain("data-rows=");
  });

  test("rejects path traversal from src (used in error context)", () => {
    const html = renderCsvViewer("h\n1", "../secret.csv", []);
    expect(html).not.toContain("<script src");
  });

  test("escapes </script in JSON content", () => {
    const html = renderCsvViewer('col\n</script>', "x.csv", []);
    expect(html).not.toContain("</script>");
    expect(html).toContain("<\\/script");
  });

  test("default rows attr is 100", () => {
    const html = renderCsvViewer("h\n1", "x.csv", []);
    expect(html).toContain('data-rows="100"');
  });
});
