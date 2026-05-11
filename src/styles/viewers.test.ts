import { test, expect } from "bun:test";
import { viewerStyles } from "./viewers";

test("viewerStyles is a non-empty string", () => {
  expect(typeof viewerStyles).toBe("string");
  expect(viewerStyles.length).toBeGreaterThan(0);
});

test("viewerStyles contains pdf-viewer class", () => {
  expect(viewerStyles).toContain(".pdf-viewer");
});

test("viewerStyles contains csv-viewer class", () => {
  expect(viewerStyles).toContain(".csv-viewer");
});

test("viewerStyles contains model-viewer class", () => {
  expect(viewerStyles).toContain(".model-viewer");
});

test("viewerStyles contains audio-viewer and video-viewer classes", () => {
  expect(viewerStyles).toContain(".audio-viewer");
  expect(viewerStyles).toContain(".video-viewer");
});
