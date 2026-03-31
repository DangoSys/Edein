import React from 'react';

export function NodeInspector({ node, busy, onRun }) {
  if (!node) {
    return (
      <aside className="eda-right">
        <div className="panel-title">Inspector</div>
        <div className="hint">select a ball</div>
      </aside>
    );
  }

  const st = node.data.status;
  const ev = node.data.eval;

  return (
    <aside className="eda-right">
      <div className="panel-title">Inspector</div>
      <div className="row"><b>ID</b><span>{node.id}</span></div>
      <div className="row"><b>Type</b><span>{node.data.type}</span></div>
      <div className="row"><b>Status</b><span>{st}</span></div>
      <div className="row"><b>Latency</b><span>{ev ? ev.latency : '-'}</span></div>
      <div className="row"><b>Area</b><span>{ev ? ev.area : '-'}</span></div>
      {node.data.error ? <div className="err">{node.data.error}</div> : null}
      <div className="action-col">
        <button type="button" disabled={busy} onClick={() => onRun('generate')}>Generate</button>
        <button type="button" disabled={busy} onClick={() => onRun('verify')}>Verify</button>
        <button type="button" disabled={busy} onClick={() => onRun('evaluate')}>Evaluate</button>
      </div>
    </aside>
  );
}
