import { join, normalize, resolve, extname, basename } from "path";
import { readdir, stat } from "fs/promises";
import { ensureMarkdownReady } from "./markdown";
import { getSiteIndex } from "./siteIndex";
import { tagsIndexBody, tagPageBody, statsBody } from "./synthetic-pages";
import { buildSearchIndex } from "./searchIndex";
import { buildNavTree, renderNav } from "./nav";
import { htmlPage } from "./template";
import { MIME, findAvailablePort, listEmbeddedFiles, pathExists } from "./utils";
import { loadConfig, saveConfig } from "./config";
import { dashboardHtml } from "./landing";
import { guideHtml } from "./guide";


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

function jsxPageHtml(source: string): string {
  const escaped = source.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  return `
<div id="jsx-page-mount" style="width:100%;min-height:200px;"></div>
<script>
(async () => {
  const CDN = {
    babel:    "https://cdn.jsdelivr.net/npm/@babel/standalone/babel.min.js",
    react:    "https://cdn.jsdelivr.net/npm/react@18/umd/react.development.js",
    reactdom: "https://cdn.jsdelivr.net/npm/react-dom@18/umd/react-dom.development.js",
  };
  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  const mount = document.getElementById("jsx-page-mount");
  try {
    await loadScript(CDN.babel);
    await loadScript(CDN.react);
    await loadScript(CDN.reactdom);
    const { React, ReactDOM, Babel } = globalThis;
    const jsxSource = \`${escaped}\`;
    const jsCode = Babel.transform(jsxSource, { presets: ["react"] }).code;
    const root = ReactDOM.createRoot(mount);
    const fn = new Function("React", "ReactDOM", "render", jsCode);
    fn(React, ReactDOM, (el) => root.render(el));
  } catch (err) {
    mount.textContent = err.message;
  }
})();
</script>`;
}

function injectReload(html: string): string {
  if (!html.includes("</body>")) return html + RELOAD_SCRIPT;
  return html.replace("</body>", RELOAD_SCRIPT + "</body>");
}

async function renderSynthetic(
  pathname: string,
  dir: string,
  tree: any,
  config: any,
  embeddedFiles: any[],
  wrap: (html: string) => string,
): Promise<Response | null> {
  if (pathname !== "/tags" && !pathname.startsWith("/tags/") && pathname !== "/__stats") return null;

  const idx = await getSiteIndex(dir);
  let body: { title: string; html: string } | null = null;

  if (pathname === "/tags") {
    body = tagsIndexBody(idx);
  } else if (pathname === "/__stats") {
    body = statsBody(idx);
  } else {
    const tag = decodeURIComponent(pathname.slice("/tags/".length));
    body = tagPageBody(idx, tag);
  }

  if (!body) return null;

  const nav = renderNav(tree, pathname);
  const raw = htmlPage(nav, body.html, body.title, undefined, config, embeddedFiles, [], {});
  return new Response(wrap(raw), { headers: { "Content-Type": "text/html; charset=utf-8" } });
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
  await ensureMarkdownReady();

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
          if (!(await pathExists(abs))) {
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
        // Origin check — block cross-site requests (e.g. malicious page hitting localhost).
        const origin = req.headers.get("origin");
        const expectedOrigin = `http://${host}:${port}`;
        if (origin && origin !== expectedOrigin) {
          return Response.json({ error: "Forbidden origin" }, { status: 403 });
        }
        const { path: p } = await req.json() as { path: string };
        const abs = normalize(resolve(p));
        // Allowlist: must be already in saved or recent. Adding new folders requires
        // /api/saved POST first — keeps the dashboard from being repointed at any
        // user-readable directory by another local process.
        const cfg = await loadConfig();
        const allowed = new Set<string>([
          ...cfg.saved.map(e => normalize(e.path)),
          ...cfg.recent.map((p2: string) => normalize(p2)),
        ]);
        if (!allowed.has(abs)) {
          return Response.json({ error: `Path not in saved or recent list: ${abs}` }, { status: 403 });
        }
        if (!(await pathExists(abs))) {
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

      // Site search index
      if (pathname === "/_readrun/search-index.json") {
        const idx = await getSiteIndex(dir);
        return Response.json(buildSearchIndex(idx));
      }

      // Runtime file route for Pyodide preload
      if (pathname.startsWith("/_readrun/files/")) {
        const fileName = decodeURIComponent(pathname.slice("/_readrun/files/".length));
        const filesDir = join(normalizedContent, ".readrun", "files");
        const filePath = normalize(resolve(filesDir, fileName));
        if (filePath !== filesDir && !filePath.startsWith(filesDir + "/")) {
          return new Response("Forbidden", { status: 403 });
        }
        const file = Bun.file(filePath);
        if (!(await file.exists())) return new Response("Not found", { status: 404 });
        const ext = extname(filePath).toLowerCase();
        return new Response(file, { headers: { "Content-Type": MIME[ext] ?? "application/octet-stream" } });
      }

      // Render markdown pages
      let pagePath = pathname === "/" ? null : pathname.replace(/\/$/, "");
      const tree = await buildNavTree(dir);
      const embeddedFiles = await listEmbeddedFiles(dir);

      // Synthetic pages: /tags, /tags/<tag>, /__stats
      const synthetic = await renderSynthetic(pathname, dir, tree, config, embeddedFiles, watch ? injectReload : (s) => s);
      if (synthetic) return synthetic;

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
        const source = await Bun.file(mdPath).text();
        const siteIdx = await getSiteIndex(dir);
        const pageUrl = "/" + pagePath.replace(/^\/+/, "");
        const { renderPage } = await import("./renderPage");
        const { html: raw } = await renderPage({
          contentDir: dir,
          pagePath: pageUrl,
          source,
          siteIndex: siteIdx,
          config,
          embeddedFiles,
          tree,
        });
        const html = watch ? injectReload(raw) : raw;
        return new Response(html, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      } catch {
        // Try .jsx page
        const jsxPath = join(dir, pagePath + ".jsx");
        try {
          const jsxSource = await Bun.file(jsxPath).text();
          const stem = pagePath.split("/").pop() ?? "page";
          const nav = renderNav(tree, pagePath);
          const content = jsxPageHtml(jsxSource);
          const raw = htmlPage(nav, content, stem, undefined, config, embeddedFiles, []);
          const html = watch ? injectReload(raw) : raw;
          return new Response(html, {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        } catch {
          return new Response("Not found", { status: 404 });
        }
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
