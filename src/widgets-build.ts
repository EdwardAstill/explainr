import { resolve, join } from "path";
import { existsSync, readdirSync, readFileSync, mkdirSync, statSync, writeFileSync } from "fs";
import { bundleWidget, isGeneratedBanner } from "./figura/bundler";

/** Toolkit root used by the bundler's `@readrun/widgets/*` resolver. */
function toolkitRoot(): string {
  return resolve(import.meta.dirname, "figura");
}

/** Resolve the widgets/scripts paths for a given content directory. */
function paths(contentDir: string): { widgetsDir: string; scriptsDir: string } {
  return {
    widgetsDir: join(contentDir, ".readrun", "widgets"),
    scriptsDir: join(contentDir, ".readrun", "scripts"),
  };
}

/** List kebab widget names found in `<contentDir>/.readrun/widgets/`. */
export function listWidgets(contentDir: string): string[] {
  const { widgetsDir } = paths(contentDir);
  if (!existsSync(widgetsDir)) return [];
  return readdirSync(widgetsDir)
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => f.slice(0, -".tsx".length))
    .sort();
}

export interface BuildResult {
  built: string[];
  scriptsDir: string;
}

/**
 * Bundle every widget under `<contentDir>/.readrun/widgets/` and write
 * the resulting `.jsx` files to `<contentDir>/.readrun/scripts/`.
 *
 * Refuses to overwrite a hand-written `<name>.jsx` (one that does not
 * carry the `@readrun/widgets` banner). The toolkit's own outputs are
 * always overwritten freely.
 */
export async function buildWidgets(contentDir: string): Promise<BuildResult> {
  const { widgetsDir, scriptsDir } = paths(contentDir);
  const names = listWidgets(contentDir);
  if (names.length === 0) return { built: [], scriptsDir };

  if (!existsSync(scriptsDir)) mkdirSync(scriptsDir, { recursive: true });

  // Pre-flight conflict check — fail before producing any output.
  const conflicts: string[] = [];
  for (const name of names) {
    const out = join(scriptsDir, `${name}.jsx`);
    if (!existsSync(out)) continue;
    try {
      const existing = readFileSync(out, "utf8");
      if (!isGeneratedBanner(existing)) conflicts.push(out);
    } catch {
      // unreadable — treat as conflict to be safe
      conflicts.push(out);
    }
  }
  if (conflicts.length > 0) {
    const list = conflicts.map((p) => `  - ${p}`).join("\n");
    throw new Error(
      `rr: refusing to overwrite hand-written script(s):\n${list}\n` +
        `Rename either the script or the widget so they do not collide.`
    );
  }

  const built: string[] = [];
  const root = toolkitRoot();
  for (const name of names) {
    const jsx = await bundleWidget(name, { widgetsDir, toolkitRoot: root });
    writeFileSync(join(scriptsDir, `${name}.jsx`), jsx);
    built.push(name);
  }
  return { built, scriptsDir };
}

/**
 * Best-effort wrapper that logs and swallows errors so `rr serve` does
 * not crash a dev session when one widget is broken.
 */
export async function buildWidgetsLogging(contentDir: string): Promise<void> {
  try {
    const { built } = await buildWidgets(contentDir);
    if (built.length > 0) {
      console.log(`rr: bundled ${built.length} widget(s) → ${join(contentDir, ".readrun", "scripts")}/`);
    }
  } catch (err: any) {
    console.error(`rr: widget bundle failed — ${err?.message ?? String(err)}`);
  }
}

/** True if the path is inside `<contentDir>/.readrun/widgets/`. */
export function isWidgetSourcePath(contentDir: string, p: string): boolean {
  const { widgetsDir } = paths(contentDir);
  const abs = resolve(p);
  return abs.startsWith(widgetsDir + "/") && abs.endsWith(".tsx");
}

/** Stat helper for callers that want to know if a widgets dir exists at all. */
export function widgetsDirExists(contentDir: string): boolean {
  const { widgetsDir } = paths(contentDir);
  return existsSync(widgetsDir) && statSync(widgetsDir).isDirectory();
}
