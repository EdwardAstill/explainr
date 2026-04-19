export type FreeTextSpec =
  | { kind: "string"; value: string }
  | { kind: "number"; value: number }
  | {
      kind: "range";
      min: number;
      max: number;
      minInclusive: boolean;
      maxInclusive: boolean;
    }
  | { kind: "any"; specs: FreeTextSpec[] };

export function parseFreetextAnswer(raw: string): FreeTextSpec {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("freetext answer is empty");
  }

  const first = trimmed[0];
  const looksStructured =
    first === '"' ||
    first === "[" ||
    trimmed.startsWith("range:") ||
    /^-?\d/.test(trimmed);

  if (looksStructured) {
    const parser = new SpecParser(trimmed);
    const spec = parser.parseSpec();
    parser.skipWs();
    if (!parser.atEnd()) {
      throw new Error(
        `unexpected trailing content in freetext answer after spec: ${JSON.stringify(
          parser.rest()
        )}`
      );
    }
    return spec;
  }

  return { kind: "string", value: trimmed };
}

class SpecParser {
  private pos = 0;
  constructor(private readonly s: string) {}

  parseSpec(): FreeTextSpec {
    this.skipWs();
    const c = this.peek();
    if (c === undefined) {
      throw new Error("empty spec");
    }
    if (c === '"') return this.parseString();
    if (c === "[") return this.parseList();
    if (this.s.startsWith("range:", this.pos)) return this.parseRange();
    if (c === "-" || (c >= "0" && c <= "9")) return this.parseNumber();
    throw new Error(
      `unexpected character ${JSON.stringify(c)} at position ${this.pos}`
    );
  }

  private parseString(): FreeTextSpec {
    this.expect('"');
    let out = "";
    while (true) {
      const c = this.peek();
      if (c === undefined) throw new Error("unterminated string literal");
      if (c === "\\") {
        this.pos++;
        const esc = this.peek();
        if (esc === undefined) throw new Error("trailing backslash in string");
        out += esc;
        this.pos++;
        continue;
      }
      if (c === '"') {
        this.pos++;
        return { kind: "string", value: out };
      }
      out += c;
      this.pos++;
    }
  }

  private parseNumber(): FreeTextSpec {
    const n = this.consumeNumber();
    return { kind: "number", value: n };
  }

  private consumeNumber(): number {
    const start = this.pos;
    if (this.peek() === "-") this.pos++;
    let sawDigit = false;
    while (this.peek() !== undefined && /\d/.test(this.peek()!)) {
      this.pos++;
      sawDigit = true;
    }
    if (this.peek() === ".") {
      this.pos++;
      while (this.peek() !== undefined && /\d/.test(this.peek()!)) {
        this.pos++;
        sawDigit = true;
      }
    }
    if (this.peek() === "e" || this.peek() === "E") {
      this.pos++;
      if (this.peek() === "+" || this.peek() === "-") this.pos++;
      while (this.peek() !== undefined && /\d/.test(this.peek()!)) this.pos++;
    }
    const text = this.s.slice(start, this.pos);
    if (!sawDigit) throw new Error(`expected number at position ${start}`);
    const n = Number(text);
    if (Number.isNaN(n)) throw new Error(`invalid number: ${text}`);
    return n;
  }

  private parseRange(): FreeTextSpec {
    if (!this.s.startsWith("range:", this.pos)) {
      throw new Error(`expected "range:" at position ${this.pos}`);
    }
    this.pos += "range:".length;
    this.skipWs();
    const openChar = this.peek();
    if (openChar !== "[" && openChar !== "(") {
      throw new Error(
        `expected "[" or "(" after "range:" at position ${this.pos}`
      );
    }
    this.pos++;
    this.skipWs();
    const min = this.consumeNumber();
    this.skipWs();
    this.expect(",");
    this.skipWs();
    const max = this.consumeNumber();
    this.skipWs();
    const closeChar = this.peek();
    if (closeChar !== "]" && closeChar !== ")") {
      throw new Error(
        `expected "]" or ")" to close range at position ${this.pos}`
      );
    }
    this.pos++;
    if (min > max) {
      throw new Error(`range min (${min}) is greater than max (${max})`);
    }
    return {
      kind: "range",
      min,
      max,
      minInclusive: openChar === "[",
      maxInclusive: closeChar === "]",
    };
  }

  private parseList(): FreeTextSpec {
    this.expect("[");
    const specs: FreeTextSpec[] = [];
    this.skipWs();
    if (this.peek() === "]") {
      this.pos++;
      return { kind: "any", specs };
    }
    while (true) {
      this.skipWs();
      specs.push(this.parseListItem());
      this.skipWs();
      const c = this.peek();
      if (c === ",") {
        this.pos++;
        continue;
      }
      if (c === "]") {
        this.pos++;
        return { kind: "any", specs };
      }
      throw new Error(
        `expected "," or "]" in list at position ${this.pos}, got ${JSON.stringify(
          c
        )}`
      );
    }
  }

  private parseListItem(): FreeTextSpec {
    const c = this.peek();
    if (c === undefined) throw new Error("unexpected end of list");
    if (c === '"' || c === "[" || this.s.startsWith("range:", this.pos)) {
      return this.parseSpec();
    }
    if (c === "-" || (c >= "0" && c <= "9")) {
      const save = this.pos;
      try {
        const n = this.consumeNumber();
        const next = this.peek();
        if (next === "," || next === "]" || next === undefined || /\s/.test(next)) {
          return { kind: "number", value: n };
        }
        this.pos = save;
      } catch {
        this.pos = save;
      }
    }
    const start = this.pos;
    while (true) {
      const ch = this.peek();
      if (ch === undefined || ch === "," || ch === "]") break;
      this.pos++;
    }
    const value = this.s.slice(start, this.pos).trim();
    if (!value) throw new Error(`empty list item at position ${start}`);
    return { kind: "string", value };
  }

  skipWs() {
    while (this.peek() !== undefined && /\s/.test(this.peek()!)) this.pos++;
  }

  private peek(): string | undefined {
    return this.pos < this.s.length ? this.s[this.pos] : undefined;
  }

  private expect(c: string) {
    if (this.peek() !== c) {
      throw new Error(
        `expected ${JSON.stringify(c)} at position ${this.pos}, got ${JSON.stringify(
          this.peek()
        )}`
      );
    }
    this.pos++;
  }

  atEnd(): boolean {
    return this.pos >= this.s.length;
  }

  rest(): string {
    return this.s.slice(this.pos);
  }
}

export function formatFreetextSpec(spec: FreeTextSpec): string {
  switch (spec.kind) {
    case "string":
      return spec.value;
    case "number":
      return String(spec.value);
    case "range":
      return `${spec.minInclusive ? "[" : "("}${spec.min}, ${spec.max}${
        spec.maxInclusive ? "]" : ")"
      }`;
    case "any":
      return spec.specs.map((s) => formatFreetextSpec(s)).join(" or ");
  }
}

export function matchFreetextSpec(
  spec: FreeTextSpec,
  answer: string,
  caseSensitive: boolean
): boolean {
  const trimmed = answer.trim();
  switch (spec.kind) {
    case "string": {
      const a = caseSensitive ? trimmed : trimmed.toLowerCase();
      const b = caseSensitive ? spec.value.trim() : spec.value.trim().toLowerCase();
      return a === b;
    }
    case "number": {
      const n = Number(trimmed);
      if (!Number.isFinite(n)) return false;
      return n === spec.value;
    }
    case "range": {
      const n = Number(trimmed);
      if (!Number.isFinite(n)) return false;
      if (spec.minInclusive ? n < spec.min : n <= spec.min) return false;
      if (spec.maxInclusive ? n > spec.max : n >= spec.max) return false;
      return true;
    }
    case "any":
      return spec.specs.some((s) => matchFreetextSpec(s, answer, caseSensitive));
  }
}
