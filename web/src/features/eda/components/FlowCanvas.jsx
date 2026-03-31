import React, { useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useReactFlow
} from 'reactflow';

function InnerCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onSelectNode,
  addBall
}) {
  const rf = useReactFlow();

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('ball/type');
    if (!type) {
      return;
    }
    const pos = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    addBall(type, pos);
  }, [addBall, rf]);

  return (
    <div className="eda-canvas" onDrop={onDrop} onDragOver={onDragOver}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => onSelectNode(node.id)}
        fitView
      >
        <MiniMap />
        <Controls />
        <Background gap={20} />
      </ReactFlow>
    </div>
  );
}

export function FlowCanvas(props) {
  return <InnerCanvas {...props} />;
}
