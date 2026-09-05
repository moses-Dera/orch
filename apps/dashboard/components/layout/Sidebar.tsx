"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useHasAccess, useIsRoleLoading } from "@/hooks/useRole"
import { cn } from "@/lib/utils"
import { UserButton, useUser } from "@clerk/nextjs"
import {
  Menu, X, Sun, Moon,
  MessageSquareCode, ShieldCheck, Store, Users,
  FolderKanban, Cpu, GitPullRequest, BarChart3,
  BookOpen, Settings, Server
} from "lucide-react"
import { useTheme } from "@/components/layout/ThemeProvider"
import { OrgSwitcher } from "./OrgSwitcher"
import { ProjectSwitcher } from "./ProjectSwitcher"

const PLATFORM_ADMIN_EMAILS = [
  "okonkwomoses158@gmail.com",
  "mosesjohnson706@gmail.com",
]

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
  platformOwnerOnly?: boolean
  badge?: string
} | null

const NAV: NavItem[] = [
  { href: "/chat", label: "Chat", icon: MessageSquareCode },
  { href: "/constraints", label: "Constraints", icon: ShieldCheck },
  { href: "/marketplace", label: "Marketplace", icon: Store },
  { href: "/team", label: "Team", adminOnly: true, icon: Users },
  { href: "/projects", label: "Projects", adminOnly: true, icon: FolderKanban },
  { href: "/models", label: "Models", adminOnly: true, icon: Cpu },
  { href: "/github", label: "GitHub", adminOnly: true, icon: GitPullRequest },
  { href: "/analytics", label: "Analytics", adminOnly: true, icon: BarChart3 },
  null,
  { href: "/docs", label: "Docs & MCP", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
  null,
  { href: "/platform-ops", label: "Platform Ops", platformOwnerOnly: true, icon: Server, badge: "Root" },
]

export function Sidebar() {
  const pathname = usePathname()
  const isAdmin = useHasAccess("admin")
  const isRoleLoading = useIsRoleLoading()
  const { user } = useUser()
  const { theme, toggle } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  const userEmail = (user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || "").toLowerCase()
  const isPlatformOwner = PLATFORM_ADMIN_EMAILS.includes(userEmail)

  // While the role is loading, show ALL links to avoid a flash of missing items.
  // Once the role resolves, hide admin-only links for non-admins.
  const shouldShowItem = (item: NonNullable<NavItem>) => {
    if (item.platformOwnerOnly) {
      return isPlatformOwner
    }
    if (!item.adminOnly) return true
    if (isRoleLoading) return true // show while loading to prevent flicker
    return isAdmin
  }

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
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
                <Link href="/" className="text-lg font-bold text-[var(--text-primary)]">Orch</Link>
                <button onClick={() => setMobileOpen(false)} className="text-[var(--text-secondary)]">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-col gap-2 pb-4 border-b border-[var(--border)]">
                <OrgSwitcher />
                <ProjectSwitcher />
              </div>

              <nav className="space-y-1">
                {NAV.map((item, i) => {
                  if (!item) return <div key={i} className="my-2 border-t border-[var(--border)]" />
                  if (!shouldShowItem(item)) return null

                  const active = pathname === item.href
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "group flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                          : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {Icon && (
                          <Icon className={cn(
                            "w-4 h-4 shrink-0 transition-colors",
                            active ? "text-[var(--accent)]" : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
                          )} />
                        )}
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20 shrink-0">
                          {item.badge}
                        </span>
                      )}
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
              if (!shouldShowItem(item)) return null

              const active = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-[var(--accent)]/10 text-[var(--accent)] font-medium"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {Icon && (
                      <Icon className={cn(
                        "w-4 h-4 shrink-0 transition-colors",
                        active ? "text-[var(--accent)]" : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
                      )} />
                    )}
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20 shrink-0">
                      {item.badge}
                    </span>
                  )}
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
