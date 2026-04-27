// Single-source-of-truth client bundle. Concatenates the existing string
// modules into one JS and one CSS payload served from /_readrun/client.{js,css}
// instead of inlined into every HTML page.

import { executionScript, settingsScript } from "./client/index";
import { styles } from "./styles/index";

let cachedJs: string | null = null;
let cachedCss: string | null = null;
const VERSION = String(Date.now());

function stripScriptTags(html: string): string {
  // Existing exports are wrapped in `<script type="module">…</script>`.
  // Extract only the body so we can serve as raw .js.
  return html.replace(/^\s*<script[^>]*>/i, "").replace(/<\/script>\s*$/i, "");
}

export function getClientJs(): string {
  if (cachedJs !== null) return cachedJs;
  const exec = stripScriptTags(executionScript);
  const settings = stripScriptTags(settingsScript);
  cachedJs = `${exec}\n${settings}`;
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
