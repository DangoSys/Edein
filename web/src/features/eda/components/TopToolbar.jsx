import React from 'react';

export function TopToolbar({ onClear, onCenter, onExport, onImport }) {
  return (
    <header className="eda-top">
      <div className="brand">Edein</div>
      <div className="tool-btns">
        <button type="button" onClick={onCenter}>Center</button>
        <button type="button" onClick={onExport}>Export JSON</button>
        <label className="upload-btn">
          Import JSON
          <input type="file" accept="application/json" onChange={(e) => onImport(e.target.files?.[0])} />
        </label>
        <button type="button" onClick={onClear}>Clear Canvas</button>
      </div>
    </header>
  );
}
