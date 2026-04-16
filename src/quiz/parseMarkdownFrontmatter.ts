interface ParsedFrontmatter {
  title: string;
  description?: string;
}

export function replaceLocalImages(content: string): string {
  return content.replace(/^:::[ ]*(\S+\.(png|jpe?g|gif|svg|webp))[ ]*$/gim, (_, filename) => `![${filename}](/api/quiz-images/${filename})`);
}

export function extractFrontmatter(content: string): {
  frontmatter: ParsedFrontmatter;
  body: string;
} {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) {
    throw new Error("Quiz must start with YAML frontmatter (---\\ntitle: ...\\n---)");
  }

  const fmBlock = fmMatch[1];
  const body = fmMatch[2];

  const frontmatter: ParsedFrontmatter = { title: "" };
  for (const line of fmBlock.split("\n")) {
    const titleMatch = line.match(/^title:\s*(.+)/);
    if (titleMatch) frontmatter.title = titleMatch[1].trim();
    const descMatch = line.match(/^description:\s*(.+)/);
    if (descMatch) frontmatter.description = descMatch[1].trim();
  }

  return { frontmatter, body };
}
