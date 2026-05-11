import { test, expect, describe } from "bun:test";
import { renderPdfViewer } from "./pdf";

describe("renderPdfViewer", () => {
  test("emits iframe with correct src", () => {
    const html = renderPdfViewer("spec.pdf", []);
    expect(html).toContain('src="/_readrun/files/spec.pdf"');
    expect(html).toContain("<iframe");
  });

  test("sandbox is allow-same-origin only", () => {
    const html = renderPdfViewer("spec.pdf", []);
    expect(html).toContain('sandbox="allow-same-origin"');
    expect(html).not.toContain("allow-scripts");
  });

  test("default height is 600", () => {
    const html = renderPdfViewer("spec.pdf", []);
    expect(html).toContain("600px");
  });

  test("custom height is clamped 300–1200", () => {
    const h200 = renderPdfViewer("doc.pdf", [{ key: "height", value: "200" }]);
    expect(h200).toContain("300px");  // clamped up
    const h9000 = renderPdfViewer("doc.pdf", [{ key: "height", value: "9000" }]);
    expect(h9000).toContain("1200px"); // clamped down
    const h700 = renderPdfViewer("doc.pdf", [{ key: "height", value: "700" }]);
    expect(h700).toContain("700px");
  });

  test("rejects path with ..", () => {
    const html = renderPdfViewer("../secrets.pdf", []);
    expect(html).toContain("rejects");
    expect(html).not.toContain("<iframe");
  });

  test("rejects absolute path", () => {
    const html = renderPdfViewer("/etc/passwd.pdf", []);
    expect(html).toContain("rejects");
    expect(html).not.toContain("<iframe");
  });
});
