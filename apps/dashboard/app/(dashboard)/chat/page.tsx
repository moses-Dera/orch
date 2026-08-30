"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Send, Square, Loader2, CheckCircle2, AlertCircle,
  Copy, Check, RotateCcw, Pencil, ThumbsUp, ThumbsDown,
  Trash2, Download, Mic, MicOff, ChevronDown,
} from "lucide-react";
import { useChat } from "@ai-sdk/react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────
type Feedback = "up" | "down" | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getTextContent(parts: any[]): string {
  return parts?.filter((p) => p.type === "text").map((p) => p.text).join("") ?? "";
}

function exportAsMarkdown(messages: any[]) {
  const md = messages
    .map((m) => {
      const text = getTextContent(m.parts ?? []);
      return m.role === "user" ? `**You:** ${text}` : `**Orch:** ${text}`;
    })
    .join("\n\n---\n\n");
  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `orch-chat-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Code block renderer ──────────────────────────────────────────────────────
function CodeBlock({ language, children }: { language: string; children: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group my-3 rounded-xl overflow-hidden border border-[var(--border)]">
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#1a1a2e] text-[10px] text-zinc-400 font-mono">
        <span>{language || "code"}</span>
        <button onClick={copy} className="flex items-center gap-1 hover:text-white transition-colors">
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || "text"}
        style={oneDark}
        customStyle={{ margin: 0, borderRadius: 0, fontSize: "0.8rem" }}
        PreTag="div"
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}

// ─── Markdown renderer ────────────────────────────────────────────────────────
const markdownComponents: any = {
  code({ inline, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || "");
    return !inline ? (
      <CodeBlock language={match?.[1] ?? ""}>{String(children).replace(/\n$/, "")}</CodeBlock>
    ) : (
      <code className="bg-[var(--surface)] border border-[var(--border)] px-1.5 py-0.5 rounded text-[0.8em] font-mono" {...props}>
        {children}
      </code>
    );
  },
  p: ({ children }: any) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  ul: ({ children }: any) => <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>,
  li: ({ children }: any) => <li className="text-[var(--text-primary)]">{children}</li>,
  h1: ({ children }: any) => <h1 className="text-lg font-bold mb-2 mt-3">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-base font-semibold mb-2 mt-3">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-sm font-semibold mb-1 mt-2">{children}</h3>,
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-2 border-[var(--accent)] pl-3 italic text-[var(--text-secondary)] my-2">{children}</blockquote>
  ),
  strong: ({ children }: any) => <strong className="font-semibold text-[var(--text-primary)]">{children}</strong>,
  a: ({ href, children }: any) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] underline underline-offset-2 hover:opacity-80">
      {children}
    </a>
  ),
};

// ─── Copy button ──────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} title="Copy message" className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-all opacity-0 group-hover:opacity-100">
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
const WELCOME = {
  id: "welcome",
  role: "assistant" as const,
  parts: [{ type: "text", text: "Hello! I am the Orchestrator CTO AI Assistant. How can I help you design architectures or review constraints today?" }],
};

const SUGGESTIONS = [
  "Draft a new security constraint",
  "Check my latest PR for violations",
  "Summarize our backend coding standards",
  "What are the best practices for this stack?",
];

export default function AssistantPage() {
  const { data: modelsData } = useQuery({ queryKey: ["models"], queryFn: api.models });
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [tokenCount, setTokenCount] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (modelsData?.models?.length > 0 && !selectedModel) {
      setSelectedModel(modelsData.models[0].id);
    }
  }, [modelsData, selectedModel]);

  const { messages, sendMessage, stop, reload, status, error, setMessages } = useChat({
    messages: [WELCOME as any],
    onFinish: (msg, { usage }) => {
      if (usage?.totalTokens) setTokenCount((prev) => (prev ?? 0) + usage.totalTokens);
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) { ta.style.height = "auto"; ta.style.height = `${Math.min(ta.scrollHeight, 128)}px`; }
  }, [input]);

  // Voice input
  const toggleVoice = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput((prev) => prev + (prev ? " " : "") + transcript);
    };
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  }, [isListening]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input }, { body: { model: selectedModel } });
    setInput("");
    setTokenCount(null);
  };

  const handleClear = () => {
    setMessages([WELCOME as any]);
    setFeedback({});
    setTokenCount(null);
  };

  const handleExport = () => exportAsMarkdown(messages);

  const handleRegenerate = () => {
    reload();
  };

  const startEdit = (id: string, text: string) => {
    setEditingId(id);
    setEditText(text);
  };

  const submitEdit = (id: string) => {
    const idx = messages.findIndex((m) => m.id === id);
    if (idx === -1) return;
    // Trim history to just before this message, then re-send
    setMessages(messages.slice(0, idx) as any);
    sendMessage({ text: editText }, { body: { model: selectedModel } });
    setEditingId(null);
  };

  const lastAssistantIdx = [...messages].reverse().findIndex((m) => m.role === "assistant");
  const lastAssistantId = lastAssistantIdx >= 0 ? messages[messages.length - 1 - lastAssistantIdx]?.id : null;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full max-w-4xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-[var(--accent)]/10 text-[var(--accent)] px-3 py-1 rounded-full text-xs font-medium">
            Active Context: Workspace Constraints
          </div>
          {modelsData?.models?.length > 0 && (
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-[var(--surface)] text-[var(--text-primary)] px-3 py-1 rounded-full text-xs font-medium border border-[var(--border)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] cursor-pointer hover:bg-[var(--background)] transition-colors max-w-[180px] truncate"
            >
              {modelsData.models.map((m: any) => (
                <option key={m.id} value={m.id}>{m.name || m.id}</option>
              ))}
            </select>
          )}
          {tokenCount !== null && (
            <div className="text-[10px] text-[var(--text-secondary)] bg-[var(--surface)] border border-[var(--border)] px-2 py-0.5 rounded-full font-mono">
              ~{tokenCount.toLocaleString()} tokens
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleExport}
            title="Export chat as Markdown"
            className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-all"
          >
            <Download size={14} />
          </button>
          <button
            onClick={handleClear}
            title="Clear conversation"
            className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 transition-all"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-6 pb-6 scroll-smooth">
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-500">Assistant Error</h3>
              <p className="text-xs text-red-500/80 mt-1">
                {(() => { try { return JSON.parse(error.message)?.error || error.message; } catch { return error.message; } })()}
              </p>
              <Link href="/models">
                <button className="mt-2 text-xs font-medium border border-red-500/30 text-red-500 hover:border-red-500/70 px-3 py-1.5 rounded-lg transition-colors">
                  Configure Models
                </button>
              </Link>
            </div>
          </div>
        )}

        {messages.map((m, index) => {
          const text = getTextContent((m as any).parts ?? []);
          const isUser = m.role === "user";
          const isLastAssistant = m.id === lastAssistantId;
          const isEditing = editingId === m.id;

          return (
            <div key={m.id} className={`flex w-full group ${isUser ? "justify-end" : "justify-start"}`}>
              {!isUser && (
                <div className="w-8 h-8 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--accent)] flex items-center justify-center flex-shrink-0 mt-1 mr-3 font-bold text-xs">
                  O
                </div>
              )}

              <div className={`flex flex-col gap-1.5 max-w-[85%] sm:max-w-[75%] ${isUser ? "items-end" : "items-start"}`}>
                {/* Tool calls */}
                {(m as any).parts?.map((part: any, i: number) => {
                  const toolName = part.type === "dynamic-tool" ? part.toolName
                    : part.type.startsWith("tool-") ? part.type.replace("tool-", "") : null;
                  if (!toolName) return null;
                  const isComplete = part.state === "output-available" || part.state === "result";
                  return (
                    <div key={i} className="text-[11px] text-[var(--text-secondary)] bg-[var(--background)] border border-[var(--border)] px-3 py-1.5 rounded-full flex items-center gap-2 font-mono">
                      {isComplete ? <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)]" /> : <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" />}
                      {isComplete ? `Used: ${toolName}` : `Running: ${toolName}...`}
                    </div>
                  );
                })}

                {/* Message bubble */}
                {isEditing ? (
                  <div className="flex flex-col gap-2 w-full">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="px-4 py-3 rounded-2xl bg-[var(--surface)] border border-[var(--accent)] text-[var(--text-primary)] text-sm resize-none focus:outline-none w-full min-h-[80px]"
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitEdit(m.id); } }}
                    />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingId(null)} className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Cancel</button>
                      <button onClick={() => submitEdit(m.id)} className="text-xs px-3 py-1.5 rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] transition-colors">Re-send</button>
                    </div>
                  </div>
                ) : (
                  <div className={`relative px-5 py-3.5 rounded-3xl text-sm ${
                    isUser
                      ? "bg-[var(--chat-user-bg)] text-[var(--chat-user-text)]"
                      : "bg-transparent text-[var(--text-primary)] w-full"
                  }`}>
                    {isUser ? (
                      <div className="whitespace-pre-wrap">{text}</div>
                    ) : (
                      <ReactMarkdown components={markdownComponents}>{text}</ReactMarkdown>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                {!isEditing && (
                  <div className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                    <CopyButton text={text} />
                    {isUser && (
                      <button onClick={() => startEdit(m.id, text)} title="Edit message" className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-all">
                        <Pencil size={13} />
                      </button>
                    )}
                    {!isUser && (
                      <>
                        {isLastAssistant && !isLoading && (
                          <button onClick={handleRegenerate} title="Regenerate response" className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-all">
                            <RotateCcw size={13} />
                          </button>
                        )}
                        <button
                          onClick={() => setFeedback((p) => ({ ...p, [m.id]: p[m.id] === "up" ? null : "up" }))}
                          className={`p-1.5 rounded-md transition-all hover:bg-[var(--surface)] ${feedback[m.id] === "up" ? "text-emerald-500" : "text-[var(--text-secondary)] hover:text-emerald-500"}`}
                        >
                          <ThumbsUp size={13} />
                        </button>
                        <button
                          onClick={() => setFeedback((p) => ({ ...p, [m.id]: p[m.id] === "down" ? null : "down" }))}
                          className={`p-1.5 rounded-md transition-all hover:bg-[var(--surface)] ${feedback[m.id] === "down" ? "text-red-500" : "text-[var(--text-secondary)] hover:text-red-500"}`}
                        >
                          <ThumbsDown size={13} />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Suggestions */}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 mt-2 sm:ml-11">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => sendMessage({ text: s }, { body: { model: selectedModel } })}
                className="text-xs px-3 py-1.5 bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--accent)] rounded-lg transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Thinking indicator */}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex w-full justify-start">
            <div className="w-8 h-8 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--accent)] flex items-center justify-center flex-shrink-0 mt-1 mr-3 font-bold text-xs">O</div>
            <div className="px-5 py-3.5 rounded-3xl flex items-center gap-2 text-[var(--text-secondary)] text-sm">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="pt-2 sticky bottom-0 bg-[var(--background)]">
        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-2 p-3 bg-[var(--surface)] rounded-2xl shadow-sm border border-[var(--border)] transition-shadow focus-within:ring-2 focus-within:ring-[var(--ring)]"
        >
          {/* Voice button */}
          <button
            type="button"
            onClick={toggleVoice}
            title={isListening ? "Stop listening" : "Voice input"}
            className={`p-2 mb-1 rounded-lg transition-colors flex-shrink-0 ${
              isListening
                ? "bg-red-500/10 text-red-500 animate-pulse"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)]"
            }`}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Orch to enforce, review, or draft a rule..."
            className="flex-1 max-h-32 min-h-[44px] p-2 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-secondary)] border-none resize-none focus:ring-0 focus:outline-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />

          {/* Stop / Send */}
          {isLoading ? (
            <button
              type="button"
              onClick={stop}
              title="Stop generating"
              className="p-3 mb-1 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors shadow-md flex-shrink-0"
            >
              <Square size={18} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input?.trim()}
              title="Send message"
              className="p-3 mb-1 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex-shrink-0"
            >
              <Send size={18} />
            </button>
          )}
        </form>

        <div className="text-center mt-2 text-xs text-[var(--text-secondary)]">
          Orch Assistant can make mistakes. Always review the constraints before applying them.
        </div>
      </div>
    </div>
  );
}
