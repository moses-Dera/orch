import { auth } from "@clerk/nextjs/server"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

const ORCH_API_URL = process.env.ORCH_API_URL ?? "http://127.0.0.1:8000"
const ORCH_API_KEY = process.env.ORCH_API_KEY ?? ""

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params)
}

async function proxy(req: NextRequest, params: { path: string[] }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const path = params.path.join("/")
  const url = new URL(`/api/${path}`, ORCH_API_URL)
  url.search = new URL(req.url).search

  const isOnboarding = path.startsWith("v1/onboarding")

  // Read API key from cookie — set once at onboarding, never fetched again
  // Fallback: if cookie missing (existing users), fetch /me once and set it
  const jar = await cookies()
  let apiKey = isOnboarding ? ORCH_API_KEY : (jar.get("orch_key")?.value ?? "")

  if (!isOnboarding && !apiKey) {
    const activeOrgId = jar.get("orch_active_org")?.value ?? ""
    const meUrl = new URL(`${ORCH_API_URL}/api/v1/onboarding/me`)
    meUrl.searchParams.set("clerk_id", userId)
    if (activeOrgId) meUrl.searchParams.set("org_id", activeOrgId)

    const meRes = await fetch(meUrl.toString(), {
      headers: { "Authorization": `Bearer ${ORCH_API_KEY}`, "Content-Type": "application/json" },
    })
    if (meRes.ok) {
      const me = await meRes.json()
      apiKey = me.api_key ?? ""
      if (apiKey) {
        jar.set("orch_key", apiKey, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 30,
        })
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

  const data = await upstream.json()
  return NextResponse.json(data, { status: upstream.status })
}
