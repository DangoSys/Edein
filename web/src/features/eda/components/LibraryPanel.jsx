import React, { useState } from 'react';

export function LibraryPanel({ balls, collapsed, onAddNewBall }) {
  const [openId, setOpenId] = useState(null);
  const [query, setQuery] = useState('');
  const [openGroups, setOpenGroups] = useState({});
  function onDragStart(e, type) {
    e.dataTransfer.setData('ball/type', type);
    e.dataTransfer.effectAllowed = 'copy';
  }

  return (
    <aside className="eda-left">
      <div className="panel-header">
        <div className="panel-title">Ball Library</div>
        <div className="panel-actions">
          <button type="button" className="ghost-btn" onClick={onAddNewBall}>
            Add Ball
          </button>
        </div>
      </div>
      {collapsed ? (
        <div className="panel-collapsed">Library</div>
      ) : (
        <div className="ball-list">
          <input
            className="ball-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search balls"
          />
          {Object.entries(groupBalls(balls, query)).map(([group, groupItems]) => {
            const open = openGroups[group] ?? true;
            return (
              <div key={group} className={`ball-group ${open ? 'open' : 'collapsed'}`}>
                <button
                  type="button"
                  className="ball-group-title"
                  onClick={() => setOpenGroups((prev) => ({ ...prev, [group]: !open }))}
                >
                  <span>{group}</span>
                  <span className="chev">{open ? '▾' : '▸'}</span>
                </button>
                {open ? groupItems.map((b) => {
            const opened = openId === b.type;
            return (
              <div
                key={b.type}
                className={`ball-card ${opened ? 'open' : ''}`}
                draggable
                onDragStart={(e) => onDragStart(e, b.type)}
              >
                <div
                  className="ball-head"
                  role="button"
                  tabIndex={0}
                  onClick={() => setOpenId((prev) => (prev === b.type ? null : b.type))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setOpenId((prev) => (prev === b.type ? null : b.type));
                    }
                  }}
                >
                  <div>
                    <div className="ball-title">{b.title}</div>
                    <div className="ball-desc">{b.desc}</div>
                  </div>
                </div>
                {opened ? (
                  <div className="ball-params">
                    {Object.entries(b.cfg || {}).map(([key, value]) => (
                      <div key={key} className="param-row">
                        <span>{key}</span>
                        <span>{String(value)}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          }) : null}
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}

function groupBalls(balls, query) {
  const q = query.trim().toLowerCase();
  const filtered = balls.filter((b) => {
    if (!q) return true;
    return (
      b.type.toLowerCase().includes(q) ||
      b.title.toLowerCase().includes(q) ||
      (b.desc || '').toLowerCase().includes(q)
    );
  });
  const groups = {};
  filtered.forEach((b) => {
    const group = categorizeBall(b);
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(b);
  });
  return groups;
}

function categorizeBall(ball) {
  const t = ball.type.toLowerCase();
  if (t.includes('quant')) return 'Quantization';
  if (t.includes('systolic') || t.includes('gemmini')) return 'Compute';
  if (t.includes('trace')) return 'Debug';
  if (t.includes('transpose') || t.includes('im2col') || t.includes('relu') || t.includes('vec')) return 'Transform';
  return 'Other';
}
