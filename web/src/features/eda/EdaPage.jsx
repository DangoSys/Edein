import React, { useEffect, useMemo, useState } from 'react';
import './eda.css';
import { ballCatalog } from './types/ballCatalog';
import { sendChat } from './services/mockActions';
import { TopToolbar } from './components/TopToolbar';
import { LibraryPanel } from './components/LibraryPanel';
import { EdaCanvas } from './components/EdaCanvas';
import { ChatPanel } from './components/ChatPanel';

const ROOT_ID = 'system-root';

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

export function EdaPage() {
  const [items, setItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [dragging, setDragging] = useState(null);
  const [leftWidth, setLeftWidth] = useState(240);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [viewport, setViewport] = useState({ x: 32, y: 32, scale: 1 });
  const [panning, setPanning] = useState(null);
  const [selection, setSelection] = useState(null);
  const [activeTileId, setActiveTileId] = useState(null);
  const [activeCoreId, setActiveCoreId] = useState(null);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatPayload, setChatPayload] = useState('{"source":"ui"}');
  const [chatItems, setChatItems] = useState([]);

  async function onSendChat() {
    const text = chatMessage.trim();
    if (!text) {
      return;
    }

    let payload = {};
    try {
      payload = chatPayload.trim() ? JSON.parse(chatPayload) : {};
    } catch {
      return;
    }

    setChatBusy(true);
    setChatItems((prev) => [
      {
        id: mkChatId(),
        role: 'user',
        text: JSON.stringify({ message: text, payload }, null, 2)
      },
      ...prev
    ]);

    try {
      const out = await sendChat(text, payload);
      setChatItems((prev) => [
        {
          id: mkChatId(),
          role: 'assistant',
          text: JSON.stringify(out, null, 2)
        },
        ...prev
      ]);
      setChatMessage('');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setChatItems((prev) => [
        {
          id: mkChatId(),
          role: 'assistant',
          text: JSON.stringify({ error: msg }, null, 2)
        },
        ...prev
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
    const tpl = ballCatalog.find((b) => b.type === type);
    if (!tpl) {
      return;
    }
    const bounds = ctx.bounds;
    const world = clientToWorld(ctx.clientX, ctx.clientY, bounds, viewport);
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
      parentId: activeCoreId,
    };

    if (activeCoreId) {
      setItems((prev) => [...prev, ball]);
      setSelectedIds([ball.id]);
      return;
    }

    const coreId = mkId('core');
    const core = {
      id: coreId,
      kind: 'core',
      title: 'Core',
      x: Math.max(8, world.x - w / 1.6),
      y: Math.max(8, world.y - h / 1.6),
      w: Math.max(200, w * 1.4),
      h: Math.max(140, h * 1.4),
      meta: `${tpl.type}`,
      color: '#1b3858',
      parentId: activeTileId || ROOT_ID,
    };
    const ballInCore = {
      ...ball,
      x: core.x + 16,
      y: core.y + 32,
      parentId: coreId,
    };
    setItems((prev) => [...prev, core, ballInCore]);
    setActiveCoreId(coreId);
    setSelectedIds([coreId]);
  }

  function onStartDrag(e, block, bounds) {
    e.stopPropagation();
    if (!bounds) {
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
      return prev.map((b) =>
        movingIds.includes(b.id)
          ? {
              ...b,
              x: Math.max(0, b.x + delta.x),
              y: Math.max(0, b.y + delta.y),
            }
          : b
      );
    });
  }

  function onEndDrag() {
    setDragging(null);
  }

  const leftStyle = useMemo(() => {
    return {
      width: leftCollapsed ? 56 : leftWidth,
    };
  }, [leftCollapsed, leftWidth]);

  function onResizeStart(e) {
    e.preventDefault();
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

  function onCanvasMouseDown(e) {
    const bounds = e.currentTarget.getBoundingClientRect();
    if (e.button === 2) {
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
    if (e.button === 0) {
      setSelection({
        startX: e.clientX - bounds.left,
        startY: e.clientY - bounds.top,
        endX: e.clientX - bounds.left,
        endY: e.clientY - bounds.top,
      });
    }
  }

  function onCanvasMouseMove(e) {
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
      setSelectedIds(next);
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
  }

  function onSelect(id, additive, expand) {
    if (!id) {
      setSelectedIds([]);
      return;
    }
    if (expand) {
      const item = items.find((b) => b.id === id);
      if (!item) {
        return;
      }
      if (item.kind === 'tile') {
        setActiveTileId((prev) => (prev === id ? null : id));
        setActiveCoreId(null);
      }
      if (item.kind === 'core') {
        setActiveCoreId((prev) => (prev === id ? null : id));
      }
    } else {
      setSelectedIds((prev) =>
        additive ? Array.from(new Set([...prev, id])) : [id]
      );
    }
  }

  function createGroup(kind) {
    if (selectedIds.length === 0) {
      return;
    }
    if (kind === 'tile' && activeTileId) {
      return;
    }
    if (kind === 'core' && !activeTileId) {
      return;
    }
    if (kind === 'core' && activeCoreId) {
      return;
    }
    const selected = items.filter((b) => selectedIds.includes(b.id));
    const parentId = selected[0]?.parentId || ROOT_ID;
    const sameParent = selected.every((b) => b.parentId === parentId);
    if (!sameParent) {
      return;
    }
    if (kind === 'core' && parentId !== activeTileId) {
      return;
    }
    if (kind === 'tile' && parentId !== ROOT_ID) {
      return;
    }
    const minX = Math.min(...selected.map((b) => b.x));
    const minY = Math.min(...selected.map((b) => b.y));
    const maxX = Math.max(...selected.map((b) => b.x + b.w));
    const maxY = Math.max(...selected.map((b) => b.y + b.h));
    const pad = 24;
    const groupId = mkId(kind);
    const group = {
      id: groupId,
      kind,
      title: kind === 'tile' ? 'Tile' : 'Core',
      x: minX - pad,
      y: minY - pad,
      w: maxX - minX + pad * 2,
      h: maxY - minY + pad * 2,
      meta: `${selected.length} blocks`,
      color: kind === 'tile' ? '#182a40' : '#1b3858',
      parentId: kind === 'core' ? activeTileId : ROOT_ID,
    };
    setItems((prev) => [
      ...prev.map((b) =>
        selectedIds.includes(b.id)
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
    if (activeCoreId) {
      return items.filter((b) => b.parentId === activeCoreId);
    }
    if (activeTileId) {
      return items.filter((b) => b.parentId === activeTileId);
    }
    return items.filter((b) => b.parentId === ROOT_ID);
  }, [items, activeTileId, activeCoreId]);

  const contextItem = useMemo(() => {
    if (activeCoreId) {
      return items.find((b) => b.id === activeCoreId) || null;
    }
    if (activeTileId) {
      return items.find((b) => b.id === activeTileId) || null;
    }
    return null;
  }, [items, activeTileId, activeCoreId]);

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

  return (
    <main className="eda-root">
      <TopToolbar
        onCenter={() => {
          setViewport((prev) => ({ ...prev, x: 32, y: 32, scale: 1 }));
        }}
        onClear={() => {
          setItems([]);
          setSelectedIds([]);
          setActiveTileId(null);
          setActiveCoreId(null);
        }}
        onMakeTile={() => createGroup('tile')}
        onMakeCore={() => createGroup('core')}
        activeTileId={activeTileId}
      />
      <section className="eda-body">
        <div className="left-wrap" style={leftStyle}>
          <LibraryPanel
            balls={ballCatalog}
            collapsed={leftCollapsed}
            onToggle={() => setLeftCollapsed((v) => !v)}
          />
          <div className="resize-handle" onMouseDown={onResizeStart} />
        </div>
        <EdaCanvas
          items={visibleItems}
          selectedIds={selectedIds}
          dragging={dragging}
          viewport={viewport}
          selectionBox={selectionBox}
          contextItem={contextItem}
          onCanvasDrop={onCanvasDrop}
          onSelect={onSelect}
          onStartDrag={onStartDrag}
          onMoveDrag={onMoveDrag}
          onEndDrag={onEndDrag}
          onCanvasMouseDown={onCanvasMouseDown}
          onCanvasMouseMove={onCanvasMouseMove}
          onCanvasMouseUp={onCanvasMouseUp}
          onCanvasWheel={onCanvasWheel}
          onCanvasContextMenu={onCanvasContextMenu}
        />
        <ChatPanel
          items={chatItems}
          message={chatMessage}
          payload={chatPayload}
          busy={chatBusy}
          onChangeMessage={setChatMessage}
          onChangePayload={setChatPayload}
          onSend={onSendChat}
        />
      </section>
    </main>
  );
}
