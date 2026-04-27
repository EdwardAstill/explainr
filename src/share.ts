// Spawn a tunnel binary (cloudflared or bore) so a local readrun
// server can be reached from a public URL. Detects the binary at
// runtime; never bundles one. If none is installed, the caller falls
// back to printing install hints.

import { spawn, type Subprocess } from "bun";

export type TunnelKind = "cloudflared" | "bore";

export interface TunnelHandle {
  kind: TunnelKind;
  publicUrl: string;
  stop: () => void;
}

const URL_RE_CLOUDFLARED = /https:\/\/[A-Za-z0-9-]+\.trycloudflare\.com/;
const URL_RE_BORE = /listening at ([A-Za-z0-9.-]+:\d+)/;

async function which(bin: string): Promise<boolean> {
  try {
    const proc = spawn({ cmd: ["which", bin], stdout: "pipe", stderr: "pipe" });
    const code = await proc.exited;
    return code === 0;
  } catch {
    return false;
  }
}

export async function detectTunnel(): Promise<TunnelKind | null> {
  if (await which("cloudflared")) return "cloudflared";
  if (await which("bore")) return "bore";
  return null;
}

export function tunnelInstallHints(): string {
  return [
    "No tunnel binary found. Install one of:",
    "  cloudflared — https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/",
    "                Quick tunnels with no signup; default for `rr share`.",
    "  bore        — cargo install bore-cli (or download from https://github.com/ekzhang/bore)",
    "                No signup; uses bore.pub by default.",
  ].join("\n");
}

export async function startTunnel(opts: {
  kind: TunnelKind;
  port: number;
  onReady: (handle: TunnelHandle) => void;
  onError?: (msg: string) => void;
}): Promise<TunnelHandle> {
  const { kind, port, onReady, onError } = opts;
  let proc: Subprocess;

  if (kind === "cloudflared") {
    proc = spawn({
      cmd: ["cloudflared", "tunnel", "--url", `http://localhost:${port}`, "--no-autoupdate"],
      stdout: "pipe",
      stderr: "pipe",
    });
  } else {
    proc = spawn({
      cmd: ["bore", "local", String(port), "--to", "bore.pub"],
      stdout: "pipe",
      stderr: "pipe",
    });
  }

  const handle: TunnelHandle = {
    kind,
    publicUrl: "",
    stop: () => { try { proc.kill(); } catch {} },
  };

  let resolved = false;
  const decoder = new TextDecoder();

  const watch = async (stream: ReadableStream<Uint8Array> | null) => {
    if (!stream) return;
    const reader = stream.getReader();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      if (resolved) continue;
      if (kind === "cloudflared") {
        const m = chunk.match(URL_RE_CLOUDFLARED);
        if (m) {
          handle.publicUrl = m[0]!;
          resolved = true;
          onReady(handle);
        }
      } else {
        const m = chunk.match(URL_RE_BORE);
        if (m) {
          handle.publicUrl = `http://${m[1]}`;
          resolved = true;
          onReady(handle);
        }
      }
    }
  };

  watch(proc.stdout as ReadableStream<Uint8Array>);
  watch(proc.stderr as ReadableStream<Uint8Array>);

  proc.exited.then((code) => {
    if (!resolved && onError) onError(`tunnel exited (code ${code}) before announcing a URL`);
  });

  return handle;
}
