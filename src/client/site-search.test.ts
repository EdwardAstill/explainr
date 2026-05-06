import { describe, it, expect } from "bun:test";
import { scoreItem } from "./site-search";

describe("scoreItem", () => {
  it("returns 0 for empty query", () => {
    expect(scoreItem("", "anything")).toEqual({ score: 0, firstHitIndex: -1 });
    expect(scoreItem("   ", "anything")).toEqual({ score: 0, firstHitIndex: -1 });
  });

  it("scores prefix match as 3", () => {
    expect(scoreItem("loss", "loss-functions").score).toBe(3);
  });

  it("scores substring match as 2", () => {
    expect(scoreItem("func", "loss-functions").score).toBe(2);
  });

  it("scores multi-token all-present as 1", () => {
    expect(scoreItem("loss func", "loss-and-functions").score).toBe(1);
  });

  it("scores 0 when any token missing", () => {
    expect(scoreItem("loss xyz", "loss-functions").score).toBe(0);
  });

  it("firstHitIndex is the index of first match", () => {
    expect(scoreItem("func", "loss-functions").firstHitIndex).toBe(5);
  });

  it("case-insensitive", () => {
    expect(scoreItem("LOSS", "loss-functions").score).toBe(3);
  });
});
