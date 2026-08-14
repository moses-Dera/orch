"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useHasAccess } from "@/hooks/useRole"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/home", label: "Home", minRole: "member" as const },
  { href: "/team", label: "Team", minRole: "admin" as const },
  { href: "/projects", label: "Projects", minRole: "admin" as const },
  { href: "/constraints", label: "Constraints", minRole: "admin" as const },
  { href: "/models", label: "Models", minRole: "admin" as const },
  { href: "/github", label: "GitHub", minRole: "admin" as const },
  { href: "/analytics", label: "Analytics", minRole: "admin" as const },
  null,
  { href: "/docs", label: "Docs & MCP", minRole: "member" as const },
  { href: "/settings", label: "Settings", minRole: "member" as const },
]

import { UserButton } from "@clerk/nextjs"

export function Sidebar() {
  const pathname = usePathname()
  const isAdmin = useHasAccess("admin")

  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] border-r bg-[var(--surface)] flex flex-col justify-between">
      <div>
        <Link href="/" className="block px-5 py-5 border-b hover:bg-[var(--border)]/50 transition-colors">
          <span className="text-base font-semibold tracking-tight">Orch</span>
        </Link>

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
      </div>

      <div className="p-4 border-t flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--text-secondary)]">Account</span>
        <UserButton 
          appearance={{
            elements: {
              userButtonPopoverFooter: "hidden"
            }
          }}
        />
      </div>
    </aside>
  )
}
