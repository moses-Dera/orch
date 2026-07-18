"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useHasAccess } from "@/hooks/useRole"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/", label: "Home", minRole: "member" as const },
  { href: "/chat", label: "Chat", minRole: "member" as const },
  { href: "/audit", label: "Audit", minRole: "member" as const },
  { href: "/sessions", label: "Sessions", minRole: "member" as const },
  null, // divider
  { href: "/team", label: "Team", minRole: "admin" as const },
  { href: "/constraints", label: "Constraints", minRole: "admin" as const },
  { href: "/models", label: "Models", minRole: "admin" as const },
  { href: "/github", label: "GitHub", minRole: "admin" as const },
  { href: "/audit-log", label: "Audit Log", minRole: "admin" as const },
  { href: "/analytics", label: "Analytics", minRole: "admin" as const },
  null,
  { href: "/docs", label: "Docs", minRole: "member" as const },
  { href: "/settings", label: "Settings", minRole: "member" as const },
]

export function Sidebar() {
  const pathname = usePathname()
  const isAdmin = useHasAccess("admin")

  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] border-r bg-[var(--surface)] flex flex-col">
      <div className="px-5 py-5 border-b">
        <span className="text-base font-semibold tracking-tight">Orch</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV.map((item, i) => {
          if (!item) return <div key={i} className="my-2 border-t" />
          if (item.minRole === "admin" && !isAdmin) return null

          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-[var(--accent)]/10 text-[var(--accent)] font-medium"
                  : "text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-[var(--text-primary)]"
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
