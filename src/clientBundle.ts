// Build the browser bundle once per process. Server and static build both
// pull from the same cache; HTML pages reference /_readrun/client.{js,css}
// instead of inlining the payload per page.
//
// JS comes from `Bun.build` against src/client/main.ts (real ES modules,
// sourcemaps inline). CSS is still string-concatenated from src/styles/*.ts
// — converting those to .css files is a follow-up.

import { resolve } from "path";
import { styles } from "./styles/index";

let cachedJs: string | null = null;
let cachedCss: string | null = null;
const VERSION = String(Date.now());

export async function getClientJs(): Promise<string> {
  if (cachedJs !== null) return cachedJs;
  const entry = resolve(import.meta.dirname, "client", "main.ts");
  const result = await Bun.build({
    entrypoints: [entry],
    target: "browser",
    minify: false,
    sourcemap: "inline",
    format: "esm",
  });
  if (!result.success || result.outputs.length === 0) {
    const errors = result.logs.map((l) => String(l)).join("\n");
    throw new Error(`Client bundle build failed:\n${errors}`);
  }
  cachedJs = await result.outputs[0]!.text();
  return cachedJs;
}

export function getClientCss(): string {
  if (cachedCss !== null) return cachedCss;
  cachedCss = styles;
  return cachedCss;
}

export function bundleVersion(): string {
  return VERSION;
}
