/* =========================================================================
   mindmap-model.js — Pure data layer, kono DOM/SVG rendering na (thumbnail
   builder chara). Editor.js ei module er upor build hoy, r dashboard.js
   notun diagram toiri korte ebong mini-thumbnail banate eta use kore.
   ========================================================================= */

const MM_SCHEMA_VERSION = 2;

function mmGenerateId() {
  return 'n_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function mmBlankNode(id, parentId, text) {
  return {
    id, parentId, text: text || 'Node',
    children: [],
    fillColor: '#FFFFFF', borderColor: '#C7CBD9',
    textColor: '#171A21',
    shape: 'rounded',       // rounded | rect | ellipse | diamond | cloud
    filled: true,            // false => transparent fill, border-only
    borderWidth: 2,          // px
    borderStyle: 'solid',    // solid | dashed | dotted
    cornerRadius: 14,        // used by rounded/rect shapes
    shadow: false,
    fontFamily: 'Inter',     // Inter | Georgia | 'Courier New' | 'Segoe UI'
    icon: '',                // emoji
    bold: false, italic: false,
    fontSize: 14,
    note: '', imageUrl: '', linkUrl: '',
    tag: '', progress: null, // 0-100 or null
    collapsed: false,
    customX: null, customY: null,
  };
}

function mmCreateDefaultMap(title) {
  const nodes = new Map();
  const rootId = 'root';
  nodes.set(rootId, Object.assign(mmBlankNode(rootId, null, title || 'Central Idea'), {
    fillColor: '#5B5FEF', borderColor: '#5B5FEF', textColor: '#FFFFFF', shape: 'rounded', fontSize: 16, bold: true
  }));
  const model = { rootId, nodes, theme: 'light', layout: 'radial' };
  const c1 = mmAddChild(model, rootId, 'Main Idea 1');
  const c2 = mmAddChild(model, rootId, 'Main Idea 2');
  mmAddChild(model, c1, 'Sub point A');
  mmAddChild(model, c1, 'Sub point B');
  mmAddChild(model, c2, 'Sub point C');
  return model;
}

function mmAddChild(model, parentId, text) {
  const id = mmGenerateId();
  const node = mmBlankNode(id, parentId, text || 'New idea');
  model.nodes.set(id, node);
  const parent = model.nodes.get(parentId);
  if (parent) parent.children.push(id);
  return id;
}

function mmDeleteSubtree(model, nodeId) {
  const node = model.nodes.get(nodeId);
  if (!node) return;
  [...node.children].forEach(cid => mmDeleteSubtree(model, cid));
  if (node.parentId) {
    const parent = model.nodes.get(node.parentId);
    if (parent) parent.children = parent.children.filter(cid => cid !== nodeId);
  }
  model.nodes.delete(nodeId);
}

function mmCloneSubtree(model, nodeId, newParentId) {
  const src = model.nodes.get(nodeId);
  if (!src) return null;
  const newId = mmGenerateId();
  const clone = Object.assign({}, src, { id: newId, parentId: newParentId, children: [], customX: null, customY: null });
  model.nodes.set(newId, clone);
  if (newParentId) {
    const parent = model.nodes.get(newParentId);
    if (parent) parent.children.push(newId);
  }
  src.children.forEach(cid => mmCloneSubtree(model, cid, newId));
  return newId;
}

function mmSerialize(model, meta) {
  const plain = {};
  model.nodes.forEach((n, id) => { plain[id] = n; });
  return JSON.stringify({
    schema: MM_SCHEMA_VERSION,
    rootId: model.rootId,
    theme: model.theme || 'light',
    layout: model.layout || 'radial',
    nodes: plain,
    meta: meta || {},
    savedAt: new Date().toISOString()
  }, null, 2);
}

function mmDeserialize(jsonStr) {
  try {
    const data = JSON.parse(jsonStr);
    const nodes = new Map();
    const rootId = data.rootId || 'root';
    Object.keys(data.nodes || {}).forEach(id => {
      const n = data.nodes[id];
      nodes.set(id, Object.assign(mmBlankNode(id, n.parentId ?? null, n.text), n));
    });
    if (!nodes.has(rootId)) return mmCreateDefaultMap();
    return { rootId, nodes, theme: data.theme || 'light', layout: data.layout || 'radial', meta: data.meta || {} };
  } catch (e) {
    console.error('mmDeserialize failed', e);
    return mmCreateDefaultMap();
  }
}

function mmNodeCount(model) { return model.nodes.size; }

/* ---------- Layout engines ---------- */
/* Returns Map<id, {x,y}> in local (un-panned/zoomed) coordinates. Root at (0,0). */
function mmComputeLayout(model, opts) {
  const layout = (opts && opts.layout) || model.layout || 'radial';
  const positions = new Map();
  const root = model.nodes.get(model.rootId);
  if (!root) return positions;

  function visibleChildren(node) {
    if (node.collapsed) return [];
    return node.children.filter(cid => model.nodes.has(cid));
  }

  if (layout === 'radial') {
    const leafCounts = new Map();
    function countLeaves(id) {
      const node = model.nodes.get(id);
      const kids = visibleChildren(node);
      if (!node || kids.length === 0) return 1;
      let total = 0; kids.forEach(cid => total += countLeaves(cid));
      leafCounts.set(id, total);
      return total;
    }
    countLeaves(model.rootId);
    const CHAIN_STEP = 108;   // radius step for a straight single-child chain (compact, linear)
    const BRANCH_STEP = 185;  // radius step when a node actually splits into 2+ children (roomy fan-out)
    function assign(id, angleStart, angleSpan, radius) {
      const node = model.nodes.get(id);
      if (!node) return;
      if (id === model.rootId) positions.set(id, { x: 0, y: 0 });
      else {
        const a = angleStart + angleSpan / 2;
        positions.set(id, { x: radius * Math.cos(a), y: radius * Math.sin(a) });
      }
      const kids = visibleChildren(node);
      if (!kids.length) return;
      const total = leafCounts.get(id) || 1;
      const step = kids.length > 1 ? BRANCH_STEP : CHAIN_STEP;
      const childRadius = radius + step;
      let cur = angleStart;
      kids.forEach(cid => {
        const leaves = leafCounts.get(cid) || 1;
        const span = (leaves / total) * angleSpan;
        assign(cid, cur, span, childRadius);
        cur += span;
      });
    }
    assign(model.rootId, 0, 2 * Math.PI, 0);
  }
  else if (layout === 'tree-right' || layout === 'tree-down') {
    const horizontal = layout === 'tree-right';
    function place(id, depth, offset) {
      const node = model.nodes.get(id);
      if (!node) return { size: 0 };
      const kids = visibleChildren(node);
      if (!kids.length) {
        positions.set(id, horizontal ? { x: depth * 210, y: offset * 90 } : { x: offset * 190, y: depth * 130 });
        return { size: 1 };
      }
      let total = 0;
      const childOffsets = [];
      kids.forEach(cid => {
        const res = place(cid, depth + 1, offset + total);
        childOffsets.push(res.size);
        total += res.size;
      });
      const mid = offset + total / 2 - 0.5;
      positions.set(id, horizontal ? { x: depth * 210, y: mid * 90 } : { x: mid * 190, y: depth * 130 });
      return { size: Math.max(1, total) };
    }
    place(model.rootId, 0, 0);
  }
  else if (layout === 'fishbone') {
    // Root far right on the "spine"; main branches alternate above/below,
    // sub-branches cascade further left.
    const kids = visibleChildren(root);
    positions.set(model.rootId, { x: 0, y: 0 });
    kids.forEach((cid, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      const depthIdx = Math.floor(i / 2) + 1;
      const bx = -depthIdx * 240;
      const by = side * 130;
      positions.set(cid, { x: bx, y: by });
      const node = model.nodes.get(cid);
      const grand = visibleChildren(node);
      grand.forEach((gid, j) => {
        positions.set(gid, { x: bx - 40, y: by + side * (j + 1) * 55 });
      });
    });
  }

  // Custom drag overrides
  model.nodes.forEach((node, id) => {
    if (node.customX !== null && node.customY !== null) positions.set(id, { x: node.customX, y: node.customY });
  });
  return positions;
}

/* ---------- Small thumbnail SVG for dashboard cards ---------- */
function mmRenderThumbnailSvg(model, w, h) {
  const positions = mmComputeLayout(model, { layout: model.layout || 'radial' });
  if (!positions.size) return '';
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  positions.forEach(p => { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); });
  const pad = 60;
  const vbW = (maxX - minX) + pad * 2 || 200, vbH = (maxY - minY) + pad * 2 || 200;
  let svg = `<svg viewBox="${minX - pad} ${minY - pad} ${vbW} ${vbH}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">`;
  model.nodes.forEach((node, id) => {
    if (id === model.rootId || !node.parentId) return;
    const pp = positions.get(node.parentId), cp = positions.get(id);
    if (!pp || !cp) return;
    svg += `<line x1="${pp.x}" y1="${pp.y}" x2="${cp.x}" y2="${cp.y}" stroke="#C7CBD9" stroke-width="3"/>`;
  });
  model.nodes.forEach((node, id) => {
    const p = positions.get(id);
    if (!p) return;
    const isRoot = id === model.rootId;
    const r = isRoot ? 22 : 13;
    svg += `<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${node.fillColor || '#fff'}" stroke="${node.borderColor || '#C7CBD9'}" stroke-width="3"/>`;
  });
  svg += '</svg>';
  return svg;
}
