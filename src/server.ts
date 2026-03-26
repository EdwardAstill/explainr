import { join, resolve, normalize } from "path";
import { readFile, stat, mkdir, readdir, writeFile } from "fs/promises";
import { renderMarkdown } from "./markdown";
import { buildNavTree, renderNav, type NavNode } from "./nav";
import { htmlPage } from "./template";
import { extractTitle } from "./utils";

async function resolveMarkdownPath(contentDir: string, urlPath: string): Promise<string | null> {
  const candidates = [
    join(contentDir, urlPath + ".md"),
    join(contentDir, urlPath, "index.md"),
    join(contentDir, urlPath, "README.md"),
  ];

  for (const candidate of candidates) {
    const resolved = normalize(resolve(candidate));
    if (!resolved.startsWith(contentDir + "/") && resolved !== contentDir) {
      return null;
    }
    if (await exists(resolved)) return resolved;
  }

  return null;
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export function findFirstFile(nodes: NavNode[]): string | null {
  for (const node of nodes) {
    if (!node.isDir) return node.path;
    if (node.children) {
      const found = findFirstFile(node.children);
      if (found) return found;
    }
  }
  return null;
}

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"]);

function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

export async function startServer(contentDir: string, port: number, liveMode = false) {
  const normalizedContentDir = normalize(resolve(contentDir));
  const filesDir = join(normalizedContentDir, ".explainr", "files");

  if (liveMode) {
    await mkdir(filesDir, { recursive: true });
    console.log(`Live mode enabled. Files directory: ${filesDir}`);
  }

  const server = Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);
      let pathname = decodeURIComponent(url.pathname);

      // API routes (live mode only)
      if (liveMode) {
        // POST /api/run — execute Python code
        if (pathname === "/api/run" && req.method === "POST") {
          try {
            const body = await req.json() as { code: string };
            const code = body.code;
            if (typeof code !== "string") {
              return new Response(JSON.stringify({ error: "Missing code" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
              });
            }

            // Snapshot files before execution
            const filesBefore = new Set(await readdir(filesDir).catch(() => [] as string[]));

            const proc = Bun.spawn(["python3", "-c", code], {
              cwd: filesDir,
              stdout: "pipe",
              stderr: "pipe",
            });

            const [stdout, stderr] = await Promise.all([
              new Response(proc.stdout).text(),
              new Response(proc.stderr).text(),
            ]);

            await proc.exited;

            // Check for new image files
            const filesAfter = await readdir(filesDir).catch(() => [] as string[]);
            const images: { name: string; mime: string; data: string }[] = [];
            for (const file of filesAfter) {
              if (filesBefore.has(file)) continue;
              const ext = file.substring(file.lastIndexOf(".")).toLowerCase();
              if (!IMAGE_EXTENSIONS.has(ext)) continue;
              const filePath = join(filesDir, file);
              const fileData = await readFile(filePath);
              images.push({
                name: file,
                mime: getMimeType(ext),
                data: Buffer.from(fileData).toString("base64"),
              });
            }

            return new Response(JSON.stringify({ stdout, stderr, images }), {
              headers: { "Content-Type": "application/json" },
            });
          } catch (err) {
            return new Response(JSON.stringify({ error: String(err) }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }
        }

        // POST /api/upload — upload a file
        if (pathname === "/api/upload" && req.method === "POST") {
          try {
            const formData = await req.formData();
            const file = formData.get("file");
            if (!file || !(file instanceof File)) {
              return new Response(JSON.stringify({ error: "No file provided" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
              });
            }

            const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const targetPath = normalize(resolve(filesDir, sanitizedName));
            if (!targetPath.startsWith(filesDir)) {
              return new Response(JSON.stringify({ error: "Invalid filename" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
              });
            }

            const arrayBuffer = await file.arrayBuffer();
            await writeFile(targetPath, Buffer.from(arrayBuffer));

            return new Response(JSON.stringify({ ok: true, name: sanitizedName }), {
              headers: { "Content-Type": "application/json" },
            });
          } catch (err) {
            return new Response(JSON.stringify({ error: String(err) }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }
        }

        // GET /api/files/* — serve files
        if (pathname.startsWith("/api/files/") && req.method === "GET") {
          const requestedFile = pathname.slice("/api/files/".length);
          const filePath = normalize(resolve(filesDir, requestedFile));
          if (!filePath.startsWith(filesDir)) {
            return new Response("Forbidden", { status: 403 });
          }

          try {
            const fileData = await readFile(filePath);
            const ext = filePath.substring(filePath.lastIndexOf(".")).toLowerCase();
            return new Response(fileData, {
              headers: { "Content-Type": getMimeType(ext) },
            });
          } catch {
            return new Response("Not found", { status: 404 });
          }
        }
      }

      if (pathname === "/") {
        const tree = await buildNavTree(normalizedContentDir);
        const first = findFirstFile(tree);
        if (first) {
          return Response.redirect(first, 302);
        }
      }

      const mdPath = await resolveMarkdownPath(normalizedContentDir, pathname);
      if (!mdPath) {
        return new Response("Not found", { status: 404 });
      }

      try {
        const source = await readFile(mdPath, "utf-8");
        const rendered = renderMarkdown(source);
        const tree = await buildNavTree(normalizedContentDir);
        const nav = renderNav(tree, pathname);
        const title = extractTitle(source, pathname.split("/").pop() || "explainr");

        const html = htmlPage(nav, rendered, title, undefined, liveMode);
        return new Response(html, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      } catch (err) {
        console.error(`Error rendering ${mdPath}:`, err);
        return new Response("Internal server error", { status: 500 });
      }
    },
  });

  console.log(`explainr running at http://localhost:${server.port}`);
  console.log(`Serving content from: ${normalizedContentDir}`);
}
