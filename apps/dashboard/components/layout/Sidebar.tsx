"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useHasAccess } from "@/hooks/useRole"
import { cn } from "@/lib/utils"
import { UserButton } from "@clerk/nextjs"
import { Menu, X, Sun, Moon } from "lucide-react"
import { useTheme } from "@/components/layout/ThemeProvider"

const NAV = [
  { href: "/constraints", label: "Constraints", minRole: "member" as const },
  { href: "/team", label: "Team", minRole: "admin" as const },
  { href: "/projects", label: "Projects", minRole: "admin" as const },
  { href: "/models", label: "Models", minRole: "admin" as const },
  { href: "/github", label: "GitHub", minRole: "admin" as const },
  { href: "/analytics", label: "Analytics", minRole: "admin" as const },
  null,
  { href: "/chat", label: "Assistant", minRole: "member" as const },
  { href: "/docs", label: "Docs & MCP", minRole: "member" as const },
  { href: "/settings", label: "Settings", minRole: "member" as const },
]

export function Sidebar() {
  const pathname = usePathname()
  const isAdmin = useHasAccess("admin")
  const { theme, toggle } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile Top Navigation Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[var(--surface)] border-b px-4 flex items-center justify-between z-40">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-base font-bold tracking-tight text-[var(--text-primary)]">Orch</span>
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="p-1.5 rounded-md border border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)]"
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
          <UserButton />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 rounded-md border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Sliding Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 bg-black/60 z-50 flex flex-col" onClick={() => setMobileOpen(false)}>
          <div className="w-[260px] h-full bg-[var(--surface)] border-r p-5 flex flex-col justify-between shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b">
                <Link href="/" className="text-lg font-bold text-[var(--text-primary)]">Orch</Link>
                <button onClick={() => setMobileOpen(false)} className="text-[var(--text-secondary)]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                {NAV.map((item, i) => {
                  if (!item) return <div key={i} className="my-2 border-t border-[var(--border)]" />
                  if (item.minRole === "admin" && !isAdmin) return null

                  const active = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                          : "text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      {item.label}
                    </Link>
                  )
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-[var(--border)] flex items-center justify-center">
              <span className="text-xs text-[var(--text-secondary)] font-mono">WORKSPACE</span>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-[220px] border-r bg-[var(--surface)] flex-col justify-between z-30">
        <div>
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <span className="text-base font-bold tracking-tight text-[var(--text-primary)]">Orch</span>
            </Link>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
            {NAV.map((item, i) => {
              if (!item) return <div key={i} className="my-2 border-t border-[var(--border)]" />
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

        <div className="p-4 border-t border-[var(--border)] flex items-center justify-between">
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
    </>
  )
}
