import React, { useEffect, useRef } from 'react';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function useWindowDrag(onMove, onEnd) {
  useEffect(() => {
    if (!onMove) {
      return;
    }
    function handleMove(e) {
      onMove(e);
    }
    function handleUp() {
      onEnd();
    }
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [onMove, onEnd]);
}

export function EdaCanvas({
  items,
  selectedIds,
  dragging,
  viewport,
  selectionBox,
  contextMenu,
  onCanvasDrop,
  onSelect,
  onStartDrag,
  onMoveDrag,
  onEndDrag,
  onStartResize,
  onCanvasMouseDown,
  onCanvasMouseMove,
  onCanvasMouseUp,
  onCanvasWheel,
  onCanvasContextMenu,
  onToggleTile,
}) {
  const canvasRef = useRef(null);
  useWindowDrag(
    dragging
      ? (e) => {
          const rect = canvasRef.current?.getBoundingClientRect() || null;
          onMoveDrag(e, rect);
        }
      : null,
    () => onEndDrag()
  );

  function handleDrop(e) {
    e.preventDefault();
    if (!canvasRef.current) {
      return;
    }
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    onCanvasDrop(e, {
      x,
      y,
      width: rect.width,
      height: rect.height,
      bounds: rect,
      clientX: e.clientX,
      clientY: e.clientY,
    });
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }

  return (
    <section
      ref={canvasRef}
      className="eda-canvas"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onMouseDown={onCanvasMouseDown}
      onMouseMove={onCanvasMouseMove}
      onMouseUp={onCanvasMouseUp}
      onWheel={onCanvasWheel}
      onContextMenu={onCanvasContextMenu}
    >
      <div className="canvas-viewport" style={{
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
      }}>
        <div className="canvas-grid" />
      {items.map((b) => {
          const left = clamp(b.x, 0, 100000);
          const top = clamp(b.y, 0, 100000);
          return (
            <div
              key={b.id}
              className={`block ${selectedIds.includes(b.id) ? 'selected' : ''} ${b.kind} ${b.locked ? 'locked' : ''} ${b.collapsed ? 'collapsed' : ''}`}
              style={{
                left,
                top,
                width: b.renderW ?? b.w,
                height: b.renderH ?? b.h,
                background: b.color,
              }}
              onMouseDown={(e) => {
                if (e.button !== 0) {
                  return;
                }
                if (e.altKey) {
                  onStartDrag(e, b, canvasRef.current?.getBoundingClientRect() || null);
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(b.id, e.shiftKey);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (b.kind === 'tile') {
                  onToggleTile(b.id);
                }
              }}
            >
              <div className="block-title">{b.title}</div>
              {!b.collapsed && b.meta ? <div className="block-meta">{b.meta}</div> : null}
              {selectedIds.includes(b.id) && b.kind !== 'ball' && !b.collapsed ? (
                <div
                  className="resize-handle-br"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    if (e.button !== 0) {
                      return;
                    }
                    onStartResize(e, b, canvasRef.current?.getBoundingClientRect() || null);
                  }}
                />
              ) : null}
            </div>
          );
        })}
      </div>
      {selectionBox ? (
        <div
          className="selection-box"
          style={{
            left: selectionBox.x,
            top: selectionBox.y,
            width: selectionBox.w,
            height: selectionBox.h,
          }}
        />
      ) : null}
      {contextMenu ? (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseDown={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          {contextMenu.items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="context-item"
              onClick={item.onClick}
              disabled={item.disabled}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
