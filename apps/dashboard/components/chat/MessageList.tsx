"use client"

import { useRef, useEffect } from "react"
import { useChatStore } from "@/stores/chatStore"
import { cn } from "@/lib/utils"

export function MessageList() {
  const messages = useChatStore((s) => s.messages)
  const isStreaming = useChatStore((s) => s.isStreaming)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-[var(--text-secondary)]">
          Type <strong>@</strong> to see actions, or just ask anything.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
        >
          <div
            className={cn(
              "max-w-[85%] rounded-lg px-4 py-2.5 text-sm",
              msg.role === "user"
                ? "bg-[var(--chat-user-bg)] text-[var(--chat-user-text)]"
                : "bg-[var(--surface)] border text-[var(--text-primary)] whitespace-pre-wrap"
            )}
          >
            {msg.content}
            {msg.role === "assistant" && msg.domain && (
              <p className="mt-1.5 text-xs opacity-50">
                {msg.domain} · {msg.model}
              </p>
            )}
          </div>
        </div>
      ))}
      {isStreaming && (
        <div className="bg-[var(--surface)] border rounded-lg px-4 py-2.5 max-w-[85%]">
          <span className="inline-block w-1.5 h-4 bg-[var(--accent)] animate-pulse rounded-sm" />
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
