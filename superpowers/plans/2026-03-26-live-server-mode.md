# Live Server Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `--live` flag that starts explainr as a live server with native Python execution, file uploads, and inline image rendering.

**Architecture:** In live mode, the "Run" button POSTs code to `/api/run` on the server instead of using Pyodide. The server spawns `python3` as a subprocess with cwd set to `.explainr/files/`. After execution, the server checks for new image files and returns them as base64 alongside stdout/stderr. A file upload endpoint at `/api/upload` accepts files and writes them to `.explainr/files/`. The template detects live mode via a `data-live` attribute on `<body>` and switches execution strategy accordingly. Static/Pyodide mode remains the default.

**Tech Stack:** Bun (subprocess via `Bun.spawn`), native Python 3, existing markdown-it pipeline

**Files overview:**
- `src/cli.ts` — add `--live` flag parsing, pass to `startServer`
- `src/server.ts` — add `--live` mode: `/api/run`, `/api/upload`, `/api/files/*` routes, `.explainr/files/` management
- `src/template.ts` — add `data-live` attribute, live-mode execution JS, file upload UI, inline image rendering CSS
- `src/markdown.ts` — no changes needed
- `docs/deployment.md` — update CLI reference
- `docs/future/live-server-mode.md` — mark as implemented
- `docs/future/file-uploads.md` — mark as partially implemented

---

### Task 1: CLI `--live` flag

**Files:**
- Modify: `src/cli.ts`

- [ ] **Step 1: Add `--live` flag parsing to cli.ts**

In `src/cli.ts`, add `--live` to the flag parsing and pass it through to `startServer`:

```typescript
const liveMode = args.includes("--live");
const filteredArgs = args.filter(
  (a, i) => a !== "-t" && a !== "--base" && a !== "--live" && i !== baseFlagIndex + 1
);
```

In the `dev` case, pass `liveMode` to `startServer`:

```typescript
case "dev": {
  const port = Number(filteredArgs[1]) || 3001;
  if (testMode) console.log(`Using built-in demo: ${demoDir}`);
  startServer(contentDir, port, liveMode);
  break;
}
```

Update the help text default case to include:

```
  --live                            Enable live server mode (native Python, file uploads)
```

- [ ] **Step 2: Verify it compiles**

Run: `bunx tsc --noEmit 2>&1 | grep -v markdown.ts`

This will fail because `startServer` doesn't accept `liveMode` yet — that's expected. Confirm the only error is about the `startServer` signature.

- [ ] **Step 3: Commit**

```bash
git add src/cli.ts
git commit -m "feat: add --live flag to CLI"
```

---

### Task 2: Server-side Python execution endpoint

**Files:**
- Modify: `src/server.ts`

- [ ] **Step 1: Update `startServer` signature to accept `liveMode`**

Change the function signature:

```typescript
export function startServer(contentDir: string, port: number, liveMode = false) {
```

Add `.explainr/files/` directory creation at the top of the function, after `normalizedContentDir`:

```typescript
const filesDir = join(normalizedContentDir, ".explainr", "files");
if (liveMode) {
  const { mkdirSync } = await import("fs");
  mkdirSync(filesDir, { recursive: true });
  console.log(`Live mode enabled. Working directory: ${filesDir}`);
}
```

Note: use top-level import instead — add `mkdir` to the existing `fs/promises` import:

```typescript
import { readFile, stat, mkdir } from "fs/promises";
```

And make it async:

```typescript
if (liveMode) {
  await mkdir(filesDir, { recursive: true });
  console.log(`Live mode enabled. Working directory: ${filesDir}`);
}
```

Since `startServer` needs to be async now, change the export:

```typescript
export async function startServer(contentDir: string, port: number, liveMode = false) {
```

And in `cli.ts`, await it:

```typescript
await startServer(contentDir, port, liveMode);
```

- [ ] **Step 2: Add `/api/run` route inside the `fetch` handler**

Before the markdown path resolution, add API route handling. Insert this block after the `pathname === "/"` redirect block:

```typescript
// API routes (live mode only)
if (liveMode && pathname === "/api/run" && req.method === "POST") {
  try {
    const { code } = await req.json() as { code: string };
    if (!code || typeof code !== "string") {
      return Response.json({ error: "Missing code" }, { status: 400 });
    }

    // Snapshot files before execution to detect new images
    const { readdir } = await import("fs/promises");
    const imageExts = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"];
    let filesBefore: Set<string>;
    try {
      filesBefore = new Set(await readdir(filesDir));
    } catch {
      filesBefore = new Set();
    }

    // Run Python as subprocess
    const proc = Bun.spawn(["python3", "-c", code], {
      cwd: filesDir,
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    await proc.exited;

    // Check for new image files
    let filesAfter: string[];
    try {
      filesAfter = await readdir(filesDir);
    } catch {
      filesAfter = [];
    }

    const newImages: { name: string; data: string; mime: string }[] = [];
    for (const file of filesAfter) {
      const ext = file.substring(file.lastIndexOf(".")).toLowerCase();
      if (imageExts.includes(ext) && !filesBefore.has(file)) {
        const imgPath = join(filesDir, file);
        const imgData = await readFile(imgPath);
        const mime = ext === ".svg" ? "image/svg+xml" : `image/${ext.slice(1)}`;
        newImages.push({
          name: file,
          data: Buffer.from(imgData).toString("base64"),
          mime,
        });
      }
    }

    return Response.json({ stdout, stderr, exitCode: proc.exitCode, images: newImages });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Add `/api/upload` route**

Add this after the `/api/run` block:

```typescript
if (liveMode && pathname === "/api/upload" && req.method === "POST") {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const dest = join(filesDir, safeName);
    // Path traversal check
    if (!normalize(resolve(dest)).startsWith(filesDir)) {
      return Response.json({ error: "Invalid filename" }, { status: 400 });
    }
    const buffer = await file.arrayBuffer();
    const { writeFile } = await import("fs/promises");
    await writeFile(dest, Buffer.from(buffer));
    return Response.json({ name: safeName, size: file.size });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 4: Add `/api/files/*` route to serve files from `.explainr/files/`**

Add this after the `/api/upload` block. This lets the browser render saved images:

```typescript
if (liveMode && pathname.startsWith("/api/files/")) {
  const fileName = pathname.slice("/api/files/".length);
  const filePath = join(filesDir, fileName);
  if (!normalize(resolve(filePath)).startsWith(filesDir)) {
    return new Response("Forbidden", { status: 403 });
  }
  try {
    const fileData = await readFile(filePath);
    return new Response(fileData);
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
```

- [ ] **Step 5: Pass `liveMode` to `htmlPage`**

Update the `htmlPage` call to pass live mode:

```typescript
const html = htmlPage(nav, rendered, title, undefined, liveMode);
```

- [ ] **Step 6: Verify it compiles**

Run: `bunx tsc --noEmit 2>&1 | grep -v markdown.ts`

Expected: may fail on `htmlPage` signature — that's fixed in Task 3.

- [ ] **Step 7: Commit**

```bash
git add src/server.ts src/cli.ts
git commit -m "feat: add /api/run, /api/upload, /api/files endpoints for live mode"
```

---

### Task 3: Template — live mode execution and file upload UI

**Files:**
- Modify: `src/template.ts`

- [ ] **Step 1: Update `htmlPage` signature**

Change the function signature to accept `liveMode`:

```typescript
export function htmlPage(nav: string, content: string, title: string, basePath?: string, liveMode = false): string {
```

Add `data-live="true"` to the `<body>` tag when in live mode:

```typescript
<body${liveMode ? ' data-live="true"' : ""}>
```

- [ ] **Step 2: Add file upload UI CSS**

Add these styles after the settings CSS block (before the closing `</style>`):

```css
/* File upload */
.file-upload {
  position: fixed;
  bottom: 12px;
  right: 12px;
  z-index: 100;
}

.file-upload__btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-sidebar-bg);
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 13px;
  font-family: var(--font-body);
  transition: all 0.15s ease;
}

.file-upload__btn:hover {
  background: var(--color-border);
  color: var(--color-text);
}

.file-upload__status {
  position: absolute;
  bottom: calc(100% + 8px);
  right: 0;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  white-space: nowrap;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.exec-output img {
  max-width: 100%;
  margin-top: 8px;
  border-radius: 4px;
}
```

- [ ] **Step 3: Add file upload button HTML**

Add this after the settings `</div>` and before the first `<script>` tag. Only render in live mode:

```typescript
${liveMode ? `
  <div class="file-upload" id="file-upload">
    <button class="file-upload__btn" id="file-upload-btn">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      Upload file
    </button>
    <input type="file" id="file-input" style="display:none">
    <div class="file-upload__status" id="file-status" style="display:none"></div>
  </div>
` : ""}
```

- [ ] **Step 4: Replace the Pyodide execution script with a mode-aware version**

Replace the entire first `<script type="module">` block (the Pyodide one, lines 459-541) with a version that checks `data-live`:

```javascript
  <script type="module">
    const isLive = document.body.dataset.live === "true";
    let pyodide = null;
    let pyodideLoading = null;

    async function loadPyodideRuntime() {
      if (pyodide) return pyodide;
      if (pyodideLoading) return pyodideLoading;
      pyodideLoading = (async () => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js";
        document.head.appendChild(script);
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });
        pyodide = await globalThis.loadPyodide();
        return pyodide;
      })();
      return pyodideLoading;
    }

    async function runLive(code) {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      return res.json();
    }

    async function runPyodide(code) {
      const py = await loadPyodideRuntime();
      py.runPython(\`
import sys, io
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
\`);
      try {
        const result = py.runPython(code);
        const stdout = py.runPython("sys.stdout.getvalue()");
        const stderr = py.runPython("sys.stderr.getvalue()");
        let output = stdout || "";
        if (result !== undefined && result !== null && !stdout && !stderr) {
          output = String(result);
        }
        return { stdout: output, stderr, images: [] };
      } catch (pyErr) {
        const stderr = py.runPython("sys.stderr.getvalue()");
        return { stdout: "", stderr: stderr || pyErr.message, images: [] };
      } finally {
        py.runPython(\`
sys.stdout = sys.__stdout__
sys.stderr = sys.__stderr__
\`);
      }
    }

    document.addEventListener("click", async (e) => {
      const btn = e.target.closest(".exec-run-btn");
      if (!btn) return;

      const blockId = btn.dataset.blockId;
      const sourceEl = document.querySelector(\`script[data-source="\${blockId}"]\`);
      const outputEl = document.querySelector(\`[data-output="\${blockId}"]\`);
      if (!sourceEl || !outputEl) return;

      const code = atob(sourceEl.textContent);

      btn.disabled = true;
      btn.textContent = isLive ? "Running..." : (pyodide ? "Running..." : "Loading Python...");
      outputEl.innerHTML = "";

      try {
        const result = isLive ? await runLive(code) : await runPyodide(code);

        let html = "";
        if (result.stdout) html += \`<span class="exec-stdout">\${escapeHtml(result.stdout)}</span>\`;
        if (result.stderr) html += \`<span class="exec-stderr">\${escapeHtml(result.stderr)}</span>\`;
        if (result.images && result.images.length > 0) {
          for (const img of result.images) {
            html += \`<img src="data:\${img.mime};base64,\${img.data}" alt="\${escapeHtml(img.name)}">\`;
          }
        }
        if (!html) html = \`<span class="exec-stdout" style="color: var(--color-text-muted)">(no output)</span>\`;
        outputEl.innerHTML = html;
      } catch (err) {
        outputEl.innerHTML = \`<span class="exec-stderr">\${escapeHtml(err.message)}</span>\`;
      }

      btn.disabled = false;
      btn.textContent = "Run";
    });

    function escapeHtml(s) {
      const d = document.createElement("div");
      d.textContent = s;
      return d.innerHTML;
    }
  </script>
```

- [ ] **Step 5: Add file upload script**

Add a new `<script type="module">` block after the settings script. This only runs in live mode:

```javascript
  <script type="module">
    // File upload (live mode only)
    const uploadBtn = document.getElementById("file-upload-btn");
    const fileInput = document.getElementById("file-input");
    const fileStatus = document.getElementById("file-status");
    if (uploadBtn && fileInput) {
      uploadBtn.addEventListener("click", () => fileInput.click());
      fileInput.addEventListener("change", async () => {
        const file = fileInput.files[0];
        if (!file) return;

        fileStatus.style.display = "block";
        fileStatus.textContent = \`Uploading \${file.name}...\`;

        try {
          const form = new FormData();
          form.append("file", file);
          const res = await fetch("/api/upload", { method: "POST", body: form });
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          fileStatus.textContent = \`Uploaded: \${data.name}\`;
        } catch (err) {
          fileStatus.textContent = \`Error: \${err.message}\`;
        }

        setTimeout(() => { fileStatus.style.display = "none"; }, 3000);
        fileInput.value = "";
      });
    }
  </script>
```

- [ ] **Step 6: Verify it compiles**

Run: `bunx tsc --noEmit 2>&1 | grep -v markdown.ts`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add src/template.ts
git commit -m "feat: template support for live mode execution, file upload, and image rendering"
```

---

### Task 4: End-to-end test

**Files:** None (testing only)

- [ ] **Step 1: Verify static mode still works**

```bash
bun src/cli.ts -t build /tmp/explainr-static-test
```

Expected: builds 4 pages, no errors. Check that `data-live` is NOT in the output:

```bash
grep -c 'data-live' /tmp/explainr-static-test/welcome/index.html
```

Expected: `0`

- [ ] **Step 2: Start live server and test /api/run**

```bash
bun src/cli.ts -t --live &
sleep 2
curl -s -X POST http://localhost:3001/api/run \
  -H "Content-Type: application/json" \
  -d '{"code": "print(\"hello from live mode\")"}'
```

Expected: `{"stdout":"hello from live mode\n","stderr":"","exitCode":0,"images":[]}`

- [ ] **Step 3: Test file upload**

```bash
echo "name,value" > /tmp/test-upload.csv
curl -s -X POST http://localhost:3001/api/upload \
  -F "file=@/tmp/test-upload.csv"
```

Expected: `{"name":"test-upload.csv","size":...}`

Then verify the file exists in the working directory:

```bash
ls explainr-demo/.explainr/files/test-upload.csv
```

- [ ] **Step 4: Test Python can read the uploaded file**

```bash
curl -s -X POST http://localhost:3001/api/run \
  -H "Content-Type: application/json" \
  -d '{"code": "print(open(\"test-upload.csv\").read())"}'
```

Expected: stdout contains `name,value`

- [ ] **Step 5: Test image generation**

```bash
curl -s -X POST http://localhost:3001/api/run \
  -H "Content-Type: application/json" \
  -d '{"code": "from PIL import Image\nim = Image.new(\"RGB\", (10,10), \"red\")\nim.save(\"test.png\")\nprint(\"saved\")"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('images',[])), 'images')"
```

Expected: `1 images` (if Pillow is installed) or stderr about missing module (which is fine — the detection logic still works).

- [ ] **Step 6: Verify `data-live` is in live mode pages**

```bash
curl -s http://localhost:3001/welcome | grep -o 'data-live="true"'
```

Expected: `data-live="true"`

- [ ] **Step 7: Kill server and clean up**

```bash
kill %1 2>/dev/null
rm -rf explainr-demo/.explainr
```

- [ ] **Step 8: Commit (if any fixes were needed)**

---

### Task 5: Update documentation

**Files:**
- Modify: `docs/deployment.md`
- Modify: `docs/future/live-server-mode.md`
- Modify: `docs/future/file-uploads.md`
- Modify: `README.md`

- [ ] **Step 1: Update `docs/deployment.md`**

Add `--live` to the usage section:

```markdown
explainr --live                         # start live server (native Python, file uploads)
explainr -t --live                      # live server with demo content
```

Add a new section after "Platform-specific builds":

```markdown
## Live server mode

Use `--live` to start explainr as a live server with native Python execution:

\```bash
explainr --live
\```

In live mode:
- Python code runs natively on your machine (not in the browser via Pyodide)
- You can upload files using the upload button in the bottom-right corner
- Uploaded files and code output go to `.explainr/files/` inside your content directory
- Generated images (e.g., from matplotlib) display inline below the code block

Live mode requires Python 3 installed on your machine.
```

- [ ] **Step 2: Update `docs/future/live-server-mode.md`**

Replace the content to mark it as implemented with remaining work.

- [ ] **Step 3: Update `docs/future/file-uploads.md`**

Mark the live server portion as implemented; note that browser-only file uploads (for static mode) are still planned.

- [ ] **Step 4: Update `README.md`**

Add `--live` to the quick start and features sections.

- [ ] **Step 5: Commit**

```bash
git add docs/ README.md
git commit -m "docs: update for live server mode and file uploads"
```
