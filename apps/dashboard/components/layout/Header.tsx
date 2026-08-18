"use client"

import { UserButton } from "@clerk/nextjs"
import { useOrchStatus } from "@/hooks/useOrchStatus"
import { useTheme } from "@/components/layout/ThemeProvider"
import { OrgSwitcher } from "@/components/layout/OrgSwitcher"
import { Sun, Moon } from "lucide-react"

export function Header() {
  const { data: status } = useOrchStatus()
  const { theme, toggle } = useTheme()

  return (
    <header className="hidden md:flex fixed top-0 left-[220px] right-0 h-14 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md items-center justify-between px-4 lg:px-6 z-10">
      <div className="flex items-center gap-3 min-w-0">
        <OrgSwitcher />
        {status && (
          <>
            <span className="text-[var(--border)] shrink-0">/</span>
            <span className="text-sm font-medium truncate">{status.team}</span>
            <span className="hidden lg:inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-[var(--text-secondary)] shrink-0">
              {status.model_policy}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={toggle}
          className="w-8 h-8 flex items-center justify-center rounded-md border border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
        </button>
        <UserButton 
          appearance={{
            elements: {
              userButtonPopoverFooter: "hidden"
            }
          }}
        />
      </div>
    </header>
  )
}
