import { join } from "path";
import { access } from "fs/promises";
import { homedir } from "os";
import { resolve as resolvePath } from "path";

export interface DoctorCheck {
  name: string;
  status: "ok" | "warn" | "fail";
  detail: string;
}

export interface DoctorResult {
  checks: DoctorCheck[];
  ok: boolean;
}

async function fileExists(p: string): Promise<boolean> {
  try { await access(p); return true; } catch { return false; }
}

async function isPortAvailable(port: number): Promise<boolean> {
  const { createServer } = await import("net");
  return new Promise((resolve) => {
    const s = createServer();
    s.once("error", () => resolve(false));
    s.listen(port, "localhost", () => s.close(() => resolve(true)));
  });
}

export async function doctor(): Promise<DoctorResult> {
  const checks: DoctorCheck[] = [];

  // Bun version (at least 1.1)
  const bunVersion = typeof Bun !== "undefined" ? Bun.version : null;
  if (bunVersion) {
    const [major, minor] = bunVersion.split(".").map((n) => parseInt(n, 10));
    const okBun = (major ?? 0) > 1 || ((major === 1) && (minor ?? 0) >= 1);
    checks.push({
      name: "Bun runtime",
      status: okBun ? "ok" : "warn",
      detail: okBun ? `Bun ${bunVersion}` : `Bun ${bunVersion} (≥1.1 recommended)`,
    });
  } else {
    checks.push({ name: "Bun runtime", status: "fail", detail: "Bun not detected" });
  }

  // readrun install root reachable
  const readrunRoot = resolvePath(import.meta.dirname, "..");
  checks.push({
    name: "readrun install",
    status: "ok",
    detail: readrunRoot,
  });

  // KaTeX package (optional)
  const katexPkg = join(readrunRoot, "node_modules", "@vscode", "markdown-it-katex", "package.json");
  const hasKatex = await fileExists(katexPkg);
  checks.push({
    name: "KaTeX (optional — math rendering)",
    status: hasKatex ? "ok" : "warn",
    detail: hasKatex ? "installed" : "not installed — math blocks render as plain text",
  });

  // Config dir writable
  const configDir = join(homedir(), ".config", "readrun");
  const configFile = join(configDir, "settings.toml");
  const hasConfig = await fileExists(configFile);
  checks.push({
    name: "Config file",
    status: hasConfig ? "ok" : "warn",
    detail: hasConfig ? configFile : `${configFile} (missing — will be created on first run)`,
  });

  // Default port
  const defaultPort = 3001;
  const portFree = await isPortAvailable(defaultPort);
  checks.push({
    name: `Default port ${defaultPort}`,
    status: portFree ? "ok" : "warn",
    detail: portFree ? "available" : "in use — readrun will auto-fall back to the next free port",
  });

  checks.push({
    name: "Block syntax",
    status: "ok",
    detail: 'Use [name]/[/name] syntax. Run "readrun validate" to detect deprecated ::: blocks.',
  });

  const ok = checks.every((c) => c.status !== "fail");
  return { checks, ok };
}
