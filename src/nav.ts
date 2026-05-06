import { basename } from "path";
import { escapeHtml } from "./utils";
import { getSiteIndex } from "./siteIndex";

export interface NavNode {
  name: string;
  path: string; // URL path (for files) or synthetic virtual path (for dirs)
  isDir: boolean;
  children?: NavNode[];
}

interface FileMeta {
  urlPath: string;
  segments: string[];
  displayName: string;
}

async function collectFiles(contentDir: string): Promise<FileMeta[]> {
  const idx = await getSiteIndex(contentDir);
  const out: FileMeta[] = [];

  for (const page of idx.pages) {
    const stem = page.relPath.replace(new RegExp(`\\${page.ext}$`), "");
    const urlPath = page.url;

    if (page.ext === ".jsx") {
      const segments = stem.split("/");
      const leaf = segments[segments.length - 1] ?? basename(page.filePath, ".jsx");
      out.push({ urlPath, segments, displayName: leaf });
      continue;
    }

    const virtualPath = page.virtualPath;
    const segments = virtualPath && virtualPath.length > 0
      ? virtualPath.split("/").filter(Boolean)
      : stem.split("/");
    const leaf = segments[segments.length - 1] ?? basename(page.filePath, ".md");
    const displayName = page.title.length > 0 ? page.title : leaf;
    out.push({ urlPath, segments, displayName });
  }

  return out;
}

function insert(tree: NavNode[], dirsByPath: Map<string, NavNode>, file: FileMeta): void {
  if (file.segments.length === 0) return;
  const leaf = file.segments[file.segments.length - 1]!;
  const dirSegments = file.segments.slice(0, -1);

  let parentChildren = tree;
  let pathAcc = "";
  for (const seg of dirSegments) {
    pathAcc = pathAcc ? `${pathAcc}/${seg}` : seg;
    const existing = dirsByPath.get(pathAcc);
    if (existing) {
      parentChildren = existing.children!;
      continue;
    }
    const node: NavNode = {
      name: seg,
      path: "/" + pathAcc,
      isDir: true,
      children: [],
    };
    parentChildren.push(node);
    dirsByPath.set(pathAcc, node);
    parentChildren = node.children!;
  }

  parentChildren.push({
    name: file.displayName === leaf ? leaf : file.displayName,
    path: file.urlPath,
    isDir: false,
  });
}

function sortTree(nodes: NavNode[]): void {
  nodes.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  for (const n of nodes) {
    if (n.isDir && n.children) sortTree(n.children);
  }
}

export async function buildNavTree(contentDir: string): Promise<NavNode[]> {
  const files = await collectFiles(contentDir);

  const tree: NavNode[] = [];
  const dirsByPath = new Map<string, NavNode>();
  for (const file of files) insert(tree, dirsByPath, file);
  sortTree(tree);
  return tree;
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
