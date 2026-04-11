export function dashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>readrun</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0d1117; color: #e6edf3; min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 48px 24px; }
  h1 { font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em; color: #58a6ff; margin-bottom: 8px; }
  .subtitle { color: #8b949e; font-size: 0.875rem; margin-bottom: 48px; }
  .container { width: 100%; max-width: 640px; display: flex; flex-direction: column; gap: 32px; }
  section h2 { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #8b949e; margin-bottom: 12px; }
  .list { display: flex; flex-direction: column; gap: 6px; }
  .item { display: flex; align-items: center; gap: 8px; background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 10px 14px; }
  .item-path { flex: 1; font-size: 0.875rem; color: #e6edf3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .item-name { font-size: 0.8rem; color: #8b949e; margin-bottom: 2px; }
  .btn { padding: 6px 14px; border-radius: 6px; font-size: 0.8rem; font-weight: 500; border: none; cursor: pointer; transition: background 0.15s; }
  .btn-primary { background: #238636; color: #fff; }
  .btn-primary:hover { background: #2ea043; }
  .btn-ghost { background: transparent; color: #8b949e; border: 1px solid #30363d; }
  .btn-ghost:hover { color: #e6edf3; border-color: #8b949e; }
  .btn-danger { background: transparent; color: #f85149; border: 1px solid #30363d; }
  .btn-danger:hover { border-color: #f85149; }
  .add-row { display: flex; gap: 8px; }
  .add-row input { flex: 1; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; padding: 8px 12px; color: #e6edf3; font-size: 0.875rem; outline: none; }
  .add-row input:focus { border-color: #58a6ff; }
  .empty { color: #8b949e; font-size: 0.875rem; padding: 12px 0; }
  .error { color: #f85149; font-size: 0.8rem; margin-top: 6px; min-height: 18px; }
</style>
</head>
<body>
<h1>readrun</h1>
<p class="subtitle">Turn Markdown folders into interactive sites</p>
<div class="container">
  <section>
    <h2>Saved</h2>
    <div class="list" id="saved-list"></div>
    <div class="add-row" style="margin-top:10px">
      <input id="add-input" type="text" placeholder="Add folder path..." />
      <button class="btn btn-ghost" onclick="addSaved()">Save</button>
    </div>
    <div class="error" id="add-error"></div>
  </section>
  <section>
    <h2>Recent</h2>
    <div class="list" id="recent-list"></div>
  </section>
  <section>
    <h2>Quick Actions</h2>
    <div class="add-row">
      <input id="open-input" type="text" placeholder="Folder or file path..." />
      <button class="btn btn-primary" onclick="openPath(document.getElementById('open-input').value.trim())">Open</button>
    </div>
    <div class="error" id="open-error"></div>
  </section>
</div>
<script>
  async function load() {
    const res = await fetch('/api/saved');
    const { saved, recent } = await res.json();
    renderList('saved-list', saved, true);
    renderList('recent-list', recent, false);
  }

  function renderList(id, paths, showRemove) {
    const el = document.getElementById(id);
    if (!paths || paths.length === 0) {
      el.innerHTML = '<p class="empty">None yet.</p>';
      return;
    }
    el.innerHTML = paths.map(p => {
      const name = p.split('/').filter(Boolean).pop() || p;
      const removeBtn = showRemove
        ? \`<button class="btn btn-danger" onclick="removeSaved('\${p.replace(/'/g, "\\\\'")}')">Remove</button>\`
        : '';
      return \`<div class="item">
        <div style="flex:1;min-width:0">
          <div class="item-name">\${name}</div>
          <div class="item-path">\${p}</div>
        </div>
        <button class="btn btn-primary" onclick="openPath('\${p.replace(/'/g, "\\\\'")}')">Open</button>
        \${removeBtn}
      </div>\`;
    }).join('');
  }

  async function openPath(path) {
    if (!path) return;
    const errEl = document.getElementById('open-error');
    const res = await fetch('/api/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path })
    });
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    } else {
      const { error } = await res.json();
      if (errEl) errEl.textContent = error || 'Could not open path';
      alert(error || 'Could not open path');
    }
  }

  async function addSaved() {
    const input = document.getElementById('add-input');
    const errEl = document.getElementById('add-error');
    const path = input.value.trim();
    if (!path) return;
    const res = await fetch('/api/saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', path })
    });
    if (res.ok) {
      input.value = '';
      errEl.textContent = '';
      load();
    } else {
      const { error } = await res.json();
      errEl.textContent = error || 'Could not add path';
    }
  }

  async function removeSaved(path) {
    await fetch('/api/saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove', path })
    });
    load();
  }

  load();
</script>
</body>
</html>`;
}
