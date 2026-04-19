import type {
  QuizItem,
  Question,
  SingleChoiceQuestion,
  MultiChoiceQuestion,
  TrueFalseQuestion,
  FreeTextQuestion,
  InfoPage,
} from "./types";
import type { IdGenerator } from "./idGenerator";
import { validateAnswerIndex } from "./validateQuiz";
import { parseFreetextAnswer } from "./parseFreetextAnswer";

type ItemType = "single" | "multi" | "truefalse" | "freetext" | "info" | "group";

export function parseItem(
  lines: string[],
  startIndex: number,
  type: ItemType,
  headingText: string,
  ids: IdGenerator
): { item: QuizItem; nextIndex: number } {
  let i = startIndex;

  while (i < lines.length && lines[i].trim() === "") i++;

  let bodyContent = "";
  if (i < lines.length && lines[i].trim() === ":::") {
    i++;
    const bodyLines: string[] = [];
    let inCodeFence = false;
    while (i < lines.length) {
      const l = lines[i];
      if (l.trim().startsWith("```")) {
        inCodeFence = !inCodeFence;
      }
      if (!inCodeFence && l.trim() === ":::") {
        i++;
        break;
      }
      bodyLines.push(l);
      i++;
    }
    bodyContent = bodyLines.join("\n").trim();
  }

  while (i < lines.length && lines[i].trim() === "") i++;

  if (type === "info") {
    const content = bodyContent || headingText;
    return {
      item: {
        id: ids.nextInfoId(),
        type: "info",
        content,
      } as InfoPage,
      nextIndex: i,
    };
  }

  let hint: string | undefined;
  let explanation: string | undefined;
  const options: string[] = [];
  const correctIndices: number[] = [];
  let trueFalseAnswer: boolean | undefined;
  let freetextAnswer: string | undefined;

  while (i < lines.length) {
    const l = lines[i];

    if (l.match(/^#{1,3} /)) break;

    const optMatch = l.match(/^- (.+)/);
    if (optMatch) {
      let optText = optMatch[1].trim();
      if (optText.endsWith(" *")) {
        optText = optText.slice(0, -2).trim();
        correctIndices.push(options.length);
      }
      options.push(optText);
      i++;
      continue;
    }

    const tfMatch = l.match(/^(true|false)\s*\*?\s*$/i);
    if (tfMatch) {
      if (l.includes("*")) {
        trueFalseAnswer = tfMatch[1].toLowerCase() === "true";
      }
      i++;
      continue;
    }

    const ftMatch = l.match(/^= (.+)/);
    if (ftMatch) {
      freetextAnswer = ftMatch[1].trim();
      i++;
      continue;
    }

    const hintMatch = l.match(/^\?> (.+)/);
    if (hintMatch) {
      hint = hintMatch[1].trim();
      i++;
      continue;
    }

    if (l.match(/^> /)) {
      const explLines: string[] = [];
      while (i < lines.length && lines[i].match(/^> /)) {
        explLines.push(lines[i].replace(/^> /, ""));
        i++;
      }
      explanation = explLines.join("\n").trim();
      continue;
    }

    if (l.trim() === "") {
      i++;
      continue;
    }

    break;
  }

  const questionText = bodyContent
    ? `${headingText}\n\n${bodyContent}`
    : headingText;

  const id = ids.nextQuestionId();

  let item: Question;
  switch (type) {
    case "single":
      if (correctIndices.length === 0) {
        throw new Error(`No correct answer marked for single-choice question: "${headingText}". Mark the correct option with a trailing *`);
      }
      item = {
        id,
        type: "single",
        question: questionText,
        options,
        correctAnswer: correctIndices[0],
        hint,
        explanation,
      } as SingleChoiceQuestion;
      break;
    case "multi":
      item = {
        id,
        type: "multi",
        question: questionText,
        options,
        correctAnswers: correctIndices,
        hint,
        explanation,
      } as MultiChoiceQuestion;
      break;
    case "truefalse":
      if (trueFalseAnswer === undefined) {
        throw new Error(`No correct answer marked for true/false question: "${headingText}". Mark the correct value with a trailing *`);
      }
      item = {
        id,
        type: "truefalse",
        question: questionText,
        correctAnswer: trueFalseAnswer,
        hint,
        explanation,
      } as TrueFalseQuestion;
      break;
    case "freetext":
      if (freetextAnswer === undefined) {
        throw new Error(`No answer provided for freetext question: "${headingText}". Provide an answer with = answer`);
      }
      item = {
        id,
        type: "freetext",
        question: questionText,
        answer: parseFreetextAnswer(freetextAnswer),
        hint,
        explanation,
      } as FreeTextQuestion;
      break;
    default:
      throw new Error(`Unknown question type: ${type}`);
  }

  validateAnswerIndex(item);
  return { item, nextIndex: i };
}
