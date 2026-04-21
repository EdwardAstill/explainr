export const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js";

export const executionCode = `
    let pyodide = null;
    let pyodideLoading = null;
    let packagesReady = null;

    const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp"]);

    const IMPORT_TO_PKG = {
      PIL: "pillow", cv2: "opencv-python", sklearn: "scikit-learn",
      skimage: "scikit-image", bs4: "beautifulsoup4", yaml: "pyyaml",
      attr: "attrs", dotenv: "python-dotenv", gi: "pygobject",
    };
    const STDLIB = new Set([
      "sys","os","io","re","math","json","csv","collections","itertools",
      "functools","operator","string","datetime","time","random","hashlib",
      "pathlib","typing","abc","copy","enum","dataclasses","decimal",
      "fractions","statistics","textwrap","unicodedata","struct","codecs",
      "pprint","logging","warnings","traceback","unittest","doctest",
      "argparse","configparser","pickle","shelve","sqlite3","gzip","zipfile",
      "tarfile","tempfile","shutil","glob","fnmatch","base64","binascii",
      "html","xml","urllib","http","email","socket","ssl","select",
      "threading","multiprocessing","subprocess","signal","contextlib",
      "weakref","array","queue","heapq","bisect","ast","dis","inspect",
      "importlib","pkgutil","platform","sysconfig","gc","ctypes",
      "calendar","locale","gettext","numbers",
    ]);

    function parseImports(code) {
      const pkgs = new Set();
      const importRe = /^(?:import|from)\\s+(\\w+)/gm;
      let m;
      while ((m = importRe.exec(code)) !== null) {
        const mod = m[1];
        if (!STDLIB.has(mod)) {
          pkgs.add(IMPORT_TO_PKG[mod] || mod);
        }
      }
      return [...pkgs];
    }

    async function loadPyodideRuntime() {
      if (pyodide) return pyodide;
      if (pyodideLoading) return pyodideLoading;
      pyodideLoading = (async () => {
        const script = document.createElement("script");
        script.src = "${PYODIDE_URL}";
        document.head.appendChild(script);
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });
        pyodide = await globalThis.loadPyodide();

        // Preload embedded files into Pyodide's virtual filesystem
        const filesEl = document.getElementById("readrun-files");
        if (filesEl) {
          try {
            const files = JSON.parse(filesEl.textContent);
            for (const f of files) {
              const bytes = Uint8Array.from(atob(f.data), c => c.charCodeAt(0));
              pyodide.FS.writeFile(f.name, bytes);
            }
          } catch {}
        }

        return pyodide;
      })();
      return pyodideLoading;
    }

    async function installPackages(pkgs) {
      if (pkgs.length === 0) return;
      const py = await loadPyodideRuntime();
      await py.loadPackage("micropip");
      const micropip = py.pyimport("micropip");
      for (const pkg of pkgs) {
        try { await micropip.install(pkg); } catch {}
      }
      // Set up matplotlib if loaded
      if (pkgs.includes("matplotlib")) {
        py.runPython(\`
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as _plt
_readrun_figures = []
def _readrun_show(*a, **kw):
    import io as _io, base64 as _b64
    for _num in _plt.get_fignums():
        _fig = _plt.figure(_num)
        _buf = _io.BytesIO()
        _fig.savefig(_buf, format="png", dpi=150, bbox_inches="tight")
        _buf.seek(0)
        _readrun_figures.append(_b64.b64encode(_buf.read()).decode())
    _plt.close("all")
_plt.show = _readrun_show
\`);
      }
    }

    // Scan all code blocks on this page and start preloading
    function scanPageImports() {
      const allPkgs = new Set();
      document.querySelectorAll('script[data-source]').forEach(el => {
        try {
          const code = atob(el.textContent);
          for (const pkg of parseImports(code)) allPkgs.add(pkg);
        } catch {}
      });
      return [...allPkgs];
    }

    // Start preloading immediately — Pyodide + packages load in background
    const pagePackages = scanPageImports();
    if (pagePackages.length > 0) {
      packagesReady = installPackages(pagePackages);
    }

    function snapshotFS(py) {
      try {
        return new Set(py.FS.readdir("/home/pyodide").filter(f => f !== "." && f !== ".."));
      } catch {
        return new Set();
      }
    }

    function detectNewFiles(py, before) {
      try {
        const after = py.FS.readdir("/home/pyodide").filter(f => f !== "." && f !== "..");
        return after.filter(f => !before.has(f));
      } catch {
        return [];
      }
    }

    function renderFileDownloads(py, newFiles, outputEl) {
      for (const file of newFiles) {
        try {
          const data = py.FS.readFile("/home/pyodide/" + file);
          const blob = new Blob([data]);
          const url = URL.createObjectURL(blob);
          const ext = file.split(".").pop().toLowerCase();

          if (IMAGE_EXTS.has(ext)) {
            const img = document.createElement("img");
            img.src = url;
            img.alt = file;
            img.style.maxWidth = "100%";
            img.style.marginTop = "8px";
            outputEl.appendChild(img);
          }

          const link = document.createElement("a");
          link.href = url;
          link.download = file;
          link.textContent = "\\u2B07 " + file;
          link.style.cssText = "display:inline-block;margin:4px 8px 0 0;font-family:var(--font-mono);font-size:12px;color:var(--color-link);";
          outputEl.appendChild(link);
        } catch {}
      }
    }

    function renderFigures(py, outputEl) {
      try {
        const figList = py.runPython("_readrun_figures if '_readrun_figures' in dir() else []");
        const figures = figList.toJs ? figList.toJs() : figList;
        if (!figures || !figures.length) return;
        for (const b64 of figures) {
          const img = document.createElement("img");
          img.src = "data:image/png;base64," + b64;
          img.style.maxWidth = "100%";
          img.style.marginTop = "8px";
          outputEl.appendChild(img);
        }
        // Clear for next run
        py.runPython("_readrun_figures.clear()");
      } catch {}
    }

    async function runPyodide(code, btn, outputEl) {
      btn.disabled = true;
      btn.textContent = pyodide ? "Running..." : "Loading Python...";
      outputEl.innerHTML = "";

      try {
        // Wait for preloading if in progress
        if (packagesReady) {
          btn.textContent = "Installing packages...";
          await packagesReady;
        }

        const py = await loadPyodideRuntime();

        // Install any packages not caught by the page-level scan
        const pkgs = parseImports(code);
        if (pkgs.length > 0 && !packagesReady) {
          btn.textContent = "Installing packages...";
          await installPackages(pkgs);
        }

        btn.textContent = "Running...";

        const fsBefore = snapshotFS(py);

        py.runPython(\`
import sys, io
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
\`);

        try {
          const result = py.runPython(code);
          const stdout = py.runPython("sys.stdout.getvalue()");
          const stderr = py.runPython("sys.stderr.getvalue()");

          let html = "";
          if (stdout) html += \`<span class="exec-stdout">\${escapeHtml(stdout)}</span>\`;
          if (stderr) html += \`<span class="exec-stderr">\${escapeHtml(stderr)}</span>\`;
          if (result !== undefined && result !== null && !stdout && !stderr) {
            html += \`<span class="exec-stdout">\${escapeHtml(String(result))}</span>\`;
          }
          outputEl.innerHTML = html || \`<span class="exec-stdout" style="color: var(--color-text-muted)">(no output)</span>\`;

          // Render matplotlib figures inline
          renderFigures(py, outputEl);

          // Check for new files created by the script
          const newFiles = detectNewFiles(py, fsBefore);
          if (newFiles.length > 0) renderFileDownloads(py, newFiles, outputEl);
        } catch (pyErr) {
          const stderr = py.runPython("sys.stderr.getvalue()");
          outputEl.innerHTML = \`<span class="exec-stderr">\${escapeHtml(stderr || pyErr.message)}</span>\`;
        } finally {
          py.runPython(\`
sys.stdout = sys.__stdout__
sys.stderr = sys.__stderr__
\`);
        }
      } catch (loadErr) {
        outputEl.innerHTML = \`<span class="exec-stderr">Failed to load Python: \${escapeHtml(loadErr.message)}</span>\`;
      }

      btn.disabled = false;
      btn.textContent = "Run";
    }

    let jsxRuntimeLoading = null;
    let jsxRuntime = null;

    async function loadJsxRuntime() {
      if (jsxRuntime) return jsxRuntime;
      if (jsxRuntimeLoading) return jsxRuntimeLoading;
      jsxRuntimeLoading = (async () => {
        const loadScript = (src) => new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = src;
          s.onload = resolve;
          s.onerror = reject;
          document.head.appendChild(s);
        });
        await loadScript("https://cdn.jsdelivr.net/npm/react@18/umd/react.development.js");
        await loadScript("https://cdn.jsdelivr.net/npm/react-dom@18/umd/react-dom.development.js");
        await loadScript("https://cdn.jsdelivr.net/npm/@babel/standalone@7/babel.min.js");
        // Disable Tailwind preflight so it doesn't reset readrun's base styles
        const twCfg = document.createElement("script");
        twCfg.textContent = "tailwind.config = { corePlugins: { preflight: false } }";
        document.head.appendChild(twCfg);
        await loadScript("https://cdn.tailwindcss.com");
        jsxRuntime = { React: globalThis.React, ReactDOM: globalThis.ReactDOM, Babel: globalThis.Babel };
        return jsxRuntime;
      })();
      return jsxRuntimeLoading;
    }

    async function runJsx(code, btn, outputEl) {
      btn.disabled = true;
      btn.textContent = "Loading React...";
      outputEl.innerHTML = "";
      try {
        const { React, ReactDOM, Babel } = await loadJsxRuntime();
        btn.textContent = "Running...";
        let jsCode;
        try {
          jsCode = Babel.transform(code, { presets: ["react"] }).code;
        } catch (err) {
          outputEl.innerHTML = \`<span class="exec-stderr">\${escapeHtml(err.message)}</span>\`;
          btn.disabled = false;
          btn.textContent = "Run";
          return;
        }
        const mountEl = document.createElement("div");
        outputEl.appendChild(mountEl);
        const root = ReactDOM.createRoot(mountEl);
        const render = (el) => root.render(el);
        try {
          const fn = new Function("React", "ReactDOM", "render", jsCode);
          fn(React, ReactDOM, render);
        } catch (err) {
          outputEl.innerHTML = \`<span class="exec-stderr">\${escapeHtml(err.message)}</span>\`;
        }
      } catch (loadErr) {
        outputEl.innerHTML = \`<span class="exec-stderr">Failed to load React: \${escapeHtml(loadErr.message)}</span>\`;
      }
      btn.disabled = false;
      btn.textContent = "Run";
    }


    document.addEventListener("keydown", (e) => {
      if (e.key !== "Tab") return;
      const ta = e.target.closest(".exec-editable");
      if (!ta) return;
      e.preventDefault();
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      ta.value = ta.value.slice(0, start) + "    " + ta.value.slice(end);
      ta.selectionStart = ta.selectionEnd = start + 4;
    });

    document.addEventListener("click", (e) => {
      const toggleBtn = e.target.closest(".exec-toggle-btn");
      if (!toggleBtn) return;
      const block = toggleBtn.closest(".exec-block");
      if (!block) return;
      block.classList.toggle("exec-block--collapsed");
      toggleBtn.textContent = block.classList.contains("exec-block--collapsed") ? "Show" : "Hide";
    });

    document.addEventListener("click", async (e) => {
      const btn = e.target.closest(".exec-run-btn");
      if (!btn) return;

      const blockId = btn.dataset.blockId;
      const block = btn.closest(".exec-block");
      const editableEl = document.querySelector(\`textarea[data-editable-source="\${blockId}"]\`);
      const sourceEl = document.querySelector(\`script[data-source="\${blockId}"]\`);
      const outputEl = document.querySelector(\`[data-output="\${blockId}"]\`);
      if ((!sourceEl && !editableEl) || !outputEl) return;

      const code = editableEl ? editableEl.value : decodeSource(sourceEl.textContent);
      const lang = block ? block.dataset.lang : "";

      if (lang === "jsx") {
        runJsx(code, btn, outputEl);
      } else {
        await runPyodide(code, btn, outputEl);
      }
    });

    function escapeHtml(s) {
      const d = document.createElement("div");
      d.textContent = s;
      return d.innerHTML;
    }

    function decodeSource(b64) {
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    }

    // Expose JSX auto-render for other modules (e.g. quiz) to call after injecting content
    window.__rrRenderJsxAuto = async function(root) {
      const els = (root || document).querySelectorAll("[data-jsx-auto]");
      if (els.length === 0) return;
      const dummyBtn = { disabled: false, textContent: "" };
      for (const outputEl of els) {
        if (outputEl.children.length > 0) continue; // already rendered
        const id = outputEl.dataset.output;
        const sourceEl = document.querySelector(\`script[data-source="\${id}"]\`);
        if (!sourceEl) continue;
        const code = decodeSource(sourceEl.textContent);
        await runJsx(code, dummyBtn, outputEl);
      }
    };

    // Auto-render JSX blocks — must run after all let declarations are initialized
    (async () => {
      await window.__rrRenderJsxAuto(document);
    })();
`;
