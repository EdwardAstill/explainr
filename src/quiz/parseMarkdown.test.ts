import { describe, it, expect } from "bun:test";
import { parseQuizMarkdown } from "./parseMarkdown";
import type { InfoPage, SingleChoiceQuestion } from "./types";

describe("parseQuizMarkdown — local image syntax", () => {
  it("replaces :::filename.png with a markdown image inside a body block", () => {
    const input = `---
title: Test
---

## [info] Look at this
:::
:::diagram.png
:::
`;
    const quiz = parseQuizMarkdown(input);
    const info = quiz.items[0] as InfoPage;
    expect(info.content).toBe("![diagram.png](/api/quiz-images/diagram.png)");
  });

  it("replaces :::filename inside a question body block", () => {
    const input = `---
title: Test
---

## [single] What does this show?
:::
:::circuit.png
:::
- Option A *
- Option B
`;
    const quiz = parseQuizMarkdown(input);
    const q = quiz.items[0] as SingleChoiceQuestion;
    expect(q.question).toContain("![circuit.png](/api/quiz-images/circuit.png)");
  });

  it("does not replace ::: group body delimiters (empty :::)", () => {
    const input = `---
title: Test
---

## [single] Plain question with body block
:::
Some body text only
:::
- Yes *
- No
`;
    const quiz = parseQuizMarkdown(input);
    expect(quiz.items).toHaveLength(1);
    const q = quiz.items[0] as SingleChoiceQuestion;
    expect(q.question).toContain("Some body text only");
  });

  it("does not affect web image URLs", () => {
    const input = `---
title: Test
---

## [info] Web image
:::
![alt text](https://example.com/photo.png)
:::
`;
    const quiz = parseQuizMarkdown(input);
    const info = quiz.items[0] as InfoPage;
    expect(info.content).toContain("https://example.com/photo.png");
    expect(info.content).not.toContain("/api/quiz-images/");
  });

  it("trims trailing whitespace from the filename", () => {
    const input = `---
title: Test
---

## [info] Trailing space
:::
:::diagram.png
:::
`;
    const quiz = parseQuizMarkdown(input);
    const info = quiz.items[0] as InfoPage;
    expect(info.content).toBe("![diagram.png](/api/quiz-images/diagram.png)");
  });
});
