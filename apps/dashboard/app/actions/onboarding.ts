"use server"

import { auth, currentUser, clerkClient } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"

const ORCH_API_URL = process.env.ORCH_API_URL ?? "http://127.0.0.1:8000"
const ORCH_API_KEY = process.env.ORCH_API_KEY ?? ""

const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${ORCH_API_KEY}`,
}

async function setOrchKeyCookie(apiKey: string) {
  const jar = await cookies()
  jar.set("orch_key", apiKey, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
}

export async function getMe() {
  const { userId } = await auth()
  if (!userId) return null

  const jar = await cookies()
  const activeOrgId = jar.get("orch_active_org")?.value ?? ""

  const url = new URL(`${ORCH_API_URL}/api/v1/onboarding/me`)
  url.searchParams.set("clerk_id", userId)
  if (activeOrgId) url.searchParams.set("org_id", activeOrgId)

  const res = await fetch(url.toString(), { headers, cache: "no-store" })
  if (!res.ok) return null
  return res.json()
}

export async function switchOrg(orgId: string, apiKey: string) {
  const jar = await cookies()
  jar.set("orch_active_org", orgId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })
  await setOrchKeyCookie(apiKey)
}

export async function switchActiveOrg(orgId: string) {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const res = await fetch(`${ORCH_API_URL}/api/v1/onboarding/switch-org`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      clerk_id: userId,
      org_id: orgId,
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to switch org")
  await switchOrg(orgId, data.api_key)
  return data
}

export async function createAdditionalOrg(formData: {
  orgName: string
  teamName: string
  modelPolicy: "open" | "allowlist" | "enforced"
}) {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const user = await currentUser()

  const res = await fetch(`${ORCH_API_URL}/api/v1/onboarding/create-org`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      clerk_id: userId,
      email: user?.emailAddresses[0]?.emailAddress ?? "",
      name: user?.fullName ?? user?.firstName ?? null,
      org_name: formData.orgName,
      team_name: formData.teamName,
      model_policy: formData.modelPolicy,
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.detail?.message ?? "Failed to create org")
  await switchOrg(data.org_id, data.api_key)
  
  if (data.role) {
    const client = await clerkClient()
    await client.users.updateUserMetadata(userId, {
      publicMetadata: { role: data.role }
    })
  }
  
  return data
}

export async function createOrg(formData: {
  orgName: string
  teamName: string
  modelPolicy: "open" | "allowlist" | "enforced"
}) {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const user = await currentUser()

  const res = await fetch(`${ORCH_API_URL}/api/v1/onboarding/create-org`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      clerk_id: userId,
      email: user?.emailAddresses[0]?.emailAddress ?? "",
      name: user?.fullName ?? user?.firstName ?? null,
      org_name: formData.orgName,
      team_name: formData.teamName,
      model_policy: formData.modelPolicy,
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.detail?.message ?? "Failed to create org")
  await setOrchKeyCookie(data.api_key)
  
  if (data.role) {
    const client = await clerkClient()
    await client.users.updateUserMetadata(userId, {
      publicMetadata: { role: data.role }
    })
  }

  return data
}

export async function createIndividual(formData: {
  workspaceName: string
  teamName: string
}) {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const user = await currentUser()

  const res = await fetch(`${ORCH_API_URL}/api/v1/onboarding/create-individual`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      clerk_id: userId,
      email: user?.emailAddresses[0]?.emailAddress ?? "",
      name: user?.fullName ?? user?.firstName ?? null,
      workspace_name: formData.workspaceName,
      team_name: formData.teamName,
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.detail?.message ?? "Failed to create workspace")
  await setOrchKeyCookie(data.api_key)
  
  if (data.role) {
    const client = await clerkClient()
    await client.users.updateUserMetadata(userId, {
      publicMetadata: { role: data.role }
    })
  }

  return data
}

export async function acceptInvite(token: string) {
  const { userId } = await auth()
  if (!userId) redirect(`/sign-in?redirect=/onboarding?token=${token}`)

  const user = await currentUser()

  const res = await fetch(`${ORCH_API_URL}/api/v1/members/accept-invite`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      token,
      clerk_id: userId,
      name: user?.fullName ?? user?.firstName ?? null,
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.detail?.message ?? "Failed to accept invite")
  await setOrchKeyCookie(data.api_key)

  if (data.role) {
    const client = await clerkClient()
    await client.users.updateUserMetadata(userId, {
      publicMetadata: { role: data.role }
    })
  }

  return data
}

export async function renameOrg(orgId: string, name: string) {
  const res = await fetch(`${ORCH_API_URL}/api/v1/onboarding/rename-org`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ org_id: orgId, name }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to rename organization")
  return data
}

export async function renameTeam(teamId: string, name: string) {
  const res = await fetch(`${ORCH_API_URL}/api/v1/onboarding/rename-team`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ team_id: teamId, name }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to rename team")
  return data
}
