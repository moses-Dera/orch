import React, { useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  reconnectEdge,
  BackgroundVariant,
  Panel
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { nodeTypes } from './nodes';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { Plus, Trash2, Save, RefreshCw } from 'lucide-react';

const initialNodes = [
  { id: 'node-1', type: 'triggerNode', position: { x: 50, y: 100 }, data: { label: 'Any Code Modified' } },
  { id: 'node-2', type: 'conditionNode', position: { x: 360, y: 100 }, data: { label: 'File matches backend/*.ts' } },
  { id: 'node-3', type: 'actionNode', position: { x: 670, y: 100 }, data: { label: 'Do not use raw SQL strings.\nUse ORM with parameterized bindings.' } },
];

const initialEdges = [
  { id: 'e1-2', source: 'node-1', target: 'node-2', animated: true, style: { stroke: 'var(--accent)', strokeWidth: 2 } },
  { id: 'e2-3', source: 'node-2', target: 'node-3', animated: true, style: { stroke: 'var(--accent)', strokeWidth: 2 } },
];

export function NodeCanvas({ onSave }: { onSave?: (markdown: string) => void }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Handle live editing of node labels
  const handleNodeChange = useCallback((id: string, newLabel: string) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, label: newLabel } } : n))
    );
  }, [setNodes]);

  // Handle single-click node deletion
  const handleDeleteNode = useCallback((id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    toast.success("Node removed");
  }, [setNodes, setEdges]);

  // Pass handlers to node data
  const processedNodes = nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      onChange: handleNodeChange,
      onDelete: handleDeleteNode,
    },
  }));

  // Handle Connecting Edges
  const onConnect = useCallback(
    (params: any) =>
      setEdges((eds) =>
        addEdge({ ...params, animated: true, style: { stroke: 'var(--accent)', strokeWidth: 2 } }, eds)
      ),
    [setEdges]
  );

  // Handle Edge Reconnection (Disconnecting & Moving Edges)
  const onReconnect = useCallback(
    (oldEdge: any, newConnection: any) => setEdges((els) => reconnectEdge(oldEdge, newConnection, els)),
    [setEdges]
  );

  // Handle Edge Click Deletion
  const onEdgeClick = useCallback(
    (_: any, edge: any) => {
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      toast.success("Connection disconnected");
    },
    [setEdges]
  );

  // Add new nodes
  const addNode = (type: 'triggerNode' | 'conditionNode' | 'actionNode', defaultLabel: string) => {
    const id = `node-${Date.now()}`;
    const xOffset = (nodes.length % 4) * 260 + 50;
    const yOffset = Math.floor(nodes.length / 4) * 150 + 100;

    const newNode = {
      id,
      type,
      position: { x: xOffset, y: yOffset },
      data: { label: defaultLabel },
    };
    setNodes((nds) => nds.concat(newNode));
    toast.success(`Added ${type.replace('Node', '')}`);
  };

  // Serialize to Markdown
  const handleSave = useCallback(() => {
    const sortedNodes = [...nodes].sort((a, b) => a.position.x - b.position.x);
    let md = "# Visual Constraint Rule\n\n";
    sortedNodes.forEach((n) => {
      const typeStr =
        n.type === 'triggerNode'
          ? 'Trigger'
          : n.type === 'conditionNode'
          ? 'Condition'
          : 'Action';
      md += `**${typeStr}:** ${n.data.label}\n\n`;
    });

    const finalMd = md.trim();
    if (onSave) onSave(finalMd);
    toast.success("Workflow graph saved & serialized to constraint!");
  }, [nodes, onSave]);

  return (
    <div className="w-full h-[520px] border border-[var(--border)] rounded-xl bg-[var(--background)] overflow-hidden relative shadow-lg">
      <ReactFlow
        nodes={processedNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode={["Backspace", "Delete"]}
      >
        <Controls className="bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-md !fill-[var(--text-primary)]" />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="var(--border)" />
        
        {/* Controls Panel */}
        <Panel position="top-right" className="flex items-center gap-2 bg-[var(--surface)] p-2 rounded-lg border border-[var(--border)] shadow-md">
          <Button
            size="sm"
            variant="outline"
            onClick={() => addNode('triggerNode', 'When: File Modified')}
            className="text-xs gap-1"
          >
            <Plus className="w-3.5 h-3.5 text-[var(--accent)]" /> Trigger
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => addNode('conditionNode', 'If: Path matches src/*')}
            className="text-xs gap-1"
          >
            <Plus className="w-3.5 h-3.5 text-[var(--warning)]" /> Condition
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => addNode('actionNode', 'Enforce: Rule Details...')}
            className="text-xs gap-1"
          >
            <Plus className="w-3.5 h-3.5 text-[var(--success)]" /> Action
          </Button>
          <div className="w-[1px] h-5 bg-[var(--border)] mx-1" />
          <Button size="sm" onClick={handleSave} className="text-xs bg-[var(--accent)] text-white gap-1 cursor-pointer">
            <Save className="w-3.5 h-3.5" /> Save Flow
          </Button>
        </Panel>

        {/* Bottom Help Tip */}
        <Panel position="bottom-left" className="bg-[var(--surface)] px-3 py-1.5 rounded border border-[var(--border)] text-[10px] font-mono text-[var(--text-secondary)]">
          Tip: Click connections or select & press Delete/Backspace to disconnect. Drag handles to connect.
        </Panel>
      </ReactFlow>
    </div>
  );
}
