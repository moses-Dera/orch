import { create } from "zustand"
import type { ChatMessage } from "@/types"

interface ChatStore {
  messages: ChatMessage[]
  sessionId: string | null
  isStreaming: boolean
  domain: string
  model: string
  addMessage: (msg: ChatMessage) => void
  appendChunk: (chunk: string) => void
  setSessionId: (id: string) => void
  setStreaming: (v: boolean) => void
  setDomain: (d: string) => void
  setModel: (m: string) => void
  clearSession: () => void
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  sessionId: null,
  isStreaming: false,
  domain: "auto",
  model: "auto",

  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),

  appendChunk: (chunk) => set((s) => {
    const msgs = [...s.messages]
    const last = msgs[msgs.length - 1]
    if (last?.role === "assistant") {
      msgs[msgs.length - 1] = { ...last, content: last.content + chunk }
    } else {
      msgs.push({ id: crypto.randomUUID(), role: "assistant", content: chunk })
    }
    return { messages: msgs }
  }),

  setSessionId: (id) => set({ sessionId: id }),
  setStreaming: (v) => set({ isStreaming: v }),
  setDomain: (d) => set({ domain: d }),
  setModel: (m) => set({ model: m }),

  clearSession: () => set({ messages: [], sessionId: null, isStreaming: false }),
}))
