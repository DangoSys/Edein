import React from 'react';

export function TopToolbar({ onClear, onCenter, onMakeTile, onMakeCore, activeTileId }) {
  return (
    <header className="eda-top">
      <div className="brand">Edein</div>
      <div className="tool-btns">
        <button type="button" onClick={onCenter}>Center</button>
        <button type="button" onClick={onMakeTile}>Make Tile</button>
        <button type="button" onClick={onMakeCore} disabled={!activeTileId}>Make Core</button>
        <button type="button" onClick={onClear}>Clear Canvas</button>
      </div>
    </header>
  );
}
