import type { SiteIndex } from "./siteIndex";

export interface SearchEntry {
  url: string;
  title: string;
  tags: string[];
  body: string; // plaintext, truncated
}

const MAX_BODY = 4000;

export function buildSearchIndex(idx: SiteIndex): SearchEntry[] {
  return idx.pages
    .filter((p) => p.ext === ".md")
    .map((p) => ({
      url: p.url,
      title: p.title,
      tags: p.tags,
      body: stripMarkdown(p.body).slice(0, MAX_BODY),
    }));
}

function stripMarkdown(s: string): string {
  return s
    .replace(/^```[\s\S]*?^```/gm, " ")
    .replace(/^~~~[\s\S]*?^~~~/gm, " ")
    .replace(/^\[([\w-]+)(?:[^\]\n]*)\]\n[\s\S]*?^\[\/\1\]/gm, " ")
    .replace(/`[^`]+`/g, " ")
    .replace(/\[\[([^\]\|#\n]+?)(\|[^\]\n]+)?(#[^\]\n]+)?\]\]/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/[#>*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
