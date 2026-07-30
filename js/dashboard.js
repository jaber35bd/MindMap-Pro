/* =========================================================================
   dashboard.js
   ========================================================================= */

let allFiles = [];
let pendingDeleteId = null;
let pendingRenameId = null;

function toast(msg, type = '') {
  const stack = document.getElementById('toastStack');
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + ' min ago';
  if (diff < 86400) return Math.floor(diff / 3600) + ' hours ago';
  if (diff < 86400 * 30) return Math.floor(diff / 86400) + ' days ago';
  return Math.floor(diff / (86400 * 30)) + ' months ago';
}

function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  document.getElementById('themeSwitch').classList.toggle('on', theme === 'dark');
  localStorage.setItem('mmpro_theme', theme);
}

function initThemeToggle() {
  const saved = localStorage.getItem('mmpro_theme') || 'light';
  applyTheme(saved);
  document.getElementById('themeSwitch').addEventListener('click', () => {
    const cur = document.body.getAttribute('data-theme');
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  });
}

async function refreshList() {
  try {
    allFiles = await DriveApi.listDiagrams();
    renderGrid(allFiles);
    document.getElementById('usageLabel').textContent = `${allFiles.length} diagram${allFiles.length === 1 ? '' : 's'}`;
  } catch (e) {
    console.error(e);
    toast('Diagram list load korte problem hocche: ' + e.message, 'error');
  }
}

function renderGrid(files) {
  const grid = document.getElementById('grid');
  const empty = document.getElementById('emptyState');
  grid.innerHTML = '';

  const newCard = document.createElement('div');
  newCard.className = 'new-diagram-card';
  newCard.innerHTML = `<div class="plus-circle">＋</div><div style="font-weight:700; font-size:.85rem;">Create Diagram</div>`;
  newCard.addEventListener('click', createDiagram);
  grid.appendChild(newCard);

  empty.style.display = (files.length === 0) ? 'block' : 'none';

  files.forEach(f => {
    const card = document.createElement('div');
    card.className = 'diagram-card';
    card.innerHTML = `
      <div class="diagram-thumb">
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.4" opacity=".5">
          <circle cx="12" cy="12" r="3"/><circle cx="4" cy="6" r="2"/><circle cx="20" cy="6" r="2"/><circle cx="4" cy="18" r="2"/><circle cx="20" cy="18" r="2"/>
          <path d="M9.5 10.5L6 7.5M14.5 10.5L18 7.5M9.5 13.5L6 16.5M14.5 13.5L18 16.5"/>
        </svg>
      </div>
      <div class="diagram-card-body">
        <div class="diagram-card-name">${escapeHtml(f.name)}</div>
        <div class="diagram-card-meta">🔒 Edited ${timeAgo(f.modifiedTime)}</div>
      </div>
      <div class="diagram-card-actions">
        <button class="btn btn-sm btn-subtle" data-act="open">Open</button>
        <button class="btn btn-sm btn-ghost" data-act="rename">✏️</button>
        <button class="btn btn-sm btn-ghost" data-act="dup">⧉</button>
        <button class="btn btn-sm btn-ghost" data-act="del">🗑️</button>
      </div>`;
    card.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (!act || act === 'open') { openDiagram(f.id); return; }
      e.stopPropagation();
      if (act === 'rename') openRenameModal(f.id, f.name);
      if (act === 'dup') duplicateDiagram(f.id, f.name);
      if (act === 'del') openDeleteModal(f.id);
    });
    grid.appendChild(card);
  });
}

function escapeHtml(s) { return (s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function openDiagram(id) { window.location.href = `editor.html?id=${encodeURIComponent(id)}`; }

async function createDiagram() {
  const btn = document.getElementById('createBtn');
  btn.disabled = true;
  try {
    const model = mmCreateDefaultMap('Untitled Mind Map');
    const json = mmSerialize(model, {});
    const created = await DriveApi.createDiagram('Untitled Mind Map', json);
    toast('Notun diagram toiri holo!', 'success');
    openDiagram(created.id);
  } catch (e) {
    console.error(e);
    toast('Create korte problem hocche: ' + e.message, 'error');
  } finally { btn.disabled = false; }
}

async function duplicateDiagram(id, name) {
  toast('Duplicate hocche...');
  try {
    await DriveApi.duplicateDiagram(id, name + ' (copy)');
    toast('Duplicate hoye geche', 'success');
    refreshList();
  } catch (e) { toast('Duplicate fail: ' + e.message, 'error'); }
}

function openRenameModal(id, name) {
  pendingRenameId = id;
  document.getElementById('renameInput').value = name;
  document.getElementById('renameModalBackdrop').style.display = 'flex';
  document.getElementById('renameInput').focus();
}
function closeRenameModal() { document.getElementById('renameModalBackdrop').style.display = 'none'; pendingRenameId = null; }

function openDeleteModal(id) { pendingDeleteId = id; document.getElementById('deleteModalBackdrop').style.display = 'flex'; }
function closeDeleteModal() { document.getElementById('deleteModalBackdrop').style.display = 'none'; pendingDeleteId = null; }

function wireModals() {
  document.getElementById('renameCancel').onclick = closeRenameModal;
  document.getElementById('renameConfirm').onclick = async () => {
    const newName = document.getElementById('renameInput').value.trim();
    if (!newName || !pendingRenameId) return closeRenameModal();
    try {
      await DriveApi.renameDiagram(pendingRenameId, newName);
      toast('Rename hoye geche', 'success');
      refreshList();
    } catch (e) { toast('Rename fail: ' + e.message, 'error'); }
    closeRenameModal();
  };
  document.getElementById('deleteCancel').onclick = closeDeleteModal;
  document.getElementById('deleteConfirm').onclick = async () => {
    if (!pendingDeleteId) return closeDeleteModal();
    const id = pendingDeleteId;
    closeDeleteModal();
    try {
      await DriveApi.deleteDiagram(id);
      LocalCache.remove(id);
      toast('Diagram muche fela hoyeche', 'success');
      refreshList();
    } catch (e) { toast('Delete fail: ' + e.message, 'error'); }
  };
}

function wireSearch() {
  document.getElementById('searchInput').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    renderGrid(!q ? allFiles : allFiles.filter(f => f.name.toLowerCase().includes(q)));
  });
}

function wireImport() {
  document.getElementById('navImport').addEventListener('click', () => document.getElementById('importFileInput').click());
  document.getElementById('importFileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      JSON.parse(text); // validate
      const name = file.name.replace(/\.json$/i, '') || 'Imported Mind Map';
      const created = await DriveApi.createDiagram(name, text);
      toast('Import hoye geche!', 'success');
      openDiagram(created.id);
    } catch (err) {
      toast('Import fail — valid MindMap Pro JSON file dite hobe.', 'error');
    }
    e.target.value = '';
  });
}

function renderTemplates() {
  const grid = document.getElementById('templateGrid');
  const tabsWrap = document.getElementById('templateTabs');
  if (!grid || !tabsWrap || typeof MM_TEMPLATES === 'undefined') return;

  const categories = ['All', ...Array.from(new Set(MM_TEMPLATES.map(t => t.category)))];
  let activeCat = 'All';

  function renderTabs() {
    tabsWrap.innerHTML = categories.map(c =>
      `<button class="tpl-tab ${c === activeCat ? 'active' : ''}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`
    ).join('');
    tabsWrap.querySelectorAll('.tpl-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        activeCat = btn.dataset.cat;
        renderTabs();
        renderCards();
      });
    });
  }

  function renderCards() {
    grid.innerHTML = '';
    const list = activeCat === 'All' ? MM_TEMPLATES : MM_TEMPLATES.filter(t => t.category === activeCat);
    list.forEach(tpl => {
      const card = document.createElement('div');
      card.className = 'template-card';
      card.style.setProperty('--tpl-accent', tpl.accent);
      let thumb = '';
      try { thumb = mmTemplateThumbnailSvg(tpl.key, 230, 96); } catch (e) { console.warn('thumbnail fail', tpl.key, e); }
      card.innerHTML = `
        <div class="template-card-top">
          <span class="template-card-badge">✨ PRO</span>
          <div class="template-card-thumb">${thumb}</div>
        </div>
        <div class="template-card-body">
          <div class="template-card-title">${tpl.icon} ${escapeHtml(tpl.title)}</div>
          <div class="template-card-tagline">${escapeHtml(tpl.tagline)}</div>
          <button class="template-card-use" data-key="${tpl.key}">Use template</button>
        </div>`;
      card.querySelector('.template-card-use').addEventListener('click', (e) => {
        e.stopPropagation();
        createFromTemplate(tpl.key, tpl.title);
      });
      grid.appendChild(card);
    });
  }

  renderTabs();
  renderCards();
}

async function createFromTemplate(key, title) {
  try {
    const model = mmCreateTemplateMap(key, title);
    const json = mmSerialize(model, {});
    const created = await DriveApi.createDiagram(title, json);
    toast(`${title} template diye notun diagram toiri holo!`, 'success');
    openDiagram(created.id);
  } catch (e) {
    console.error(e);
    toast('Template diye create korte problem hocche: ' + e.message, 'error');
  }
}

function showSignedInUI(user) {
  document.getElementById('signinSplash').style.display = 'none';
  document.getElementById('dashShell').style.display = 'flex';
  document.getElementById('userName').textContent = user?.name || 'Google User';
  document.getElementById('userEmail').textContent = user?.email || '';
  const avatar = document.getElementById('avatar');
  if (user?.picture) avatar.innerHTML = `<img src="${user.picture}" alt="">`;
  else avatar.textContent = (user?.name || 'U')[0].toUpperCase();
  renderTemplates();
  refreshList();
}

function showSignedOutUI() {
  document.getElementById('signinSplash').style.display = 'flex';
  document.getElementById('dashShell').style.display = 'none';
}

async function boot() {
  initThemeToggle();
  wireModals();
  wireSearch();
  wireImport();

  document.getElementById('splashSignIn').addEventListener('click', async () => {
    try { await Auth.signIn(true); } catch (e) { toast('Sign in fail holo. Abar try korun.', 'error'); }
  });
  document.getElementById('signOutBtn').addEventListener('click', () => Auth.signOut());
  document.getElementById('createBtn').addEventListener('click', createDiagram);

  try {
    await Auth.init((status, data) => {
      if (status === 'signed-in') showSignedInUI(data);
      else if (status === 'signed-out') showSignedOutUI();
      else if (status === 'error') toast('Google auth error — GitHub Pages domain ta Google Cloud Console e "Authorized JavaScript origins" e add kora ache kina check korun.', 'error');
    });
    // Auth.init() already tries to restore a still-valid session (saved by
    // index.html/editor.html earlier in this tab) and fires 'signed-in'
    // above if it succeeds. Only fall back to the sign-in splash if that
    // didn't happen.
    if (!Auth.isSignedIn()) showSignedOutUI();
  } catch (e) {
    console.error(e);
    toast(e.message, 'error');
  }
}

window.addEventListener('load', boot);
