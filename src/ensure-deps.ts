import { resolve } from "path";
import { existsSync } from "fs";

let checked = false;

export async function ensureDeps(): Promise<void> {
  if (checked) return;
  checked = true;

  const readrunRoot = resolve(import.meta.dirname, "..");
  const pkgPath = resolve(readrunRoot, "package.json");

  let pkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  try {
    pkg = await Bun.file(pkgPath).json();
  } catch {
    return;
  }

  const required = [
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
  ];
  const missing = required.filter(
    (name) => !existsSync(resolve(readrunRoot, "node_modules", name))
  );
  if (missing.length === 0) return;

  console.log(
    `rr: installing ${missing.length} missing dependenc${missing.length === 1 ? "y" : "ies"}: ${missing.join(", ")}`
  );
  const proc = Bun.spawn(["bun", "install"], {
    cwd: readrunRoot,
    stdout: "inherit",
    stderr: "inherit",
  });
  await proc.exited;
  if (proc.exitCode !== 0) {
    console.error(`rr: bun install failed (exit ${proc.exitCode}). Run \`bun install\` in ${readrunRoot} manually.`);
    process.exit(proc.exitCode ?? 1);
  }
}
