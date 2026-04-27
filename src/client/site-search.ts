export const siteSearchCode = `
(() => {
  let idxPromise = null;
  function getIdx() {
    if (!idxPromise) {
      idxPromise = fetch("/_readrun/search-index.json")
        .then((r) => r.ok ? r.json() : [])
        .catch(() => []);
    }
    return idxPromise;
  }

  function score(query, entry) {
    const q = query.toLowerCase().trim();
    if (!q) return 0;
    const tokens = q.split(/\\s+/).filter(Boolean);
    if (tokens.length === 0) return 0;
    const title = entry.title.toLowerCase();
    const body = entry.body.toLowerCase();
    let s = 0;
    for (const t of tokens) {
      if (title.includes(t)) s += 10;
      if (entry.tags.some((tag) => tag.toLowerCase().includes(t))) s += 5;
      if (body.includes(t)) s += 1;
      else if (title.includes(t)) {} // already scored
      else return 0; // token not found anywhere = exclude
    }
    return s;
  }

  function snippet(body, query) {
    const q = query.toLowerCase().split(/\\s+/).filter(Boolean)[0];
    if (!q) return body.slice(0, 140);
    const idx = body.toLowerCase().indexOf(q);
    if (idx < 0) return body.slice(0, 140);
    const start = Math.max(0, idx - 60);
    const end = Math.min(body.length, idx + 80);
    return (start > 0 ? "…" : "") + body.slice(start, end) + (end < body.length ? "…" : "");
  }

  function buildPalette() {
    if (document.getElementById("site-search-palette")) return;
    const el = document.createElement("div");
    el.id = "site-search-palette";
    el.className = "site-search-palette";
    el.innerHTML = \`
      <div class="site-search-palette__scrim"></div>
      <div class="site-search-palette__card">
        <input class="site-search-palette__input" type="text" placeholder="Search all pages…" autocomplete="off">
        <div class="site-search-palette__results"></div>
      </div>\`;
    document.body.appendChild(el);

    const scrim = el.querySelector(".site-search-palette__scrim");
    const input = el.querySelector(".site-search-palette__input");
    const results = el.querySelector(".site-search-palette__results");
    let activeIdx = 0;

    function close() { el.classList.remove("site-search-palette--open"); input.value = ""; results.innerHTML = ""; }

    async function refresh() {
      const q = input.value.trim();
      const idx = await getIdx();
      const scored = idx.map((e) => ({ e, s: score(q, e) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 30);
      activeIdx = 0;
      if (scored.length === 0) {
        results.innerHTML = q ? '<div class="site-search-palette__empty">No matches</div>' : '';
        return;
      }
      results.innerHTML = scored.map((x, i) => {
        const snip = snippet(x.e.body, q).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));
        return '<a class="site-search-palette__result' + (i === 0 ? ' site-search-palette__result--active' : '') + '" href="' + x.e.url + '">'
          + '<div class="site-search-palette__title">' + x.e.title + '</div>'
          + '<div class="site-search-palette__snippet">' + snip + '</div>'
          + '</a>';
      }).join("");
    }

    function highlight() {
      const items = results.querySelectorAll(".site-search-palette__result");
      items.forEach((it, i) => it.classList.toggle("site-search-palette__result--active", i === activeIdx));
      const active = items[activeIdx];
      if (active) active.scrollIntoView({ block: "nearest" });
    }

    scrim.addEventListener("click", close);
    input.addEventListener("input", refresh);
    input.addEventListener("keydown", (e) => {
      const items = results.querySelectorAll(".site-search-palette__result");
      if (e.key === "Escape") { close(); }
      else if (e.key === "ArrowDown") { activeIdx = Math.min(items.length - 1, activeIdx + 1); highlight(); e.preventDefault(); }
      else if (e.key === "ArrowUp") { activeIdx = Math.max(0, activeIdx - 1); highlight(); e.preventDefault(); }
      else if (e.key === "Enter") { const a = items[activeIdx]; if (a) location.href = a.getAttribute("href"); e.preventDefault(); }
    });

    el.openPalette = () => { el.classList.add("site-search-palette--open"); setTimeout(() => input.focus(), 0); };
    el.closePalette = close;
  }

  function open() { buildPalette(); document.getElementById("site-search-palette").openPalette(); }

  window.openSiteSearch = open;

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { open(); e.preventDefault(); }
  });
})();
`;
