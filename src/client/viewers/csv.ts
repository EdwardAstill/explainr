export function sortRows(rows: string[][], col: number, dir: "asc" | "desc"): string[][] {
  const isNum = (v: string) => v !== "" && !isNaN(Number(v));
  const numeric = rows.every(r => isNum(r[col] ?? ""));
  return [...rows].sort((a, b) => {
    const av = a[col] ?? "";
    const bv = b[col] ?? "";
    const cmp = numeric ? Number(av) - Number(bv) : av.localeCompare(bv);
    return dir === "asc" ? cmp : -cmp;
  });
}

export function filterRows(rows: string[][], query: string): string[][] {
  if (!query) return rows;
  const q = query.toLowerCase();
  return rows.filter(r => r.some(cell => cell.toLowerCase().includes(q)));
}

export function paginateRows(rows: string[][], page: number, perPage: number): string[][] {
  return rows.slice(page * perPage, (page + 1) * perPage);
}

interface CsvData { headers: string[]; rows: string[][]; }

function renderTable(wrap: HTMLElement, headers: string[], rows: string[][], sortCol: number, sortDir: "asc" | "desc"): void {
  const table = wrap.querySelector<HTMLTableElement>(".csv-table")!;
  const thead = `<thead><tr>${headers.map((h, i) => {
    const arrow = i === sortCol ? (sortDir === "asc" ? " ↑" : " ↓") : " ↕";
    return `<th data-col="${i}" style="cursor:pointer">${escHtml(h)}<span style="opacity:0.5;font-size:0.75em">${arrow}</span></th>`;
  }).join("")}</tr></thead>`;
  const tbody = `<tbody>${rows.map(row =>
    `<tr>${row.map(cell => `<td>${escHtml(cell)}</td>`).join("")}</tr>`
  ).join("")}</tbody>`;
  table.innerHTML = thead + tbody;
}

function renderPagination(wrap: HTMLElement, page: number, total: number, perPage: number, onPage: (p: number) => void): void {
  const pages = Math.ceil(total / perPage);
  const pag = wrap.querySelector(".csv-pagination")!;
  if (pages <= 1) { pag.innerHTML = ""; return; }
  pag.innerHTML = `<span style="font-size:0.8em;color:var(--text-muted)">Page ${page + 1} / ${pages}</span>
    <button data-dir="-1" ${page === 0 ? "disabled" : ""}>‹</button>
    <button data-dir="1" ${page >= pages - 1 ? "disabled" : ""}>›</button>`;
  pag.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => onPage(page + parseInt((btn as HTMLElement).dataset.dir!)));
  });
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function initCsvViewer(wrap: HTMLElement): void {
  const id = wrap.dataset.csvId!;
  const maxRows = parseInt(wrap.dataset.rows ?? "100", 10);
  const scriptEl = document.getElementById(`csv-data-${id}`);
  if (!scriptEl) return;

  const data: CsvData = JSON.parse(scriptEl.textContent!);
  let filteredRows = data.rows;
  let sortCol = -1;
  let sortDir: "asc" | "desc" = "asc";
  let page = 0;

  function render(): void {
    const pageRows = paginateRows(filteredRows, page, maxRows);
    renderTable(wrap, data.headers, pageRows, sortCol, sortDir);
    renderPagination(wrap, page, filteredRows.length, maxRows, p => { page = p; render(); });

    wrap.querySelectorAll("th[data-col]").forEach(th => {
      th.addEventListener("click", () => {
        const col = parseInt((th as HTMLElement).dataset.col!);
        if (sortCol === col) sortDir = sortDir === "asc" ? "desc" : "asc";
        else { sortCol = col; sortDir = "asc"; }
        filteredRows = sortRows(filteredRows, sortCol, sortDir);
        page = 0;
        render();
      });
    });
  }

  const filterInput = wrap.querySelector<HTMLInputElement>(".csv-filter");
  if (filterInput) {
    let debounce: ReturnType<typeof setTimeout>;
    filterInput.addEventListener("input", () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        filteredRows = filterRows(data.rows, filterInput.value);
        if (sortCol >= 0) filteredRows = sortRows(filteredRows, sortCol, sortDir);
        page = 0;
        render();
      }, 150);
    });
  }

  render();
}

export function initCsvViewers(): void {
  document.querySelectorAll<HTMLElement>(".csv-viewer").forEach(el => {
    if (el.dataset.csvMounted) return;
    el.dataset.csvMounted = "1";
    initCsvViewer(el);
  });
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", initCsvViewers);
  document.addEventListener("readrun:remount", initCsvViewers);
}
