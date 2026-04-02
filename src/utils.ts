import { resolve, normalize } from "path";
import type { NavNode } from "./nav";

export function extractTitle(source: string, fallback: string): string {
  const match = source.match(/^#\s+(.+)$/m);
  return match?.[1] ?? fallback;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function isPathWithin(child: string, parent: string): boolean {
  const resolved = normalize(resolve(parent, child));
  const normalizedParent = normalize(resolve(parent));
  return resolved.startsWith(normalizedParent + "/") || resolved === normalizedParent;
}

export function findFirstFile(nodes: NavNode[]): string | null {
  // Prefer welcome/index/README at the root level
  const preferred = nodes.find(n => !n.isDir && /^\/(welcome|index|readme)$/i.test(n.path));
  if (preferred) return preferred.path;

  for (const node of nodes) {
    if (!node.isDir) return node.path;
    if (node.children) {
      const found = findFirstFile(node.children);
      if (found) return found;
    }
  }
  return null;
}
