import { readdir, readFile } from "fs/promises";
import { join, relative, basename, extname } from "path";
import { escapeHtml } from "./utils";

export interface NavNode {
  name: string;
  path: string; // URL path (for files) or synthetic virtual path (for dirs)
  isDir: boolean;
  children?: NavNode[];
}

interface FileMeta {
  urlPath: string;           // /notes/math/contour-integration
  segments: string[];        // virtual tree position, last segment is the leaf
  displayName: string;       // leaf label
}

async function loadIgnorePatterns(contentDir: string): Promise<Bun.Glob[]> {
  const ignorePath = join(contentDir, ".readrun", ".ignore");
  try {
    const content = await readFile(ignorePath, "utf-8");
    return content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((pattern) => new Bun.Glob(pattern));
  } catch {
    return [];
  }
}

function isIgnored(relPath: string, globs: Bun.Glob[]): boolean {
  for (const glob of globs) {
    if (glob.match(relPath)) return true;
  }
  return false;
}

const IGNORE_DIRS = new Set(["node_modules", "dist", "out", ".git", "__pycache__", ".venv", "venv"]);

const FM_RE = /^---\n([\s\S]*?)\n---/;
const VPATH_LINE_RE = /^virtual_path:\s*["']?([^"'\n]+?)["']?\s*$/m;
const TITLE_LINE_RE = /^title:\s*["']?([^"'\n]+?)["']?\s*$/m;

function parseFrontmatterFields(head: string): { virtualPath?: string; title?: string } {
  const fm = head.match(FM_RE);
  const block = fm?.[1];
  if (!block) return {};
  const vp = block.match(VPATH_LINE_RE)?.[1];
  const ti = block.match(TITLE_LINE_RE)?.[1];
  return {
    virtualPath: vp ? vp.trim() : undefined,
    title: ti ? ti.trim() : undefined,
  };
}

async function readHead(filePath: string, bytes = 2048): Promise<string> {
  const f = Bun.file(filePath);
  const blob = f.slice(0, bytes);
  return await blob.text();
}

async function collectFiles(contentDir: string, ignoreGlobs: Bun.Glob[]): Promise<FileMeta[]> {
  const out: FileMeta[] = [];

  async function walk(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.name.startsWith(".")) continue;
      if (e.isDirectory() && IGNORE_DIRS.has(e.name)) continue;
      const full = join(dir, e.name);
      const relPath = relative(contentDir, full);
      if (isIgnored(relPath, ignoreGlobs)) continue;
      if (e.isDirectory()) {
        await walk(full);
        continue;
      }
      if (extname(e.name) !== ".md") continue;

      const head = await readHead(full);
      const { virtualPath, title } = parseFrontmatterFields(head);

      const urlPath = "/" + relPath.replace(/\\/g, "/").replace(/\.md$/, "");
      const fileStemPath = relPath.replace(/\\/g, "/").replace(/\.md$/, "");
      const segments = (virtualPath && virtualPath.length > 0)
        ? virtualPath.split("/").filter(Boolean)
        : fileStemPath.split("/");

      const leaf = segments[segments.length - 1] ?? basename(e.name, ".md");
      const displayName = title && title.length > 0 ? title : leaf;

      out.push({ urlPath, segments, displayName });
    }
  }

  await walk(contentDir);
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
  const ignoreGlobs = await loadIgnorePatterns(contentDir);
  const files = await collectFiles(contentDir, ignoreGlobs);

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
