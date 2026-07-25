/* =========================================================================
   editor-panel.js — right sidebar: content + style controls for the
   currently selected node.
   ========================================================================= */

const EditorPanel = (() => {
  const ICONS = ['💡','⭐','🔥','✅','❗','❓','📌','🎯','🚀','📅','💰','📈','🔗','🎨','🧩','⚡'];
  let panelEl, contentEls;

  function init() {
    panelEl = document.getElementById('editorPanel');
    contentEls = {
      text: document.getElementById('nodeText'),
      note: document.getElementById('nodeNote'),
      imageUrl: document.getElementById('nodeImageUrl'),
      imgPreview: document.getElementById('nodeImagePreview'),
      linkUrl: document.getElementById('nodeLinkUrl'),
      tag: document.getElementById('nodeTag'),
      fill: document.getElementById('nodeFillColor'),
      border: document.getElementById('nodeBorderColor'),
      textColor: document.getElementById('nodeTextColor'),
      fontSize: document.getElementById('nodeFontSize'),
      fontSizeVal: document.getElementById('nodeFontSizeVal'),
      progress: document.getElementById('nodeProgress'),
      progressVal: document.getElementById('nodeProgressVal'),
      progressToggle: document.getElementById('nodeProgressToggle'),
      fontFamily: document.getElementById('nodeFontFamily'),
      borderWidth: document.getElementById('nodeBorderWidth'),
      borderStyle: document.getElementById('nodeBorderStyle'),
      cornerRadius: document.getElementById('nodeCornerRadius'),
      cornerRadiusVal: document.getElementById('nodeCornerRadiusVal'),
    };
    buildIconGrid();
    wireEvents();
    window.addEventListener('mm-inline-edit', (e) => {
      EditorState.select(e.detail.id, false);
      setTimeout(() => contentEls.text.focus(), 30);
    });
  }

  function buildIconGrid() {
    const grid = document.getElementById('iconGrid');
    grid.innerHTML = '<button data-icon="" title="None">∅</button>' + ICONS.map(i => `<button data-icon="${i}">${i}</button>`).join('');
    grid.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = EditorState.primarySelected();
        if (!id) return;
        EditorState.updateNode(id, { icon: btn.dataset.icon });
        refresh();
      });
    });
  }

  function debounceTextUpdate() {
    let t = null;
    return (id, patch) => {
      clearTimeout(t);
      t = setTimeout(() => EditorState.updateNode(id, patch), 250);
    };
  }
  const debouncedUpdate = debounceTextUpdate();

  function wireEvents() {
    contentEls.text.addEventListener('input', () => {
      const id = EditorState.primarySelected(); if (!id) return;
      debouncedUpdate(id, { text: contentEls.text.value || 'Node' });
    });
    contentEls.note.addEventListener('input', () => {
      const id = EditorState.primarySelected(); if (!id) return;
      debouncedUpdate(id, { note: contentEls.note.value });
    });
    contentEls.imageUrl.addEventListener('input', () => {
      const id = EditorState.primarySelected(); if (!id) return;
      const url = contentEls.imageUrl.value.trim();
      contentEls.imgPreview.style.display = url ? 'block' : 'none';
      contentEls.imgPreview.src = url;
      debouncedUpdate(id, { imageUrl: url });
    });
    contentEls.linkUrl.addEventListener('input', () => {
      const id = EditorState.primarySelected(); if (!id) return;
      debouncedUpdate(id, { linkUrl: contentEls.linkUrl.value.trim() });
    });
    contentEls.tag.addEventListener('input', () => {
      const id = EditorState.primarySelected(); if (!id) return;
      debouncedUpdate(id, { tag: contentEls.tag.value.trim().slice(0, 12) });
    });
    contentEls.fill.addEventListener('input', () => {
      const id = EditorState.primarySelected(); if (!id) return;
      EditorState.updateNode(id, { fillColor: contentEls.fill.value });
    });
    contentEls.border.addEventListener('input', () => {
      const id = EditorState.primarySelected(); if (!id) return;
      EditorState.updateNode(id, { borderColor: contentEls.border.value });
    });
    contentEls.textColor.addEventListener('input', () => {
      const id = EditorState.primarySelected(); if (!id) return;
      EditorState.updateNode(id, { textColor: contentEls.textColor.value });
    });
    contentEls.fontSize.addEventListener('input', () => {
      const id = EditorState.primarySelected(); if (!id) return;
      contentEls.fontSizeVal.textContent = contentEls.fontSize.value;
      EditorState.updateNode(id, { fontSize: Number(contentEls.fontSize.value) });
    });
    contentEls.fontFamily.addEventListener('change', () => {
      const id = EditorState.primarySelected(); if (!id) return;
      EditorState.updateNode(id, { fontFamily: contentEls.fontFamily.value });
    });
    contentEls.borderWidth.addEventListener('change', () => {
      const id = EditorState.primarySelected(); if (!id) return;
      EditorState.updateNode(id, { borderWidth: Number(contentEls.borderWidth.value) });
    });
    contentEls.borderStyle.addEventListener('change', () => {
      const id = EditorState.primarySelected(); if (!id) return;
      EditorState.updateNode(id, { borderStyle: contentEls.borderStyle.value });
    });
    contentEls.cornerRadius.addEventListener('input', () => {
      const id = EditorState.primarySelected(); if (!id) return;
      contentEls.cornerRadiusVal.textContent = contentEls.cornerRadius.value;
      EditorState.updateNode(id, { cornerRadius: Number(contentEls.cornerRadius.value) });
    });
    document.getElementById('fillToggle').addEventListener('click', () => {
      const id = EditorState.primarySelected(); if (!id) return;
      const node = EditorState.model.nodes.get(id);
      EditorState.updateNode(id, { filled: !(node.filled !== false) });
      refresh();
    });
    document.getElementById('shadowToggle').addEventListener('click', () => {
      const id = EditorState.primarySelected(); if (!id) return;
      const node = EditorState.model.nodes.get(id);
      EditorState.updateNode(id, { shadow: !node.shadow });
      refresh();
    });
    contentEls.progressToggle.addEventListener('click', () => {
      const id = EditorState.primarySelected(); if (!id) return;
      const node = EditorState.model.nodes.get(id);
      const enabling = node.progress == null;
      EditorState.updateNode(id, { progress: enabling ? 0 : null });
      refresh();
    });
    contentEls.progress.addEventListener('input', () => {
      const id = EditorState.primarySelected(); if (!id) return;
      contentEls.progressVal.textContent = contentEls.progress.value + '%';
      EditorState.updateNode(id, { progress: Number(contentEls.progress.value) });
    });

    document.querySelectorAll('.shape-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        const id = EditorState.primarySelected(); if (!id) return;
        EditorState.updateNode(id, { shape: opt.dataset.shape });
        refresh();
      });
    });
    document.getElementById('boldToggle').addEventListener('click', () => {
      const id = EditorState.primarySelected(); if (!id) return;
      const node = EditorState.model.nodes.get(id);
      EditorState.updateNode(id, { bold: !node.bold });
      refresh();
    });
    document.getElementById('italicToggle').addEventListener('click', () => {
      const id = EditorState.primarySelected(); if (!id) return;
      const node = EditorState.model.nodes.get(id);
      EditorState.updateNode(id, { italic: !node.italic });
      refresh();
    });
    document.getElementById('panelClose').addEventListener('click', () => EditorState.clearSelection());
    document.getElementById('panelAddChild').addEventListener('click', () => {
      const id = EditorState.primarySelected(); if (!id) return;
      const newId = EditorState.addChild(id, 'New idea');
      EditorState.select(newId, false);
    });
    document.getElementById('panelDelete').addEventListener('click', () => {
      const id = EditorState.primarySelected(); if (!id) return;
      if (id === EditorState.model.rootId) return;
      EditorState.deleteNode(id);
    });
  }

  function refresh() {
    const sel = EditorState.getSelection();
    const id = EditorState.primarySelected();
    if (!id || sel.size === 0) { panelEl.classList.add('hidden'); return; }
    panelEl.classList.remove('hidden');
    const node = EditorState.model.nodes.get(id);
    if (!node) { panelEl.classList.add('hidden'); return; }

    document.getElementById('panelMultiHint').style.display = sel.size > 1 ? 'block' : 'none';
    document.getElementById('panelMultiHint').textContent = sel.size > 1 ? `${sel.size} nodes selected` : '';

    if (document.activeElement !== contentEls.text) contentEls.text.value = node.text || '';
    if (document.activeElement !== contentEls.note) contentEls.note.value = node.note || '';
    if (document.activeElement !== contentEls.imageUrl) contentEls.imageUrl.value = node.imageUrl || '';
    if (document.activeElement !== contentEls.linkUrl) contentEls.linkUrl.value = node.linkUrl || '';
    if (document.activeElement !== contentEls.tag) contentEls.tag.value = node.tag || '';
    contentEls.imgPreview.style.display = node.imageUrl ? 'block' : 'none';
    if (node.imageUrl) contentEls.imgPreview.src = node.imageUrl;
    contentEls.fill.value = node.fillColor || '#ffffff';
    contentEls.border.value = node.borderColor || '#c7cbd9';
    contentEls.textColor.value = node.textColor || '#171a21';
    contentEls.fontSize.value = node.fontSize || 14;
    contentEls.fontSizeVal.textContent = node.fontSize || 14;
    contentEls.progressToggle.textContent = node.progress == null ? 'Add progress bar' : 'Remove progress bar';
    document.getElementById('progressRow').style.display = node.progress == null ? 'none' : 'flex';
    contentEls.progress.value = node.progress || 0;
    contentEls.progressVal.textContent = (node.progress || 0) + '%';

    contentEls.fontFamily.value = node.fontFamily || 'Inter';
    contentEls.borderWidth.value = String(node.borderWidth != null ? node.borderWidth : 2);
    contentEls.borderStyle.value = node.borderStyle || 'solid';
    contentEls.cornerRadius.value = node.cornerRadius != null ? node.cornerRadius : 14;
    contentEls.cornerRadiusVal.textContent = contentEls.cornerRadius.value;
    document.getElementById('cornerRadiusField').style.display =
      (node.shape === 'rounded' || node.shape === 'rect' || !node.shape) ? 'flex' : 'none';
    document.getElementById('fillToggle').classList.toggle('active', node.filled !== false);
    document.getElementById('shadowToggle').classList.toggle('active', !!node.shadow);

    document.querySelectorAll('.shape-opt').forEach(o => o.classList.toggle('active', o.dataset.shape === (node.shape || 'rounded')));
    document.querySelectorAll('#iconGrid button').forEach(b => b.classList.toggle('active', b.dataset.icon === (node.icon || '')));
    document.getElementById('boldToggle').classList.toggle('active', !!node.bold);
    document.getElementById('italicToggle').classList.toggle('active', !!node.italic);
    document.getElementById('panelDelete').disabled = (id === EditorState.model.rootId);
  }

  return { init, refresh };
})();
