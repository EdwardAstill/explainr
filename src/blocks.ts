// Block syntax engine for readrun
// Delimiter syntax: [name attrs]/[/name] with correct nesting via name matching

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BlockAttr = { key: string; value: string | true }; // true = flag

export type BlockToken =
  | { kind: "open";  name: string; attrs: BlockAttr[]; src: string | null; line: number }
  | { kind: "close"; name: string; line: number }
  | { kind: "void";  name: string; attrs: BlockAttr[]; src: string | null; line: number }
  | { kind: "text";  content: string; line: number };

export interface Block {
  kind: "block";
  name: string;
  attrs: BlockAttr[];
  src: string | null;       // value from [name=path] shorthand → implicit src attr
  children: (Block | TextRun)[];
  openLine: number;
  closeLine: number;
}

export interface TextRun {
  kind: "text";
  content: string;  // may be multi-line (adjacent text lines coalesced)
  startLine: number;
}

export type BlockTree = (Block | TextRun)[];

export interface BlockError {
  message: string;
  line: number;
  hint?: string;
}

export interface TokeniseResult {
  tokens: BlockToken[];
  errors: BlockError[];
}

export interface ParseResult {
  tree: BlockTree;
  errors: BlockError[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VOID_BLOCKS = new Set(["upload", "include"]);

// Block-line regex: whole line, case-sensitive
const BLOCK_LINE_RE =
  /^\s*\[(?<close>\/)?(?<name>[A-Za-z][A-Za-z0-9-]*)(?:=(?<src>[^\s\]"]+))?(?<attrs>[^\]]*)\]\s*$/;

// ---------------------------------------------------------------------------
// parseAttrs
// ---------------------------------------------------------------------------

export function parseAttrs(s: string): BlockAttr[] {
  const result: BlockAttr[] = [];
  // Trim whitespace
  s = s.trim();
  if (!s) return result;

  // Walk through the string token by token
  let i = 0;
  while (i < s.length) {
    // Skip whitespace
    while (i < s.length && /\s/.test(s[i]!)) i++;
    if (i >= s.length) break;

    // Read key (up to = or whitespace)
    let keyStart = i;
    while (i < s.length && s[i] !== "=" && !/\s/.test(s[i]!)) i++;
    const key = s.slice(keyStart, i);
    if (!key) { i++; continue; }

    if (i < s.length && s[i] === "=") {
      // Has a value
      i++; // consume '='
      let value: string;
      if (i < s.length && s[i] === '"') {
        // Quoted value
        i++; // consume opening quote
        let valStart = i;
        while (i < s.length && s[i] !== '"') i++;
        value = s.slice(valStart, i);
        if (i < s.length) i++; // consume closing quote
      } else {
        // Unquoted value
        let valStart = i;
        while (i < s.length && !/\s/.test(s[i]!)) i++;
        value = s.slice(valStart, i);
      }
      result.push({ key, value });
    } else {
      // Flag (bare key)
      result.push({ key, value: true });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// tokenise
// ---------------------------------------------------------------------------

export function tokenise(source: string): TokeniseResult {
  const tokens: BlockToken[] = [];
  const errors: BlockError[] = [];

  const lines = source.split("\n");
  let inFrontmatter = false;
  let frontmatterDone = false;
  let inFence = false;
  let inRaw = false;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1; // 1-based
    const line = lines[i]!;

    // --- Frontmatter detection ---
    if (!frontmatterDone && lineNum === 1 && line.trim() === "---") {
      inFrontmatter = true;
      tokens.push({ kind: "text", content: line, line: lineNum });
      continue;
    }
    if (inFrontmatter) {
      tokens.push({ kind: "text", content: line, line: lineNum });
      if (line.trim() === "---") {
        inFrontmatter = false;
        frontmatterDone = true;
      }
      continue;
    }

    // --- Code fence detection ---
    if (!inRaw && /^(`{3,}|~{3,})/.test(line)) {
      inFence = !inFence;
      tokens.push({ kind: "text", content: line, line: lineNum });
      continue;
    }
    if (inFence) {
      tokens.push({ kind: "text", content: line, line: lineNum });
      continue;
    }

    // --- Raw block handling ---
    if (inRaw) {
      // Check if this is the [/raw] closer
      const closeMatch = BLOCK_LINE_RE.exec(line);
      if (closeMatch && closeMatch.groups?.close && closeMatch.groups?.name === "raw") {
        inRaw = false;
        tokens.push({ kind: "close", name: "raw", line: lineNum });
      } else {
        tokens.push({ kind: "text", content: line, line: lineNum });
      }
      continue;
    }

    // --- Backslash escape ---
    if (/^\s*\\\[/.test(line)) {
      // Strip the backslash before the [
      const stripped = line.replace(/\\(\[)/, "$1");
      tokens.push({ kind: "text", content: stripped, line: lineNum });
      continue;
    }

    // --- Attempt block-line match ---
    const match = BLOCK_LINE_RE.exec(line);
    if (match && match.groups) {
      const { close, name, src, attrs: attrsStr } = match.groups;
      const parsedAttrs = parseAttrs(attrsStr ?? "");

      if (close) {
        // Closing tag
        tokens.push({ kind: "close", name: name!, line: lineNum });
      } else if (VOID_BLOCKS.has(name!) || src !== undefined) {
        // Void block
        const srcVal = src ?? null;
        tokens.push({ kind: "void", name: name!, attrs: parsedAttrs, src: srcVal, line: lineNum });
      } else {
        // Open block
        tokens.push({ kind: "open", name: name!, attrs: parsedAttrs, src: null, line: lineNum });
        // Set inRaw if this is a [raw] block
        if (name === "raw") {
          inRaw = true;
        }
      }
    } else {
      // Plain text line
      tokens.push({ kind: "text", content: line, line: lineNum });
    }
  }

  return { tokens, errors };
}

// ---------------------------------------------------------------------------
// buildTree
// ---------------------------------------------------------------------------

export function buildTree(tokens: BlockToken[]): ParseResult {
  const errors: BlockError[] = [];

  // Root-level children
  const rootChildren: (Block | TextRun)[] = [];

  // Stack of open blocks. Each entry holds the Block and its children array.
  const stack: Block[] = [];

  function currentChildren(): (Block | TextRun)[] {
    if (stack.length === 0) return rootChildren;
    return stack[stack.length - 1]!.children;
  }

  for (const token of tokens) {
    switch (token.kind) {
      case "open": {
        const block: Block = {
          kind: "block",
          name: token.name,
          attrs: token.attrs,
          src: token.src,
          children: [],
          openLine: token.line,
          closeLine: -1, // will be set on close
        };
        currentChildren().push(block);
        stack.push(block);
        break;
      }

      case "text": {
        const children = currentChildren();
        const last = children[children.length - 1];
        if (last && last.kind === "text") {
          // Coalesce
          last.content += "\n" + token.content;
        } else {
          children.push({ kind: "text", content: token.content, startLine: token.line });
        }
        break;
      }

      case "void": {
        const block: Block = {
          kind: "block",
          name: token.name,
          attrs: token.attrs,
          src: token.src,
          children: [],
          openLine: token.line,
          closeLine: token.line,
        };
        currentChildren().push(block);
        break;
      }

      case "close": {
        if (stack.length === 0) {
          errors.push({
            message: `unexpected closing tag [/${token.name}] with no open block`,
            line: token.line,
          });
          break;
        }
        const top = stack[stack.length - 1]!;
        if (top.name !== token.name) {
          errors.push({
            message: `closing tag [/${token.name}] does not match opener [${top.name}] (opened at line ${top.openLine})`,
            line: token.line,
          });
          // Error recovery: pop anyway
          stack.pop();
          top.closeLine = token.line;
        } else {
          stack.pop();
          top.closeLine = token.line;
        }
        break;
      }
    }
  }

  // Any unclosed blocks remaining on stack
  for (const block of stack) {
    errors.push({
      message: `unclosed [${block.name}] block (opened at line ${block.openLine})`,
      line: block.openLine,
    });
  }

  return { tree: rootChildren, errors };
}

// ---------------------------------------------------------------------------
// parse
// ---------------------------------------------------------------------------

export function parse(source: string): ParseResult {
  const { tokens, errors: tokenErrors } = tokenise(source);
  const { tree, errors: treeErrors } = buildTree(tokens);
  return { tree, errors: [...tokenErrors, ...treeErrors] };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getAttr(block: Block, key: string): string | true | undefined {
  const attr = block.attrs.find((a) => a.key === key);
  return attr?.value;
}

export function hasAttr(block: Block, key: string): boolean {
  return block.attrs.some((a) => a.key === key);
}
