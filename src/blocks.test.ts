import { test, expect, describe } from "bun:test";
import {
  parse,
  parseAttrs,
  getAttr,
  hasAttr,
  type Block,
  type TextRun,
} from "./blocks";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function block(tree: (Block | TextRun)[], idx: number): Block {
  const node = tree[idx];
  if (!node || node.kind !== "block") throw new Error(`tree[${idx}] is not a block`);
  return node;
}


// ---------------------------------------------------------------------------
// 1. Simple container
// ---------------------------------------------------------------------------

describe("simple container", () => {
  test("[jsx] block with one TextRun child", () => {
    const { tree, errors } = parse("[jsx]\n<Chart/>\n[/jsx]");
    expect(errors).toHaveLength(0);
    expect(tree).toHaveLength(1);
    const b = block(tree, 0);
    expect(b.name).toBe("jsx");
    expect(b.children).toHaveLength(1);
    expect(b.children[0]!.kind).toBe("text");
    expect((b.children[0]! as TextRun).content).toBe("<Chart/>");
  });
});

// ---------------------------------------------------------------------------
// 2. Void with src shorthand
// ---------------------------------------------------------------------------

describe("void with src", () => {
  test("[jsx=viz/chart.jsx] produces void block with src", () => {
    const { tree, errors } = parse("[jsx=viz/chart.jsx]");
    expect(errors).toHaveLength(0);
    expect(tree).toHaveLength(1);
    const b = block(tree, 0);
    expect(b.name).toBe("jsx");
    expect(b.src).toBe("viz/chart.jsx");
    expect(b.children).toHaveLength(0);
    expect(b.openLine).toBe(b.closeLine); // void: same line
  });
});

// ---------------------------------------------------------------------------
// 3. Void by name
// ---------------------------------------------------------------------------

describe("void by name", () => {
  test("[upload] is void with attrs", () => {
    const { tree, errors } = parse('[upload label="Submit" accept=".csv"]');
    expect(errors).toHaveLength(0);
    expect(tree).toHaveLength(1);
    const b = block(tree, 0);
    expect(b.name).toBe("upload");
    expect(b.children).toHaveLength(0);
    expect(getAttr(b, "label")).toBe("Submit");
    expect(getAttr(b, "accept")).toBe(".csv");
  });
});

// ---------------------------------------------------------------------------
// 4. Nested blocks
// ---------------------------------------------------------------------------

describe("nested blocks", () => {
  test("[quiz] containing [question]", () => {
    const src = "[quiz]\n[question type=single]\ntext\n[/question]\n[/quiz]";
    const { tree, errors } = parse(src);
    expect(errors).toHaveLength(0);
    expect(tree).toHaveLength(1);

    const quiz = block(tree, 0);
    expect(quiz.name).toBe("quiz");
    expect(quiz.children).toHaveLength(1);

    const q = quiz.children[0] as Block;
    expect(q.kind).toBe("block");
    expect(q.name).toBe("question");
    expect(getAttr(q, "type")).toBe("single");

    expect(q.children).toHaveLength(1);
    expect((q.children[0] as TextRun).content).toBe("text");
  });
});

// ---------------------------------------------------------------------------
// 5. Mismatched closer
// ---------------------------------------------------------------------------

describe("mismatched closer", () => {
  test("error with line numbers", () => {
    const { errors } = parse("[jsx]\n...\n[/python]");
    expect(errors.length).toBeGreaterThan(0);
    const err = errors[0]!;
    expect(err.message).toContain("[/python]");
    expect(err.message).toContain("[jsx]");
    expect(err.line).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// 6. Unclosed block
// ---------------------------------------------------------------------------

describe("unclosed block", () => {
  test("error for unclosed [jsx]", () => {
    const { errors } = parse("[jsx]\n...\n");
    expect(errors.length).toBeGreaterThan(0);
    const err = errors[0]!;
    expect(err.message).toContain("unclosed");
    expect(err.message).toContain("[jsx]");
  });
});

// ---------------------------------------------------------------------------
// 7. Mid-line non-block
// ---------------------------------------------------------------------------

describe("mid-line non-block", () => {
  test("text [jsx] more text → TextRun, not BlockOpen", () => {
    const { tree, errors } = parse("text [jsx] more text");
    expect(errors).toHaveLength(0);
    expect(tree).toHaveLength(1);
    expect(tree[0]!.kind).toBe("text");
  });
});

// ---------------------------------------------------------------------------
// 8. Code-fence immunity
// ---------------------------------------------------------------------------

describe("code fence immunity", () => {
  test("backtick-fenced [jsx] is treated as text", () => {
    const src = "```\n[jsx]\n<Chart/>\n[/jsx]\n```";
    const { tree, errors } = parse(src);
    expect(errors).toHaveLength(0);
    // Everything should be text runs, no blocks
    for (const node of tree) {
      expect(node.kind).toBe("text");
    }
  });
});

// ---------------------------------------------------------------------------
// 9. Escape
// ---------------------------------------------------------------------------

describe("escape", () => {
  test("\\[jsx] → TextRun containing [jsx] (no backslash)", () => {
    const { tree, errors } = parse("\\[jsx]");
    expect(errors).toHaveLength(0);
    expect(tree).toHaveLength(1);
    expect(tree[0]!.kind).toBe("text");
    const t = tree[0]! as TextRun;
    expect(t.content).toBe("[jsx]");
    expect(t.content).not.toContain("\\");
  });
});

// ---------------------------------------------------------------------------
// 10. Raw block
// ---------------------------------------------------------------------------

describe("raw block", () => {
  test("[raw] block: inner [jsx] content is TextRun, not parsed", () => {
    const src = "[raw]\n[jsx]\n<Chart/>\n[/jsx]\n[/raw]";
    const { tree, errors } = parse(src);
    expect(errors).toHaveLength(0);
    expect(tree).toHaveLength(1);

    const raw = block(tree, 0);
    expect(raw.name).toBe("raw");
    // Children should be a single coalesced TextRun
    expect(raw.children).toHaveLength(1);
    expect(raw.children[0]!.kind).toBe("text");
    const inner = raw.children[0]! as TextRun;
    expect(inner.content).toContain("[jsx]");
    expect(inner.content).toContain("[/jsx]");
    expect(inner.content).toContain("<Chart/>");
  });
});

// ---------------------------------------------------------------------------
// 11. Attr parsing
// ---------------------------------------------------------------------------

describe("attr parsing", () => {
  test("[python hidden] → flag attr", () => {
    const { tree } = parse("[python hidden]\ncode\n[/python]");
    const b = block(tree, 0);
    expect(hasAttr(b, "hidden")).toBe(true);
    expect(getAttr(b, "hidden")).toBe(true);
  });

  test("[upload label=\"foo bar\" accept=.csv] → string attrs", () => {
    const { tree } = parse('[upload label="foo bar" accept=.csv]');
    const b = block(tree, 0);
    expect(getAttr(b, "label")).toBe("foo bar");
    expect(getAttr(b, "accept")).toBe(".csv");
  });

  test("[jsx=path/file.jsx hidden] → src shorthand + flag", () => {
    const { tree } = parse("[jsx=path/file.jsx hidden]");
    const b = block(tree, 0);
    expect(b.src).toBe("path/file.jsx");
    expect(hasAttr(b, "hidden")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 12. Frontmatter immunity
// ---------------------------------------------------------------------------

describe("frontmatter immunity", () => {
  test("---\\n[jsx]\\n--- not parsed as blocks", () => {
    const src = "---\n[jsx]\n---\nnormal text";
    const { tree, errors } = parse(src);
    expect(errors).toHaveLength(0);
    // The [jsx] inside frontmatter must not produce a block
    for (const node of tree) {
      if (node.kind === "block") {
        throw new Error("unexpected block inside frontmatter region");
      }
    }
    // The last line should be a TextRun
    const last = tree[tree.length - 1]!;
    expect(last.kind).toBe("text");
    expect((last as TextRun).content).toContain("normal text");
  });
});

// ---------------------------------------------------------------------------
// 13. Adjacent text coalescing
// ---------------------------------------------------------------------------

describe("adjacent text coalescing", () => {
  test("multiple non-block lines → single TextRun", () => {
    const src = "line one\nline two\nline three";
    const { tree, errors } = parse(src);
    expect(errors).toHaveLength(0);
    expect(tree).toHaveLength(1);
    expect(tree[0]!.kind).toBe("text");
    const t = tree[0]! as TextRun;
    expect(t.content).toBe("line one\nline two\nline three");
    expect(t.startLine).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 14. getAttr and hasAttr helpers
// ---------------------------------------------------------------------------

describe("getAttr and hasAttr", () => {
  test("getAttr returns string value", () => {
    const { tree } = parse('[jsx type="module"]\n[/jsx]');
    const b = block(tree, 0);
    expect(getAttr(b, "type")).toBe("module");
  });

  test("getAttr returns true for flag", () => {
    const { tree } = parse("[jsx hidden]\n[/jsx]");
    const b = block(tree, 0);
    expect(getAttr(b, "hidden")).toBe(true);
  });

  test("getAttr returns undefined for missing attr", () => {
    const { tree } = parse("[jsx]\n[/jsx]");
    const b = block(tree, 0);
    expect(getAttr(b, "missing")).toBeUndefined();
  });

  test("hasAttr returns true when attr exists", () => {
    const { tree } = parse("[jsx hidden]\n[/jsx]");
    const b = block(tree, 0);
    expect(hasAttr(b, "hidden")).toBe(true);
  });

  test("hasAttr returns false when attr missing", () => {
    const { tree } = parse("[jsx]\n[/jsx]");
    const b = block(tree, 0);
    expect(hasAttr(b, "hidden")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Extra: parseAttrs unit tests
// ---------------------------------------------------------------------------

describe("parseAttrs", () => {
  test("empty string → []", () => {
    expect(parseAttrs("")).toEqual([]);
  });

  test("bare flag", () => {
    expect(parseAttrs("hidden")).toEqual([{ key: "hidden", value: true }]);
  });

  test("key=value", () => {
    expect(parseAttrs("type=single")).toEqual([{ key: "type", value: "single" }]);
  });

  test('key="quoted value"', () => {
    expect(parseAttrs('label="foo bar"')).toEqual([{ key: "label", value: "foo bar" }]);
  });

  test("multiple attrs mixed", () => {
    const result = parseAttrs(' type=single hidden label="my label"');
    expect(result).toEqual([
      { key: "type", value: "single" },
      { key: "hidden", value: true },
      { key: "label", value: "my label" },
    ]);
  });
});
