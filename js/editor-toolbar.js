/* =========================================================================
   editor-toolbar.js
   ========================================================================= */

const EditorToolbar = (() => {

  function toast(msg, type = '') {
    const stack = document.getElementById('toastStack');
    const elx = document.createElement('div');
    elx.className = 'toast ' + type;
    elx.textContent = msg;
    stack.appendChild(elx);
    setTimeout(() => elx.remove(), 4200);
  }

  function wireBack() {
    document.getElementById('backBtn').addEventListener('click', async () => {
      await EditorState.forceSaveNow().catch(() => {});
      window.location.href = 'index.html';
    });
  }

  function wireNameInput() {
    const input = document.getElementById('diagramNameInput');
    input.addEventListener('blur', () => {
      const v = input.value.trim() || 'Untitled Mind Map';
      input.value = v;
      EditorState.renameFile(v);
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
  }

  function wireUndoRedo() {
    document.getElementById('undoBtn').addEventListener('click', () => EditorState.undo());
    document.getElementById('redoBtn').addEventListener('click', () => EditorState.redo());
  }

  function refreshUndoRedoState() {
    document.getElementById('undoBtn').disabled = !EditorState.canUndo();
    document.getElementById('redoBtn').disabled = !EditorState.canRedo();
  }

  function wireZoom() {
    const pctLabel = document.getElementById('zoomPct');
    function update() { pctLabel.textContent = Math.round(EditorRender.getZoom() * 100) + '%'; }
    document.getElementById('zoomInBtn').addEventListener('click', () => { EditorRender.setZoom(EditorRender.getZoom() * 1.2); update(); });
    document.getElementById('zoomOutBtn').addEventListener('click', () => { EditorRender.setZoom(EditorRender.getZoom() / 1.2); update(); });
    document.getElementById('zoomResetBtn').addEventListener('click', () => { EditorRender.resetView(); update(); });
    update();
  }

  function wireLayout() {
    const sel = document.getElementById('layoutSelect');
    sel.addEventListener('change', () => {
      EditorState.setLayout(sel.value);
    });
  }

  function wireAutoArrange() {
    const btn = document.getElementById('autoArrangeBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      EditorState.clearCustomPositions();
      EditorRender.resetView();
      toast('Mind map auto-arrange kora hoyeche');
    });
  }

  function wireTheme() {
    document.getElementById('themeToggleBtn').addEventListener('click', () => {
      const cur = EditorState.model.theme === 'dark' ? 'light' : 'dark';
      EditorState.setTheme(cur);
      applyThemeToDom(cur);
    });
  }

  function applyThemeToDom(theme) {
    document.body.setAttribute('data-theme', theme);
    document.getElementById('canvasWrap').classList.toggle('dark-canvas', theme === 'dark');
    document.getElementById('themeToggleBtn').textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  /* ---------- Export / Import ---------- */
  function wireExportImport() {
    document.getElementById('exportMenuBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      openExportMenu(e.currentTarget);
    });
    document.getElementById('importInput').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        EditorState.loadFromJson(text, EditorState.fileId, EditorState.fileName);
        EditorState.markDirtyAndSave({ skipHistory: true });
        toast('Import hoye geche', 'success');
      } catch (err) { toast('Import fail — valid JSON na.', 'error'); }
      e.target.value = '';
    });
  }

  function openExportMenu(anchor) {
    closeAnyMenu();
    const rect = anchor.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.className = 'ctx-menu';
    menu.id = 'exportMenu';
    menu.style.top = (rect.bottom + 6) + 'px';
    menu.style.left = Math.min(rect.left, window.innerWidth - 210) + 'px';
    menu.innerHTML = `
      <div class="ctx-item" data-x="png">🖼️ Export as PNG</div>
      <div class="ctx-item" data-x="svg">📐 Export as SVG</div>
      <div class="ctx-item" data-x="json">🗂️ Export as JSON</div>
      <div class="ctx-item" data-x="md">📝 Export as Markdown</div>
      <div class="ctx-sep"></div>
      <div class="ctx-item" data-x="import">📥 Import JSON</div>
    `;
    document.body.appendChild(menu);
    menu.addEventListener('click', (e) => {
      const act = e.target.closest('[data-x]')?.dataset.x;
      if (!act) return;
      closeAnyMenu();
      if (act === 'png') exportPng();
      if (act === 'svg') exportSvg();
      if (act === 'json') exportJson();
      if (act === 'md') exportMarkdown();
      if (act === 'import') document.getElementById('importInput').click();
    });
  }

  function closeAnyMenu() {
    document.querySelectorAll('.ctx-menu').forEach(m => m.remove());
  }

  function download(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function exportJson() { download(`${EditorState.fileName}.json`, EditorState.snapshot(), 'application/json'); }

  function exportSvg() { download(`${EditorState.fileName}.svg`, EditorRender.exportSvgString(), 'image/svg+xml'); }

  function exportPng() {
    const svgStr = EditorRender.exportSvgString();
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width * 2; canvas.height = img.height * 2;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = EditorState.model.theme === 'dark' ? '#0F1116' : '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const a = document.createElement('a');
      a.download = `${EditorState.fileName}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = url;
  }

  function exportMarkdown() {
    const model = EditorState.model;
    let md = '';
    function walk(id, depth) {
      const node = model.nodes.get(id);
      if (!node) return;
      md += `${'  '.repeat(depth)}- ${node.text}\n`;
      node.children.forEach(cid => walk(cid, depth + 1));
    }
    walk(model.rootId, 0);
    download(`${EditorState.fileName}.md`, md, 'text/markdown');
  }

  /* ---------- Search ---------- */
  let searchMatches = [];
  let searchIdx = -1;
  function wireSearch() {
    const overlay = document.getElementById('searchOverlay');
    const input = document.getElementById('searchInputEditor');
    document.getElementById('searchToggleBtn').addEventListener('click', () => {
      overlay.style.display = overlay.style.display === 'flex' ? 'none' : 'flex';
      if (overlay.style.display === 'flex') input.focus();
      else { searchMatches = []; render(); }
    });
    input.addEventListener('input', () => {
      searchMatches = EditorState.findNodes(input.value);
      searchIdx = searchMatches.length ? 0 : -1;
      updateSearchCount();
      render();
      if (searchIdx >= 0) EditorRender.focusOnNode(searchMatches[searchIdx]);
    });
    document.getElementById('searchNextBtn').addEventListener('click', () => stepSearch(1));
    document.getElementById('searchPrevBtn').addEventListener('click', () => stepSearch(-1));
    function stepSearch(dir) {
      if (!searchMatches.length) return;
      searchIdx = (searchIdx + dir + searchMatches.length) % searchMatches.length;
      updateSearchCount();
      EditorRender.focusOnNode(searchMatches[searchIdx]);
      EditorState.select(searchMatches[searchIdx], false);
    }
    function updateSearchCount() {
      document.getElementById('searchCount').textContent = searchMatches.length ? `${searchIdx + 1}/${searchMatches.length}` : '0/0';
    }
  }
  function getSearchHighlights() { return searchMatches; }

  /* ---------- Presentation mode ---------- */
  function wirePresentation() {
    document.getElementById('presentBtn').addEventListener('click', startPresentation);
  }
  function startPresentation() {
    const model = EditorState.model;
    const order = [];
    (function walk(id) { order.push(id); const n = model.nodes.get(id); if (n && !n.collapsed) n.children.forEach(walk); })(model.rootId);
    let idx = 0;
    const shell = document.createElement('div');
    shell.className = 'present-shell';
    shell.innerHTML = `
      <div class="present-stage"><div class="present-node" id="presentNode"></div></div>
      <div class="present-bar">
        <button class="btn btn-ghost" id="presentPrev">◀ Prev</button>
        <span class="present-count" id="presentCount"></span>
        <button class="btn btn-ghost" id="presentNext">Next ▶</button>
        <button class="btn btn-danger" id="presentExit">Exit (Esc)</button>
      </div>`;
    document.body.appendChild(shell);
    function show() {
      const node = model.nodes.get(order[idx]);
      const el = document.getElementById('presentNode');
      el.textContent = (node.icon ? node.icon + ' ' : '') + node.text;
      el.style.background = node.fillColor || 'var(--surface)';
      el.style.color = node.textColor || 'var(--text)';
      el.style.border = `2px solid ${node.borderColor || 'var(--border)'}`;
      document.getElementById('presentCount').textContent = `${idx + 1} / ${order.length}`;
    }
    function next() { idx = Math.min(order.length - 1, idx + 1); show(); }
    function prev() { idx = Math.max(0, idx - 1); show(); }
    document.getElementById('presentNext').onclick = next;
    document.getElementById('presentPrev').onclick = prev;
    document.getElementById('presentExit').onclick = exit;
    function keyHandler(e) {
      if (e.key === 'Escape') exit();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    }
    function exit() { shell.remove(); window.removeEventListener('keydown', keyHandler); }
    window.addEventListener('keydown', keyHandler);
    show();
  }

  /* ---------- Share ---------- */
  function wireShare() {
    document.getElementById('shareBtn').addEventListener('click', async () => {
      if (!EditorState.fileId) return;
      const btn = document.getElementById('shareBtn');
      btn.disabled = true;
      try {
        await DriveApi.setPublicReadable(EditorState.fileId, true);
        const link = `${window.location.origin}${window.location.pathname}?id=${EditorState.fileId}&view=1`;
        await navigator.clipboard.writeText(link).catch(() => {});
        toast('View-only link clipboard e copy hoye geche!', 'success');
      } catch (e) { toast('Share link toiri korte problem hocche: ' + e.message, 'error'); }
      btn.disabled = false;
    });
  }

  /* ---------- Context menu (right-click on a node) ---------- */
  function showContextMenu(x, y, nodeId) {
    closeAnyMenu();
    const model = EditorState.model;
    const isRoot = nodeId === model.rootId;
    const menu = document.createElement('div');
    menu.className = 'ctx-menu';
    menu.style.top = Math.min(y, window.innerHeight - 260) + 'px';
    menu.style.left = Math.min(x, window.innerWidth - 210) + 'px';
    menu.innerHTML = `
      <div class="ctx-item" data-a="addChild">➕ Add child <span class="hint-badge">Tab</span></div>
      ${!isRoot ? `<div class="ctx-item" data-a="addSibling">➕ Add sibling <span class="hint-badge">Enter</span></div>` : ''}
      <div class="ctx-item" data-a="toggleCollapse">🔽 Expand/Collapse</div>
      <div class="ctx-sep"></div>
      <div class="ctx-item" data-a="copy">⧉ Copy <span class="hint-badge">Ctrl+C</span></div>
      <div class="ctx-item" data-a="paste">📋 Paste as child <span class="hint-badge">Ctrl+V</span></div>
      <div class="ctx-sep"></div>
      ${!isRoot ? `<div class="ctx-item danger" data-a="delete">🗑️ Delete <span class="hint-badge">Del</span></div>` : ''}
    `;
    document.body.appendChild(menu);
    menu.addEventListener('click', (e) => {
      const act = e.target.closest('[data-a]')?.dataset.a;
      closeAnyMenu();
      if (act === 'addChild') { const id = EditorState.addChild(nodeId, 'New idea'); EditorState.select(id, false); }
      if (act === 'addSibling') { const id = EditorState.addSibling(nodeId); EditorState.select(id, false); }
      if (act === 'toggleCollapse') EditorState.toggleCollapse(nodeId);
      if (act === 'copy') { EditorState.select(nodeId, false); EditorState.copySelection(); toast('Copied'); }
      if (act === 'paste') { const id = EditorState.pasteAsChild(nodeId); if (id) EditorState.select(id, false); }
      if (act === 'delete') EditorState.deleteNode(nodeId);
    });
  }

  document.addEventListener('click', closeAnyMenu);

  /* ---------- Keyboard shortcuts ---------- */
  function wireKeyboard() {
    window.addEventListener('keydown', (e) => {
      const tag = (document.activeElement && document.activeElement.tagName) || '';
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return; // don't hijack typing
      const id = EditorState.primarySelected();

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); EditorState.undo(); }
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); EditorState.redo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); EditorState.forceSaveNow(); toast('Save hocche...'); }
      else if ((e.ctrlKey || e.metaKey) && e.key === 'c' && id) { EditorState.copySelection(); }
      else if ((e.ctrlKey || e.metaKey) && e.key === 'v' && id) { const nid = EditorState.pasteAsChild(id); if (nid) EditorState.select(nid, false); }
      else if (e.key === 'Tab' && id) { e.preventDefault(); const nid = EditorState.addChild(id, 'New idea'); EditorState.select(nid, false); }
      else if (e.key === 'Enter' && id && id !== EditorState.model.rootId) { e.preventDefault(); const nid = EditorState.addSibling(id); EditorState.select(nid, false); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && id && id !== EditorState.model.rootId) { e.preventDefault(); EditorState.deleteSelected(); }
      else if (e.key === 'Escape') { EditorState.clearSelection(); closeAnyMenu(); }
      else if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); document.getElementById('searchToggleBtn').click(); }
    });
  }

  function init() {
    wireBack(); wireNameInput(); wireUndoRedo(); wireZoom(); wireLayout(); wireAutoArrange();
    wireTheme(); wireExportImport(); wireSearch(); wirePresentation(); wireShare(); wireKeyboard();
  }

  return { init, refreshUndoRedoState, applyThemeToDom, showContextMenu, getSearchHighlights, toast };
})();
