import type { QuestionGroup, Question } from "./types";
import type { IdGenerator } from "./idGenerator";
import { parseItem } from "./parseMarkdownItem";

type ItemType = "single" | "multi" | "truefalse" | "freetext" | "info" | "group";

export function parseGroup(
  lines: string[],
  startIndex: number,
  headingText: string,
  ids: IdGenerator
): { item: QuestionGroup; nextIndex: number } {
  let i = startIndex;
  const groupId = ids.nextQuestionId();
  const groupNum = ids.currentQuestionNum;
  const parts: Question[] = [];
  let hint: string | undefined;
  let explanation: string | undefined;

  while (i < lines.length && lines[i].trim() === "") i++;

  let bodyContent = "";
  if (i < lines.length && lines[i].trim() === ":::") {
    i++;
    const bodyLines: string[] = [];
    let inCodeFence = false;
    while (i < lines.length) {
      const l = lines[i];
      if (l.trim().startsWith("```")) inCodeFence = !inCodeFence;
      if (!inCodeFence && l.trim() === ":::") { i++; break; }
      bodyLines.push(l);
      i++;
    }
    bodyContent = bodyLines.join("\n").trim();
  }

  while (i < lines.length) {
    const l = lines[i];

    if (l.match(/^#{1,2} /) && !l.match(/^###/)) break;

    const h3Match = l.match(/^### \[(\w+)\]\s*(.*)/);
    if (h3Match) {
      const type = h3Match[1] as ItemType;
      const subHeading = h3Match[2].trim();
      i++;
      const sub = parseItem(lines, i, type, subHeading, ids);
      i = sub.nextIndex;
      parts.push(sub.item as Question);
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

    if (l.trim() === "") { i++; continue; }

    break;
  }

  const questionText = bodyContent
    ? `${headingText}\n\n${bodyContent}`
    : headingText;

  ids.assignGroupPartIds(parts, groupNum);

  return {
    item: {
      id: groupId,
      type: "group",
      question: questionText,
      parts,
      hint,
      explanation,
    },
    nextIndex: i,
  };
}
