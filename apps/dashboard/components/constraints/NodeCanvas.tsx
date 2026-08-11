import React, { useCallback, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { nodeTypes } from './nodes';
import { Button } from '../ui/button';
import { toast } from 'sonner';

const initialNodes = [
  { id: '1', type: 'triggerNode', position: { x: 50, y: 50 }, data: { label: 'Any File Modified' } },
  { id: '2', type: 'conditionNode', position: { x: 350, y: 50 }, data: { label: 'File is *.tsx' } },
  { id: '3', type: 'actionNode', position: { x: 650, y: 50 }, data: { label: 'Use React Server Components by default.\nDo not use useEffect.' } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: 'var(--accent)' } },
  { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: 'var(--accent)' } },
];

export function NodeCanvas({ onSave }: { onSave?: (markdown: string) => void }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: 'var(--accent)' } }, eds)),
    [setEdges],
  );

  const handleSave = () => {
    const sortedNodes = [...nodes].sort((a, b) => a.position.x - b.position.x);
    let md = "# Visual Constraint Rule\n\n";
    sortedNodes.forEach(n => {
      const typeStr = n.type === 'triggerNode' ? 'Trigger' : n.type === 'conditionNode' ? 'Condition' : 'Action';
      md += `**${typeStr}:** ${n.data.label}\n\n`;
    });
    
    if (onSave) onSave(md.trim());
    toast.success("Graph serialized to markdown!");
  };

  return (
    <div className="w-full h-[500px] border rounded-lg bg-[var(--background)] overflow-hidden relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Controls className="bg-[var(--surface)] border-none shadow-lg fill-white" />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} color="var(--text-secondary)" />
      </ReactFlow>
      
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button size="sm" variant="outline" onClick={() => {
          const newNode = {
            id: Date.now().toString(),
            type: 'actionNode',
            position: { x: 400, y: 200 },
            data: { label: 'New Rule' }
          };
          setNodes((nds) => nds.concat(newNode));
        }}>+ Add Node</Button>
        <Button size="sm" onClick={handleSave}>Save Flow</Button>
      </div>
    </div>
  );
}
