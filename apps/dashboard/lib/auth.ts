import { auth, clerkClient } from "@clerk/nextjs/server"
import { getMe } from "@/app/actions/onboarding"
import type { Role } from "@/types"

const HIERARCHY: Role[] = ["viewer", "member", "admin", "owner"]

export async function getRole(): Promise<Role> {
  const { userId, sessionClaims } = await auth()
  if (!userId) return "viewer"
  
  const metadata = sessionClaims?.metadata as any
  if (metadata?.role) {
    return metadata.role as Role
  }

  const me = await getMe()
  const role = (me?.role as Role) ?? "member"
  
  if (me?.role) {
    const client = await clerkClient()
    await client.users.updateUserMetadata(userId, {
      publicMetadata: { role }
    })
  }

  return role
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
