"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Send, Square, Loader2, CheckCircle2, AlertCircle,
  Copy, Check, RotateCcw, Pencil, ThumbsUp, ThumbsDown,
  Trash2, Download, Mic, MicOff, ChevronDown,
  BookOpen, Globe, ExternalLink, Shield, Sparkles,
} from "lucide-react";
import { useChat } from "@ai-sdk/react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useProjectStore } from "@/stores/projectStore";

import { v4 as uuidv4 } from "uuid";
import { History, MessageSquare, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";

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
      <div className="flex items-center justify-between px-4 py-1.5 bg-[var(--surface)] text-[10px] text-[var(--text-secondary)] font-mono border-b border-[var(--border)]">
        <span>{language || "code"}</span>
        <button onClick={copy} className="flex items-center gap-1 hover:text-white transition-colors">
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || "text"}
        style={oneDark}
        customStyle={{ margin: 0, borderRadius: 0, fontSize: "0.8rem", backgroundColor: 'var(--background)' }}
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
const getWelcomeMessage = (teamName?: string) => ({
  id: "welcome",
  role: "assistant" as const,
  parts: [{ type: "text", text: `Hello! I am the Orchestrator CTO AI Assistant${teamName ? ` for **${teamName}**` : ''}. How can I help you design architectures or review constraints today?` }],
});

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string>(() => uuidv4());
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const { selectedProjectId } = useProjectStore();
  const [resourceModalMessage, setResourceModalMessage] = useState<any>(null);

  const { data: statusData } = useQuery({ queryKey: ["status"], queryFn: api.status });
  const { data: sessionsData, refetch: refetchSessions } = useQuery({ queryKey: ["chat-sessions"], queryFn: api.chatSessions });

  const currentWelcome = getWelcomeMessage(statusData?.team);
  
  // Whenever activeSessionId changes, refetch messages for that session
  const { data: sessionMessages, isLoading: isMessagesLoading } = useQuery({
    queryKey: ["chat-messages", activeSessionId],
    queryFn: () => api.chatMessages(activeSessionId),
    enabled: !!activeSessionId
  });

  useEffect(() => {
    if (modelsData?.models && modelsData.models.length > 0 && !selectedModel) {
      setSelectedModel(modelsData.models[0].id);
    }
  }, [modelsData, selectedModel]);

  const { messages, sendMessage, stop, regenerate, status, error, setMessages } = useChat({
    id: activeSessionId,
    initialMessages: [currentWelcome as any] as any,
    onFinish: (message: any, options?: any) => {
      const usage = options?.usage || message?.usage;
      if (usage?.totalTokens) setTokenCount((prev) => (prev ?? 0) + usage.totalTokens);
      refetchSessions(); // Refresh sidebar to show newly created session
    },
  } as any);

  // When sessionMessages loads, set the messages in the chat
  useEffect(() => {
    if (sessionMessages?.messages && sessionMessages.messages.length > 0) {
      // Map DB messages to Vercel AI SDK format
      const formatted = sessionMessages.messages.map(m => ({
        id: m.id.toString(),
        role: m.role,
        content: m.content || "",
        toolInvocations: m.toolCalls ? m.toolCalls : undefined,
      }));
      // Only set if we haven't already locally optimistically appended them
      if (messages.length <= 1 || (messages[0]?.id === "welcome" && messages.length === 1)) {
        setMessages(formatted as any);
      }
    } else if (!isMessagesLoading && activeSessionId) {
      // It's a new chat, reset to welcome
      setMessages([currentWelcome as any]);
    }
  }, [sessionMessages, activeSessionId, isMessagesLoading, statusData]);

  const isLoading = status === "streaming" || status === "submitted";

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: isLoading ? "auto" : "smooth" });
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
    sendMessage({ text: input }, { body: { model: selectedModel, project_id: selectedProjectId } });
    setInput("");
    setTokenCount(null);
  };

  const handleClear = () => {
    const newId = uuidv4();
    setActiveSessionId(newId);
    setMessages([currentWelcome as any]);
    setFeedback({});
    setTokenCount(null);
  };

  const handleExport = () => exportAsMarkdown(messages);

  const handleRegenerate = () => {
    regenerate();
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
    sendMessage({ text: editText }, { body: { model: selectedModel, project_id: selectedProjectId } });
    setEditingId(null);
  };

  const lastAssistantIdx = [...messages].reverse().findIndex((m) => m.role === "assistant");
  const lastAssistantId = lastAssistantIdx >= 0 ? messages[messages.length - 1 - lastAssistantIdx]?.id : null;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] w-full max-w-4xl mx-auto border border-[var(--border)] rounded-2xl bg-[var(--surface)]/30 backdrop-blur-xs overflow-hidden shadow-xs relative">
      {/* Chat Toolbar Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-2.5 bg-[var(--surface)]/80 backdrop-blur-md border-b border-[var(--border)] shrink-0 z-10">
        <div className="flex items-center gap-2 flex-wrap">
          <Dialog open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
            <DialogTrigger className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-all text-xs font-medium cursor-pointer">
              <History size={14} />
              History
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[85vh] flex flex-col bg-[var(--background)] border-[var(--border)] p-0 gap-0">
              <DialogHeader className="p-4 border-b border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-base text-[var(--text-primary)]">Chat History</DialogTitle>
                  <button
                    onClick={() => { handleClear(); setIsSidebarOpen(false); }}
                    className="flex items-center gap-1.5 bg-[var(--surface)] hover:bg-[var(--border)] text-[var(--text-primary)] px-3 py-1.5 rounded-lg transition-colors font-medium text-xs border border-[var(--border)] cursor-pointer"
                  >
                    <Plus size={14} />
                    New Chat
                  </button>
                </div>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto p-2 min-h-[300px]">
                {(!sessionsData?.sessions || sessionsData.sessions.length === 0) ? (
                  <div className="text-xs text-[var(--text-secondary)] text-center mt-8">
                    No chat history yet.
                  </div>
                ) : (
                  sessionsData.sessions.map((session: any) => (
                    <button
                      key={session.id}
                      onClick={() => {
                        setActiveSessionId(session.id);
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left text-sm transition-colors group ${
                        activeSessionId === session.id
                          ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                          : "text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      <MessageSquare size={16} className="shrink-0" />
                      <div className="flex-1 truncate">
                        <div className="truncate font-medium text-[var(--text-primary)]">
                          {session.id.slice(0, 8)}...
                        </div>
                        <div className="text-[10px] opacity-70">
                          {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>

          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-all text-xs font-medium cursor-pointer"
            title="Start new conversation"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </div>

        {/* Right side of header */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {(modelsData?.models?.length ?? 0) > 0 ? (
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] px-2.5 py-1.5 rounded-md text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[var(--accent)] cursor-pointer transition-colors max-w-[180px] truncate"
              >
                {modelsData?.models?.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.name || m.id}</option>
                ))}
              </select>
            ) : (
              <a
                href="/models"
                className="bg-amber-500/10 text-amber-600 px-2.5 py-1.5 rounded-md text-xs font-medium hover:bg-amber-500/20 transition-colors"
              >
                Add API Key
              </a>
            )}
            {tokenCount !== null && (
              <div className="text-[10px] text-[var(--text-secondary)] bg-[var(--surface)] border border-[var(--border)] px-2 py-0.5 rounded-md font-mono">
                ~{tokenCount.toLocaleString()} tokens
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 border-l border-[var(--border)] pl-3">
            <button
              onClick={handleExport}
              title="Export chat as Markdown"
              className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-all cursor-pointer"
            >
              <Download size={14} />
            </button>
            <button
              onClick={handleClear}
              title="Clear conversation"
              className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-6 p-4 md:p-6 scroll-smooth">
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
                {/* Tool calls & Agentic Progress */}
                {(m as any).toolInvocations?.map((toolInvocation: any, i: number) => {
                  const toolName = toolInvocation.toolName;
                  const isComplete = "result" in toolInvocation;
                  const args = toolInvocation.args || {};

                  if (toolName === "searchWeb") {
                    return (
                      <div
                        key={toolInvocation.toolCallId || i}
                        className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-2 font-mono w-fit mb-2 border transition-all ${
                          isComplete
                            ? "bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)]"
                            : "bg-sky-500/10 border-sky-500/30 text-sky-400 animate-pulse"
                        }`}
                      >
                        {isComplete ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        ) : (
                          <Globe className="w-3.5 h-3.5 animate-spin text-sky-400 shrink-0" />
                        )}
                        <span className="truncate max-w-[280px] sm:max-w-md">
                          {isComplete
                            ? `Web Search: "${args.query || 'docs'}" (${toolInvocation.result?.results?.length ?? toolInvocation.result?.count ?? 0} sources)`
                            : `Searching web for "${args.query || 'query'}"...`}
                        </span>
                      </div>
                    );
                  }

                  let label = toolName;
                  if (toolName === "createConstraint") label = `Enforcing rule "${args.id || ''}"`;
                  if (toolName === "listProjects") label = "Listing team projects";
                  if (toolName === "createProject") label = `Creating project "${args.name || ''}"`;
                  if (toolName === "deleteConstraint") label = `Deleting rule "${args.id || ''}"`;

                  return (
                    <div
                      key={toolInvocation.toolCallId || i}
                      className="text-[11px] text-[var(--text-secondary)] bg-[var(--surface)] border border-[var(--border)] px-3 py-1.5 rounded-full flex items-center gap-2 font-mono w-fit mb-2"
                    >
                      {isComplete ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                      ) : (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)] shrink-0" />
                      )}
                      <span>{isComplete ? `Completed: ${label}` : `Executing: ${label}...`}</span>
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
                      <>
                        <ReactMarkdown components={markdownComponents}>{text}</ReactMarkdown>

                        {/* Inline Citations / Sources if web search was performed */}
                        {(() => {
                          const webSearchInvocations = ((m as any).toolInvocations || []).filter(
                            (ti: any) => ti.toolName === "searchWeb" && ti.result?.results?.length > 0
                          );
                          const sources = webSearchInvocations.flatMap((ti: any) => ti.result.results || []);
                          if (sources.length === 0) return null;

                          return (
                            <div className="mt-3 pt-2.5 border-t border-[var(--border)]/50 flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] text-[var(--text-secondary)] font-medium flex items-center gap-1 mr-1">
                                <Globe size={11} className="text-sky-400" /> Sources:
                              </span>
                              {sources.slice(0, 4).map((src: any, idx: number) => {
                                let hostname = "";
                                try {
                                  hostname = new URL(src.url).hostname.replace(/^www\./, "");
                                } catch {
                                  hostname = `Source ${idx + 1}`;
                                }
                                return (
                                  <a
                                    key={idx}
                                    href={src.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] hover:border-[var(--accent)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all font-mono"
                                    title={src.title}
                                  >
                                    <span>[{idx + 1}] {hostname}</span>
                                    <ExternalLink size={9} className="opacity-60" />
                                  </a>
                                );
                              })}
                              {sources.length > 4 && (
                                <button
                                  onClick={() => setResourceModalMessage(m)}
                                  className="text-[10px] text-[var(--accent)] hover:underline ml-1 font-mono"
                                >
                                  +{sources.length - 4} more
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                {!isEditing && (
                  <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                    <CopyButton text={text} />
                    {isUser && (
                      <button onClick={() => startEdit(m.id, text)} title="Edit message" className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-all">
                        <Pencil size={13} />
                      </button>
                    )}
                    {!isUser && (
                      <>
                        {/* Used Resources Modal Trigger */}
                        {(((m as any).toolInvocations?.length > 0) || false) && (
                          <button
                            onClick={() => setResourceModalMessage(m)}
                            title="Inspect Used Resources & Citations"
                            className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] border border-[var(--border)] transition-all cursor-pointer"
                          >
                            <BookOpen size={12} className="text-amber-400" />
                            <span>Used Resources</span>
                          </button>
                        )}
                        {isLastAssistant && !isLoading && (
                          <button onClick={handleRegenerate} title="Regenerate response" className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-all cursor-pointer">
                            <RotateCcw size={13} />
                          </button>
                        )}
                        <button
                          onClick={() => setFeedback((p) => ({ ...p, [m.id]: p[m.id] === "up" ? null : "up" }))}
                          className={`p-1.5 rounded-md transition-all hover:bg-[var(--surface)] cursor-pointer ${feedback[m.id] === "up" ? "text-emerald-500" : "text-[var(--text-secondary)] hover:text-emerald-500"}`}
                        >
                          <ThumbsUp size={13} />
                        </button>
                        <button
                          onClick={() => setFeedback((p) => ({ ...p, [m.id]: p[m.id] === "down" ? null : "down" }))}
                          className={`p-1.5 rounded-md transition-all hover:bg-[var(--surface)] cursor-pointer ${feedback[m.id] === "down" ? "text-red-500" : "text-[var(--text-secondary)] hover:text-red-500"}`}
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

      {/* Input Form */}
      <div className="bg-[var(--surface)]/60 backdrop-blur-md border-t border-[var(--border)] p-3 md:px-6 md:py-3.5 shrink-0">
        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-2 p-2.5 bg-[var(--surface)] rounded-2xl shadow-xs border border-[var(--border)] transition-shadow focus-within:ring-2 focus-within:ring-[var(--ring)]"
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
            placeholder="Ask Orch to research, enforce, review, or draft a rule..."
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
              className="p-2.5 mb-1 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors shadow-xs flex-shrink-0 cursor-pointer"
            >
              <Square size={16} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input?.trim()}
              title="Send message"
              className="p-2.5 mb-1 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs flex-shrink-0 cursor-pointer"
            >
              <Send size={16} />
            </button>
          )}
        </form>

        <div className="text-center mt-1.5 text-[11px] text-[var(--text-secondary)]">
          Orch Assistant researches the live web & enforces team policies. Always review constraints before production.
        </div>
      </div>

      {/* Used Resources & Citations Modal */}
      <Dialog open={!!resourceModalMessage} onOpenChange={(open) => { if (!open) setResourceModalMessage(null); }}>
        <DialogContent className="max-w-xl bg-[var(--surface)] border-[var(--border)] max-h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-4 border-b border-[var(--border)]">
            <DialogTitle className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>Used Resources & Citations</span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {/* 1. Web Sources */}
            {(() => {
              const searchTools = ((resourceModalMessage as any)?.toolInvocations || []).filter(
                (ti: any) => ti.toolName === "searchWeb"
              );
              const sources = searchTools.flatMap((ti: any) => ti.result?.results || []);

              if (sources.length === 0) return null;

              return (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
                    <Globe className="w-3.5 h-3.5 text-sky-400" />
                    <span>Live Web Citations ({sources.length})</span>
                  </div>
                  <div className="space-y-2">
                    {sources.map((src: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)]/60">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="font-semibold text-[var(--text-primary)] line-clamp-1">{src.title}</span>
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sky-400 hover:text-sky-300 flex items-center gap-1 shrink-0 font-mono text-[11px]"
                          >
                            <span>Open URL</span>
                            <ExternalLink size={10} />
                          </a>
                        </div>
                        <p className="text-[var(--text-secondary)] text-[11px] leading-relaxed line-clamp-3">
                          {src.snippet}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* 2. Tool Calls */}
            {(() => {
              const tools = (resourceModalMessage as any)?.toolInvocations || [];
              if (tools.length === 0) return null;

              return (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
                    <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>Agentic Tools Executed ({tools.length})</span>
                  </div>
                  <div className="space-y-2">
                    {tools.map((ti: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)]/60">
                        <div className="flex items-center justify-between font-mono text-[11px] mb-1">
                          <span className="text-[var(--accent)] font-semibold">{ti.toolName}</span>
                          <span className="text-[10px] text-emerald-400">SUCCESS</span>
                        </div>
                        {ti.args && (
                          <div className="text-[10px] font-mono text-[var(--text-secondary)] bg-[var(--surface)] p-1.5 rounded overflow-x-auto">
                            {JSON.stringify(ti.args, null, 2)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* 3. Project Policy Context */}
            <div className="p-3 rounded-lg border border-amber-400/20 bg-amber-400/5 text-amber-300/90 text-[11px] leading-relaxed">
              <div className="flex items-center gap-1.5 font-semibold mb-1">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>Orchestrator Policy Engine Guardrails Active</span>
              </div>
              All responses are grounded against private team constraints and subscribed public skill packs.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
