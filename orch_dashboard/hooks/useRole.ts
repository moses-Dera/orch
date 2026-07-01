"use client"

import { useUser } from "@clerk/nextjs"
import { useQuery } from "@tanstack/react-query"
import type { Role } from "@/types"

const HIERARCHY: Role[] = ["viewer", "member", "admin", "owner"]

export function useMe() {
  const { user } = useUser()
  return useQuery({
    queryKey: ["me", user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/orch/v1/onboarding/me?clerk_id=${user?.id}`)
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!user?.id,
    staleTime: Infinity,
  })
}

export function useRole(): Role {
  const { data } = useMe()
  return (data?.role as Role) ?? "member"
}

export function useHasAccess(minimum: Role): boolean {
  const role = useRole()
  return HIERARCHY.indexOf(role) >= HIERARCHY.indexOf(minimum)
}
