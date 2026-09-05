import { auth, currentUser } from "@clerk/nextjs/server"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

const ORCH_API_URL = process.env.ORCH_API_URL ?? "http://127.0.0.1:8000"
const ORCH_API_KEY = process.env.ORCH_API_KEY ?? ""

const PLATFORM_ADMIN_EMAILS = [
  "okonkwomoses158@gmail.com",
  "mosesjohnson706@gmail.com",
]

const pendingMeRequests = new Map<string, Promise<string>>();

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params)
}

async function proxy(req: NextRequest, params: { path: string[] }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const path = params.path.join("/")
  const isApiPrefixed = path.startsWith("v1/onboarding") || path.startsWith("auth")
  const url = new URL(isApiPrefixed ? `/api/${path}` : `/${path}`, ORCH_API_URL)
  url.search = new URL(req.url).search

  const isOnboarding = path.startsWith("v1/onboarding")

  const jar = await cookies()
  const activeOrgId = jar.get("orch_active_org")?.value ?? ""

  if (path === "v1/onboarding/me" && activeOrgId) {
    url.searchParams.set("org_id", activeOrgId)
  }

  const isPlatformOps = path.startsWith("v1/platform")
  let userEmail = ""
  let apiKey = isOnboarding ? ORCH_API_KEY : (jar.get("orch_key")?.value ?? "")

  if (isPlatformOps) {
    const user = await currentUser()
    userEmail = (user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || "").trim().toLowerCase()
    const allowedAdmins = [
      ...PLATFORM_ADMIN_EMAILS,
      (process.env.ADMIN_EMAIL || "").trim().toLowerCase()
    ].filter(Boolean)

    if (!allowedAdmins.includes(userEmail)) {
      return NextResponse.json({ error: "Forbidden: Restricted to platform owner" }, { status: 403 })
    }
    // Authenticated Platform Owner — use server secret to query core engine
    apiKey = ORCH_API_KEY
  }

  // Read API key from cookie — set once at onboarding, never fetched again
  // Fallback: if cookie missing (existing users), fetch /me once and set it
  if (!isPlatformOps && !isOnboarding && !apiKey) {
    const activeOrgId = jar.get("orch_active_org")?.value ?? ""
    const cacheKey = `${userId}:${activeOrgId}`;

    if (pendingMeRequests.has(cacheKey)) {
      apiKey = await pendingMeRequests.get(cacheKey)!;
    } else {
      const sessionKeyPromise = (async () => {
        const res = await fetch(`${ORCH_API_URL}/api/v1/onboarding/session-key`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${ORCH_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ clerk_id: userId, org_id: activeOrgId || undefined }),
        })
        if (res.ok) {
          const data = await res.json()
          const key = data.api_key ?? ""
          if (key) {
            jar.set("orch_key", key, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              path: "/",
              maxAge: 60 * 60 * 24 * 30,
            })
          }
          return key;
        }
        return "";
      })();

      pendingMeRequests.set(cacheKey, sessionKeyPromise);
      try {
        apiKey = await sessionKeyPromise;
      } finally {
        pendingMeRequests.delete(cacheKey);
      }
    }
  }

  const reqHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`,
    "X-Clerk-User-Id": userId,
    ...(userEmail ? { "X-Clerk-User-Email": userEmail } : {}),
  }

  const modelKey = req.headers.get("X-Model-API-Key")
  if (modelKey) reqHeaders["X-Model-API-Key"] = modelKey

  const body = req.method !== "GET" ? await req.text() : undefined

  const upstream = await fetch(url.toString(), {
    method: req.method,
    headers: reqHeaders,
    body,
    cache: "no-store",
  })

  if (upstream.headers.get("content-type")?.includes("text/event-stream")) {
    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    })
  }

  if (upstream.headers.get("content-type")?.includes("application/json")) {
    const data = await upstream.json()
    return NextResponse.json(data, { status: upstream.status, headers: { "X-Proxy": "true" } })
  }

  const text = await upstream.text()
  return new NextResponse(text, { 
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") || "text/plain" }
  })
}
