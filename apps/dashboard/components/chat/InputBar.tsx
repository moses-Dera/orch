"use client"

import { useState, useRef, useEffect } from "react"
import { useChatStore } from "@/stores/chatStore"
import { Button } from "@/components/ui/button"

const ACTIONS = [
  { label: "@ask", desc: "Ask a question" },
  { label: "@audit", desc: "Audit current file" },
  { label: "@status", desc: "Show org and team info" },
]

interface InputBarProps {
  onSend: (text: string) => void
  disabled?: boolean
}

export function InputBar({ onSend, disabled }: InputBarProps) {
  const [value, setValue] = useState("")
  const [showActions, setShowActions] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px"
    }
  }, [value])

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value
    setValue(v)
    setShowActions(v === "@")
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send()
    }
    if (e.key === "Escape") setShowActions(false)
  }

  function send() {
    const text = value.trim()
    if (!text || disabled) return
    setShowActions(false)
    setValue("")
    onSend(text)
  }

  function pickAction(label: string) {
    setShowActions(false)
    if (["@status"].includes(label)) {
      onSend(label)
    } else {
      setValue(label + " ")
      textareaRef.current?.focus()
    }
  }

  return (
    <div className="border-t bg-[var(--surface)] px-4 py-3">
      {showActions && (
        <div className="mb-2 rounded-lg border bg-[var(--background)] overflow-hidden">
          {ACTIONS.map((a) => (
            <button
              key={a.label}
              onClick={() => pickAction(a.label)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--border)] transition-colors text-left"
            >
              <span className="font-medium text-[var(--accent)] w-20">{a.label}</span>
              <span className="text-[var(--text-secondary)]">{a.desc}</span>
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          placeholder="Ask anything, or type @ for actions..."
          className="flex-1 resize-none rounded-md border bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-50"
        />
        <Button onClick={send} disabled={disabled || !value.trim()} size="sm">
          Send
        </Button>
      </div>
    </div>
  )
}
