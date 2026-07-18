"use client"

import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { SECTIONS, type Audience, type DocBlock } from "./content"

const AUDIENCES: { value: Audience; label: string }[] = [
  { value: "developer", label: "Developer" },
  { value: "admin", label: "Admin" },
]

function CodeBlock({ lang, text }: { lang: string; text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="relative group my-4 rounded-lg border bg-[#0a0a0a] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <span className="text-xs text-[var(--text-secondary)] font-mono">{lang}</span>
        <button
          onClick={copy}
          className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm text-[#e5e5e5] font-mono leading-relaxed">
        <code>{text}</code>
      </pre>
    </div>
  )
}

function Callout({ variant, text }: { variant: "info" | "warning" | "tip"; text: string }) {
  const styles = {
    info:    "border-[var(--accent)]/40 bg-[var(--accent)]/5 text-[var(--accent)]",
    warning: "border-[var(--warning)]/40 bg-[var(--warning)]/5 text-[var(--warning)]",
    tip:     "border-[var(--success)]/40 bg-[var(--success)]/5 text-[var(--success)]",
  }
  const labels = { info: "Note", warning: "Warning", tip: "Tip" }
  return (
    <div className={cn("my-4 rounded-lg border px-4 py-3 flex gap-3", styles[variant])}>
      <span className="text-xs font-semibold uppercase tracking-wide mt-0.5 shrink-0">{labels[variant]}</span>
      <p className="text-sm text-[var(--text-primary)]">{text}</p>
    </div>
  )
}

function DocTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="my-4 overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-[var(--surface)]">
            {headers.map(h => (
              <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-[var(--surface)] transition-colors">
              {row.map((cell, j) => (
                <td key={j} className={cn("px-4 py-2.5", j === 0 && "font-mono text-xs text-[var(--accent)]")}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function renderBlock(block: DocBlock, i: number) {
  switch (block.type) {
    case "p":      return <p key={i} className="text-sm text-[var(--text-primary)] leading-relaxed my-3">{block.text}</p>
    case "h3":     return <h3 key={i} className="text-sm font-semibold text-[var(--text-primary)] mt-7 mb-2">{block.text}</h3>
    case "code":   return <CodeBlock key={i} lang={block.lang} text={block.text} />
    case "callout":return <Callout key={i} variant={block.variant} text={block.text} />
    case "table":  return <DocTable key={i} headers={block.headers} rows={block.rows} />
    case "list":   return (
      <ul key={i} className="my-3 space-y-1.5 pl-4">
        {block.items.map((item, j) => (
          <li key={j} className="text-sm text-[var(--text-primary)] flex gap-2">
            <span className="text-[var(--accent)] mt-1 shrink-0">·</span>
            {item}
          </li>
        ))}
      </ul>
    )
  }
}

export default function DocsPage() {
  const [audience, setAudience] = useState<Audience>("developer")
  const [activeId, setActiveId] = useState("introduction")
  const contentRef = useRef<HTMLDivElement>(null)

  const visible = SECTIONS.filter(s => s.audience === "both" || s.audience === audience)
  const activeIndex = visible.findIndex(s => s.id === activeId)
  const active = visible[activeIndex]
  const prev = visible[activeIndex - 1] ?? null
  const next = visible[activeIndex + 1] ?? null

  // scroll to top on section change
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" })
  }, [activeId])

  // reset to first section when audience changes
  useEffect(() => {
    setActiveId(visible[0]?.id ?? "introduction")
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audience])

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden -m-6">

      {/* Docs sidebar */}
      <aside className="w-56 shrink-0 border-r bg-[var(--surface)] flex flex-col overflow-hidden">
        {/* Audience toggle */}
        <div className="p-3 border-b">
          <div className="flex rounded-md border overflow-hidden text-xs">
            {AUDIENCES.map(a => (
              <button
                key={a.value}
                onClick={() => setAudience(a.value)}
                className={cn(
                  "flex-1 py-1.5 font-medium transition-colors",
                  audience === a.value
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Section list */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {visible.map((section, i) => (
            <button
              key={section.id}
              onClick={() => setActiveId(section.id)}
              className={cn(
                "w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                activeId === section.id
                  ? "bg-[var(--accent)]/10 text-[var(--accent)] font-medium"
                  : "text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-[var(--text-primary)]"
              )}
            >
              <span className="text-xs text-[var(--text-secondary)] w-4 shrink-0 font-mono">
                {String(i + 1).padStart(2, "0")}
              </span>
              {section.title}
            </button>
          ))}
        </nav>

        {/* Progress */}
        <div className="p-3 border-t">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-1.5">
            <span>Progress</span>
            <span>{activeIndex + 1} / {visible.length}</span>
          </div>
          <div className="h-1 rounded-full bg-[var(--border)] overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] rounded-full transition-all duration-300"
              style={{ width: `${((activeIndex + 1) / visible.length) * 100}%` }}
            />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div ref={contentRef} className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-8">

          {/* Breadcrumb */}
          <p className="text-xs text-[var(--text-secondary)] mb-1 uppercase tracking-wide font-medium">
            {audience === "developer" ? "Developer Docs" : "Admin Docs"} · {String(activeIndex + 1).padStart(2, "0")}
          </p>

          {/* Title */}
          <h1 className="text-2xl font-semibold tracking-tight mb-1">{active?.title}</h1>
          <div className="h-px bg-[var(--border)] my-6" />

          {/* Content */}
          <div>
            {active?.content.map((block, i) => renderBlock(block, i))}
          </div>

          {/* Prev / Next */}
          <div className="mt-12 pt-6 border-t grid grid-cols-2 gap-4">
            {prev ? (
              <button
                onClick={() => setActiveId(prev.id)}
                className="group flex flex-col items-start gap-1 rounded-lg border p-4 hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all text-left"
              >
                <span className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--accent)] transition-colors">← Previous</span>
                <span className="text-sm font-medium">{prev.title}</span>
              </button>
            ) : <div />}

            {next ? (
              <button
                onClick={() => setActiveId(next.id)}
                className="group flex flex-col items-end gap-1 rounded-lg border p-4 hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all text-right"
              >
                <span className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--accent)] transition-colors">Next →</span>
                <span className="text-sm font-medium">{next.title}</span>
              </button>
            ) : (
              <div className="flex flex-col items-end gap-1 rounded-lg border border-dashed p-4 opacity-50">
                <span className="text-xs text-[var(--text-secondary)]">You're all caught up</span>
                <span className="text-sm font-medium">End of docs</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
