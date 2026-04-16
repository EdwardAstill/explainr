import type { QuizItem } from "./types";

export function validateAnswerIndex(item: QuizItem) {
  if (item.type === "single") {
    if (typeof item.correctAnswer !== "number" || item.correctAnswer < 0 || item.correctAnswer >= item.options.length) {
      throw new Error(
        `Invalid answer index ${item.correctAnswer} for question "${item.question}" with ${item.options.length} options`
      );
    }
  }
  if (item.type === "multi") {
    if (!Array.isArray(item.correctAnswers)) {
      throw new Error(`Multi question "${item.question}" must have a correctAnswers array`);
    }
    for (const idx of item.correctAnswers) {
      if (typeof idx !== "number" || idx < 0 || idx >= item.options.length) {
        throw new Error(
          `Invalid answer index ${idx} for question "${item.question}" with ${item.options.length} options`
        );
      }
    }
  }
}
