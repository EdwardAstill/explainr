import { afterEach, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { startServer, type ServerHandle } from "./server";
import { invalidateSiteIndex } from "./siteIndex";

const repos: string[] = [];
const servers: ServerHandle[] = [];

async function makeTempRepo(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "rr-server-test-"));
  for (const [rel, content] of Object.entries(files)) {
    const full = join(dir, rel);
    await mkdir(full.slice(0, full.lastIndexOf("/")), { recursive: true });
    await writeFile(full, content);
  }
  repos.push(dir);
  return dir;
}

afterEach(async () => {
  for (const server of servers.splice(0)) {
    server.stop();
  }
  for (const repo of repos.splice(0)) {
    invalidateSiteIndex(repo);
    await rm(repo, { recursive: true, force: true });
  }
});

test("server returns 404 for pages excluded by the virtual-paths manifest", async () => {
  const dir = await makeTempRepo({
    "courses/intro.md": "# Intro",
    "docs/planning.md": "# Planning",
    ".readrun/virtual-paths.yaml": "exclude:\n  - docs/**\n",
  });

  const server = await startServer({ contentDir: dir, port: 43120, host: "127.0.0.1" });
  servers.push(server);

  const visible = await fetch(`http://${server.host}:${server.port}/courses/intro`);
  expect(visible.status).toBe(200);

  const hidden = await fetch(`http://${server.host}:${server.port}/docs/planning`);
  expect(hidden.status).toBe(404);
});
