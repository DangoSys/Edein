import React, { useEffect, useMemo, useState } from 'react';
import './eda.css';
import { ballCatalog } from './types/ballCatalog';
import { sendChat } from './services/mockActions';
import { TopToolbar } from './components/TopToolbar';
import { LibraryPanel } from './components/LibraryPanel';
import { EdaCanvas } from './components/EdaCanvas';
import { ChatPanel } from './components/ChatPanel';

const ROOT_ID = 'system-root';
const CORE_SIZE = { w: 260, h: 220 };
const BALL_SIZE_BY_TYPE = {
  VecBall: { w: 120, h: 70 },
  ReluBall: { w: 130, h: 70 },
  TransposeBall: { w: 140, h: 70 },
  Im2colBall: { w: 140, h: 70 },
  SystolicArrayBall: { w: 170, h: 80 },
  QuantBall: { w: 120, h: 70 },
  DequantBall: { w: 120, h: 70 },
  GemminiBall: { w: 150, h: 80 },
  TraceBall: { w: 130, h: 70 },
};

function mkId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function pickColor(type) {
  const palette = {
    VecBall: '#2e6fb8',
    ReluBall: '#2f7a52',
    TransposeBall: '#4b6ba5',
    Im2colBall: '#3a8cc7',
    SystolicArrayBall: '#3867b6',
    QuantBall: '#447a5a',
    DequantBall: '#3f6a5d',
    GemminiBall: '#2c5c8a',
    TraceBall: '#555c8a'
  };
  return palette[type] || '#2c5c8a';
}

function sizeFromCfg(cfg) {
  if (!cfg || typeof cfg !== 'object') {
    return { w: 160, h: 120, meta: '-' };
  }
  const values = Object.values(cfg).filter((v) => typeof v === 'number');
  const sum = values.reduce((acc, v) => acc + v, 0);
  const w = Math.max(140, Math.min(420, 120 + sum * 0.4));
  const h = Math.max(90, Math.min(300, 80 + sum * 0.25));
  const meta = values.length ? values.join(' x ') : '-';
  return { w, h, meta };
}

function normalizeBallSizeByType(item) {
  if (item.kind !== 'ball') {
    return item;
  }
  const spec = BALL_SIZE_BY_TYPE[item.type];
  if (!spec) {
    return item;
  }
  if (item.w === spec.w && item.h === spec.h) {
    return item;
  }
  return { ...item, w: spec.w, h: spec.h };
}

function layoutRootTilesCompact(sourceItems) {
  const tiles = sourceItems
    .filter((b) => b.kind === 'tile' && b.parentId === ROOT_ID)
    .sort((a, b) => (a.y - b.y) || (a.x - b.x));
  if (tiles.length <= 1) {
    return sourceItems;
  }

  const gap = 24;
  const startX = 40;
  const startY = 40;
  const targetRowWidth = 1800;
  let cursorX = startX;
  let cursorY = startY;
  let rowMaxH = 0;
  const placed = new Map();

  tiles.forEach((tile) => {
    if (cursorX > startX && cursorX + tile.w > startX + targetRowWidth) {
      cursorX = startX;
      cursorY += rowMaxH + gap;
      rowMaxH = 0;
    }
    placed.set(tile.id, { x: cursorX, y: cursorY });
    rowMaxH = Math.max(rowMaxH, tile.h);
    cursorX += tile.w + gap;
  });

  const tileDeltaById = new Map();
  tiles.forEach((tile) => {
    const pos = placed.get(tile.id);
    if (!pos) {
      return;
    }
    tileDeltaById.set(tile.id, { dx: pos.x - tile.x, dy: pos.y - tile.y });
  });
  const byId = new Map(sourceItems.map((b) => [b.id, b]));
  function rootTileId(item) {
    let cur = item;
    const visited = new Set();
    while (cur && cur.parentId && cur.parentId !== ROOT_ID) {
      if (visited.has(cur.id)) {
        break;
      }
      visited.add(cur.id);
      cur = byId.get(cur.parentId);
    }
    return cur && cur.kind === 'tile' ? cur.id : null;
  }
  return sourceItems.map((b) => {
    const tid = rootTileId(b);
    if (!tid) {
      return b;
    }
    const delta = tileDeltaById.get(tid);
    if (!delta || (!delta.dx && !delta.dy)) {
      return b;
    }
    return { ...b, x: b.x + delta.dx, y: b.y + delta.dy };
  });
}

function resolveRootTileOverlaps(sourceItems) {
  const next = sourceItems.map((b) => ({ ...b }));
  const byId = new Map(next.map((b) => [b.id, b]));
  const roots = next
    .filter((b) => b.kind === 'tile' && b.parentId === ROOT_ID)
    .sort((a, b) => (a.y - b.y) || (a.x - b.x));
  if (roots.length <= 1) {
    return next;
  }
  const moved = new Map();
  roots.forEach((tile) => moved.set(tile.id, { dx: 0, dy: 0 }));
  const gap = 24;
  for (let i = 0; i < roots.length; i += 1) {
    const a = roots[i];
    for (let j = 0; j < i; j += 1) {
      const b = roots[j];
      const overlap =
        a.x < b.x + b.w + gap &&
        a.x + a.w + gap > b.x &&
        a.y < b.y + b.h + gap &&
        a.y + a.h + gap > b.y;
      if (!overlap) {
        continue;
      }
      const pushX = b.x + b.w + gap - a.x;
      a.x += Math.max(0, pushX);
      const d = moved.get(a.id) || { dx: 0, dy: 0 };
      moved.set(a.id, { dx: d.dx + Math.max(0, pushX), dy: d.dy });
    }
  }

  function rootTileId(item) {
    let cur = item;
    const visited = new Set();
    while (cur && cur.parentId && cur.parentId !== ROOT_ID) {
      if (visited.has(cur.id)) {
        break;
      }
      visited.add(cur.id);
      cur = byId.get(cur.parentId);
    }
    return cur && cur.kind === 'tile' ? cur.id : null;
  }

  return next.map((b) => {
    const tid = rootTileId(b);
    if (!tid) {
      return b;
    }
    const d = moved.get(tid);
    if (!d || (!d.dx && !d.dy)) {
      return b;
    }
    return { ...b, x: b.x + d.dx, y: b.y + d.dy };
  });
}

function layoutChildrenCompact(sourceItems, parentId) {
  const parent = sourceItems.find((b) => b.id === parentId);
  if (!parent) {
    return sourceItems;
  }
  const children = sourceItems.filter((b) => b.parentId === parentId);
  if (children.length === 0) {
    return sourceItems;
  }

  const allCore = children.every((b) => b.kind === 'core');
  const allBall = children.every((b) => b.kind === 'ball');
  if (!allCore && !allBall) {
    return sourceItems;
  }

  const gap = 12;
  const header = 30;
  const innerX = parent.x + gap;
  const innerY = parent.y + header + gap;
  const innerW = Math.max(1, parent.w - gap * 2);

  const targetW = Math.max(...children.map((c) => c.w));
  const targetH = Math.max(...children.map((c) => c.h));
  const cols = Math.max(1, Math.floor((innerW + gap) / (targetW + gap)));
  const rows = Math.ceil(children.length / cols);

  const placed = new Map();
  children.forEach((child, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = innerX + col * (targetW + gap);
    const y = innerY + row * (targetH + gap);
    placed.set(child.id, { x, y });
  });

  const usedW = cols * targetW + (cols - 1) * gap + gap * 2;
  const usedH = header + rows * targetH + (rows - 1) * gap + gap * 2;
  const minParentW = allBall ? 220 : 300;
  const minParentH = allBall ? 140 : 180;
  const nextParent = {
    ...parent,
    w: Math.max(minParentW, usedW),
    h: Math.max(minParentH, usedH),
  };

  return sourceItems.map((b) => {
    if (b.id === parentId) {
      return nextParent;
    }
    const pos = placed.get(b.id);
    if (!pos) {
      return b;
    }
    return { ...b, x: pos.x, y: pos.y };
  });
}

function hasSameKindSiblingOverlap(items, candidate) {
  if (candidate.kind !== 'tile' && candidate.kind !== 'core' && candidate.kind !== 'ball') {
    return false;
  }
  return items.some((other) => {
    if (other.id === candidate.id || other.parentId !== candidate.parentId) {
      return false;
    }
    if (other.kind !== candidate.kind) {
      return false;
    }
    return (
      candidate.x < other.x + other.w &&
      candidate.x + candidate.w > other.x &&
      candidate.y < other.y + other.h &&
      candidate.y + candidate.h > other.y
    );
  });
}

function clientToWorld(clientX, clientY, bounds, viewport) {
  const x = (clientX - bounds.left - viewport.x) / viewport.scale;
  const y = (clientY - bounds.top - viewport.y) / viewport.scale;
  return { x, y };
}

function canvasToWorld(localX, localY, viewport) {
  const x = (localX - viewport.x) / viewport.scale;
  const y = (localY - viewport.y) / viewport.scale;
  return { x, y };
}

function mkChatId() {
  return `chat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

  function pickTopItem(items, world) {
    const hits = items.filter(
      (b) =>
        world.x >= b.x &&
        world.x <= b.x + (b.renderW ?? b.w) &&
        world.y >= b.y &&
        world.y <= b.y + (b.renderH ?? b.h)
    );
  if (hits.length === 0) {
    return null;
  }
  hits.sort((a, b) => (a.w * a.h) - (b.w * b.h));
  return hits[0];
}

function packDesign(items, viewport) {
  return {
    version: 1,
    meta: {
      createdAt: new Date().toISOString(),
    },
    viewport,
    items,
  };
}

function unpackDesign(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('invalid json');
  }
  if (!Array.isArray(payload.items)) {
    throw new Error('items missing');
  }
  return {
    items: payload.items,
    viewport: payload.viewport || { x: 32, y: 32, scale: 1 },
  };
}

export function EdaPage() {
  const [items, setItems] = useState([]);
  const [balls, setBalls] = useState(ballCatalog);
  const [selectedIds, setSelectedIds] = useState([]);
  const [dragging, setDragging] = useState(null);
  const [resizingItem, setResizingItem] = useState(null);
  const [leftWidth, setLeftWidth] = useState(240);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightWidth, setRightWidth] = useState(320);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [resizingRight, setResizingRight] = useState(false);
  const [viewport, setViewport] = useState({ x: 32, y: 32, scale: 1 });
  const [panning, setPanning] = useState(null);
  const [selection, setSelection] = useState(null);
  // no active tile/core; all levels rendered in one view
  const [contextMenu, setContextMenu] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [expandedTileIds, setExpandedTileIds] = useState([]);
  const [addingBall, setAddingBall] = useState(false);
  const [newBall, setNewBall] = useState({
    type: '',
    title: '',
    desc: '',
    cfgText: '{"param":1}'
  });
  const [chatBusy, setChatBusy] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatItems, setChatItems] = useState([]);

  useEffect(() => {
    function handleKey(e) {
      const tag = e.target instanceof HTMLElement ? e.target.tagName : '';
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA';
      if (e.key === 'Escape') {
        setContextMenu(null);
        setSelection(null);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        if (renaming || isTyping) {
          return;
        }
        deleteItems(selectedIds);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedIds, renaming]);

  async function onSendChat() {
    const text = chatMessage.trim();
    if (!text) {
      return;
    }

    setChatBusy(true);
    setChatItems((prev) => [
      ...prev,
      {
        id: mkChatId(),
        role: 'user',
        text
      }
    ]);

    try {
      const out = await sendChat(text, {});
      setChatItems((prev) => [
        ...prev,
        {
          id: mkChatId(),
          role: 'assistant',
          text: typeof out === 'string'
            ? out
            : out?.message || out?.reply || out?.error || 'ok'
        }
      ]);
      setChatMessage('');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setChatItems((prev) => [
        ...prev,
        {
          id: mkChatId(),
          role: 'assistant',
          text: `Error: ${msg}`
        }
      ]);
    } finally {
      setChatBusy(false);
    }
  }

  function onCanvasDrop(e, ctx) {
    const type = e.dataTransfer.getData('ball/type');
    if (!type) {
      return;
    }
    const tpl = balls.find((b) => b.type === type);
    if (!tpl) {
      return;
    }
    const bounds = ctx.bounds;
    const world = clientToWorld(ctx.clientX, ctx.clientY, bounds, viewport);
    const hitCore = items.find(
      (b) =>
        b.kind === 'core' &&
        world.x >= b.x &&
        world.x <= b.x + b.w &&
        world.y >= b.y &&
        world.y <= b.y + b.h
    );
    if (!hitCore) {
      return;
    }
    const { w, h, meta } = sizeFromCfg(tpl.cfg);
    const ball = {
      id: mkId('ball'),
      kind: 'ball',
      type,
      title: tpl.title,
      x: Math.max(12, world.x - w / 2),
      y: Math.max(12, world.y - h / 2),
      w,
      h,
      meta,
      color: pickColor(type),
      parentId: hitCore.id,
    };

    setItems((prev) => [...prev, ball]);
    setSelectedIds([ball.id]);
  }

  function addNewBallToLibrary() {
    setAddingBall(true);
  }

  function saveNewBall() {
    const type = newBall.type.trim();
    const title = newBall.title.trim() || type;
    if (!type) {
      return;
    }
    let cfg = {};
    try {
      cfg = newBall.cfgText.trim() ? JSON.parse(newBall.cfgText) : {};
    } catch {
      cfg = {};
    }
    let finalType = type;
    if (balls.find((b) => b.type === finalType)) {
      finalType = `${type}_${Date.now().toString(36).slice(2, 4)}`;
    }
    setBalls((prev) => [
      ...prev,
      {
        type: finalType,
        title,
        desc: newBall.desc.trim() || 'custom ball',
        cfg
      }
    ]);
    setAddingBall(false);
  }

  function onStartDrag(e, block, bounds) {
    e.stopPropagation();
    if (!bounds) {
      return;
    }
    if (block.locked) {
      return;
    }
    setSelectedIds((prev) =>
      prev.includes(block.id) ? prev : [block.id]
    );
    setDragging({
      id: block.id,
      offsetX: (e.clientX - bounds.left - viewport.x) / viewport.scale - block.x,
      offsetY: (e.clientY - bounds.top - viewport.y) / viewport.scale - block.y,
    });
  }

  function onMoveDrag(e, bounds) {
    if (!dragging || !bounds) {
      return;
    }
    const x = (e.clientX - bounds.left - viewport.x) / viewport.scale - dragging.offsetX;
    const y = (e.clientY - bounds.top - viewport.y) / viewport.scale - dragging.offsetY;
    setItems((prev) => {
      const moving = prev.find((b) => b.id === dragging.id);
      if (!moving) {
        return prev;
      }
      const delta = { x: x - moving.x, y: y - moving.y };
      const movingIds = selectedIds.includes(moving.id) ? selectedIds : [moving.id];
      const map = new Map(prev.map((b) => [b.id, b]));
      const descendants = new Set();
      const stack = [...movingIds];
      while (stack.length > 0) {
        const id = stack.pop();
        prev.forEach((b) => {
          if (b.parentId === id) {
            descendants.add(b.id);
            stack.push(b.id);
          }
        });
      }
      const movingSet = new Set([...movingIds, ...descendants]);
      return prev.map((b) => {
        if (!movingSet.has(b.id) || b.locked) {
          return b;
        }
        let nextX = b.x + delta.x;
        let nextY = b.y + delta.y;
        if (b.parentId && !movingSet.has(b.parentId)) {
          const parent = map.get(b.parentId);
          if (parent) {
            const minX = parent.x;
            const minY = parent.y;
            const maxX = parent.x + parent.w - b.w;
            const maxY = parent.y + parent.h - b.h;
            const clampX = maxX < minX ? minX : Math.max(minX, Math.min(maxX, nextX));
            const clampY = maxY < minY ? minY : Math.max(minY, Math.min(maxY, nextY));
            nextX = clampX;
            nextY = clampY;
          }
        }
        let candidate = { x: Math.max(0, nextX), y: Math.max(0, nextY) };
        if (b.kind === 'core' || b.kind === 'ball' || b.kind === 'tile') {
          const overlaps = prev.some((o) => {
            if (o.id === b.id || o.parentId !== b.parentId) {
              return false;
            }
            if (movingSet.has(o.id)) {
              return false;
            }
            if (b.kind === 'core' && o.kind !== 'core') {
              return false;
            }
            if (b.kind === 'ball' && o.kind !== 'ball') {
              return false;
            }
            if (b.kind === 'tile' && o.kind !== 'tile') {
              return false;
            }
            const nx = candidate.x;
            const ny = candidate.y;
            return (
              nx < o.x + o.w &&
              nx + b.w > o.x &&
              ny < o.y + o.h &&
              ny + b.h > o.y
            );
          });
          if (overlaps) {
            candidate = { x: b.x, y: b.y };
          }
        }
        return {
          ...b,
          x: candidate.x,
          y: candidate.y,
        };
      });
    });
  }

  function onEndDrag() {
    setDragging(null);
  }

  function onStartItemResize(e, block, bounds) {
    e.stopPropagation();
    if (!bounds || block.locked) {
      return;
    }
    setResizingItem({
      id: block.id,
      startX: (e.clientX - bounds.left - viewport.x) / viewport.scale,
      startY: (e.clientY - bounds.top - viewport.y) / viewport.scale,
      w: block.w,
      h: block.h,
    });
  }

  function onMoveResize(e, bounds) {
    if (!resizingItem || !bounds) {
      return;
    }
    const x = (e.clientX - bounds.left - viewport.x) / viewport.scale;
    const y = (e.clientY - bounds.top - viewport.y) / viewport.scale;
    let dw = Math.max(40, resizingItem.w + (x - resizingItem.startX));
    let dh = Math.max(30, resizingItem.h + (y - resizingItem.startY));
    setItems((prev) =>
      prev.map((b) => {
        if (b.id !== resizingItem.id) {
          return b;
        }
        if (b.kind === 'ball') {
          return b;
        }
        const children = prev.filter((c) => c.parentId === b.id);
        if (children.length > 0) {
          const maxX = Math.max(...children.map((c) => c.x + c.w));
          const maxY = Math.max(...children.map((c) => c.y + c.h));
          dw = Math.max(dw, maxX - b.x);
          dh = Math.max(dh, maxY - b.y);
        }
        if (b.parentId) {
          const parent = prev.find((p) => p.id === b.parentId);
          if (parent) {
            dw = Math.min(dw, parent.x + parent.w - b.x);
            dh = Math.min(dh, parent.y + parent.h - b.y);
          }
        }
        const candidate = { ...b, w: dw, h: dh };
        if (hasSameKindSiblingOverlap(prev, candidate)) {
          return b;
        }
        return candidate;
      })
    );
  }

  function onEndResize() {
    setResizingItem(null);
  }

  const leftStyle = useMemo(() => {
    return {
      width: leftCollapsed ? 56 : leftWidth,
    };
  }, [leftCollapsed, leftWidth]);

  const rightStyle = useMemo(() => {
    return {
      width: rightCollapsed ? 56 : rightWidth,
    };
  }, [rightCollapsed, rightWidth]);

  function onResizeStart(e) {
    e.preventDefault();
    if (leftCollapsed) {
      return;
    }
    setResizing(true);
  }

  function onResizeMove(e) {
    if (!resizing) {
      return;
    }
    const next = Math.max(180, Math.min(420, e.clientX - 8));
    setLeftWidth(next);
  }

  function onResizeEnd() {
    setResizing(false);
  }

  function onResizeRightStart(e) {
    e.preventDefault();
    if (rightCollapsed) {
      return;
    }
    setResizingRight(true);
  }

  function onResizeRightMove(e) {
    if (!resizingRight) {
      return;
    }
    const viewportWidth = window.innerWidth;
    const next = Math.max(240, Math.min(480, viewportWidth - e.clientX - 8));
    setRightWidth(next);
  }

  function onResizeRightEnd() {
    setResizingRight(false);
  }

  function onCanvasMouseDown(e) {
    const bounds = e.currentTarget.getBoundingClientRect();
    if (e.button === 1) {
      setContextMenu(null);
      setPanning({
        startX: e.clientX,
        startY: e.clientY,
        x: viewport.x,
        y: viewport.y,
      });
      return;
    }
    if (e.button === 2) {
      setContextMenu(null);
      setPanning({
        startX: e.clientX,
        startY: e.clientY,
        x: viewport.x,
        y: viewport.y,
      });
      return;
    }
    if (!e.shiftKey) {
      setSelectedIds([]);
    }
    if (e.button === 0 && e.ctrlKey) {
      setContextMenu(null);
      setSelection({
        startX: e.clientX - bounds.left,
        startY: e.clientY - bounds.top,
        endX: e.clientX - bounds.left,
        endY: e.clientY - bounds.top,
      });
    }
  }

  function onCanvasMouseMove(e) {
    if (resizingItem) {
      const bounds = e.currentTarget.getBoundingClientRect();
      onMoveResize(e, bounds);
      return;
    }
    if (panning) {
      setViewport((prev) => ({
        ...prev,
        x: panning.x + (e.clientX - panning.startX),
        y: panning.y + (e.clientY - panning.startY),
      }));
      return;
    }
    if (selection) {
      const bounds = e.currentTarget.getBoundingClientRect();
      setSelection((prev) => ({
        ...prev,
        endX: e.clientX - bounds.left,
        endY: e.clientY - bounds.top,
      }));
    }
  }

  function onCanvasMouseUp(e) {
    if (resizingItem) {
      onEndResize();
      return;
    }
    if (panning) {
      setPanning(null);
      return;
    }
    if (selection) {
      const rect = {
        x: Math.min(selection.startX, selection.endX),
        y: Math.min(selection.startY, selection.endY),
        w: Math.abs(selection.endX - selection.startX),
        h: Math.abs(selection.endY - selection.startY),
      };
      if (rect.w < 6 || rect.h < 6) {
        setSelection(null);
        return;
      }
      const worldStart = canvasToWorld(rect.x, rect.y, viewport);
      const worldEnd = canvasToWorld(rect.x + rect.w, rect.y + rect.h, viewport);
      const worldRect = {
        x: Math.min(worldStart.x, worldEnd.x),
        y: Math.min(worldStart.y, worldEnd.y),
        w: Math.abs(worldEnd.x - worldStart.x),
        h: Math.abs(worldEnd.y - worldStart.y),
      };
      const visible = visibleItems;
      const next = visible
        .filter((b) =>
          b.x >= worldRect.x &&
          b.y >= worldRect.y &&
          b.x + b.w <= worldRect.x + worldRect.w &&
          b.y + b.h <= worldRect.y + worldRect.h
        )
        .map((b) => b.id);
      createDraftGroup(next, worldRect);
      setSelection(null);
      return;
    }
  }

  function onCanvasWheel(e) {
    e.preventDefault();
    const bounds = e.currentTarget.getBoundingClientRect();
    const scale = viewport.scale;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const nextScale = Math.max(0.3, Math.min(2.8, scale * delta));
    const world = clientToWorld(e.clientX, e.clientY, bounds, viewport);
    const nextX = e.clientX - bounds.left - world.x * nextScale;
    const nextY = e.clientY - bounds.top - world.y * nextScale;
    setViewport({ x: nextX, y: nextY, scale: nextScale });
  }

  function onCanvasContextMenu(e) {
    e.preventDefault();
    const bounds = e.currentTarget.getBoundingClientRect();
    const localX = e.clientX - bounds.left;
    const localY = e.clientY - bounds.top;
    const world = canvasToWorld(localX, localY, viewport);
    const hit = pickTopItem(renderItems, world);
    const targetIds = hit ? [hit.id] : selectedIds;
    if (hit && !selectedIds.includes(hit.id)) {
      setSelectedIds([hit.id]);
    }
    if (!hit && selectedIds.length === 0) {
      setContextMenu(null);
      return;
    }
    if (selectedIds.length > 0 && !hit) {
      setContextMenu({
        x: localX,
        y: localY,
        items: buildContextItems(selectedIds),
      });
      return;
    }
    if (!hit) {
      setContextMenu(null);
      return;
    }
    setContextMenu({
      x: localX,
      y: localY,
      items: buildContextItems(targetIds),
    });
  }

  function onSelect(id, additive) {
    if (!id) {
      setContextMenu(null);
      setSelectedIds([]);
      return;
    }
    setSelectedIds((prev) =>
      additive ? Array.from(new Set([...prev, id])) : [id]
    );
  }

  function buildContextItems(targetIds) {
    const list = items.filter((b) => targetIds.includes(b.id));
    const single = list.length === 1 ? list[0] : null;
    const hasTarget = list.length > 0;
    const isCore = single?.kind === 'core';
    const isTile = single?.kind === 'tile';
    const isDraft = single?.kind === 'group';
    const canMakeTile = isDraft && single.parentId === ROOT_ID;
    const canMakeCore = isDraft && items.find((b) => b.id === single.parentId)?.kind === 'tile';
    return [
      {
        id: 'rename',
        label: 'Rename',
        disabled: !single,
        onClick: () => {
          if (!single) {
            return;
          }
          setRenaming({ id: single.id, value: single.title });
          setContextMenu(null);
        },
      },
      {
        id: 'delete',
        label: 'Delete',
        disabled: !hasTarget || list.some((b) => b.locked),
        onClick: () => {
          if (!hasTarget) {
            return;
          }
          deleteItems(targetIds);
          setContextMenu(null);
        },
      },
      {
        id: 'lock',
        label: single?.locked ? 'Unlock' : 'Lock',
        disabled: !single,
        onClick: () => {
          if (!single) {
            return;
          }
          setItems((prev) =>
            prev.map((b) =>
              b.id === single.id ? { ...b, locked: !b.locked } : b
            )
          );
          setContextMenu(null);
        },
      },
      {
        id: 'layout',
        label: 'Auto Layout',
        disabled: !isTile && !isCore,
        onClick: () => {
          if (!single) {
            return;
          }
          autoLayout(single.id);
          setContextMenu(null);
        },
      },
      {
        id: 'set-tile',
        label: 'Make Tile',
        disabled: !canMakeTile,
        onClick: () => {
          setItems((prev) =>
            prev.map((b) =>
              b.id === single.id
                ? { ...b, kind: 'tile', title: b.title || 'Tile', color: '#182a40' }
                : b
            )
          );
          setContextMenu(null);
        },
      },
      {
        id: 'set-core',
        label: 'Make Core',
        disabled: !canMakeCore,
        onClick: () => {
          setItems((prev) =>
            prev.map((b) =>
              b.id === single.id
                ? { ...b, kind: 'core', title: b.title || 'Core', color: '#1b3858' }
                : b
            )
          );
          setContextMenu(null);
        },
      },
    ];
  }

  function deleteItems(ids) {
    let deleted = [];
    setItems((prev) => {
      const toDelete = new Set();
      ids.forEach((id) => {
        const item = prev.find((b) => b.id === id);
        if (!item || item.locked) {
          return;
        }
        toDelete.add(id);
      });
      let changed = true;
      while (changed) {
        changed = false;
        prev.forEach((b) => {
          if (b.parentId && toDelete.has(b.parentId) && !toDelete.has(b.id)) {
            toDelete.add(b.id);
            changed = true;
          }
        });
      }
      deleted = Array.from(toDelete);
      return prev.filter((b) => !toDelete.has(b.id) || b.locked);
    });
    setSelectedIds((prev) => prev.filter((id) => !deleted.includes(id)));
  }

  function autoLayout(parentId) {
    setItems((prev) => layoutChildrenCompact(prev, parentId));
  }

  function autoLayoutAll() {
    setItems((prev) => {
      let next = prev.map(normalizeBallSizeByType);
      const coreIds = next.filter((b) => b.kind === 'core').map((b) => b.id);
      coreIds.forEach((id) => {
        next = layoutChildrenCompact(next, id);
      });
      const tileIds = next.filter((b) => b.kind === 'tile').map((b) => b.id);
      tileIds.forEach((id) => {
        next = layoutChildrenCompact(next, id);
      });
      next = layoutRootTilesCompact(next);
      next = resolveRootTileOverlaps(next);
      return next;
    });
  }

  function onExportJson() {
    const payload = packDesign(items, viewport);
    const txt = JSON.stringify(payload, null, 2);
    const blob = new Blob([txt], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'edein-design.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function onImportJson(file) {
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result || ''));
        const parsed = unpackDesign(payload);
        setItems(parsed.items.map(normalizeBallSizeByType));
        setViewport(parsed.viewport);
        setSelectedIds([]);
      } catch {
        // ignore invalid file
      }
    };
    reader.readAsText(file);
  }

  function createDraftGroup(ids, rect) {
    const targetIds = ids || selectedIds;
    const selected = items.filter((b) => targetIds.includes(b.id) && !b.locked);
    let parentId = selected.length
      ? selected[0]?.parentId || ROOT_ID
      : ROOT_ID;
    const sameParent = selected.length
      ? selected.every((b) => b.parentId === parentId)
      : true;
    if (!sameParent) {
      return;
    }
    const parentItem = items.find((b) => b.id === parentId);
    if (parentItem?.kind === 'core') {
      return;
    }
    if (!selected.length) {
      const parentTile = items
        .filter((b) => b.kind === 'tile')
        .find(
          (b) =>
            rect.x >= b.x &&
            rect.y >= b.y &&
            rect.x + rect.w <= b.x + b.w &&
            rect.y + rect.h <= b.y + b.h
        );
      if (parentTile) {
        parentId = parentTile.id;
      }
    }
    const groupId = mkId('group');
    const parent = items.find((b) => b.id === parentId) || null;
    const clamped = parent
      ? {
          x: Math.max(parent.x, rect.x),
          y: Math.max(parent.y, rect.y),
          w: Math.max(12, Math.min(rect.w, parent.x + parent.w - rect.x)),
          h: Math.max(12, Math.min(rect.h, parent.y + parent.h - rect.y)),
        }
      : rect;
    const group = {
      id: groupId,
      kind: 'group',
      title: 'Untyped',
      x: clamped.x,
      y: clamped.y,
      w: clamped.w,
      h: clamped.h,
      meta: selected.length ? `${selected.length} blocks` : '',
      color: '#1a2230',
      parentId,
    };
    let minW = parent && parent.kind === 'tile' ? 240 : 420;
    let minH = parent && parent.kind === 'tile' ? 160 : 260;
    if (parent) {
      minW = Math.min(minW, parent.w);
      minH = Math.min(minH, parent.h);
    }
    group.w = Math.max(group.w, minW);
    group.h = Math.max(group.h, minH);
    setItems((prev) => [
      ...prev.map((b) =>
        selected.length && targetIds.includes(b.id)
          ? {
              ...b,
              parentId: groupId,
            }
          : b
      ),
      group,
    ]);
    setSelectedIds([groupId]);
  }

  const visibleItems = useMemo(() => {
    if (expandedTileIds.length === 0) {
      return items.filter((b) => b.kind === 'tile' || b.parentId === ROOT_ID);
    }
    return items.filter((b) => {
      if (b.kind === 'tile') {
        return true;
      }
      if (expandedTileIds.includes(b.parentId)) {
        return true;
      }
      const parent = items.find((p) => p.id === b.parentId);
      if (parent && expandedTileIds.includes(parent.parentId)) {
        return true;
      }
      return false;
    });
  }, [items, expandedTileIds]);

  const renderItems = useMemo(() => {
    return visibleItems.map((b) => {
      if (b.kind !== 'tile') {
        return b;
      }
      const collapsed = expandedTileIds.length > 0 ? !expandedTileIds.includes(b.id) : true;
      if (!collapsed) {
        return { ...b, collapsed: false };
      }
      const renderW = Math.max(220, Math.min(b.w * 0.6, 520));
      const renderH = Math.max(80, Math.min(b.h * 0.35, 180));
      return { ...b, collapsed: true, renderW, renderH };
    });
  }, [visibleItems, expandedTileIds]);

  const selectionBox = useMemo(() => {
    if (!selection) {
      return null;
    }
    const rect = {
      x: Math.min(selection.startX, selection.endX),
      y: Math.min(selection.startY, selection.endY),
      w: Math.abs(selection.endX - selection.startX),
      h: Math.abs(selection.endY - selection.startY),
    };
    return rect;
  }, [selection]);

  useEffect(() => {
    if (!resizing) {
      return;
    }
    function handleMove(e) {
      onResizeMove(e);
    }
    function handleUp() {
      onResizeEnd();
    }
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [resizing]);

  useEffect(() => {
    if (!resizingRight) {
      return;
    }
    function handleMove(e) {
      onResizeRightMove(e);
    }
    function handleUp() {
      onResizeRightEnd();
    }
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [resizingRight]);

  return (
    <main className="eda-root">
      <TopToolbar
        onCenter={() => {
          setViewport((prev) => ({ ...prev, x: 32, y: 32, scale: 1 }));
        }}
        onToggleTiles={() => {
          if (expandedTileIds.length > 0) {
            setExpandedTileIds([]);
            return;
          }
          const all = items.filter((b) => b.kind === 'tile').map((b) => b.id);
          setExpandedTileIds(all);
        }}
        onAutoLayoutAll={autoLayoutAll}
        onExport={onExportJson}
        onImport={onImportJson}
        onClear={() => {
          setItems([]);
          setSelectedIds([]);
        }}
      />
      <section className="eda-body">
        <div className="left-wrap" style={leftStyle}>
          <LibraryPanel
            balls={balls}
            collapsed={leftCollapsed}
            onAddNewBall={addNewBallToLibrary}
          />
          <div className="resize-handle" onMouseDown={onResizeStart} />
          <button
            type="button"
            className="collapse-tab"
            onClick={() => setLeftCollapsed((v) => !v)}
            title={leftCollapsed ? 'Expand' : 'Collapse'}
          >
            {leftCollapsed ? '>' : '<'}
          </button>
        </div>
        {renaming ? (
          <div className="rename-overlay" onMouseDown={() => setRenaming(null)}>
            <div className="rename-panel" onMouseDown={(e) => e.stopPropagation()}>
              <div className="rename-title">Rename</div>
              <input
                value={renaming.value}
                onChange={(e) => setRenaming((prev) => ({ ...prev, value: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const name = renaming.value.trim();
                    if (name) {
                      setItems((prev) =>
                        prev.map((b) =>
                          b.id === renaming.id ? { ...b, title: name } : b
                        )
                      );
                    }
                    setRenaming(null);
                  }
                  if (e.key === 'Escape') {
                    setRenaming(null);
                  }
                }}
                autoFocus
              />
              <div className="rename-actions">
                <button
                  type="button"
                  onClick={() => {
                    const name = renaming.value.trim();
                    if (name) {
                      setItems((prev) =>
                        prev.map((b) =>
                          b.id === renaming.id ? { ...b, title: name } : b
                        )
                      );
                    }
                    setRenaming(null);
                  }}
                >
                  Save
                </button>
                <button type="button" className="ghost-btn" onClick={() => setRenaming(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {addingBall ? (
          <div className="rename-overlay" onMouseDown={() => setAddingBall(false)}>
            <div className="rename-panel" onMouseDown={(e) => e.stopPropagation()}>
              <div className="rename-title">Add Ball</div>
              <input
                value={newBall.type}
                onChange={(e) => setNewBall((prev) => ({ ...prev, type: e.target.value }))}
                placeholder="Type (unique key)"
              />
              <input
                value={newBall.title}
                onChange={(e) => setNewBall((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Title"
              />
              <input
                value={newBall.desc}
                onChange={(e) => setNewBall((prev) => ({ ...prev, desc: e.target.value }))}
                placeholder="Description"
              />
              <textarea
                value={newBall.cfgText}
                onChange={(e) => setNewBall((prev) => ({ ...prev, cfgText: e.target.value }))}
                rows={4}
              />
              <div className="rename-actions">
                <button type="button" onClick={saveNewBall}>Save</button>
                <button type="button" className="ghost-btn" onClick={() => setAddingBall(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : null}
        <EdaCanvas
          items={renderItems}
          selectedIds={selectedIds}
          dragging={dragging}
          viewport={viewport}
          selectionBox={selectionBox}
          contextMenu={contextMenu}
          onCanvasDrop={onCanvasDrop}
          onSelect={onSelect}
          onStartDrag={onStartDrag}
          onStartResize={onStartItemResize}
          onMoveDrag={onMoveDrag}
          onEndDrag={onEndDrag}
          onCanvasMouseDown={onCanvasMouseDown}
          onCanvasMouseMove={onCanvasMouseMove}
          onCanvasMouseUp={onCanvasMouseUp}
          onCanvasWheel={onCanvasWheel}
          onCanvasContextMenu={onCanvasContextMenu}
          onToggleTile={(id) => {
            setExpandedTileIds((prev) =>
              prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
            );
          }}
        />
        <div className="right-wrap" style={rightStyle}>
          {!rightCollapsed ? (
            <ChatPanel
              items={chatItems}
              message={chatMessage}
              busy={chatBusy}
              onChangeMessage={setChatMessage}
              onSend={onSendChat}
            />
          ) : (
            <div className="chat-collapsed">Chat</div>
          )}
          <div className="resize-handle right" onMouseDown={onResizeRightStart} />
          <button
            type="button"
            className="collapse-tab right"
            onClick={() => setRightCollapsed((v) => !v)}
            title={rightCollapsed ? 'Expand' : 'Collapse'}
          >
            {rightCollapsed ? '<' : '>'}
          </button>
        </div>
      </section>
    </main>
  );
}
