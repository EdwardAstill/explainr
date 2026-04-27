import { join, normalize, resolve, extname, sep } from "path";
import { statSync } from "fs";
import { MIME } from "./utils";

export interface StaticServerOptions {
  rootDir: string;
  port: number;
  host?: string;
}

export interface StaticServerHandle {
  port: number;
  host: string;
  stop: () => void;
}

export async function startStaticServer(opts: StaticServerOptions): Promise<StaticServerHandle> {
  const rootDir = normalize(resolve(opts.rootDir));
  try { statSync(rootDir); } catch {
    throw new Error(`Folder not found: ${rootDir}`);
  }
  const host = opts.host ?? "localhost";

  const server = Bun.serve({
    port: opts.port,
    hostname: host,
    async fetch(req) {
      const url = new URL(req.url);
      let pathname = decodeURIComponent(url.pathname);
      if (pathname.endsWith("/")) pathname += "index.html";

      const filePath = normalize(resolve(join(rootDir, pathname)));
      const rootBoundary = rootDir.endsWith(sep) ? rootDir : rootDir + sep;
      if (filePath !== rootDir && !filePath.startsWith(rootBoundary)) {
        return new Response("Forbidden", { status: 403 });
      }

      try {
        const file = Bun.file(filePath);
        if (await file.exists()) {
          const ext = extname(filePath).toLowerCase();
          return new Response(file, {
            headers: { "Content-Type": MIME[ext] ?? "application/octet-stream" },
          });
        }
        // Fallback to <path>/index.html for directory-style requests
        const indexPath = normalize(resolve(join(rootDir, pathname, "index.html")));
        if (indexPath === rootDir || indexPath.startsWith(rootBoundary)) {
          const indexFile = Bun.file(indexPath);
          if (await indexFile.exists()) {
            return new Response(indexFile, {
              headers: { "Content-Type": "text/html; charset=utf-8" },
            });
          }
        }
      } catch { /* fall through */ }

      return new Response("Not found", { status: 404 });
    },
  });

  console.log(`readrun preview at http://${host}:${opts.port}`);
  console.log(`Serving static files from: ${rootDir}`);
  return { port: opts.port, host, stop: () => server.stop() };
}
