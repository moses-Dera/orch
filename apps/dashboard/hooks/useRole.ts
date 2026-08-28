"use client"

import { useSession, useUser } from "@clerk/nextjs"
import { useQuery } from "@tanstack/react-query"
import type { Role } from "@/types"

const HIERARCHY: Role[] = ["viewer", "member", "admin", "owner"]

export function useMe() {
  const { user } = useUser()
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch(`/api/orch/v1/onboarding/me?clerk_id=${user?.id}`)
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useRole(): Role {
  const { session } = useSession()
  const role = session?.publicUserData?.publicMetadata?.role || 
               // @ts-ignore fallback if custom claim template is used
               session?.claims?.metadata?.role
               
  return (role as Role) ?? "member"
}

export function useHasAccess(minimum: Role): boolean {
  const role = useRole()
  return HIERARCHY.indexOf(role) >= HIERARCHY.indexOf(minimum)
}
