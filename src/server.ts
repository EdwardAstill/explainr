import { join, normalize, resolve, extname } from "path";
import { readFile, readdir, stat } from "fs/promises";
import { renderMarkdown, resolveFileReferences, extractToc } from "./markdown";
import { buildNavTree, renderNav } from "./nav";
import { htmlPage } from "./template";
import { extractTitle } from "./utils";
import { loadConfig, type ReadrunConfig } from "./config";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".py": "text/x-python",
  ".ts": "text/typescript",
  ".csv": "text/csv",
  ".toml": "text/plain",
  ".md": "text/markdown",
  ".txt": "text/plain",
};

async function isPortAvailable(port: number): Promise<boolean> {
  try {
    const { createServer } = await import("net");
    return new Promise((resolve) => {
      const server = createServer();
      server.once("error", () => resolve(false));
      server.listen(port, "localhost", () => {
        server.close(() => resolve(true));
      });
    });
  } catch {
    return false;
  }
}

async function findAvailablePort(start: number): Promise<number> {
  for (let port = start; port < start + 20; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port found in range ${start}–${start + 19}`);
}

export interface ServerOptions {
  contentDir: string;
  port: number;
}

export async function startServer(options: ServerOptions): Promise<number> {
  const port = await findAvailablePort(options.port);
  const { contentDir } = options;
  const normalizedContent = normalize(resolve(contentDir));
  const scriptsDir = join(contentDir, ".readrun", "scripts");
  const imagesDir = join(contentDir, ".readrun", "images");

  const config = await loadConfig();

  // Load embedded files from .readrun/files/
  async function loadEmbeddedFiles() {
    const filesDir = join(contentDir, ".readrun", "files");
    try {
      const entries = await readdir(filesDir);
      const files: { name: string; data: string }[] = [];
      for (const name of entries) {
        const content = await readFile(join(filesDir, name));
        files.push({ name, data: content.toString("base64") });
      }
      return files;
    } catch {
      return [];
    }
  }

  Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);
      const pathname = decodeURIComponent(url.pathname);

      // Resource browser API
      if (pathname.startsWith("/api/resources/") && req.method === "GET") {
        const parts = pathname.slice("/api/resources/".length).split("/");
        const tab = parts[0];
        const tabDirs: Record<string, string> = {
          images: join(normalizedContent, ".readrun", "images"),
          files: join(normalizedContent, ".readrun", "files"),
          scripts: join(normalizedContent, ".readrun", "scripts"),
        };
        const dir = tabDirs[tab];
        if (!dir) return Response.json({ error: "Invalid tab" }, { status: 400 });

        if (parts.length === 1) {
          try {
            const entries = await readdir(dir).catch(() => [] as string[]);
            const files: { name: string; size: number }[] = [];
            for (const name of entries) {
              const s = await stat(join(dir, name)).catch(() => null);
              if (s && s.isFile()) {
                files.push({ name, size: s.size });
              }
            }
            return Response.json({ files });
          } catch {
            return Response.json({ files: [] });
          }
        } else {
          const fileName = parts.slice(1).join("/");
          const filePath = normalize(resolve(dir, fileName));
          if (!filePath.startsWith(dir + "/") && filePath !== dir) {
            return new Response("Forbidden", { status: 403 });
          }
          try {
            const file = Bun.file(filePath);
            if (!(await file.exists())) return new Response("Not found", { status: 404 });
            const ext = extname(filePath).toLowerCase();
            return new Response(file, {
              headers: { "Content-Type": MIME[ext] || "application/octet-stream" },
            });
          } catch {
            return new Response("Not found", { status: 404 });
          }
        }
      }

      // Render markdown pages on the fly
      let pagePath = pathname === "/" ? null : pathname.replace(/\/$/, "");

      // Build nav tree fresh each request (fast enough for dev)
      const tree = await buildNavTree(contentDir);
      const embeddedFiles = await loadEmbeddedFiles();

      // Root redirect to first page
      if (!pagePath || pagePath === "/") {
        const { findFirstFile } = await import("./utils");
        const first = findFirstFile(tree);
        if (first) {
          return new Response(null, {
            status: 302,
            headers: { Location: first },
          });
        }
        return new Response("No pages found", { status: 404 });
      }

      // Try to render the markdown file
      const mdPath = join(contentDir, pagePath + ".md");
      try {
        const source = await readFile(mdPath, "utf-8");
        const resolved = await resolveFileReferences(source, scriptsDir, imagesDir);
        const rendered = renderMarkdown(resolved);
        const toc = extractToc(resolved);
        const nav = renderNav(tree, pagePath);
        const title = extractTitle(source, pagePath.split("/").pop() || "readrun");

        const html = htmlPage(nav, rendered, title, undefined, config, embeddedFiles, toc);

        return new Response(html, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      } catch {
        return new Response("Not found", { status: 404 });
      }
    },
  });

  console.log(`readrun running at http://localhost:${port}`);
  console.log(`Serving content from: ${contentDir}`);
  return port;
}
