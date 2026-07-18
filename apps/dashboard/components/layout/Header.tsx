"use client"

import { UserButton } from "@clerk/nextjs"
import { useOrchStatus } from "@/hooks/useOrchStatus"
import { useTheme } from "@/components/layout/ThemeProvider"
import { OrgSwitcher } from "@/components/layout/OrgSwitcher"

export function Header() {
  const { data: status } = useOrchStatus()
  const { theme, toggle } = useTheme()

  return (
    <header className="fixed top-0 left-[220px] right-0 h-14 border-b bg-[var(--surface)] flex items-center justify-between px-6 z-10">
      <div className="flex items-center gap-3">
        <OrgSwitcher />
        {status && (
          <>
            <span className="text-[var(--border)]">/</span>
            <span className="text-sm font-medium">{status.team}</span>
            <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-[var(--text-secondary)]">
              {status.model_policy}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? "☀" : "☾"}
        </button>
        <UserButton />
      </div>
    </header>
  )
}
