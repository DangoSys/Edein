import React from 'react';

export function LibraryPanel({ balls, collapsed, onToggle }) {
  function onDragStart(e, type) {
    e.dataTransfer.setData('ball/type', type);
    e.dataTransfer.effectAllowed = 'copy';
  }

  return (
    <aside className="eda-left">
      <div className="panel-header">
        <div className="panel-title">Ball Library</div>
        <button type="button" className="ghost-btn" onClick={onToggle}>
          {collapsed ? 'Expand' : 'Collapse'}
        </button>
      </div>
      {collapsed ? (
        <div className="panel-collapsed">Library</div>
      ) : (
        <div className="ball-list">
          {balls.map((b) => (
            <button
              key={b.type}
              className="ball-item"
              type="button"
              draggable
              onDragStart={(e) => onDragStart(e, b.type)}
            >
              <span>{b.title}</span>
              <small>{b.desc}</small>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
