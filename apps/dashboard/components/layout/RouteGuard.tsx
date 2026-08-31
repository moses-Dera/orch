"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { useHasAccess, useIsRoleLoading } from "@/hooks/useRole"
import { Loader2 } from "lucide-react"

const ADMIN_ROUTES = ["/team", "/constraints", "/models", "/github", "/audit-log", "/analytics"]

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isAdmin = useHasAccess("admin")
  const isLoading = useIsRoleLoading()

  useEffect(() => {
    if (!isLoading && !isAdmin && ADMIN_ROUTES.some(r => pathname.startsWith(r))) {
      router.replace("/")
    }
  }, [isLoading, isAdmin, pathname, router])

  // Block render until role is confirmed for admin routes
  if (ADMIN_ROUTES.some(r => pathname.startsWith(r))) {
    if (isLoading) {
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
