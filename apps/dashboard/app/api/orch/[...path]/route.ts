import { auth } from "@clerk/nextjs/server"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

const ORCH_API_URL = process.env.ORCH_API_URL ?? "http://127.0.0.1:8000"
const ORCH_API_KEY = process.env.ORCH_API_KEY ?? ""

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

  // Read API key from cookie — set once at onboarding, never fetched again
  // Fallback: if cookie missing (existing users), fetch /me once and set it
  const jar = await cookies()
  let apiKey = isOnboarding ? ORCH_API_KEY : (jar.get("orch_key")?.value ?? "")

  if (!isOnboarding && !apiKey) {
    const activeOrgId = jar.get("orch_active_org")?.value ?? ""
    const cacheKey = `${userId}:${activeOrgId}`;

    if (pendingMeRequests.has(cacheKey)) {
      apiKey = await pendingMeRequests.get(cacheKey)!;
    } else {
      const mePromise = (async () => {
        const meUrl = new URL(`${ORCH_API_URL}/api/v1/onboarding/me`)
        meUrl.searchParams.set("clerk_id", userId)
        if (activeOrgId) meUrl.searchParams.set("org_id", activeOrgId)

        const meRes = await fetch(meUrl.toString(), {
          headers: { "Authorization": `Bearer ${ORCH_API_KEY}`, "Content-Type": "application/json" },
        })
        if (meRes.ok) {
          const me = await meRes.json()
          const key = me.api_key ?? ""
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
        // 404 = user needs onboarding — let the request proceed with empty key
        // the dashboard middleware will redirect them
        return "";
      })();
      
      pendingMeRequests.set(cacheKey, mePromise);
      try {
        apiKey = await mePromise;
      } finally {
        pendingMeRequests.delete(cacheKey);
      }
    }
  }

  const reqHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`,
    "X-Clerk-User-Id": userId,
  }

  const modelKey = req.headers.get("X-Model-API-Key")
  if (modelKey) reqHeaders["X-Model-API-Key"] = modelKey

  const body = req.method !== "GET" ? await req.text() : undefined

  const upstream = await fetch(url.toString(), {
    method: req.method,
    headers: reqHeaders,
    body,
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
