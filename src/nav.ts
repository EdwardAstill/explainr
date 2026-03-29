import { readdir, stat } from "fs/promises";
import { join, relative, basename, extname } from "path";
import { escapeHtml } from "./utils";

export interface NavNode {
  name: string;
  path: string; // URL path
  isDir: boolean;
  children?: NavNode[];
}

export async function buildNavTree(contentDir: string): Promise<NavNode[]> {
  return buildTree(contentDir, contentDir);
}

async function buildTree(dir: string, root: string): Promise<NavNode[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nodes: NavNode[] = [];

  // Sort: directories first, then files, alphabetical within each group
  const sorted = entries
    .filter((e) => !e.name.startsWith("."))
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

  for (const entry of sorted) {
    const fullPath = join(dir, entry.name);
    const relPath = "/" + relative(root, fullPath);

    if (entry.isDirectory()) {
      const children = await buildTree(fullPath, root);
      if (children.length > 0) {
        nodes.push({
          name: entry.name,
          path: relPath,
          isDir: true,
          children,
        });
      }
    } else if (extname(entry.name) === ".md") {
      nodes.push({
        name: basename(entry.name, ".md"),
        path: relPath.replace(/\.md$/, ""),
        isDir: false,
      });
    }
  }

  return nodes;
}

export function renderNav(tree: NavNode[], currentPath: string): string {
  return `<nav class="sidebar-nav nav-tree">${renderNodes(tree, currentPath)}</nav>`;
}

function renderNodes(nodes: NavNode[], currentPath: string): string {
  let html = "<ul>";
  for (const node of nodes) {
    if (node.isDir) {
      html += `<li class="nav-dir">
        <details open data-nav-path="${escapeHtml(node.path)}">
          <summary>${escapeHtml(node.name)}/</summary>
          ${node.children ? renderNodes(node.children, currentPath) : ""}
        </details>
      </li>`;
    } else {
      const isActive = currentPath === node.path;
      html += `<li class="nav-file${isActive ? " active" : ""}">
        <a href="${node.path}">${escapeHtml(node.name)}</a>
      </li>`;
    }
  }
  html += "</ul>";
  return html;
}
