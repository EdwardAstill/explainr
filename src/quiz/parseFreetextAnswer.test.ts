import { describe, it, expect } from "bun:test";
import {
  parseFreetextAnswer,
  formatFreetextSpec,
  matchFreetextSpec,
} from "./parseFreetextAnswer";
import { parseQuizMarkdown } from "./parseMarkdown";
import type { FreeTextQuestion } from "./types";

describe("parseFreetextAnswer — spec parsing", () => {
  it("parses a bareword as a plain string (backwards compat)", () => {
    expect(parseFreetextAnswer("Simple Storage Service")).toEqual({
      kind: "string",
      value: "Simple Storage Service",
    });
  });

  it("parses a quoted string", () => {
    expect(parseFreetextAnswer('"hello world"')).toEqual({
      kind: "string",
      value: "hello world",
    });
  });

  it("parses a number", () => {
    expect(parseFreetextAnswer("3.14")).toEqual({
      kind: "number",
      value: 3.14,
    });
  });

  it("parses a negative number", () => {
    expect(parseFreetextAnswer("-2.5")).toEqual({
      kind: "number",
      value: -2.5,
    });
  });

  it("parses an inclusive range", () => {
    expect(parseFreetextAnswer("range:[1,2]")).toEqual({
      kind: "range",
      min: 1,
      max: 2,
      minInclusive: true,
      maxInclusive: true,
    });
  });

  it("parses a half-open range with mixed bracketing", () => {
    expect(parseFreetextAnswer("range:(0, 1]")).toEqual({
      kind: "range",
      min: 0,
      max: 1,
      minInclusive: false,
      maxInclusive: true,
    });
  });

  it("parses an exclusive-upper range", () => {
    expect(parseFreetextAnswer("range:[0.9, 1.1)")).toEqual({
      kind: "range",
      min: 0.9,
      max: 1.1,
      minInclusive: true,
      maxInclusive: false,
    });
  });

  it("rejects range with min > max", () => {
    expect(() => parseFreetextAnswer("range:[5,3]")).toThrow();
  });

  it("parses a list of numbers", () => {
    expect(parseFreetextAnswer("[1, 2, 3]")).toEqual({
      kind: "any",
      specs: [
        { kind: "number", value: 1 },
        { kind: "number", value: 2 },
        { kind: "number", value: 3 },
      ],
    });
  });

  it("parses a list of quoted strings", () => {
    expect(parseFreetextAnswer('["S3", "Simple Storage Service"]')).toEqual({
      kind: "any",
      specs: [
        { kind: "string", value: "S3" },
        { kind: "string", value: "Simple Storage Service" },
      ],
    });
  });

  it("parses a list mixing ranges, numbers, and strings", () => {
    const spec = parseFreetextAnswer('[range:[0,1], 2, "two"]');
    expect(spec.kind).toBe("any");
    if (spec.kind === "any") {
      expect(spec.specs).toHaveLength(3);
      expect(spec.specs[0]?.kind).toBe("range");
      expect(spec.specs[1]).toEqual({ kind: "number", value: 2 });
      expect(spec.specs[2]).toEqual({ kind: "string", value: "two" });
    }
  });

  it("parses unquoted list items as strings", () => {
    expect(parseFreetextAnswer("[alpha, beta]")).toEqual({
      kind: "any",
      specs: [
        { kind: "string", value: "alpha" },
        { kind: "string", value: "beta" },
      ],
    });
  });

  it("throws on trailing junk", () => {
    expect(() => parseFreetextAnswer('"hello" extra')).toThrow();
  });
});

describe("matchFreetextSpec", () => {
  it("matches a plain string case-insensitively by default", () => {
    const spec = parseFreetextAnswer("Hello");
    expect(matchFreetextSpec(spec, "hello", false)).toBe(true);
    expect(matchFreetextSpec(spec, "HELLO", false)).toBe(true);
  });

  it("respects caseSensitive flag", () => {
    const spec = parseFreetextAnswer('"Hello"');
    expect(matchFreetextSpec(spec, "hello", true)).toBe(false);
    expect(matchFreetextSpec(spec, "Hello", true)).toBe(true);
  });

  it("matches exact numbers", () => {
    const spec = parseFreetextAnswer("3.14");
    expect(matchFreetextSpec(spec, "3.14", false)).toBe(true);
    expect(matchFreetextSpec(spec, "3.140", false)).toBe(true);
    expect(matchFreetextSpec(spec, "3.15", false)).toBe(false);
  });

  it("matches inclusive range endpoints", () => {
    const spec = parseFreetextAnswer("range:[1,2]");
    expect(matchFreetextSpec(spec, "1", false)).toBe(true);
    expect(matchFreetextSpec(spec, "2", false)).toBe(true);
    expect(matchFreetextSpec(spec, "1.5", false)).toBe(true);
    expect(matchFreetextSpec(spec, "2.01", false)).toBe(false);
  });

  it("excludes exclusive range endpoints", () => {
    const spec = parseFreetextAnswer("range:(1,2)");
    expect(matchFreetextSpec(spec, "1", false)).toBe(false);
    expect(matchFreetextSpec(spec, "2", false)).toBe(false);
    expect(matchFreetextSpec(spec, "1.5", false)).toBe(true);
  });

  it("handles half-open range: [a,b)", () => {
    const spec = parseFreetextAnswer("range:[1,2)");
    expect(matchFreetextSpec(spec, "1", false)).toBe(true);
    expect(matchFreetextSpec(spec, "2", false)).toBe(false);
  });

  it("matches any item in a list", () => {
    const spec = parseFreetextAnswer('["S3", "Simple Storage Service"]');
    expect(matchFreetextSpec(spec, "S3", false)).toBe(true);
    expect(matchFreetextSpec(spec, "simple storage service", false)).toBe(true);
    expect(matchFreetextSpec(spec, "SSS", false)).toBe(false);
  });

  it("matches numeric tolerance via range in a list", () => {
    const spec = parseFreetextAnswer("[range:[3.13, 3.15], 3.14159]");
    expect(matchFreetextSpec(spec, "3.14", false)).toBe(true);
    expect(matchFreetextSpec(spec, "3.14159", false)).toBe(true);
    expect(matchFreetextSpec(spec, "3.2", false)).toBe(false);
  });
});

describe("formatFreetextSpec", () => {
  it("formats ranges with interval notation", () => {
    const spec = parseFreetextAnswer("range:[0,1)");
    expect(formatFreetextSpec(spec)).toBe("[0, 1)");
  });

  it("formats a list with 'or' separator", () => {
    const spec = parseFreetextAnswer('["S3", "Simple Storage Service"]');
    expect(formatFreetextSpec(spec)).toBe("S3 or Simple Storage Service");
  });
});

describe("parseQuizMarkdown — freetext spec integration", () => {
  it("parses bareword freetext into a string spec", () => {
    const quiz = parseQuizMarkdown(`---
title: t
---

## [freetext] What does S3 stand for?
= Simple Storage Service
`);
    const q = quiz.items[0] as FreeTextQuestion;
    expect(q.type).toBe("freetext");
    expect(q.answer).toEqual({ kind: "string", value: "Simple Storage Service" });
  });

  it("parses a range spec from the answer line", () => {
    const quiz = parseQuizMarkdown(`---
title: t
---

## [freetext] Compute pi to 2dp
= range:[3.13, 3.15]
`);
    const q = quiz.items[0] as FreeTextQuestion;
    expect(q.answer.kind).toBe("range");
  });

  it("parses a list spec from the answer line", () => {
    const quiz = parseQuizMarkdown(`---
title: t
---

## [freetext] Name the currency of Japan
= ["yen", "JPY"]
`);
    const q = quiz.items[0] as FreeTextQuestion;
    expect(q.answer.kind).toBe("any");
  });
});
