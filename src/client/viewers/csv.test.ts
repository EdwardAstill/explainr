import { test, expect, describe } from "bun:test";
import { sortRows, filterRows, paginateRows } from "./csv";

describe("sortRows", () => {
  const rows = [["Beta", "875"], ["Alpha", "1240"], ["Gamma", "2104"]];

  test("sorts ascending by column index", () => {
    const sorted = sortRows(rows, 0, "asc");
    expect(sorted[0]![0]).toBe("Alpha");
    expect(sorted[2]![0]).toBe("Gamma");
  });

  test("sorts descending by column index", () => {
    const sorted = sortRows(rows, 0, "desc");
    expect(sorted[0]![0]).toBe("Gamma");
  });

  test("numeric sort when all values are numbers", () => {
    const numRows = [["30"], ["9"], ["100"]];
    const sorted = sortRows(numRows, 0, "asc");
    expect(sorted[0]![0]).toBe("9");
    expect(sorted[2]![0]).toBe("100");
  });
});

describe("filterRows", () => {
  const rows = [["Alpha", "sensors"], ["Beta", "motors"], ["Gamma", "sensors"]];

  test("returns rows matching filter string (case-insensitive)", () => {
    const result = filterRows(rows, "sensor");
    expect(result).toHaveLength(2);
  });

  test("empty filter returns all rows", () => {
    const result = filterRows(rows, "");
    expect(result).toHaveLength(3);
  });
});

describe("paginateRows", () => {
  const rows = Array.from({ length: 25 }, (_, i) => [`row${i}`]);

  test("returns first page of 10", () => {
    const result = paginateRows(rows, 0, 10);
    expect(result).toHaveLength(10);
    expect(result[0]![0]).toBe("row0");
  });

  test("returns correct second page", () => {
    const result = paginateRows(rows, 1, 10);
    expect(result[0]![0]).toBe("row10");
  });

  test("last page has remaining rows", () => {
    const result = paginateRows(rows, 2, 10);
    expect(result).toHaveLength(5);
  });
});
