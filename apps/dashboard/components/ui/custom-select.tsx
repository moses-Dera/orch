"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { ChevronDown, Check } from "lucide-react"

export interface SelectOption {
  value: string
  label: string
  description?: string
  badge?: string
  icon?: React.ReactNode
}

export interface CustomSelectProps {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  triggerClassName?: string
  dropdownClassName?: string
  disabled?: boolean
  size?: "xs" | "sm" | "md"
  fullWidth?: boolean
  align?: "left" | "right"
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  className = "",
  triggerClassName = "",
  dropdownClassName = "",
  disabled = false,
  size = "sm",
  fullWidth = false,
  align = "left",
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("touchstart", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen])

  const handleSelect = useCallback(
    (val: string) => {
      onChange(val)
      setIsOpen(false)
    },
    [onChange]
  )

  const sizeClasses = {
    xs: "px-2 py-1 text-[11px] gap-1.5 h-7",
    sm: "px-3 py-1.5 text-xs gap-2 h-8",
    md: "px-3.5 py-2 text-sm gap-2.5 h-9",
  }[size]

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${fullWidth ? "w-full" : ""} ${className}`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none focus:outline-none focus:ring-1 focus:ring-[var(--accent)] ${sizeClasses} ${
          fullWidth ? "w-full" : "min-w-[140px]"
        } ${triggerClassName}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate text-left flex items-center gap-1.5 flex-1 pr-1 font-medium">
          {selectedOption ? (
            <>
              {selectedOption.icon && <span className="shrink-0">{selectedOption.icon}</span>}
              <span className="truncate">{selectedOption.label}</span>
              {selectedOption.badge && (
                <span className="text-[10px] px-1.5 py-0.2 rounded border border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] font-mono shrink-0">
                  {selectedOption.badge}
                </span>
              )}
            </>
          ) : (
            <span className="text-[var(--text-secondary)]">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          size={size === "xs" ? 12 : 14}
          className={`text-[var(--text-secondary)] shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-[var(--accent)]" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className={`absolute ${
            align === "right" ? "right-0" : "left-0"
          } top-full mt-1.5 z-50 min-w-[180px] ${
            fullWidth ? "w-full" : "w-auto max-w-[280px]"
          } rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl backdrop-blur-xl overflow-hidden py-1 max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-100 ${dropdownClassName}`}
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-[var(--text-secondary)] text-center">
              No options available
            </div>
          ) : (
            options.map((opt) => {
              const isSelected = opt.value === value
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between gap-2.5 cursor-pointer ${
                    isSelected
                      ? "bg-[var(--accent)]/10 text-[var(--accent)] font-semibold"
                      : "text-[var(--text-secondary)] hover:bg-[var(--border)]/60 hover:text-[var(--text-primary)]"
                  }`}
                >
                  <div className="flex-1 truncate">
                    <div className="flex items-center gap-1.5 truncate">
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                      <span className="truncate">{opt.label}</span>
                      {opt.badge && (
                        <span className="text-[9px] px-1 py-0.2 rounded border border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] font-mono shrink-0">
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    {opt.description && (
                      <p className="text-[10px] text-[var(--text-secondary)] truncate mt-0.5 opacity-80">
                        {opt.description}
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <Check
                      size={14}
                      className="text-[var(--accent)] shrink-0"
                    />
                  )}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
