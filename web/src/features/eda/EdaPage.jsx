import React, { useState } from 'react';
import { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import './eda.css';
import { ballCatalog } from './types/ballCatalog';
import {
  exportVerilog,
  runEvaluate,
  runGenerate,
  runVerify
} from './services/mockActions';
import { useEdaStore } from './state/useEdaStore';
import { TopToolbar } from './components/TopToolbar';
import { LibraryPanel } from './components/LibraryPanel';
import { FlowCanvas } from './components/FlowCanvas';
import { NodeInspector } from './components/NodeInspector';

export function EdaPage() {
  const {
    nodes,
    edges,
    selected,
    logs,
    addBall,
    patchNode,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onSelectNode,
    clearAll,
    appendLog
  } = useEdaStore();
  const [busy, setBusy] = useState(false);
  const [verilog, setVerilog] = useState('');

  async function runNode(kind) {
    if (!selected) {
      throw new Error('select a ball first');
    }
    setBusy(true);
    patchNode(selected.id, { status: 'running', error: null });
    appendLog('info', `${kind} start`, selected.id);
    try {
      if (kind === 'generate') {
        const out = await runGenerate(selected);
        patchNode(selected.id, { status: 'success' });
        appendLog('ok', `gen: ${out.artifact}`, selected.id);
      } else if (kind === 'verify') {
        await runVerify(selected, nodes, edges);
        patchNode(selected.id, { status: 'success' });
        appendLog('ok', 'verify pass', selected.id);
      } else {
        const ev = await runEvaluate(selected);
        patchNode(selected.id, { status: 'success', eval: ev });
        appendLog('ok', `eval latency=${ev.latency} area=${ev.area}`, selected.id);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      patchNode(selected.id, { status: 'failed', error: msg });
      appendLog('err', msg, selected.id);
      throw e;
    } finally {
      setBusy(false);
    }
  }

  function onExport() {
    const txt = exportVerilog(nodes, edges);
    setVerilog(txt);
    appendLog('ok', 'export verilog');
    const blob = new Blob([txt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'npu_top.v';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="eda-root">
      <TopToolbar onExport={onExport} onClear={clearAll} hasNodes={nodes.length > 0} />
      <section className="eda-body">
        <LibraryPanel balls={ballCatalog} />
        <ReactFlowProvider>
          <FlowCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectNode={onSelectNode}
            addBall={addBall}
          />
        </ReactFlowProvider>
        <NodeInspector node={selected} busy={busy} onRun={runNode} />
      </section>
      <section className="eda-bottom">
        <div className="log-box">
          <div className="panel-title">Logs</div>
          <div className="logs">
            {logs.map((l) => (
              <div key={l.id} className={`log ${l.kind}`}>
                <span>{l.ts.slice(11, 19)}</span>
                <span>{l.nodeId || '-'}</span>
                <span>{l.msg}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="code-box">
          <div className="panel-title">Verilog Preview</div>
          <pre>{verilog || '// export to preview'}</pre>
        </div>
      </section>
    </main>
  );
}
