import { watch } from "fs";
import { join, extname } from "path";
import { startServer, type ServerHandle } from "./server";
import { invalidateSiteIndex } from "./siteIndex";

export interface WatchOptions {
  contentDir: string;
  port: number;
  host?: string;
  debounceMs?: number;
}

export async function startWatchServer(opts: WatchOptions): Promise<ServerHandle & { stopWatch: () => void }> {
  const handle = await startServer({
    contentDir: opts.contentDir,
    port: opts.port,
    host: opts.host,
    watch: true,
  });

  const debounceMs = opts.debounceMs ?? 120;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let needsLinkInvalidation = false;
  const fire = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (needsLinkInvalidation) {
        invalidateSiteIndex(opts.contentDir);
        needsLinkInvalidation = false;
      }
      handle.reload();
    }, debounceMs);
  };

  const watchers: { close: () => void }[] = [];
  const toWatch = [
    opts.contentDir,
    join(opts.contentDir, ".readrun", "scripts"),
    join(opts.contentDir, ".readrun", "images"),
    join(opts.contentDir, ".readrun", "files"),
  ];

  for (const dir of toWatch) {
    try {
      const w = watch(dir, { recursive: true }, (_event, filename) => {
        if (!filename) return;
        // Ignore transient editor files
        if (filename.endsWith("~") || filename.startsWith(".#") || filename.endsWith(".swp")) return;
        const ext = extname(filename).toLowerCase();
        if (ext === ".md" || ext === ".jsx") needsLinkInvalidation = true;
        fire();
      });
      watchers.push(w);
    } catch {
      // Directory may not exist yet (e.g. no .readrun/); skip silently
    }
  }

  console.log(`Watching ${opts.contentDir} — edits trigger a page reload.`);

  return {
    ...handle,
    stopWatch: () => {
      for (const w of watchers) try { w.close(); } catch {}
      if (timer) clearTimeout(timer);
    },
  };
}
