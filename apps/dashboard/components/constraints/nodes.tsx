import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Zap, ShieldAlert, GitMerge, Trash2 } from "lucide-react";

// Standard UI for all nodes to match our aesthetics
const NodeWrapper = ({ title, icon: Icon, children, type, onDelete }: any) => {
  const colorMap: any = {
    trigger: "text-[var(--accent)]",
    condition: "text-[var(--warning)]",
    action: "text-[var(--success)]",
  };

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-xl min-w-[240px] text-[var(--text-primary)] transition-all hover:border-[var(--accent)]/50">
      <div className="px-3 py-2 border-b border-[var(--border)] flex items-center justify-between bg-[var(--background)] rounded-t-lg">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${colorMap[type]}`} />
          <h3 className="text-xs font-semibold uppercase tracking-wider">{title}</h3>
        </div>
        {onDelete && (
          <button
            onClick={onDelete}
            className="text-[var(--text-secondary)] hover:text-rose-500 transition-colors p-1 rounded cursor-pointer"
            title="Delete Node"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="p-3 text-xs space-y-2">{children}</div>
    </div>
  );
};

export const TriggerNode = memo(({ id, data }: any) => {
  return (
    <>
      <NodeWrapper title="Trigger" icon={Zap} type="trigger" onDelete={data.onDelete ? () => data.onDelete(id) : undefined}>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-mono uppercase text-[var(--text-secondary)]">When (Event / Scope):</span>
          <input
            type="text"
            value={data.label || ""}
            onChange={(e) => data.onChange && data.onChange(id, e.target.value)}
            placeholder="e.g. Any File Modified..."
            className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-2 py-1 text-xs font-mono text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
        </div>
      </NodeWrapper>
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-[var(--accent)] !border-2 !border-[var(--background)]" />
    </>
  );
});

export const ConditionNode = memo(({ id, data }: any) => {
  return (
    <>
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-[var(--accent)] !border-2 !border-[var(--background)]" />
      <NodeWrapper title="Condition" icon={GitMerge} type="condition" onDelete={data.onDelete ? () => data.onDelete(id) : undefined}>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-mono uppercase text-[var(--text-secondary)]">If (Check Condition):</span>
          <input
            type="text"
            value={data.label || ""}
            onChange={(e) => data.onChange && data.onChange(id, e.target.value)}
            placeholder="e.g. File matches *.tsx..."
            className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-2 py-1 text-xs font-mono text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
        </div>
      </NodeWrapper>
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-[var(--accent)] !border-2 !border-[var(--background)]" />
    </>
  );
});

export const ActionNode = memo(({ id, data }: any) => {
  return (
    <>
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-[var(--accent)] !border-2 !border-[var(--background)]" />
      <NodeWrapper title="Enforce Rule" icon={ShieldAlert} type="action" onDelete={data.onDelete ? () => data.onDelete(id) : undefined}>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-mono uppercase text-[var(--text-secondary)]">Enforce Constraint Rule:</span>
          <textarea
            value={data.label || ""}
            onChange={(e) => data.onChange && data.onChange(id, e.target.value)}
            placeholder="e.g. Do not use raw SQL strings..."
            rows={3}
            className="w-full resize-none bg-[var(--background)] border border-[var(--border)] rounded p-2 text-xs font-mono text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--accent)] leading-relaxed"
          />
        </div>
      </NodeWrapper>
    </>
  );
});

export const nodeTypes = {
  triggerNode: TriggerNode,
  conditionNode: ConditionNode,
  actionNode: ActionNode,
};
