/* =========================================================================
   editor-render.js — SVG canvas: layout -> shapes, pan/zoom, drag,
   rubber-band multi-select, right-click context menu.
   ========================================================================= */

const EditorRender = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const NODE_W = 168, NODE_H = 58;
  let svg, viewport, wrap;
  let zoom = 1, panX = 0, panY = 0;
  let isPanning = false, panStart = null;
  let rubberBand = null;
  let dragInfo = null;
  let onNodeContextMenu = () => {};
  let positionsCache = new Map();

  function init(svgEl, wrapEl, contextMenuCb) {
    svg = svgEl; wrap = wrapEl;
    onNodeContextMenu = contextMenuCb || (() => {});
    viewport = document.createElementNS(NS, 'g');
    viewport.setAttribute('id', 'viewport');
    svg.appendChild(viewport);
    wireCanvasEvents();
  }

  function el(tag, attrs) {
    const e = document.createElementNS(NS, tag);
    Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v));
    return e;
  }

  function applyTransform() {
    viewport.setAttribute('transform', `translate(${panX},${panY}) scale(${zoom})`);
  }

  function setZoom(z, cx, cy) {
    const newZoom = Math.min(2.5, Math.max(0.2, z));
    if (cx !== undefined) {
      // zoom around a point (screen coords)
      const rect = svg.getBoundingClientRect();
      const sx = cx - rect.left, sy = cy - rect.top;
      const wx = (sx - panX) / zoom, wy = (sy - panY) / zoom;
      panX = sx - wx * newZoom;
      panY = sy - wy * newZoom;
    }
    zoom = newZoom;
    applyTransform();
    return zoom;
  }
  function getZoom() { return zoom; }
  function resetView() { zoom = 1; panX = wrap.clientWidth / 2; panY = wrap.clientHeight / 2; applyTransform(); }
  function panBy(dx, dy) { panX += dx; panY += dy; applyTransform(); }

  function screenToWorld(clientX, clientY) {
    const rect = svg.getBoundingClientRect();
    return { x: (clientX - rect.left - panX) / zoom, y: (clientY - rect.top - panY) / zoom };
  }

  function shapePath(shape, w, h, cornerRadius) {
    const hw = w / 2, hh = h / 2;
    const rx = cornerRadius != null ? cornerRadius : 14;
    switch (shape) {
      case 'ellipse': return { tag: 'ellipse', attrs: { cx: 0, cy: 0, rx: hw, ry: hh } };
      case 'diamond': return { tag: 'polygon', attrs: { points: `0,${-hh} ${hw},0 0,${hh} ${-hw},0` } };
      case 'rect': return { tag: 'rect', attrs: { x: -hw, y: -hh, width: w, height: h, rx } };
      case 'cloud': {
        // simple cloud-ish blob using a rounded rect with big radius as approximation
        return { tag: 'rect', attrs: { x: -hw, y: -hh, width: w, height: h, rx: hh } };
      }
      default: return { tag: 'rect', attrs: { x: -hw, y: -hh, width: w, height: h, rx } }; // rounded
    }
  }

  function connectorPath(pp, cp, style) {
    if (style === 'straight') return `M ${pp.x} ${pp.y} L ${cp.x} ${cp.y}`;
    if (style === 'elbow') {
      const midX = (pp.x + cp.x) / 2;
      return `M ${pp.x} ${pp.y} L ${midX} ${pp.y} L ${midX} ${cp.y} L ${cp.x} ${cp.y}`;
    }
    // curved (default)
    const dx = (cp.x - pp.x) * 0.5;
    return `M ${pp.x} ${pp.y} C ${pp.x + dx} ${pp.y}, ${cp.x - dx} ${cp.y}, ${cp.x} ${cp.y}`;
  }

  function render(model, selectedIds, searchHighlightIds) {
    viewport.innerHTML = '';
    const defs = el('defs', {});
    viewport.appendChild(defs);
    const positions = mmComputeLayout(model);
    positionsCache = positions;

    // connectors
    const linkLayer = el('g', { class: 'link-layer' });
    model.nodes.forEach((node, id) => {
      if (id === model.rootId || !node.parentId) return;
      const parent = model.nodes.get(node.parentId);
      if (parent && parent.collapsed) return;
      const pp = positions.get(node.parentId), cp = positions.get(id);
      if (!pp || !cp) return;
      const path = el('path', {
        d: connectorPath(pp, cp, 'curved'),
        fill: 'none', stroke: node.borderColor || '#C7CBD9', 'stroke-width': 2.4, opacity: 0.85
      });
      linkLayer.appendChild(path);
    });
    viewport.appendChild(linkLayer);

    // nodes
    const nodeLayer = el('g', { class: 'node-layer' });
    model.nodes.forEach((node, id) => {
      const pos = positions.get(id);
      if (!pos) return;
      const parent = node.parentId ? model.nodes.get(node.parentId) : null;
      if (parent && parent.collapsed) return;

      const g = el('g', { transform: `translate(${pos.x},${pos.y})`, 'data-node-id': id, style: 'cursor:pointer' });
      const isSelected = selectedIds.has(id);
      const isHighlighted = searchHighlightIds && searchHighlightIds.includes(id);

      const w = node.id === model.rootId ? NODE_W + 20 : NODE_W;
      const h = node.id === model.rootId ? NODE_H + 6 : NODE_H;
      const sp = shapePath(node.shape, w, h, node.cornerRadius);
      const shapeEl = el(sp.tag, sp.attrs);
      const isFilled = node.filled !== false;
      shapeEl.setAttribute('fill', isFilled ? (node.fillColor || '#fff') : 'none');
      shapeEl.setAttribute('stroke', isSelected ? '#5B5FEF' : (isHighlighted ? '#F5A623' : (node.borderColor || '#C7CBD9')));
      const baseWidth = node.borderWidth != null ? node.borderWidth : 2;
      shapeEl.setAttribute('stroke-width', isSelected || isHighlighted ? Math.max(3, baseWidth) : baseWidth);
      if (node.borderStyle === 'dashed') shapeEl.setAttribute('stroke-dasharray', '7,4');
      else if (node.borderStyle === 'dotted') shapeEl.setAttribute('stroke-dasharray', '2,3');
      if (isSelected) shapeEl.setAttribute('filter', 'drop-shadow(0 2px 8px rgba(91,95,239,.35))');
      else if (node.shadow) shapeEl.setAttribute('filter', 'drop-shadow(0 3px 6px rgba(20,20,30,.18))');
      g.appendChild(shapeEl);

      let textX = -w / 2 + 14;
      const contentTop = -h / 2;

      if (node.imageUrl) {
        const clipId = 'clip_' + id;
        const clip = el('clipPath', { id: clipId });
        clip.appendChild(el('rect', { x: -w / 2 + 8, y: contentTop + 8, width: 32, height: 32, rx: 6 }));
        defs.appendChild(clip);
        const img = el('image', { x: -w / 2 + 8, y: contentTop + 8, width: 32, height: 32, href: node.imageUrl, 'clip-path': `url(#${clipId})` });
        img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', node.imageUrl);
        g.appendChild(img);
        textX += 36;
      } else if (node.icon) {
        const iconText = el('text', { x: -w / 2 + 10, y: 5, 'font-size': 16 });
        iconText.textContent = node.icon;
        g.appendChild(iconText);
        textX += 20;
      }

      const text = el('text', {
        x: textX, y: node.progress != null ? -2 : 5,
        fill: node.textColor || '#171A21',
        'font-size': node.fontSize || 14,
        'font-weight': node.bold ? 700 : 500,
        'font-style': node.italic ? 'italic' : 'normal',
        'font-family': (node.fontFamily || 'Inter') + ', sans-serif'
      });
      const maxChars = Math.floor((w - (textX + w / 2) - 24) / ((node.fontSize || 14) * 0.56));
      text.textContent = node.text.length > maxChars ? node.text.slice(0, maxChars) + '…' : node.text;
      g.appendChild(text);

      if (node.progress != null) {
        const barW = w - 28;
        g.appendChild(el('rect', { x: -barW / 2, y: h / 2 - 12, width: barW, height: 4, rx: 2, fill: 'rgba(0,0,0,.08)' }));
        g.appendChild(el('rect', { x: -barW / 2, y: h / 2 - 12, width: barW * Math.max(0, Math.min(100, node.progress)) / 100, height: 4, rx: 2, fill: '#2FA36B' }));
      }

      if (node.tag) {
        const tagW = Math.min(70, 12 + node.tag.length * 6);
        g.appendChild(el('rect', { x: w / 2 - tagW - 6, y: contentTop + 6, width: tagW, height: 16, rx: 8, fill: 'rgba(91,95,239,.12)' }));
        const tagText = el('text', { x: w / 2 - tagW / 2 - 6, y: contentTop + 17, 'text-anchor': 'middle', 'font-size': 9, fill: '#5B5FEF', 'font-weight': 700 });
        tagText.textContent = node.tag;
        g.appendChild(tagText);
      }

      if (node.linkUrl) {
        const linkIcon = el('text', { x: w / 2 - 18, y: h / 2 - 6, 'font-size': 12 });
        linkIcon.textContent = '🔗';
        g.appendChild(linkIcon);
      }

      if (node.note) {
        const title = el('title', {});
        title.textContent = node.note;
        g.appendChild(title);
      }

      if (node.children.length > 0) {
        const cx = w / 2 + 12;
        const badge = el('g', { class: 'collapse-badge', transform: `translate(${cx},0)`, style: 'cursor:pointer' });
        badge.appendChild(el('circle', { r: 9, fill: '#fff', stroke: node.borderColor || '#C7CBD9', 'stroke-width': 1.4 }));
        const sign = el('text', { x: 0, y: 4, 'text-anchor': 'middle', 'font-size': 12, fill: '#6B7180', 'font-weight': 700 });
        sign.textContent = node.collapsed ? '+' : '–';
        badge.appendChild(sign);
        badge.addEventListener('click', (e) => { e.stopPropagation(); EditorState.toggleCollapse(id); });
        g.appendChild(badge);
      }

      wireNodeEvents(g, id, node);
      nodeLayer.appendChild(g);
    });
    viewport.appendChild(nodeLayer);
  }

  function wireNodeEvents(g, id, node) {
    g.addEventListener('click', (e) => {
      e.stopPropagation();
      EditorState.select(id, e.shiftKey || e.metaKey || e.ctrlKey);
    });
    g.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      window.dispatchEvent(new CustomEvent('mm-inline-edit', { detail: { id } }));
    });
    g.addEventListener('contextmenu', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (!EditorState.getSelection().has(id)) EditorState.select(id, false);
      onNodeContextMenu(e.clientX, e.clientY, id);
    });
    g.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      const startWorld = screenToWorld(e.clientX, e.clientY);
      const model = EditorState.model;
      const startPositions = new Map();
      const selection = EditorState.getSelection().has(id) ? EditorState.getSelection() : new Set([id]);
      selection.forEach(sid => { const p = positionsCache.get(sid); if (p) startPositions.set(sid, { x: p.x, y: p.y }); });
      let moved = false;
      dragInfo = { active: true };

      function onMove(ev) {
        const w = screenToWorld(ev.clientX, ev.clientY);
        const dx = w.x - startWorld.x, dy = w.y - startWorld.y;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;
        selection.forEach(sid => {
          const base = startPositions.get(sid);
          const node = model.nodes.get(sid);
          if (base && node) { node.customX = base.x + dx; node.customY = base.y + dy; }
        });
        EditorRender.render(model, EditorState.getSelection());
      }
      function onUp() {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        dragInfo = null;
        if (moved) EditorState.markDirtyAndSave();
      }
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });
  }

  function wireCanvasEvents() {
    svg.addEventListener('mousedown', (e) => {
      if (e.target !== svg && e.target !== viewport) return;
      if (e.shiftKey) {
        // rubber-band multi-select
        const startX = e.clientX, startY = e.clientY;
        const box = document.createElement('div');
        box.style.cssText = 'position:fixed;border:1.5px solid #5B5FEF;background:rgba(91,95,239,.12);pointer-events:none;z-index:50;';
        document.body.appendChild(box);
        function draw(x1, y1, x2, y2) {
          box.style.left = Math.min(x1, x2) + 'px'; box.style.top = Math.min(y1, y2) + 'px';
          box.style.width = Math.abs(x2 - x1) + 'px'; box.style.height = Math.abs(y2 - y1) + 'px';
        }
        function onMove(ev) { draw(startX, startY, ev.clientX, ev.clientY); }
        function onUp(ev) {
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
          const rect = box.getBoundingClientRect();
          box.remove();
          const svgRect = svg.getBoundingClientRect();
          const found = [];
          positionsCache.forEach((pos, id) => {
            const screenX = svgRect.left + panX + pos.x * zoom;
            const screenY = svgRect.top + panY + pos.y * zoom;
            if (screenX >= rect.left && screenX <= rect.right && screenY >= rect.top && screenY <= rect.bottom) found.push(id);
          });
          EditorState.selectMany(found);
        }
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return;
      }
      isPanning = true;
      panStart = { x: e.clientX, y: e.clientY, panX, panY };
      svg.classList.add('panning');
    });
    window.addEventListener('mousemove', (e) => {
      if (!isPanning || !panStart) return;
      panX = panStart.panX + (e.clientX - panStart.x);
      panY = panStart.panY + (e.clientY - panStart.y);
      applyTransform();
    });
    window.addEventListener('mouseup', () => { isPanning = false; svg.classList.remove('panning'); });
    svg.addEventListener('click', (e) => { if (e.target === svg || e.target === viewport) EditorState.clearSelection(); });
    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(zoom * factor, e.clientX, e.clientY);
    }, { passive: false });
  }

  function focusOnNode(id) {
    const pos = positionsCache.get(id);
    if (!pos) return;
    panX = wrap.clientWidth / 2 - pos.x * zoom;
    panY = wrap.clientHeight / 2 - pos.y * zoom;
    applyTransform();
  }

  function exportSvgString() {
    const clone = svg.cloneNode(true);
    clone.removeAttribute('class');
    return new XMLSerializer().serializeToString(clone);
  }

  return { init, render, setZoom, getZoom, resetView, panBy, focusOnNode, exportSvgString, get positions() { return positionsCache; } };
})();
