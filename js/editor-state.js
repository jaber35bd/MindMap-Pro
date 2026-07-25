/* =========================================================================
   editor-state.js — central state, undo/redo history, autosave pipeline.

   Save strategy (eta-i "bar bar Saved failed" somossa fix kore):
     1. Prottek change e SYNCHRONOUSLY localStorage e save hoy (kokhono
        fail hoy na, kaj hariye jawar chance nei).
     2. Debounce kore (1.8s por change thamle) Drive e background e save
        hoy.
     3. Drive save fail korle exponential backoff diye max 5 bar retry
        hoy (network layer e already ache), tarpor o fail korle status
        bar "error" dekhabe kintu local copy e kaj surokkhito thake — user
        চাইলে "Retry sync" chapte পারবে।
   ========================================================================= */

const EditorState = (() => {
  let model = null;
  let fileId = null;
  let fileName = 'Untitled Mind Map';
  let dirty = false;
  let saveTimer = null;
  let saving = false;
  let lastSaveError = null;
  let history = [];
  let historyIdx = -1;
  let listeners = { change: [], saveStatus: [] };
  let selectedIds = new Set();
  let clipboardSubtreeJson = null;

  function on(evt, fn) { listeners[evt].push(fn); }
  function emit(evt, payload) { listeners[evt].forEach(fn => fn(payload)); }

  function snapshot() {
    return mmSerialize(model, { name: fileName });
  }

  function pushHistory() {
    // truncate redo branch
    history = history.slice(0, historyIdx + 1);
    history.push(snapshot());
    if (history.length > APP_CONFIG.MAX_HISTORY) history.shift();
    historyIdx = history.length - 1;
  }

  function loadFromJson(jsonStr, id, name) {
    model = mmDeserialize(jsonStr);
    fileId = id || null;
    fileName = name || model.meta?.name || 'Untitled Mind Map';
    history = [snapshot()];
    historyIdx = 0;
    selectedIds = new Set();
    dirty = false;
    emit('change', { fullReload: true });
  }

  function markDirtyAndSave(opts) {
    dirty = true;
    if (!(opts && opts.skipHistory)) pushHistory();
    // 1) local cache — instant, never fails
    if (fileId) LocalCache.save(fileId, snapshot());
    emit('change', {});
    // 2) debounced cloud save
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => cloudSave(), APP_CONFIG.AUTOSAVE_DEBOUNCE_MS);
  }

  async function cloudSave() {
    if (!fileId || saving) return;
    saving = true;
    lastSaveError = null;
    emit('saveStatus', { state: 'saving' });
    try {
      const json = snapshot();
      await DriveApi.updateDiagramContent(fileId, json);
      LocalCache.save(fileId, json);
      dirty = false;
      emit('saveStatus', { state: 'saved' });
    } catch (e) {
      console.error('Cloud save failed:', e);
      lastSaveError = e.message;
      emit('saveStatus', { state: 'error', message: e.message });
    } finally {
      saving = false;
    }
  }

  function forceSaveNow() {
    if (saveTimer) clearTimeout(saveTimer);
    return cloudSave();
  }

  async function renameFile(newName) {
    fileName = newName;
    markDirtyAndSave({ skipHistory: true });
    if (fileId) {
      try { await DriveApi.renameDiagram(fileId, newName); }
      catch (e) { emit('saveStatus', { state: 'error', message: e.message }); }
    }
  }

  function undo() {
    if (historyIdx <= 0) return;
    historyIdx--;
    model = mmDeserialize(history[historyIdx]);
    selectedIds = new Set();
    if (fileId) LocalCache.save(fileId, snapshot());
    emit('change', { fullReload: true });
    scheduleCloudSaveOnly();
  }
  function redo() {
    if (historyIdx >= history.length - 1) return;
    historyIdx++;
    model = mmDeserialize(history[historyIdx]);
    selectedIds = new Set();
    if (fileId) LocalCache.save(fileId, snapshot());
    emit('change', { fullReload: true });
    scheduleCloudSaveOnly();
  }
  function scheduleCloudSaveOnly() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => cloudSave(), APP_CONFIG.AUTOSAVE_DEBOUNCE_MS);
  }
  function canUndo() { return historyIdx > 0; }
  function canRedo() { return historyIdx < history.length - 1; }

  /* ---------- Node ops (all go through markDirtyAndSave) ---------- */
  function addChild(parentId, text) {
    const id = mmAddChild(model, parentId, text);
    markDirtyAndSave();
    return id;
  }
  function addSibling(nodeId) {
    const node = model.nodes.get(nodeId);
    if (!node || !node.parentId) return addChild(nodeId, 'New idea');
    const id = mmAddChild(model, node.parentId, 'New idea');
    markDirtyAndSave();
    return id;
  }
  function deleteNode(nodeId) {
    if (nodeId === model.rootId) return;
    mmDeleteSubtree(model, nodeId);
    selectedIds.delete(nodeId);
    markDirtyAndSave();
  }
  function deleteSelected() {
    [...selectedIds].forEach(id => { if (id !== model.rootId) mmDeleteSubtree(model, id); });
    selectedIds.clear();
    markDirtyAndSave();
  }
  function updateNode(nodeId, patch) {
    const node = model.nodes.get(nodeId);
    if (!node) return;
    Object.assign(node, patch);
    markDirtyAndSave();
  }
  function toggleCollapse(nodeId) {
    const node = model.nodes.get(nodeId);
    if (!node || !node.children.length) return;
    node.collapsed = !node.collapsed;
    markDirtyAndSave();
  }
  function setCustomPos(nodeId, x, y, opts) {
    const node = model.nodes.get(nodeId);
    if (!node) return;
    node.customX = x; node.customY = y;
    markDirtyAndSave(opts);
  }
  function clearCustomPositions() {
    model.nodes.forEach(n => { n.customX = null; n.customY = null; });
    markDirtyAndSave();
  }
  function copySelection() {
    if (selectedIds.size !== 1) return;
    const id = [...selectedIds][0];
    const node = model.nodes.get(id);
    clipboardSubtreeJson = JSON.stringify(node);
  }
  function pasteAsChild(parentId) {
    if (!clipboardSubtreeJson) return null;
    const srcNode = JSON.parse(clipboardSubtreeJson);
    const tempMap = new Map(model.nodes);
    // register temp copy of original subtree isn't needed—just clone shallow (no nested children copy from clipboard for simplicity)
    const newId = mmGenerateId();
    const clone = Object.assign({}, srcNode, { id: newId, parentId, children: [], customX: null, customY: null });
    model.nodes.set(newId, clone);
    const parent = model.nodes.get(parentId);
    if (parent) parent.children.push(newId);
    markDirtyAndSave();
    return newId;
  }
  function setLayout(layout) { model.layout = layout; markDirtyAndSave({ skipHistory: true }); }
  function setTheme(theme) { model.theme = theme; markDirtyAndSave({ skipHistory: true }); }

  /* ---------- Selection ---------- */
  function select(id, additive) {
    if (!additive) selectedIds.clear();
    if (id) { if (selectedIds.has(id) && additive) selectedIds.delete(id); else selectedIds.add(id); }
    emit('change', {});
  }
  function selectMany(ids) { selectedIds = new Set(ids); emit('change', {}); }
  function clearSelection() { selectedIds.clear(); emit('change', {}); }
  function getSelection() { return selectedIds; }
  function primarySelected() { return selectedIds.size ? [...selectedIds][selectedIds.size - 1] : null; }

  /* ---------- Search ---------- */
  function findNodes(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out = [];
    model.nodes.forEach((n, id) => { if (n.text.toLowerCase().includes(q)) out.push(id); });
    return out;
  }

  return {
    on,
    loadFromJson, snapshot,
    get model() { return model; },
    get fileId() { return fileId; },
    set fileId(v) { fileId = v; },
    get fileName() { return fileName; },
    get dirty() { return dirty; },
    get lastSaveError() { return lastSaveError; },
    markDirtyAndSave, cloudSave, forceSaveNow, renameFile,
    undo, redo, canUndo, canRedo,
    addChild, addSibling, deleteNode, deleteSelected, updateNode, toggleCollapse,
    setCustomPos, clearCustomPositions, copySelection, pasteAsChild,
    setLayout, setTheme,
    select, selectMany, clearSelection, getSelection, primarySelected,
    findNodes,
  };
})();
