"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { useHasAccess } from "@/hooks/useRole"

const ADMIN_ROUTES = ["/team", "/constraints", "/models", "/github", "/audit-log", "/analytics"]

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isAdmin = useHasAccess("admin")

  useEffect(() => {
    if (!isAdmin && ADMIN_ROUTES.some(r => pathname.startsWith(r))) {
      router.replace("/")
    }
  }, [isAdmin, pathname, router])

  // Block render until role is confirmed for admin routes
  if (!isAdmin && ADMIN_ROUTES.some(r => pathname.startsWith(r))) {
    return null
  }

  return <>{children}</>
}
