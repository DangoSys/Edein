import { useMemo, useState } from 'react';
import { addEdge, applyEdgeChanges, applyNodeChanges } from 'reactflow';
import { ballCatalog } from '../types/ballCatalog';

function mkId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function mkLog(kind, msg, nodeId) {
  return {
    id: mkId('log'),
    ts: new Date().toISOString(),
    kind,
    msg,
    nodeId: nodeId || null
  };
}

export function useEdaStore() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selId, setSelId] = useState(null);
  const [logs, setLogs] = useState([mkLog('info', 'ready')]);

  const selected = useMemo(() => {
    return nodes.find((n) => n.id === selId) || null;
  }, [nodes, selId]);

  function addBall(type, pos) {
    const tpl = ballCatalog.find((b) => b.type === type);
    if (!tpl) {
      throw new Error(`unknown ball type: ${type}`);
    }
    const id = mkId(type.toLowerCase());
    const node = {
      id,
      type: 'default',
      position: pos,
      data: {
        type: tpl.type,
        title: tpl.title,
        cfg: { ...tpl.cfg },
        status: 'idle',
        eval: null,
        error: null
      }
    };
    setNodes((prev) => [...prev, node]);
    setSelId(id);
    appendLog('info', `add ${type}`, id);
  }

  function patchNode(id, patch) {
    setNodes((prev) => prev.map((n) => {
      if (n.id !== id) {
        return n;
      }
      return {
        ...n,
        data: {
          ...n.data,
          ...patch
        }
      };
    }));
  }

  function onNodesChange(changes) {
    setNodes((prev) => applyNodeChanges(changes, prev));
  }

  function onEdgesChange(changes) {
    setEdges((prev) => applyEdgeChanges(changes, prev));
  }

  function onConnect(conn) {
    setEdges((prev) => addEdge({ ...conn, animated: true }, prev));
    appendLog('info', `link ${conn.source} -> ${conn.target}`);
  }

  function onSelectNode(id) {
    setSelId(id);
  }

  function clearAll() {
    setNodes([]);
    setEdges([]);
    setSelId(null);
    appendLog('warn', 'clear graph');
  }

  function appendLog(kind, msg, nodeId) {
    setLogs((prev) => [mkLog(kind, msg, nodeId), ...prev].slice(0, 160));
  }

  return {
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
  };
}
