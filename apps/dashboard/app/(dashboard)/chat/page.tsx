"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useChat } from '@ai-sdk/react';
import Link from 'next/link';

export default function AssistantPage() {
  const [input, setInput] = useState('');
  
  const { messages, sendMessage, status, error } = useChat({
    messages: [
      {
        id: 'welcome',
        role: 'assistant',
        parts: [{ type: 'text', text: 'Hello! I am the Orchestrator CTO AI Assistant. How can I help you design architectures or review constraints today?' }]
      }
    ] as any
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput('');
  };

  const append = (msg: { text: string }) => {
    sendMessage(msg);
  };

  const isLoading = status === 'streaming' || status === 'submitted';

  const SUGGESTIONS = [
    "Draft a new security constraint",
    "Check my latest PR for violations",
    "Summarize our backend coding standards"
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full max-w-4xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <div className="bg-[var(--accent)]/10 text-[var(--accent)] px-3 py-1 rounded-full text-xs font-medium flex items-center">
            Active Context: Workspace Constraints
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 pb-6">
        {error && (
          <div className="mx-auto w-full mb-6">
            <div className="rounded-none border border-red-500/50 bg-transparent p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-500">Assistant Error</h3>
                <p className="text-sm text-red-500/80 mt-1">
                  The chat assistant encountered an error. If you haven't configured an LLM API key yet, please do so.
                  {error.message && (
                    <span className="block mt-2 font-mono text-xs">
                      {(() => {
                        try {
                          const parsed = JSON.parse(error.message);
                          return parsed.error || error.message;
                        } catch {
                          return error.message;
                        }
                      })()}
                    </span>
                  )}
                </p>
                <Link href="/models">
                  <button className="mt-3 text-xs font-medium bg-transparent border border-red-500/30 text-red-500 hover:border-red-500/70 px-3 py-1.5 rounded-none transition-colors">
                    Configure Models
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {messages.map((m) => {
          const textContent = m.parts?.filter(p => p.type === 'text').map(p => (p as any).text).join('') || '';
          
          return (
            <div
              key={m.id}
              className={`flex w-full ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--accent)] flex items-center justify-center flex-shrink-0 mt-1 mr-3">
                  <span className="font-bold text-xs">O</span>
                </div>
              )}
              
              <div className={`flex flex-col gap-2 max-w-[85%] sm:max-w-[75%] ${m.role === "user" ? "items-end" : "items-start"}`}>
                {/* Tool Invocations (Citations) */}
                {m.parts?.map((part, i) => {
                  const toolName = part.type === 'dynamic-tool' 
                    ? (part as any).toolName 
                    : part.type.startsWith('tool-') 
                      ? part.type.replace('tool-', '') 
                      : null;
                      
                  if (!toolName) return null;
                  
                  const isComplete = (part as any).state === 'output-available' || (part as any).state === 'result';
                  
                  return (
                    <div key={i} className="text-[11px] text-[var(--text-secondary)] bg-[var(--background)] border border-[var(--border)] px-3 py-1.5 rounded-full flex items-center gap-2 font-mono shadow-sm">
                      {isComplete ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)]" />
                      ) : (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
                      )}
                      {isComplete ? `Used Tool: ${toolName}` : `Running Tool: ${toolName}...`}
                    </div>
                  );
                })}

                <div
                  className={`px-5 py-4 rounded-3xl ${
                    m.role === "user"
                      ? "bg-[var(--chat-user-bg)] text-[var(--chat-user-text)]"
                      : "bg-transparent text-[var(--text-primary)] prose prose-sm dark:prose-invert max-w-full"
                  }`}
                >
                  {m.role === 'user' ? (
                    <div className="whitespace-pre-wrap">{textContent}</div>
                  ) : (
                    <ReactMarkdown>{textContent}</ReactMarkdown>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 mt-2 sm:ml-12">
            {SUGGESTIONS.map((s, i) => (
              <button 
                key={i} 
                onClick={() => append({ text: s })}
                className="text-xs px-3 py-1.5 bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--accent)] rounded-lg transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex w-full justify-start mt-4">
            <div className="w-8 h-8 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--accent)] flex items-center justify-center flex-shrink-0 mt-1 mr-3">
              <span className="font-bold text-xs">O</span>
            </div>
            <div className="px-5 py-4 rounded-3xl bg-transparent flex items-center text-[var(--text-secondary)]">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Thinking...
            </div>
          </div>
        )}
      </div>

      <div className="pt-2 sticky bottom-0 bg-[var(--background)]">
        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-2 p-3 bg-[var(--surface)] rounded-2xl shadow-sm border border-[var(--border)] transition-shadow focus-within:ring-2 focus-within:ring-[var(--ring)]"
        >
          <textarea
            value={input}
            onChange={handleInputChange}
            placeholder="Ask Orch to enforce, review, or draft a rule..."
            className="flex-1 max-h-32 min-h-[44px] p-2 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-secondary)] border-none resize-none focus:ring-0 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <button
            type="submit"
            disabled={!input?.trim() || isLoading}
            className="p-3 mb-1 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
          >
            <Send size={18} />
          </button>
        </form>
        {error && (
          <div className="text-center mt-2 text-sm font-medium text-red-500 bg-red-50 dark:bg-red-950/20 py-2 px-3 rounded-lg border border-red-200 dark:border-red-900">
            {error.message || "An error occurred. Please try again."}
          </div>
        )}
        <div className="text-center mt-2 text-xs text-[var(--text-secondary)]">
          Orch Assistant can make mistakes. Always review the constraints before applying them.
        </div>
      </div>
    </div>
  );
}
