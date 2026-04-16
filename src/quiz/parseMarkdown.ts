import type { Quiz, TopLevelItem, QuizItem, Section } from "./types";
import { IdGenerator } from "./idGenerator";
import { replaceLocalImages, extractFrontmatter } from "./parseMarkdownFrontmatter";
import { parseItem } from "./parseMarkdownItem";
import { parseGroup } from "./parseMarkdownGroup";

type ItemType = "single" | "multi" | "truefalse" | "freetext" | "info" | "group";

export function parseQuizMarkdown(content: string): Quiz {
  const processed = replaceLocalImages(content);
  const { frontmatter, body } = extractFrontmatter(processed);
  if (!frontmatter.title) {
    throw new Error("Quiz must have a title in frontmatter");
  }

  const lines = body.split("\n");
  const topLevelItems: TopLevelItem[] = [];
  let currentSection: Section | null = null;
  let i = 0;

  const ids = new IdGenerator();

  function addItem(item: QuizItem) {
    if (currentSection) {
      currentSection.items.push(item);
    } else {
      topLevelItems.push(item);
    }
  }

  while (i < lines.length) {
    const line = lines[i];

    if (line.match(/^# /) && !line.match(/^##/)) {
      const title = line.replace(/^# /, "").trim();
      if (currentSection) {
        topLevelItems.push(currentSection);
      }
      currentSection = {
        type: "section",
        title,
        id: ids.nextSectionId(),
        items: [],
      };
      i++;
      continue;
    }

    const h2Match = line.match(/^## \[(\w+)\]\s*(.*)/);
    if (h2Match) {
      const type = h2Match[1] as ItemType;
      const headingText = h2Match[2].trim();
      i++;

      if (type === "group") {
        const group = parseGroup(lines, i, headingText, ids);
        i = group.nextIndex;
        addItem(group.item);
      } else {
        const item = parseItem(lines, i, type, headingText, ids);
        i = item.nextIndex;
        addItem(item.item);
      }
      continue;
    }

    i++;
  }

  if (currentSection) {
    topLevelItems.push(currentSection);
  }

  return {
    title: frontmatter.title,
    description: frontmatter.description,
    items: topLevelItems,
  };
}
