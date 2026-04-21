import { join, normalize, resolve, extname, basename } from "path";
import { readFile, readdir, stat, access } from "fs/promises";
import { renderMarkdown, resolveFileReferences, extractToc } from "./markdown";
import { getWikilinkIndex, rewriteWikilinks } from "./wikilinks";
import { buildNavTree, renderNav } from "./nav";
import { htmlPage } from "./template";
import { extractTitle } from "./utils";
import { loadConfig, saveConfig } from "./config";
import { dashboardHtml } from "./landing";
import { guideHtml } from "./guide";

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
  contentDir?: string;
  port: number;
  host?: string;
  watch?: boolean;
}

export interface ServerHandle {
  port: number;
  host: string;
  stop: () => void;
  reload: () => void;
}

const RELOAD_SCRIPT = `<script>
(function(){
  try {
    var es = new EventSource("/__reload");
    es.addEventListener("reload", function(){ location.reload(); });
    es.onerror = function(){ /* server likely stopped; let next keepalive reconnect */ };
  } catch (e) {}
})();
</script>`;

function injectReload(html: string): string {
  if (!html.includes("</body>")) return html + RELOAD_SCRIPT;
  return html.replace("</body>", RELOAD_SCRIPT + "</body>");
}

export async function startServer(options: ServerOptions): Promise<ServerHandle> {
  const port = await findAvailablePort(options.port);
  const host = options.host ?? "localhost";
  const watch = options.watch === true;
  let contentDir = options.contentDir ? normalize(resolve(options.contentDir)) : undefined;

  const reloadClients = new Set<ReadableStreamDefaultController<Uint8Array>>();
  const encoder = new TextEncoder();
  function broadcastReload() {
    for (const ctl of reloadClients) {
      try { ctl.enqueue(encoder.encode("event: reload\ndata: 1\n\n")); } catch {}
    }
  }
  const isDashboard = () => contentDir === undefined;

  const config = await loadConfig();

  async function loadEmbeddedFiles(dir: string) {
    const filesDir = join(dir, ".readrun", "files");
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

  const server = Bun.serve({
    port,
    hostname: host,
    async fetch(req) {
      const url = new URL(req.url);
      const pathname = decodeURIComponent(url.pathname);

      // --- Live-reload SSE (watch mode only) ---
      if (watch && pathname === "/__reload") {
        const stream = new ReadableStream<Uint8Array>({
          start(ctl) {
            reloadClients.add(ctl);
            ctl.enqueue(encoder.encode("retry: 1000\n\n"));
            req.signal.addEventListener("abort", () => {
              reloadClients.delete(ctl);
              try { ctl.close(); } catch {}
            });
          },
        });
        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
          },
        });
      }

      // --- Guide route (works in both modes) ---
      if (pathname === "/guide") {
        const html = watch ? injectReload(guideHtml()) : guideHtml();
        return new Response(html, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      // --- Dashboard API routes (dashboard mode only) ---
      if (isDashboard() && pathname === "/api/saved" && req.method === "GET") {
        const cfg = await loadConfig();
        return Response.json({ saved: cfg.saved.map(e => e.path), recent: cfg.recent });
      }

      if (isDashboard() && pathname === "/api/saved" && req.method === "POST") {
        const { action, path: p } = await req.json() as { action: string; path: string };
        const abs = resolve(p);
        const cfg = await loadConfig();
        if (action === "add") {
          try { await access(abs); } catch {
            return Response.json({ error: `Path not found: ${abs}` }, { status: 400 });
          }
          if (!cfg.saved.find(e => e.path === abs)) {
            cfg.saved.push({ name: basename(abs), path: abs });
            await saveConfig(cfg);
          }
          return Response.json({ ok: true });
        }
        if (action === "remove") {
          cfg.saved = cfg.saved.filter(e => e.path !== abs);
          await saveConfig(cfg);
          return Response.json({ ok: true });
        }
        return Response.json({ error: "Unknown action" }, { status: 400 });
      }

      if (isDashboard() && pathname === "/api/open" && req.method === "POST") {
        const { path: p } = await req.json() as { path: string };
        const abs = normalize(resolve(p));
        try { await access(abs); } catch {
          return Response.json({ error: `Path not found: ${abs}` }, { status: 400 });
        }
        contentDir = abs;
        return Response.json({ url: "/" });
      }

      // --- Dashboard landing (dashboard mode only) ---
      if (isDashboard()) {
        if (pathname === "/" || pathname === "") {
          const html = watch ? injectReload(dashboardHtml()) : dashboardHtml();
          return new Response(html, {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        }
        return new Response("Not found", { status: 404 });
      }

      // --- Content mode (existing logic) ---
      const dir = contentDir!;
      const normalizedContent = normalize(resolve(dir));
      const scriptsDir = join(dir, ".readrun", "scripts");
      const imagesDir = join(dir, ".readrun", "images");

      // Resource browser API
      if (pathname.startsWith("/api/resources/") && req.method === "GET") {
        const parts = pathname.slice("/api/resources/".length).split("/");
        const tab = parts[0] ?? "";
        const tabDirs: Record<string, string> = {
          images: join(normalizedContent, ".readrun", "images"),
          files: join(normalizedContent, ".readrun", "files"),
          scripts: join(normalizedContent, ".readrun", "scripts"),
        };
        const tabDir = tabDirs[tab];
        if (!tabDir) return Response.json({ error: "Invalid tab" }, { status: 400 });

        if (parts.length === 1) {
          try {
            const entries = await readdir(tabDir).catch(() => [] as string[]);
            const files: { name: string; size: number }[] = [];
            for (const name of entries) {
              const s = await stat(join(tabDir, name)).catch(() => null);
              if (s && s.isFile()) files.push({ name, size: s.size });
            }
            return Response.json({ files });
          } catch {
            return Response.json({ files: [] });
          }
        } else {
          const fileName = parts.slice(1).join("/");
          const filePath = normalize(resolve(tabDir, fileName));
          if (!filePath.startsWith(tabDir + "/") && filePath !== tabDir) {
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

      // Render markdown pages
      let pagePath = pathname === "/" ? null : pathname.replace(/\/$/, "");
      const tree = await buildNavTree(dir);
      const embeddedFiles = await loadEmbeddedFiles(dir);

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

      const mdPath = join(dir, pagePath + ".md");
      try {
        const source = await readFile(mdPath, "utf-8");
        const resolved = await resolveFileReferences(source, scriptsDir, imagesDir);
        const wikiIndex = await getWikilinkIndex(dir);
        const linked = rewriteWikilinks(resolved, wikiIndex);
        const rendered = renderMarkdown(linked);
        const toc = extractToc(linked);
        const nav = renderNav(tree, pagePath);
        const title = extractTitle(source, pagePath.split("/").pop() || "readrun");
        const raw = htmlPage(nav, rendered, title, undefined, config, embeddedFiles, toc);
        const html = watch ? injectReload(raw) : raw;
        return new Response(html, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      } catch {
        return new Response("Not found", { status: 404 });
      }
    },
  });

  console.log(`readrun running at http://${host}:${port}`);
  if (contentDir) console.log(`Serving content from: ${contentDir}`);
  return {
    port,
    host,
    stop: () => server.stop(),
    reload: broadcastReload,
  };
}
