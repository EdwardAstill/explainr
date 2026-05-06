// @ts-nocheck
import { scoreItem } from "./site-search";
import { escapeHtml } from "./dom-utils";

export function mountPanes() {
  // 1. Read rr-nav-config; abort unless mode === "panes"
  const configEl = document.getElementById("rr-nav-config");
  if (!configEl) return;
  let config;
  try {
    config = JSON.parse(configEl.textContent || "{}");
  } catch {
    return;
  }
  if (!config || config.mode !== "panes") return;

  // 2. Find <nav class="sidebar-nav rr-panes">; abort if missing
  const nav = document.querySelector("nav.sidebar-nav.rr-panes");
  if (!nav) return;

  // 3. Inject pinned search input above pane wrappers, then wrap wrappers
  //    in a .rr-panes-row flex container so they sit side-by-side below
  //    the full-width search input.
  if (nav.querySelector('.rr-panes-row')) return;

  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.className = "rr-pane-search";
  searchInput.placeholder = "Search…";
  nav.insertBefore(searchInput, nav.firstChild);

  // Move all .rr-pane-wrapper elements into a new .rr-panes-row container.
  const panesRow = document.createElement("div");
  panesRow.className = "rr-panes-row";
  const wrappers = Array.from(nav.querySelectorAll(".rr-pane-wrapper"));
  for (const w of wrappers) {
    panesRow.appendChild(w);
  }
  nav.appendChild(panesRow);

  // Gather all pane lists
  const paneUls = Array.from(nav.querySelectorAll(".rr-pane"));

  // Cache original DOM order and inner text for each row
  const originalOrder = new Map(); // ul -> li[]
  const originalLabel = new Map(); // li -> { textEl, text }

  function ensureCache() {
    for (const ul of paneUls) {
      if (!originalOrder.has(ul)) {
        originalOrder.set(ul, Array.from(ul.querySelectorAll("li.rr-pane-row")));
      }
      const rows = originalOrder.get(ul);
      for (const li of rows) {
        if (!originalLabel.has(li)) {
          const textEl = li.querySelector("a, span");
          if (textEl) {
            originalLabel.set(li, { textEl, text: textEl.textContent || "" });
          }
        }
      }
    }
  }

  function applyMark(textEl, text, query) {
    if (!query) {
      textEl.textContent = text;
      return;
    }
    const lo = text.toLowerCase();
    const q = query.toLowerCase().trim();
    // Find best contiguous match first
    let idx = lo.indexOf(q);
    let matchLen = q.length;
    if (idx < 0) {
      // Try first token
      const tokens = q.split(/\s+/).filter(Boolean);
      if (tokens.length > 0) {
        idx = lo.indexOf(tokens[0]);
        matchLen = tokens[0].length;
      }
    }
    if (idx < 0) {
      textEl.textContent = text;
      return;
    }
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + matchLen);
    const after = text.slice(idx + matchLen);
    textEl.innerHTML =
      escapeHtml(before) +
      "<mark>" +
      escapeHtml(match) +
      "</mark>" +
      escapeHtml(after);
  }

  function reorder(query) {
    ensureCache();
    const q = (query || "").trim();

    for (const ul of paneUls) {
      const rows = originalOrder.get(ul) || [];

      if (!q) {
        // Restore original order and text
        for (const li of rows) {
          li.classList.remove("match-strong", "match", "dim");
          const cached = originalLabel.get(li);
          if (cached) {
            cached.textEl.textContent = cached.text;
          }
          ul.appendChild(li);
        }
        continue;
      }

      // Score each row
      const scored = rows.map((li) => {
        const label = li.dataset.searchLabel || li.textContent || "";
        const { score, firstHitIndex } = scoreItem(q, label);
        return { li, score, firstHitIndex, label };
      });

      // Sort: score desc, firstHitIndex asc (with -1 last), label asc
      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const ai = a.firstHitIndex < 0 ? Infinity : a.firstHitIndex;
        const bi = b.firstHitIndex < 0 ? Infinity : b.firstHitIndex;
        if (ai !== bi) return ai - bi;
        return a.label.localeCompare(b.label);
      });

      // Apply classes and marks, then reorder in DOM
      for (const { li, score, firstHitIndex } of scored) {
        li.classList.remove("match-strong", "match", "dim");
        if (score === 3) li.classList.add("match-strong");
        else if (score >= 1) li.classList.add("match");
        else li.classList.add("dim");

        const cached = originalLabel.get(li);
        if (cached) {
          applyMark(cached.textEl, cached.text, score > 0 ? q : null);
        }

        ul.appendChild(li);
      }
    }
  }

  // Wire search input with rAF debounce
  let rafId = 0;
  function scheduleReorder() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      reorder(searchInput.value);
    });
  }
  searchInput.addEventListener("input", scheduleReorder);

  // 4. Wire click handlers for dir rows (span) to toggle is-active
  nav.addEventListener("click", (e) => {
    // Find the closest rr-pane-row
    const li = e.target.closest("li.rr-pane-row");
    if (!li) return;

    // If the click target is or is inside an <a>, let browser navigate normally
    if (e.target.closest("a")) return;

    // It's a span (dir) row — toggle is-active
    const ul = li.closest("ul.rr-pane");
    if (!ul) return;

    // Toggle is-active; clicking an already-active row deactivates it
    const wasActive = li.classList.contains("is-active");
    ul.querySelectorAll("li.rr-pane-row.is-active").forEach((row) => {
      row.classList.remove("is-active");
    });
    if (!wasActive) li.classList.add("is-active");
  });
}
