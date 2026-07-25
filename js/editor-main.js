/* =========================================================================
   editor-main.js — sob module wire kore boot kore.
   ========================================================================= */

function qparam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function updateSaveStatusUI(evt) {
  const el = document.getElementById('saveStatus');
  const label = document.getElementById('saveStatusLabel');
  el.classList.remove('saving', 'saved', 'error');
  if (evt.state === 'saving') { el.classList.add('saving'); label.textContent = 'Saving to Drive...'; }
  else if (evt.state === 'saved') { el.classList.add('saved'); label.textContent = 'Saved to Drive'; }
  else if (evt.state === 'error') {
    el.classList.add('error');
    label.textContent = 'Cloud save failed (saved locally)';
    EditorToolbar.toast('Google Drive এ save করতে সমস্যা হচ্ছে — কাজ locally safe আছে, connection ঠিক হলে auto-retry হবে। (' + evt.message + ')', 'error');
  }
}

function renderAll() {
  EditorRender.render(EditorState.model, EditorState.getSelection(), EditorToolbar.getSearchHighlights());
  EditorPanel.refresh();
  EditorToolbar.refreshUndoRedoState();
  const nameInput = document.getElementById('diagramNameInput');
  if (document.activeElement !== nameInput) nameInput.value = EditorState.fileName;
  document.getElementById('layoutSelect').value = EditorState.model.layout || 'radial';
  EditorToolbar.applyThemeToDom(EditorState.model.theme || 'light');
}

async function loadOwnerDiagram(fileId) {
  // 1) local cache first (instant paint, offline-safe)
  const cached = LocalCache.load(fileId);
  if (cached) {
    EditorState.loadFromJson(cached, fileId, null);
    renderAll();
    EditorRender.resetView();
  }
  // 2) then reconcile with Drive (source of truth) if newer
  try {
    const remote = await DriveApi.getDiagramContent(fileId);
    EditorState.loadFromJson(remote, fileId, null);
    LocalCache.save(fileId, remote);
    renderAll();
    if (!cached) EditorRender.resetView();
  } catch (e) {
    console.error(e);
    if (!cached) {
      EditorToolbar.toast('Diagram Drive theke load korte parlam na: ' + e.message, 'error');
    } else {
      EditorToolbar.toast('Offline / Drive access nei — locally saved version dekhano hocche.', 'error');
    }
  }
}

async function loadPublicReadOnly(fileId) {
  document.getElementById('editorShell').classList.add('readonly-mode');
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${APP_CONFIG.GOOGLE_API_KEY}`);
    if (!res.ok) throw new Error('File private ache athoba link vul.');
    const text = await res.text();
    EditorState.loadFromJson(text, null, null);
    renderAll();
    EditorRender.resetView();
    document.getElementById('toolbarRoot').innerHTML = `<div style="padding:10px 14px; font-weight:700;">👁️ View-only mode — <a href="index.html" style="color:var(--accent);">sign in to edit your own diagrams</a></div>`;
    document.getElementById('editorPanel').classList.add('hidden');
  } catch (e) {
    document.body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:10px;font-family:sans-serif;">
      <h2>Diagram khola gelo na</h2><p style="color:#888;">${e.message}</p><a href="index.html">← MindMap Pro e ferot jan</a></div>`;
  }
}

async function boot() {
  EditorPanel.init();
  EditorToolbar.init();
  EditorRender.init(document.getElementById('canvasSvg'), document.getElementById('canvasWrap'), EditorToolbar.showContextMenu);

  EditorState.on('change', () => renderAll());
  EditorState.on('saveStatus', updateSaveStatusUI);

  const fileId = qparam('id');
  const isPublicView = qparam('view') === '1';

  if (!fileId) {
    window.location.href = 'index.html';
    return;
  }

  if (isPublicView) {
    // Public view-only path doesn't require sign-in at all.
    await loadPublicReadOnly(fileId);
    return;
  }

  try {
    await Auth.init((status, data) => {
      if (status === 'signed-in') {
        document.getElementById('userChip').innerHTML = data?.picture
          ? `<img src="${data.picture}" style="width:26px;height:26px;border-radius:50%;">`
          : '';
      } else if (status === 'signed-out') {
        window.location.href = 'index.html';
      } else if (status === 'error') {
        EditorToolbar.toast('Auth error — Google Cloud Console e authorized origin check korun.', 'error');
      }
    });
    // Silent token check — user already consented on the dashboard, so this
    // should succeed without a popup. If it fails (session expired), bounce
    // back to the dashboard to sign in again.
    try { await Auth.ensureFreshToken(); await loadOwnerDiagram(fileId); }
    catch (e) { window.location.href = 'index.html'; }
  } catch (e) {
    console.error(e);
    EditorToolbar.toast(e.message, 'error');
  }
}

window.addEventListener('load', boot);
window.addEventListener('beforeunload', (e) => {
  if (EditorState.dirty) {
    EditorState.forceSaveNow();
  }
});
