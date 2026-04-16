import { renderMarkdownText, renderMarkdownInline } from "../markdown";
import type { Quiz, TopLevelItem, QuizItem, Question } from "./types";

function renderQuestion(q: Question): Record<string, unknown> {
  const base: Record<string, unknown> = {
    type: q.type,
    id: q.id,
    questionHtml: renderMarkdownText(q.question),
    hintHtml: q.hint ? renderMarkdownText(q.hint) : undefined,
    explanationHtml: q.explanation ? renderMarkdownText(q.explanation) : undefined,
  };

  switch (q.type) {
    case "single":
      return { ...base, options: q.options, optionsHtml: q.options.map(o => renderMarkdownInline(o)), correctAnswer: q.correctAnswer };
    case "multi":
      return { ...base, options: q.options, optionsHtml: q.options.map(o => renderMarkdownInline(o)), correctAnswers: q.correctAnswers };
    case "truefalse":
      return { ...base, correctAnswer: q.correctAnswer };
    case "freetext":
      return { ...base, correctAnswer: q.correctAnswer, caseSensitive: q.caseSensitive, placeholder: q.placeholder };
  }
}

function renderItem(item: QuizItem): Record<string, unknown> {
  if (item.type === "info") {
    return {
      type: "info",
      id: item.id,
      contentHtml: renderMarkdownText(item.content),
    };
  }
  if (item.type === "group") {
    return {
      type: "group",
      id: item.id,
      questionHtml: renderMarkdownText(item.question),
      hintHtml: item.hint ? renderMarkdownText(item.hint) : undefined,
      explanationHtml: item.explanation ? renderMarkdownText(item.explanation) : undefined,
      parts: item.parts.map(p => renderQuestion(p)),
    };
  }
  return renderQuestion(item);
}

function renderTopLevelItem(item: TopLevelItem): Record<string, unknown> {
  if (item.type === "section") {
    return {
      type: "section",
      title: item.title,
      items: item.items.map(i => renderItem(i)),
    };
  }
  return renderItem(item);
}

export function renderQuizForClient(quiz: Quiz): Record<string, unknown> {
  return {
    title: quiz.title,
    descriptionHtml: quiz.description ? renderMarkdownText(quiz.description) : undefined,
    items: quiz.items.map(item => renderTopLevelItem(item)),
  };
}
