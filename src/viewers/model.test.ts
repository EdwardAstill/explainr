import { test, expect, describe } from "bun:test";
import { renderModelViewer } from "./model";

describe("renderModelViewer", () => {
  test("emits model-viewer div with data-src", () => {
    const html = renderModelViewer("bracket.stl", "stl", []);
    expect(html).toContain('class="model-viewer"');
    expect(html).toContain('data-src="/_readrun/files/bracket.stl"');
    expect(html).toContain('data-format="stl"');
  });

  test("works for glb format", () => {
    const html = renderModelViewer("scene.glb", "model", []);
    expect(html).toContain('data-src="/_readrun/files/scene.glb"');
    expect(html).toContain('data-format="glb"');
  });

  test("works for gltf format", () => {
    const html = renderModelViewer("scene.gltf", "model", []);
    expect(html).toContain('data-format="gltf"');
  });

  test("default height is 480", () => {
    const html = renderModelViewer("m.stl", "stl", []);
    expect(html).toContain("480px");
  });

  test("height attr clamped 240–1200", () => {
    const low = renderModelViewer("m.stl", "stl", [{ key: "height", value: "100" }]);
    expect(low).toContain("240px");
    const high = renderModelViewer("m.stl", "stl", [{ key: "height", value: "9999" }]);
    expect(high).toContain("1200px");
  });

  test("controls=false sets data-controls=false", () => {
    const html = renderModelViewer("m.stl", "stl", [{ key: "controls", value: "false" }]);
    expect(html).toContain('data-controls="false"');
  });

  test("default controls is true", () => {
    const html = renderModelViewer("m.stl", "stl", []);
    expect(html).toContain('data-controls="true"');
  });

  test("rejects path with ..", () => {
    const html = renderModelViewer("../evil.stl", "stl", []);
    expect(html).toContain("rejects");
    expect(html).not.toContain("model-viewer");
  });

  test("rejects absolute path", () => {
    const html = renderModelViewer("/etc/passwd", "stl", []);
    expect(html).toContain("rejects");
  });
});
