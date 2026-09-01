"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useHasAccess, useIsRoleLoading } from "@/hooks/useRole"
import { Loader2 } from "lucide-react"

const ADMIN_ROUTES = ["/team", "/models", "/github", "/audit-log", "/analytics"]

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isAdmin = useHasAccess("admin")
  const isLoading = useIsRoleLoading()
  const [timedOut, setTimedOut] = useState(false)

  // Safety timeout — if role loading takes more than 3s, assume admin (the backend default)
  useEffect(() => {
    if (!isLoading) return
    const timer = setTimeout(() => setTimedOut(true), 3000)
    return () => clearTimeout(timer)
  }, [isLoading])

  const effectiveLoading = isLoading && !timedOut

  useEffect(() => {
    if (!effectiveLoading && !isAdmin && ADMIN_ROUTES.some(r => pathname.startsWith(r))) {
      router.replace("/")
    }
  }, [effectiveLoading, isAdmin, pathname, router])

  // Block render until role is confirmed for admin routes
  if (ADMIN_ROUTES.some(r => pathname.startsWith(r))) {
    if (effectiveLoading) {
      return (
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--text-secondary)]" />
        </div>
      )
    }
    if (!isAdmin) {
      return null
    }
  }

  return <>{children}</>
}
