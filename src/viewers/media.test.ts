import { test, expect, describe } from "bun:test";
import { renderAudioViewer, renderVideoViewer } from "./media";

describe("renderAudioViewer", () => {
  test("emits audio element with correct src", () => {
    const html = renderAudioViewer("talk.mp3", []);
    expect(html).toContain('src="/_readrun/files/talk.mp3"');
    expect(html).toContain("<audio");
    expect(html).toContain("controls");
  });

  test("loop attr forwarded", () => {
    const html = renderAudioViewer("talk.mp3", [{ key: "loop", value: true }]);
    expect(html).toContain("loop");
  });

  test("rejects path with ..", () => {
    const html = renderAudioViewer("../bad.mp3", []);
    expect(html).toContain("rejects");
    expect(html).not.toContain("<audio");
  });

  test("rejects absolute path", () => {
    const html = renderAudioViewer("/etc/passwd.mp3", []);
    expect(html).toContain("rejects");
    expect(html).not.toContain("<audio");
  });
});

describe("renderVideoViewer", () => {
  test("emits video element with correct src", () => {
    const html = renderVideoViewer("demo.mp4", []);
    expect(html).toContain('src="/_readrun/files/demo.mp4"');
    expect(html).toContain("<video");
    expect(html).toContain("controls");
  });

  test("height attr applied when provided", () => {
    const html = renderVideoViewer("demo.mp4", [{ key: "height", value: "360" }]);
    expect(html).toContain("360px");
  });

  test("muted attr forwarded", () => {
    const html = renderVideoViewer("demo.mp4", [{ key: "muted", value: true }]);
    expect(html).toContain("muted");
  });

  test("rejects path with ..", () => {
    const html = renderVideoViewer("../bad.mp4", []);
    expect(html).toContain("rejects");
    expect(html).not.toContain("<video");
  });

  test("rejects absolute path", () => {
    const html = renderVideoViewer("/etc/passwd.mp4", []);
    expect(html).toContain("rejects");
    expect(html).not.toContain("<video");
  });
});
