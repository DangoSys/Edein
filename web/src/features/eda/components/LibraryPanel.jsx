import React from 'react';

export function LibraryPanel({ balls }) {
  function onDragStart(e, type) {
    e.dataTransfer.setData('ball/type', type);
    e.dataTransfer.effectAllowed = 'copy';
  }

  return (
    <aside className="eda-left">
      <div className="panel-title">Ball Library</div>
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
    </aside>
  );
}
