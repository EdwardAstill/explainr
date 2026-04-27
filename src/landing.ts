import { landingShell } from "./shell";

const styles = `
  body { min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 48px 24px; }
  h1 { font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em; color: var(--shell-accent); margin-bottom: 8px; }
  .subtitle { color: var(--shell-fg-muted); font-size: 0.875rem; margin-bottom: 48px; }
  .container { width: 100%; max-width: 640px; display: flex; flex-direction: column; gap: 32px; }
  section h2 { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--shell-fg-muted); margin-bottom: 12px; }
  .list { display: flex; flex-direction: column; gap: 6px; }
  .item { display: flex; align-items: center; gap: 8px; background: var(--shell-bg-alt); border: 1px solid var(--shell-border); border-radius: 8px; padding: 10px 14px; }
  .item-path { flex: 1; font-size: 0.875rem; color: var(--shell-fg); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .item-name { font-size: 0.8rem; color: var(--shell-fg-muted); margin-bottom: 2px; }
  .btn { padding: 6px 14px; border-radius: 6px; font-size: 0.8rem; font-weight: 500; border: none; cursor: pointer; transition: background 0.15s; }
  .btn-primary { background: var(--shell-success); color: #fff; }
  .btn-primary:hover { background: var(--shell-success-hover); }
  .btn-ghost { background: transparent; color: var(--shell-fg-muted); border: 1px solid var(--shell-border); }
  .btn-ghost:hover { color: var(--shell-fg); border-color: var(--shell-fg-muted); }
  .btn-danger { background: transparent; color: var(--shell-danger); border: 1px solid var(--shell-border); }
  .btn-danger:hover { border-color: var(--shell-danger); }
  .add-row { display: flex; gap: 8px; }
  .add-row input { flex: 1; background: var(--shell-bg); border: 1px solid var(--shell-border); border-radius: 6px; padding: 8px 12px; color: var(--shell-fg); font-size: 0.875rem; outline: none; }
  .add-row input:focus { border-color: var(--shell-accent); }
  .empty { color: var(--shell-fg-muted); font-size: 0.875rem; padding: 12px 0; }
  .error { color: var(--shell-danger); font-size: 0.8rem; margin-top: 6px; min-height: 18px; }
`;

const body = `
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
</script>`;

export function dashboardHtml(): string {
  return landingShell({ title: "readrun", bodyHtml: body, extraCss: styles });
}
