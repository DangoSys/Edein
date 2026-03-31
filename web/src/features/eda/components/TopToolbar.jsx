import React from 'react';

export function TopToolbar({ onExport, onClear, hasNodes }) {
  return (
    <header className="eda-top">
      <div className="brand">Edein</div>
      <div className="tool-btns">
        <button type="button" onClick={onExport} disabled={!hasNodes}>Export Verilog</button>
        <button type="button" onClick={onClear}>Clear</button>
      </div>
    </header>
  );
}
