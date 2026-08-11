import { LucideIcon, FolderOpen } from "lucide-react"

interface EmptyStateProps {
  title: string
  description: string
  action?: React.ReactNode
  icon?: LucideIcon
}

export function EmptyState({ title, description, action, icon: Icon = FolderOpen }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--muted)] mb-4 shadow-inner">
        <Icon className="h-6 w-6 text-[var(--muted-foreground)]" />
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">{title}</h3>
      <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-sm leading-relaxed">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
