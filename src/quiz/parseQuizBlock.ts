import type { Block, TextRun } from "../blocks";
import { getAttr } from "../blocks";
import type {
  Quiz,
  TopLevelItem,
  Question,
  SingleChoiceQuestion,
  MultiChoiceQuestion,
  TrueFalseQuestion,
  FreeTextQuestion,
  QuestionGroup,
  InfoPage,
} from "./types";
import { IdGenerator } from "./idGenerator";
import { parseFreetextAnswer } from "./parseFreetextAnswer";

function textFromChildren(children: (Block | TextRun)[]): string {
  return children
    .filter((c) => c.kind === "text")
    .map((c) => (c as TextRun).content)
    .join("\n")
    .trim();
}

function attrString(block: Block, key: string): string | undefined {
  const v = getAttr(block, key);
  if (v === undefined || v === true) return undefined;
  return v;
}

function childBlock(block: Block, name: string): Block | undefined {
  return block.children.find(
    (c): c is Block => c.kind === "block" && c.name === name
  );
}

function extractInlineTag(block: Block, tag: string): string | undefined {
  const raw = textFromChildren(block.children);
  const re = new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`);
  const m = re.exec(raw);
  return m ? m[1]!.trim() : undefined;
}

function hintFrom(block: Block): string | undefined {
  const h = childBlock(block, "hint");
  if (h) {
    const t = textFromChildren(h.children);
    return t || undefined;
  }
  return extractInlineTag(block, "hint");
}

function explainFrom(block: Block): string | undefined {
  const e = childBlock(block, "explain");
  if (e) {
    const t = textFromChildren(e.children);
    return t || undefined;
  }
  return extractInlineTag(block, "explain");
}

interface ParsedOptions {
  options: string[];
  correctIndexes: number[];
}

function parseOptionLines(lines: string[]): ParsedOptions {
  const options: string[] = [];
  const correctIndexes: number[] = [];
  for (const line of lines) {
    const m = /^-\s+(.*?)(\s+\*)?$/.exec(line.trim());
    if (m) {
      options.push(m[1]!.trim());
      if (m[2]) correctIndexes.push(options.length - 1);
    }
  }
  return { options, correctIndexes };
}

interface StemAndAnswerLines {
  stem: string;
  answerLines: string[];
}

const INLINE_BLOCK_RE = /^\s*\[(hint|explain)\].*\[\/(hint|explain)\]\s*$/;

function splitStemAndAnswerLines(raw: string): StemAndAnswerLines {
  const lines = raw.split("\n");
  const stemLines: string[] = [];
  const answerLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const isOption = /^-\s+/.test(trimmed);
    const isFreetext = /^=\s+/.test(trimmed);
    const isTrueFalse = /^(true|false)(\s+\*)?$/.test(trimmed);
    const isInlineBlock = INLINE_BLOCK_RE.test(line);
    if (isOption || isFreetext || isTrueFalse) {
      answerLines.push(trimmed);
    } else if (isInlineBlock) {
      // skip — consumed as block children or irrelevant to stem
    } else {
      stemLines.push(line);
    }
  }

  return {
    stem: stemLines.join("\n").trim(),
    answerLines,
  };
}

function parseQuestionBlock(block: Block, ids: IdGenerator): Question {
  const type = attrString(block, "type");
  if (!type) throw new Error("[question] block missing required 'type' attr");

  const rawId = attrString(block, "id");
  const id = ids.nextQuestionId(rawId);
  const hint = hintFrom(block);
  const explanation = explainFrom(block);

  const rawText = textFromChildren(block.children);
  const { stem, answerLines } = splitStemAndAnswerLines(rawText);

  if (type === "single" || type === "multi") {
    const { options, correctIndexes } = parseOptionLines(answerLines);
    if (type === "single") {
      const correctAnswer = correctIndexes[0] ?? 0;
      const q: SingleChoiceQuestion = { id, type: "single", question: stem, options, correctAnswer };
      if (hint) q.hint = hint;
      if (explanation) q.explanation = explanation;
      return q;
    } else {
      const q: MultiChoiceQuestion = { id, type: "multi", question: stem, options, correctAnswers: correctIndexes };
      if (hint) q.hint = hint;
      if (explanation) q.explanation = explanation;
      return q;
    }
  }

  if (type === "truefalse") {
    let correctAnswer = false;
    for (const line of answerLines) {
      const m = /^(true|false)(\s+\*)?$/.exec(line);
      if (m && m[2]) {
        correctAnswer = m[1] === "true";
      }
    }
    const q: TrueFalseQuestion = { id, type: "truefalse", question: stem, correctAnswer };
    if (hint) q.hint = hint;
    if (explanation) q.explanation = explanation;
    return q;
  }

  if (type === "freetext") {
    const answerLine = answerLines.find((l) => /^=\s+/.test(l));
    if (!answerLine) throw new Error(`[question type=freetext] missing '= answer' line`);
    const raw = answerLine.replace(/^=\s+/, "");
    const answer = parseFreetextAnswer(raw);
    const q: FreeTextQuestion = { id, type: "freetext", question: stem, answer };
    if (hint) q.hint = hint;
    if (explanation) q.explanation = explanation;
    return q;
  }

  throw new Error(`Unknown question type: "${type}"`);
}

function parseGroupBlock(block: Block, ids: IdGenerator): QuestionGroup {
  const rawId = attrString(block, "id");
  const groupNum = ids.currentQuestionNum + 1;
  const id = ids.nextQuestionId(rawId);

  const hint = hintFrom(block);
  const explanation = explainFrom(block);
  const question = textFromChildren(
    block.children.filter((c) => !(c.kind === "block"))
  );

  const partBlocks = block.children.filter(
    (c): c is Block => c.kind === "block" && c.name === "question"
  );

  const parts: Question[] = partBlocks.map((pb) => parseQuestionBlock(pb, ids));

  ids.assignGroupPartIds(parts, groupNum);

  const g: QuestionGroup = { id, type: "group", question, parts };
  if (hint) g.hint = hint;
  if (explanation) g.explanation = explanation;
  return g;
}

const EXEC_BLOCK_NAMES = new Set(["jsx", "python"]);

function infoContent(children: (Block | TextRun)[]): string {
  return children.map(c => {
    if (c.kind === "text") return (c as TextRun).content;
    const b = c as Block;
    if (EXEC_BLOCK_NAMES.has(b.name)) {
      const code = (b.children.find(ch => ch.kind === "text") as TextRun | undefined)?.content ?? "";
      return `[${b.name}]\n${code}\n[/${b.name}]`;
    }
    return "";
  }).join("\n").trim();
}

function parseInfoBlock(block: Block, ids: IdGenerator): InfoPage {
  const rawId = attrString(block, "id");
  const id = ids.nextInfoId(rawId);
  const content = infoContent(block.children);
  return { id, type: "info", content };
}

export function parseQuizBlock(block: Block): Quiz {
  const title = attrString(block, "title") ?? "";

  const description = attrString(block, "description");

  const ids = new IdGenerator();
  const items: TopLevelItem[] = [];

  for (const child of block.children) {
    if (child.kind === "text") continue;

    if (child.name === "question") {
      items.push(parseQuestionBlock(child, ids));
    } else if (child.name === "group") {
      items.push(parseGroupBlock(child, ids));
    } else if (child.name === "info") {
      items.push(parseInfoBlock(child, ids));
    }
  }

  const quiz: Quiz = { title, items };
  if (description) quiz.description = description;
  return quiz;
}

if (import.meta.main) {
  const { parse } = await import("../blocks");

  const src = `
[quiz title="Smoke Test" description="Basic check"]

[question type=single]
What colour is the sky?

- Red
- Blue *
- Green

[hint]Think about daytime.[/hint]
[explain]The sky appears blue due to Rayleigh scattering.[/explain]
[/question]

[question type=multi]
Which are primary colours?

- Red *
- Green *
- Purple
- Blue *
[/question]

[question type=truefalse]
The earth is round.
true *
[/question]

[question type=freetext]
What is 2+2?
= 4
[/question]

[group]
Shared stem.

[question type=freetext]
Part (a)
= 3
[/question]

[question type=freetext]
Part (b)
= 5
[/question]
[/group]

[info]
This is an **info page**.
[/info]

[/quiz]
`.trim();

  const { tree, errors } = parse(src);
  if (errors.length) {
    console.error("Parse errors:", errors);
    process.exit(1);
  }

  const quizBlock = tree.find((n): n is import("../blocks").Block => n.kind === "block" && n.name === "quiz");
  if (!quizBlock) throw new Error("No quiz block found");

  const quiz = parseQuizBlock(quizBlock);
  console.log(JSON.stringify(quiz, null, 2));
  console.log("Smoke test passed.");
}
