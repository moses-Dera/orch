"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import { PageShell } from "@/components/layout/PageShell"
import { MessageList } from "@/components/chat/MessageList"
import { InputBar } from "@/components/chat/InputBar"
import { Button } from "@/components/ui/button"
import { useChatStore } from "@/stores/chatStore"
import { useModels } from "@/hooks/useOrchStatus"
import { useHasAccess } from "@/hooks/useRole"
import { toast } from "sonner"

function NoModelBanner({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter()
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-sm w-full space-y-4 text-center">
        <div className="w-12 h-12 rounded-full bg-[var(--accent)]/10 flex items-center justify-center mx-auto">
          <span className="text-xl">⚡</span>
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-medium">No model configured</p>
          <p className="text-sm text-[var(--text-secondary)]">
            {isAdmin
              ? "Add a model with an API key to start chatting. Orch supports OpenAI, Anthropic, Gemini, and any custom endpoint."
              : "Your admin hasn't configured a model yet. Ask them to add one in the Models page."}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => router.push("/models")} size="sm">
            Add a model →
          </Button>
        )}
      </div>
    </div>
  )
}

export default function ChatPage() {
  const { sessionId, domain, model, isStreaming, addMessage, appendChunk, setSessionId, setStreaming, clearSession } = useChatStore()
  const { data: modelsData } = useModels()
  const isAdmin = useHasAccess("admin")
  const hasModels = (modelsData?.models.length ?? 0) > 0

  const send = useCallback(async (text: string) => {
    const prompt = text.replace(/^@(ask|chat)\s*/i, "").trim()
    if (!prompt) return

    addMessage({ id: crypto.randomUUID(), role: "user", content: prompt })
    setStreaming(true)

    try {
      const res = await fetch("/api/orch/v1/orchestrate/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_prompt: prompt, domain, model, session_id: sessionId }),
      })

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.detail?.message ?? err?.detail ?? "Stream failed")
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const data = line.slice(6).trim()
          if (data === "[DONE]") break
          try {
            const event = JSON.parse(data)
            if (event.type === "meta") setSessionId(event.session_id)
            else if (event.type === "chunk") appendChunk(event.content)
            else if (event.type === "error") toast.error(event.message)
          } catch {}
        }
      }
    } catch (e: any) {
      toast.error(e.message ?? "Something went wrong")
    } finally {
      setStreaming(false)
    }
  }, [sessionId, domain, model, addMessage, appendChunk, setSessionId, setStreaming])

  return (
    <PageShell
      title="Chat"
      description="Ask questions with your org's constraints applied."
      action={
        hasModels ? (
          <Button variant="outline" size="sm" onClick={clearSession}>
            New session
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col rounded-lg border bg-[var(--surface)] overflow-hidden" style={{ height: "calc(100vh - 200px)" }}>
        {!hasModels ? (
          <NoModelBanner isAdmin={isAdmin} />
        ) : (
          <>
            <MessageList />
            <InputBar onSend={send} disabled={isStreaming} />
          </>
        )}
      </div>
    </PageShell>
  )
}
