import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Zap, ShieldAlert, GitMerge } from "lucide-react";

// Standard UI for all nodes to match our aesthetics
const NodeWrapper = ({ title, icon: Icon, children, type }: any) => {
  const colorMap: any = {
    trigger: "text-[var(--accent)]",
    condition: "text-[var(--warning)]",
    action: "text-[var(--success)]",
  };
  return (
    <div className="rounded-lg border bg-[var(--surface)] shadow-lg min-w-[220px]">
      <div className="px-3 py-2 border-b flex items-center gap-2 bg-[var(--background)] rounded-t-lg">
        <Icon className={`w-4 h-4 ${colorMap[type]}`} />
        <h3 className="text-xs font-semibold">{title}</h3>
      </div>
      <div className="p-3 text-xs">{children}</div>
    </div>
  );
};

export const TriggerNode = memo(({ data }: any) => {
  return (
    <>
      <NodeWrapper title="Trigger" icon={Zap} type="trigger">
        <div className="flex flex-col gap-1">
          <span className="text-[var(--text-secondary)]">When:</span>
          <span className="font-mono bg-[var(--background)] px-1 py-0.5 rounded border">{data.label}</span>
        </div>
      </NodeWrapper>
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-[var(--accent)]" />
    </>
  );
});

export const ConditionNode = memo(({ data }: any) => {
  return (
    <>
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-[var(--accent)]" />
      <NodeWrapper title="Condition" icon={GitMerge} type="condition">
        <div className="flex flex-col gap-1">
          <span className="text-[var(--text-secondary)]">If:</span>
          <span className="font-mono bg-[var(--background)] px-1 py-0.5 rounded border">{data.label}</span>
        </div>
      </NodeWrapper>
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-[var(--accent)]" />
    </>
  );
});

export const ActionNode = memo(({ data }: any) => {
  return (
    <>
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-[var(--accent)]" />
      <NodeWrapper title="Enforce Rule" icon={ShieldAlert} type="action">
        <p className="text-[var(--text-secondary)] mb-2">Rule:</p>
        <textarea
          readOnly
          className="w-full resize-none bg-[var(--background)] border rounded p-1 text-xs font-mono"
          value={data.label}
          rows={3}
        />
      </NodeWrapper>
    </>
  );
});

export const nodeTypes = {
  triggerNode: TriggerNode,
  conditionNode: ConditionNode,
  actionNode: ActionNode,
};
