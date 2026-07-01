import { auth } from "@clerk/nextjs/server"
import { getMe } from "@/app/actions/onboarding"
import type { Role } from "@/types"

const HIERARCHY: Role[] = ["viewer", "member", "admin", "owner"]

export async function getRole(): Promise<Role> {
  const { userId } = await auth()
  if (!userId) return "viewer"
  const me = await getMe()
  return (me?.role as Role) ?? "member"
}

export async function requireRole(minimum: Role) {
  const role = await getRole()
  if (HIERARCHY.indexOf(role) < HIERARCHY.indexOf(minimum)) {
    throw new Error("Insufficient permissions")
  }
}

export function hasAccess(role: Role, minimum: Role): boolean {
  return HIERARCHY.indexOf(role) >= HIERARCHY.indexOf(minimum)
}
