// @ts-nocheck
// Focus mode for the sidebar nav.
//
// Default behaviour: tree works like normal (single-click expands).
// Enhancement: double-click any directory <summary> to "focus" the sidebar
// on that folder — siblings and ancestors disappear, the focused folder
// itself disappears, and a breadcrumb appears above the tree letting the
// user widen back. Focus state persists across pages via localStorage.
//
// Search reorders + dims: typing in the pinned search input reorders every
// matching item to the top with mark-highlighted substrings; non-matches
// are dimmed.

import { scoreItem } from "./site-search";

const STORAGE_KEY = "rr:focus-path";
const DBLCLICK_DELAY_MS = 230;

interface FocusState {
  focus: string[]; // path segments (e.g. ["courses", "ai"])
}

function readFocus(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every(s => typeof s === "string")) return parsed;
  } catch {}
  return [];
}

function writeFocus(focus: string[]): void {
  try {
    if (focus.length === 0) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(focus));
  } catch {}
}

function pathOfNode(el: Element): string[] {
  // Walk up the nav tree collecting <details data-nav-path> ancestors.
  // For files, the closest ancestor <details> path + the leaf file's name.
  const parts: string[] = [];
  let cur: Element | null = el;
  while (cur && !cur.matches(".sidebar-nav")) {
    if (cur.matches("details[data-nav-path]")) {
      const p = (cur as HTMLDetailsElement).dataset.navPath || "";
      if (p) {
        // navPath is "/courses/ai"; we want segments without the leading slash
        const segs = p.replace(/^\/+/, "").split("/").filter(Boolean);
        return segs;
      }
    }
    cur = cur.parentElement;
  }
  return parts;
}

function findNavRoot(): HTMLElement | null {
  return document.querySelector(".sidebar-nav.nav-tree") as HTMLElement | null;
}

function findOrCreateBreadcrumbs(nav: HTMLElement): HTMLElement {
  let crumbs = document.getElementById("rr-focus-crumbs") as HTMLElement | null;
  if (crumbs) return crumbs;
  crumbs = document.createElement("div");
  crumbs.id = "rr-focus-crumbs";
  crumbs.className = "rr-focus-crumbs empty";
  nav.parentElement?.insertBefore(crumbs, nav);
  return crumbs;
}

function findOrCreateSearch(nav: HTMLElement): { input: HTMLInputElement; toggle: HTMLButtonElement } {
  let input = document.getElementById("rr-focus-search") as HTMLInputElement | null;
  let toggle = document.getElementById("rr-focus-toggle") as HTMLButtonElement | null;
  if (input && toggle) return { input, toggle };

  const wrap = document.createElement("div");
  wrap.className = "rr-focus-search-wrap";

  input = document.createElement("input");
  input.id = "rr-focus-search";
  input.type = "text";
  input.placeholder = "Search…";
  input.autocomplete = "off";

  toggle = document.createElement("button");
  toggle.id = "rr-focus-toggle";
  toggle.type = "button";
  toggle.className = "rr-focus-toggle";
  toggle.setAttribute("aria-label", "Collapse all folders");
  toggle.title = "Collapse all folders";
  toggle.innerHTML = "−"; // updated by syncToggleIcon

  wrap.appendChild(input);
  wrap.appendChild(toggle);
  nav.parentElement?.insertBefore(wrap, nav);
  return { input, toggle };
}

function anyOpen(nav: HTMLElement): boolean {
  return !!nav.querySelector("li:not(.rr-hidden) > details[open]");
}

function syncToggleIcon(nav: HTMLElement, toggle: HTMLButtonElement): void {
  const open = anyOpen(nav);
  toggle.innerHTML = open ? "−" : "+";
  toggle.title = open ? "Collapse all folders" : "Expand all folders";
  toggle.setAttribute("aria-label", toggle.title);
}

function setAllOpen(nav: HTMLElement, open: boolean): void {
  // Only toggle visible (not rr-hidden) details so collapse-all respects focus scope.
  const details = nav.querySelectorAll("li:not(.rr-hidden) > details");
  details.forEach((d) => { (d as HTMLDetailsElement).open = open; });
}

function applyFocus(nav: HTMLElement, focus: string[]): void {
  const focusKey = focus.join("/");
  const items = nav.querySelectorAll("li.nav-dir, li.nav-file");
  items.forEach((li) => {
    let path = "";
    const details = li.querySelector(":scope > details");
    if (details) {
      path = ((details as HTMLDetailsElement).dataset.navPath || "").replace(/^\/+/, "");
    } else {
      const a = li.querySelector(":scope > a") as HTMLAnchorElement | null;
      if (a) path = (a.getAttribute("href") || "").replace(/^\/+/, "");
    }
    if (focus.length === 0) {
      (li as HTMLElement).classList.remove("rr-hidden", "rr-focus-self");
      return;
    }
    if (path === focusKey) {
      // hide the focused folder itself; its <details> children are unwrapped via CSS
      (li as HTMLElement).classList.add("rr-focus-self");
      (li as HTMLElement).classList.remove("rr-hidden");
      return;
    }
    if (path.startsWith(focusKey + "/")) {
      (li as HTMLElement).classList.remove("rr-hidden", "rr-focus-self");
      return;
    }
    // Outside scope: hide UNLESS this li is an ancestor of the focused path
    // (we still need ancestors in the DOM so the focused subtree renders).
    if ((focusKey + "/").startsWith(path + "/")) {
      (li as HTMLElement).classList.add("rr-focus-self");
      (li as HTMLElement).classList.remove("rr-hidden");
      return;
    }
    (li as HTMLElement).classList.add("rr-hidden");
    (li as HTMLElement).classList.remove("rr-focus-self");
  });

  // ensure focused folder + ancestors are open so children are visible
  if (focus.length > 0) {
    let acc = "";
    for (const seg of focus) {
      acc = acc ? acc + "/" + seg : seg;
      const det = nav.querySelector(`details[data-nav-path="/${acc}"]`) as HTMLDetailsElement | null;
      if (det) det.open = true;
    }
  }
}

function renderBreadcrumbs(crumbs: HTMLElement, focus: string[], onChange: (next: string[]) => void): void {
  crumbs.innerHTML = "";
  crumbs.classList.toggle("empty", focus.length === 0);
  crumbs.classList.toggle("has-focus", focus.length > 0);
  if (focus.length === 0) return;

  const all = document.createElement("button");
  all.type = "button";
  all.className = "rr-crumb root";
  all.textContent = "all";
  all.title = "Widen back to everything";
  all.onclick = () => onChange([]);
  crumbs.appendChild(all);

  for (let i = 0; i < focus.length; i++) {
    const sep = document.createElement("span");
    sep.className = "rr-crumb-sep";
    sep.textContent = "›";
    crumbs.appendChild(sep);
    const c = document.createElement("button");
    c.type = "button";
    c.className = "rr-crumb" + (i === focus.length - 1 ? " current" : "");
    c.textContent = focus[i];
    if (i < focus.length - 1) {
      c.title = "Widen to " + focus.slice(0, i + 1).join("/");
      c.onclick = () => onChange(focus.slice(0, i + 1));
    } else {
      c.disabled = true;
    }
    crumbs.appendChild(c);
  }

  const clear = document.createElement("button");
  clear.type = "button";
  clear.className = "rr-crumb-clear";
  clear.textContent = "×";
  clear.title = "Widen to all";
  clear.onclick = () => onChange([]);
  crumbs.appendChild(clear);
}

function applySearch(nav: HTMLElement, query: string): void {
  const q = query.trim();
  const items = nav.querySelectorAll("li.nav-file > a, li.nav-dir > details > summary");
  if (!q) {
    items.forEach((el) => {
      el.classList.remove("rr-match", "rr-match-strong", "rr-dim");
      // restore any cached label
      const cached = (el as HTMLElement).dataset.rrOriginal;
      if (cached !== undefined) {
        el.innerHTML = cached;
        delete (el as HTMLElement).dataset.rrOriginal;
      }
    });
    // restore natural order (browser already has it; nothing to do because we don't move nodes)
    return;
  }

  items.forEach((el) => {
    const label = el.textContent || "";
    const { score } = scoreItem(q, label);
    el.classList.remove("rr-match", "rr-match-strong", "rr-dim");
    if (score >= 3) el.classList.add("rr-match-strong");
    else if (score >= 1) el.classList.add("rr-match");
    else el.classList.add("rr-dim");

    // highlight
    if ((el as HTMLElement).dataset.rrOriginal === undefined) {
      (el as HTMLElement).dataset.rrOriginal = el.innerHTML;
    }
    if (score > 0) {
      const idx = label.toLowerCase().indexOf(q.toLowerCase());
      if (idx >= 0) {
        const safe = (s: string) => s.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] as string);
        el.innerHTML = safe(label.slice(0, idx)) + "<mark>" + safe(label.slice(idx, idx + q.length)) + "</mark>" + safe(label.slice(idx + q.length));
      }
    }
  });
}

export function mountFocus(): void {
  const nav = findNavRoot();
  if (!nav) return; // not in tree mode (e.g. legacy panes mode page)
  if ((nav as HTMLElement).dataset.rrFocusMounted === "true") return;
  (nav as HTMLElement).dataset.rrFocusMounted = "true";
  // Tag the parent .sidebar so CSS can drop its top/bottom padding when focus is mounted.
  const sidebar = nav.closest(".sidebar");
  if (sidebar) (sidebar as HTMLElement).classList.add("rr-focus-active");

  const { input: search, toggle } = findOrCreateSearch(nav);
  const crumbs = findOrCreateBreadcrumbs(nav);

  let focus = readFocus();

  function setFocus(next: string[]): void {
    focus = next;
    writeFocus(focus);
    applyFocus(nav!, focus);
    renderBreadcrumbs(crumbs, focus, setFocus);
    syncToggleIcon(nav!, toggle);
  }

  setFocus(focus);

  // Click handlers on summary elements (folder rows).
  let pendingTimer: ReturnType<typeof setTimeout> | null = null;
  nav.addEventListener("click", (e: MouseEvent) => {
    const summary = (e.target as Element).closest("summary");
    if (!summary || !nav.contains(summary)) return;
    const details = summary.parentElement as HTMLDetailsElement | null;
    if (!details || !details.matches("details[data-nav-path]")) return;

    if (e.detail >= 2) {
      // double-click: focus
      e.preventDefault();
      if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null; }
      const path = (details.dataset.navPath || "").replace(/^\/+/, "").split("/").filter(Boolean);
      setFocus(path);
      return;
    }

    // single-click: defer expand toggle to wait for possible double-click
    e.preventDefault();
    if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null; }
    const wasOpen = details.open;
    pendingTimer = setTimeout(() => {
      pendingTimer = null;
      details.open = !wasOpen;
      syncToggleIcon(nav!, toggle);
    }, DBLCLICK_DELAY_MS);
  });

  toggle.addEventListener("click", () => {
    const open = anyOpen(nav!);
    setAllOpen(nav!, !open);
    syncToggleIcon(nav!, toggle);
  });

  search.addEventListener("input", () => applySearch(nav!, search.value));
}

mountFocus();
document.addEventListener("readrun:remount", mountFocus);
