import { describe, it, expect } from "bun:test";
import React from "react";
import { WidgetLayout, extractSlots } from "./WidgetLayout";

// ── Slot marker tests ──────────────────────────────────────────────────────

describe("WidgetLayout slot markers", () => {
  it("WidgetLayout.Visual has __figuraSlot === 'visual'", () => {
    expect((WidgetLayout.Visual as { __figuraSlot?: string }).__figuraSlot).toBe("visual");
  });

  it("WidgetLayout.Controls has __figuraSlot === 'controls'", () => {
    expect((WidgetLayout.Controls as { __figuraSlot?: string }).__figuraSlot).toBe("controls");
  });

  it("WidgetLayout.Aside has __figuraSlot === 'aside'", () => {
    expect((WidgetLayout.Aside as { __figuraSlot?: string }).__figuraSlot).toBe("aside");
  });
});

// ── extractSlots tests ────────────────────────────────────────────────────

describe("extractSlots", () => {
  it("extracts visual slot from children", () => {
    const children = React.createElement(WidgetLayout.Visual, null, "vis content");
    const slots = extractSlots(children);
    expect(slots["visual"]).toBeDefined();
  });

  it("extracts controls slot from children", () => {
    const children = React.createElement(WidgetLayout.Controls, null, "ctrl content");
    const slots = extractSlots(children);
    expect(slots["controls"]).toBeDefined();
  });

  it("extracts aside slot from children", () => {
    const children = React.createElement(WidgetLayout.Aside, null, "aside content");
    const slots = extractSlots(children);
    expect(slots["aside"]).toBeDefined();
  });

  it("extracts all three slots from an array of children", () => {
    const children = [
      React.createElement(WidgetLayout.Visual, { key: "v", children: "vis" }),
      React.createElement(WidgetLayout.Controls, { key: "c", children: "ctrl" }),
      React.createElement(WidgetLayout.Aside, { key: "a", children: "aside" }),
    ];
    const slots = extractSlots(children);
    expect(slots["visual"]).toBeDefined();
    expect(slots["controls"]).toBeDefined();
    expect(slots["aside"]).toBeDefined();
  });

  it("returns empty record when no slots are present", () => {
    const children = React.createElement("div", null, "plain");
    const slots = extractSlots(children);
    expect(Object.keys(slots)).toHaveLength(0);
  });

  it("ignores non-slot children alongside slot children", () => {
    const children = [
      React.createElement("span", { key: "s" }, "ignored"),
      React.createElement(WidgetLayout.Visual, { key: "v", children: "vis" }),
    ];
    const slots = extractSlots(children);
    expect(slots["visual"]).toBeDefined();
    expect(Object.keys(slots)).toHaveLength(1);
  });
});

// ── WidgetLayout static properties ────────────────────────────────────────

describe("WidgetLayout compound component", () => {
  it("exposes Visual, Controls, Aside as static properties", () => {
    expect(typeof WidgetLayout.Visual).toBe("function");
    expect(typeof WidgetLayout.Controls).toBe("function");
    expect(typeof WidgetLayout.Aside).toBe("function");
  });
});
