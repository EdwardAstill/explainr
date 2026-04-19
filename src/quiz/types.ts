export interface SingleChoiceQuestion {
  id: string;
  type: "single";
  question: string;
  options: string[];
  correctAnswer: number;
  hint?: string;
  explanation?: string;
}

export interface MultiChoiceQuestion {
  id: string;
  type: "multi";
  question: string;
  options: string[];
  correctAnswers: number[];
  hint?: string;
  explanation?: string;
}

export interface TrueFalseQuestion {
  id: string;
  type: "truefalse";
  question: string;
  correctAnswer: boolean;
  hint?: string;
  explanation?: string;
}

import type { FreeTextSpec } from "./parseFreetextAnswer";

export interface FreeTextQuestion {
  id: string;
  type: "freetext";
  question: string;
  answer: FreeTextSpec;
  caseSensitive?: boolean;
  placeholder?: string;
  hint?: string;
  explanation?: string;
}

export type Question =
  | SingleChoiceQuestion
  | MultiChoiceQuestion
  | TrueFalseQuestion
  | FreeTextQuestion;

export interface InfoPage {
  id: string;
  type: "info";
  content: string;
}

export type QuizItem = Question | QuestionGroup | InfoPage;

export interface QuestionGroup {
  id: string;
  type: "group";
  question: string;
  parts: Question[];
  hint?: string;
  explanation?: string;
}

export interface Section {
  type: "section";
  title: string;
  id?: string;
  items: QuizItem[];
}

export type TopLevelItem = QuizItem | Section;

export interface Quiz {
  title: string;
  description?: string;
  items: TopLevelItem[];
}
