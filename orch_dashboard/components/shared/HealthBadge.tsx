import { cn } from "@/lib/utils"
import type { HealthStatus } from "@/types"

const styles: Record<HealthStatus, string> = {
  healthy: "bg-green-500/10 text-green-500 border-green-500/20",
  warning: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  critical: "bg-red-500/10 text-red-500 border-red-500/20",
}

export function HealthBadge({ status }: { status: HealthStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", styles[status])}>
      {status}
    </span>
  )
}

export function SeverityBadge({ severity }: { severity: string }) {
  const status: HealthStatus = severity === "critical" ? "critical" : severity === "warning" ? "warning" : "healthy"
  return <HealthBadge status={status} />
}
