import { join, resolve, normalize } from "path";
import { readFile, stat, mkdir, readdir, writeFile, unlink } from "fs/promises";
import { renderMarkdown } from "./markdown";
import { buildNavTree, renderNav } from "./nav";
import { htmlPage } from "./template";
import { extractTitle, findFirstFile } from "./utils";

async function resolveMarkdownPath(contentDir: string, urlPath: string): Promise<string | null> {
  const candidates = [
    join(contentDir, urlPath + ".md"),
    join(contentDir, urlPath, "index.md"),
    join(contentDir, urlPath, "README.md"),
  ];

  for (const candidate of candidates) {
    const resolved = normalize(resolve(candidate));
    if (!resolved.startsWith(contentDir + "/") && resolved !== contentDir) {
      return null;
    }
    if (await exists(resolved)) return resolved;
  }

  return null;
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"]);

function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

// Map import names to PyPI package names where they differ
const IMPORT_TO_PACKAGE: Record<string, string> = {
  PIL: "pillow",
  cv2: "opencv-python",
  sklearn: "scikit-learn",
  yaml: "pyyaml",
  attr: "attrs",
  bs4: "beautifulsoup4",
  dateutil: "python-dateutil",
  dotenv: "python-dotenv",
  gi: "pygobject",
  google: "googleapis-common-protos",
  lxml: "lxml",
  serial: "pyserial",
  skimage: "scikit-image",
  usb: "pyusb",
  wx: "wxpython",
};

// Python stdlib modules (3.10+) — skip these
const STDLIB = new Set([
  "__future__", "abc", "aifc", "argparse", "array", "ast", "asynchat",
  "asyncio", "asyncore", "atexit", "audioop", "base64", "bdb", "binascii",
  "binhex", "bisect", "builtins", "bz2", "calendar", "cgi", "cgitb",
  "chunk", "cmath", "cmd", "code", "codecs", "codeop", "collections",
  "colorsys", "compileall", "concurrent", "configparser", "contextlib",
  "contextvars", "copy", "copyreg", "cProfile", "crypt", "csv", "ctypes",
  "curses", "dataclasses", "datetime", "dbm", "decimal", "difflib", "dis",
  "distutils", "doctest", "email", "encodings", "enum", "errno",
  "faulthandler", "fcntl", "filecmp", "fileinput", "fnmatch", "fractions",
  "ftplib", "functools", "gc", "getopt", "getpass", "gettext", "glob",
  "grp", "gzip", "hashlib", "heapq", "hmac", "html", "http", "idlelib",
  "imaplib", "imghdr", "imp", "importlib", "inspect", "io", "ipaddress",
  "itertools", "json", "keyword", "lib2to3", "linecache", "locale",
  "logging", "lzma", "mailbox", "mailcap", "marshal", "math", "mimetypes",
  "mmap", "modulefinder", "multiprocessing", "netrc", "nis", "nntplib",
  "numbers", "operator", "optparse", "os", "ossaudiodev", "pathlib",
  "pdb", "pickle", "pickletools", "pipes", "pkgutil", "platform",
  "plistlib", "poplib", "posix", "posixpath", "pprint", "profile",
  "pstats", "pty", "pwd", "py_compile", "pyclbr", "pydoc", "queue",
  "quopri", "random", "re", "readline", "reprlib", "resource", "rlcompleter",
  "runpy", "sched", "secrets", "select", "selectors", "shelve", "shlex",
  "shutil", "signal", "site", "smtpd", "smtplib", "sndhdr", "socket",
  "socketserver", "spwd", "sqlite3", "ssl", "stat", "statistics", "string",
  "stringprep", "struct", "subprocess", "sunau", "symtable", "sys",
  "sysconfig", "syslog", "tabnanny", "tarfile", "telnetlib", "tempfile",
  "termios", "test", "textwrap", "threading", "time", "timeit", "tkinter",
  "token", "tokenize", "tomllib", "trace", "traceback", "tracemalloc",
  "tty", "turtle", "turtledemo", "types", "typing", "unicodedata",
  "unittest", "urllib", "uu", "uuid", "venv", "warnings", "wave",
  "weakref", "webbrowser", "winreg", "winsound", "wsgiref", "xdrlib",
  "xml", "xmlrpc", "zipapp", "zipfile", "zipimport", "zlib",
  "_thread", "_io",
]);

function detectImports(code: string): string[] {
  const packages = new Set<string>();
  // Match "import foo", "import foo.bar", "from foo import ...", "from foo.bar import ..."
  const importRegex = /^(?:import|from)\s+([\w.]+)/gm;
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    const topLevel = match[1].split(".")[0];
    if (STDLIB.has(topLevel)) continue;
    if (topLevel.startsWith("_")) continue;
    const pkg = IMPORT_TO_PACKAGE[topLevel] || topLevel;
    packages.add(pkg);
  }
  return [...packages];
}

export async function startServer(contentDir: string, port: number, liveMode = false) {
  const normalizedContentDir = normalize(resolve(contentDir));
  const filesDir = join(normalizedContentDir, ".explainr", "files");

  if (liveMode) {
    await mkdir(filesDir, { recursive: true });
    console.log(`Live mode enabled. Files directory: ${filesDir}`);
  }

  const server = Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);
      let pathname = decodeURIComponent(url.pathname);

      // API routes (live mode only)
      if (liveMode) {
        // POST /api/run — execute Python code
        if (pathname === "/api/run" && req.method === "POST") {
          try {
            const body = await req.json() as { code: string };
            const code = body.code;
            if (typeof code !== "string") {
              return Response.json({ error: "Missing code" }, { status: 400 });
            }

            // Snapshot files before execution
            const filesBefore = new Set(await readdir(filesDir).catch(() => [] as string[]));

            // Write code to a temp file for uv
            const scriptName = `_explainr_run_${Date.now()}.py`;
            const scriptPath = join(filesDir, scriptName);
            await writeFile(scriptPath, code);
            filesBefore.add(scriptName);

            // If PEP 723 metadata is present, uv handles deps from the file.
            // Otherwise, auto-detect imports and pass them via --with.
            const hasPep723 = /^# \/\/\/ script/m.test(code);
            const withArgs: string[] = [];
            if (!hasPep723) {
              const imports = detectImports(code);
              for (const pkg of imports) withArgs.push("--with", pkg);
            }

            const proc = Bun.spawn(["uv", "run", ...withArgs, scriptPath], {
              cwd: filesDir,
              stdout: "pipe",
              stderr: "pipe",
            });

            const [stdout, stderr] = await Promise.all([
              new Response(proc.stdout).text(),
              new Response(proc.stderr).text(),
            ]);

            await proc.exited;

            // Clean up temp script
            await unlink(scriptPath).catch(() => {});

            // Check for new image files
            const filesAfter = await readdir(filesDir).catch(() => [] as string[]);
            const images: { name: string; mime: string; data: string }[] = [];
            for (const file of filesAfter) {
              if (filesBefore.has(file)) continue;
              const ext = file.substring(file.lastIndexOf(".")).toLowerCase();
              if (!IMAGE_EXTENSIONS.has(ext)) continue;
              const filePath = join(filesDir, file);
              const fileData = await readFile(filePath);
              images.push({
                name: file,
                mime: getMimeType(ext),
                data: Buffer.from(fileData).toString("base64"),
              });
            }

            return Response.json({ stdout, stderr, images });
          } catch (err) {
            return Response.json({ error: String(err) }, { status: 500 });
          }
        }

        // POST /api/upload — upload a file
        if (pathname === "/api/upload" && req.method === "POST") {
          try {
            const formData = await req.formData();
            const file = formData.get("file");
            if (!file || !(file instanceof File)) {
              return Response.json({ error: "No file provided" }, { status: 400 });
            }

            const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const targetPath = normalize(resolve(filesDir, sanitizedName));
            if (!targetPath.startsWith(filesDir)) {
              return Response.json({ error: "Invalid filename" }, { status: 400 });
            }

            const arrayBuffer = await file.arrayBuffer();
            await writeFile(targetPath, Buffer.from(arrayBuffer));

            return Response.json({ ok: true, name: sanitizedName });
          } catch (err) {
            return Response.json({ error: String(err) }, { status: 500 });
          }
        }

        // GET /api/files — list files
        if (pathname === "/api/files" && req.method === "GET") {
          try {
            const entries = await readdir(filesDir).catch(() => [] as string[]);
            const files: { name: string; size: number }[] = [];
            for (const name of entries) {
              const filePath = join(filesDir, name);
              const s = await stat(filePath).catch(() => null);
              if (s && s.isFile()) {
                files.push({ name, size: s.size });
              }
            }
            return Response.json({ files });
          } catch (err) {
            return Response.json({ error: String(err) }, { status: 500 });
          }
        }

        // GET /api/files/* — serve files
        if (pathname.startsWith("/api/files/") && req.method === "GET") {
          const requestedFile = pathname.slice("/api/files/".length);
          const filePath = normalize(resolve(filesDir, requestedFile));
          if (!filePath.startsWith(filesDir)) {
            return new Response("Forbidden", { status: 403 });
          }

          try {
            const fileData = await readFile(filePath);
            const ext = filePath.substring(filePath.lastIndexOf(".")).toLowerCase();
            return new Response(fileData, {
              headers: { "Content-Type": getMimeType(ext) },
            });
          } catch {
            return new Response("Not found", { status: 404 });
          }
        }
      }

      if (pathname === "/") {
        // Try to resolve an index/README at the root first
        const rootMd = await resolveMarkdownPath(normalizedContentDir, pathname);
        if (!rootMd) {
          const tree = await buildNavTree(normalizedContentDir);
          const first = findFirstFile(tree);
          if (first) {
            return Response.redirect(first, 302);
          }
        }
      }

      const mdPath = await resolveMarkdownPath(normalizedContentDir, pathname);
      if (!mdPath) {
        return new Response("Not found", { status: 404 });
      }

      try {
        const source = await readFile(mdPath, "utf-8");
        const rendered = renderMarkdown(source);
        const tree = await buildNavTree(normalizedContentDir);
        const nav = renderNav(tree, pathname);
        const title = extractTitle(source, pathname.split("/").pop() || "explainr");

        const html = htmlPage(nav, rendered, title, undefined, liveMode);
        return new Response(html, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      } catch (err) {
        console.error(`Error rendering ${mdPath}:`, err);
        return new Response("Internal server error", { status: 500 });
      }
    },
  });

  console.log(`explainr running at http://localhost:${server.port}`);
  console.log(`Serving content from: ${normalizedContentDir}`);
}
