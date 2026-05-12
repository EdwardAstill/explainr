/**
 * @readrun/widgets bundler — core logic
 *
 * All functions are pure/exported so they can be unit-tested in isolation.
 * The bundler turns a `<name>.tsx` source file into a self-contained `.jsx`
 * payload the readrun JSX runtime can mount: no imports, no exports, ending
 * with `render(<PascalName/>);`.
 */

import * as esbuild from "esbuild";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Convert kebab-case to PascalCase.
 * e.g. "distribution-explorer" → "DistributionExplorer"
 */
export function kebabToPascal(name: string): string {
  return name
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join("");
}

/**
 * Remove all top-level export statements from source.
 */
export function stripExports(source: string): string {
  const collapsed = source.replace(/^export\s*\{[^}]*\}/gms, (match) =>
    match.replace(/\n/g, " ")
  );

  return collapsed
    .split("\n")
    .filter((line) => !/^export[\s{]/.test(line))
    .join("\n");
}

export function extractDefaultExportName(source: string): string | null {
  const inlineMatch = source.match(/export\s+default\s+function\s+([A-Z][A-Za-z0-9_]*)/);
  if (inlineMatch?.[1]) return inlineMatch[1];

  const refMatch = source.match(/export\s+default\s+([A-Z][A-Za-z0-9_]*)\s*;/);
  if (refMatch?.[1]) return refMatch[1];

  return null;
}

export function extractWidgetExportName(source: string): string | null {
  const defaultName = extractDefaultExportName(source);
  if (defaultName) return defaultName;

  const namedMatch = source.match(/^export\s+function\s+([A-Z][A-Za-z0-9_]*)\s*\(/m);
  if (namedMatch?.[1]) return namedMatch[1];

  return null;
}

// ─── esbuild plugins ─────────────────────────────────────────────────────────

/**
 * Redirect `react`, `react-dom`, and `react/jsx-runtime` to the
 * `globalThis.React` / `globalThis.ReactDOM` UMD globals the readrun runtime
 * exposes. Without this, every widget would re-bundle react inline.
 */
export const reactGlobalsPlugin: esbuild.Plugin = {
  name: "react-globals",
  setup(build) {
    build.onResolve({ filter: /^react$/ }, () => ({
      path: "react",
      namespace: "globals",
    }));
    build.onResolve({ filter: /^react-dom$/ }, () => ({
      path: "react-dom",
      namespace: "globals",
    }));
    build.onResolve({ filter: /^react\/jsx-runtime$/ }, () => ({
      path: "react/jsx-runtime",
      namespace: "globals",
    }));
    build.onLoad({ filter: /.*/, namespace: "globals" }, (args) => ({
      contents:
        args.path === "react"
          ? "module.exports = globalThis.React;"
          : args.path === "react-dom"
          ? "module.exports = globalThis.ReactDOM;"
          : "module.exports = globalThis.React;",
      loader: "js",
    }));
  },
};

/**
 * Resolve `@readrun/widgets` and its subpath specifiers to absolute paths
 * inside the toolkit (this `figura/` directory). Widget authors write:
 *
 *   import { Slider } from "@readrun/widgets/primitives";
 *
 * and the bundler points that at `readrun/src/figura/primitives/index.tsx`.
 */
export function readrunWidgetsPlugin(toolkitRoot: string): esbuild.Plugin {
  const SUBPACKAGES = ["primitives", "plot", "diagram", "interaction", "draw", "math"];
  return {
    name: "readrun-widgets",
    setup(build) {
      build.onResolve({ filter: /^@readrun\/widgets(\/.*)?$/ }, (args) => {
        const spec = args.path;
        if (spec === "@readrun/widgets") {
          return { path: path.join(toolkitRoot, "index.ts") };
        }
        const rest = spec.slice("@readrun/widgets/".length);
        const [head, ...tail] = rest.split("/");
        if (!head || !SUBPACKAGES.includes(head)) {
          return {
            errors: [
              {
                text: `Unknown @readrun/widgets subpath: "${spec}". Valid roots: ${SUBPACKAGES.map((s) => `@readrun/widgets/${s}`).join(", ")}`,
              },
            ],
          };
        }
        if (tail.length === 0) {
          const dir = path.join(toolkitRoot, head);
          const candidates = [path.join(dir, "index.tsx"), path.join(dir, "index.ts")];
          for (const c of candidates) {
            if (fs.existsSync(c)) return { path: c };
          }
          return { errors: [{ text: `No index file under ${dir} for "${spec}".` }] };
        }
        const base = path.join(toolkitRoot, head, ...tail);
        const candidates = [
          base,
          base + ".tsx",
          base + ".ts",
          path.join(base, "index.tsx"),
          path.join(base, "index.ts"),
        ];
        for (const c of candidates) {
          if (fs.existsSync(c) && fs.statSync(c).isFile()) return { path: c };
        }
        return { errors: [{ text: `Cannot resolve "${spec}" — tried ${candidates.join(", ")}` }] };
      });
    },
  };
}

// ─── banner ──────────────────────────────────────────────────────────────────

/**
 * Build the two-line banner comment.
 * Reads the toolkit git SHA at call time (not at import time).
 */
export function buildBanner(widgetName: string, toolkitRoot: string): string {
  let sha = "unknown";
  try {
    sha = execSync(`git -C "${toolkitRoot}" rev-parse --short HEAD`, {
      encoding: "utf8",
    }).trim();
  } catch {
    // not a git repo or git not available — use placeholder
  }

  const ts = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

  return (
    `// generated by @readrun/widgets — edit .readrun/widgets/${widgetName}.tsx, then re-run rr\n` +
    `// @readrun/widgets@${sha} — generated ${ts}\n`
  );
}

/**
 * Detect a banner produced by this bundler (or its legacy figura predecessor).
 * Used to allow safe overwrite — hand-written .jsx files do not carry a banner.
 */
export function isGeneratedBanner(source: string): boolean {
  return /^\/\/ generated by (@readrun\/widgets|figura)/m.test(source);
}

// ─── core bundler ────────────────────────────────────────────────────────────

export interface BundleWidgetOpts {
  /** Absolute path to the directory containing <name>.tsx files. */
  widgetsDir: string;
  /** Absolute path to readrun/src/figura/ (for git SHA + @readrun/widgets resolution). */
  toolkitRoot: string;
}

/**
 * Bundle a single widget by name (kebab-case).
 * Returns the final .jsx source string ready for the readrun JSX runtime.
 */
export async function bundleWidget(
  name: string,
  opts: BundleWidgetOpts
): Promise<string> {
  const { widgetsDir, toolkitRoot } = opts;
  const entryPath = path.join(widgetsDir, `${name}.tsx`);

  if (!fs.existsSync(entryPath)) {
    throw new Error(`Widget not found: ${entryPath}`);
  }

  const pascalName = kebabToPascal(name);

  const sourceText = fs.readFileSync(entryPath, "utf8");
  const detectedName = extractWidgetExportName(sourceText);

  if (detectedName === null) {
    throw new Error(
      `Widget "${name}" (${entryPath}) has no detectable component export.\n` +
        `Expected: export function ${pascalName}() { ... } or export default function ${pascalName}() { ... }`
    );
  }

  if (detectedName !== pascalName) {
    throw new Error(
      `Widget "${name}" exports "${detectedName}", but expected "${pascalName}".\n` +
        `Either rename the file to match the component, or rename the component to match the file.`
    );
  }

  const buildResult = await esbuild.build({
    entryPoints: [entryPath],
    bundle: true,
    format: "esm",
    target: "es2020",
    jsx: "transform",
    loader: { ".tsx": "tsx", ".ts": "ts" },
    treeShaking: true,
    write: false,
    plugins: [reactGlobalsPlugin, readrunWidgetsPlugin(toolkitRoot)],
  });

  const first = buildResult.outputFiles[0];
  if (!first) throw new Error(`esbuild produced no output for widget "${name}"`);
  const rawSource = first.text;

  const stripped = stripExports(rawSource);
  const withRender = stripped.trimEnd() + `\nrender(<${pascalName} />);\n`;
  const banner = buildBanner(name, toolkitRoot);

  return banner + withRender;
}
