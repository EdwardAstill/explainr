import { describe, it, expect } from "bun:test";
import { shouldInvalidateOnFile } from "./watch";

describe("shouldInvalidateOnFile", () => {
  it("returns true for .md files", () => {
    expect(shouldInvalidateOnFile("notes.md")).toBe(true);
  });

  it("returns true for .jsx files", () => {
    expect(shouldInvalidateOnFile("component.jsx")).toBe(true);
  });

  it("returns true for virtual-paths.yaml", () => {
    expect(shouldInvalidateOnFile("virtual-paths.yaml")).toBe(true);
  });

  it("returns false for other files", () => {
    expect(shouldInvalidateOnFile("style.css")).toBe(false);
    expect(shouldInvalidateOnFile("config.json")).toBe(false);
  });

  it("returns false for editor temp files", () => {
    expect(shouldInvalidateOnFile("notes.md~")).toBe(false);
    expect(shouldInvalidateOnFile(".#notes.md")).toBe(false);
    expect(shouldInvalidateOnFile("notes.md.swp")).toBe(false);
  });
});
