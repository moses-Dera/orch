"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useProjectStore } from "@/stores/projectStore"
import { ChevronDown, Check } from "lucide-react"

export function ProjectSwitcher() {
  const [open, setOpen] = useState(false)
  const { selectedProjectId, setSelectedProjectId } = useProjectStore()
  const { data: projectsData, isLoading } = useQuery({ 
    queryKey: ["projects"], 
    queryFn: api.listProjects 
  })

  // Close dropdown when clicking outside (handled simply by onBlur for focus loss)
  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setOpen(false)
    }
  }

  const handleSelect = (id: string) => {
    setSelectedProjectId(id)
    setOpen(false)
  }

  const selectedProject = projectsData?.projects?.find((p: any) => p.id === selectedProjectId)
  const displayName = selectedProject 
    ? (selectedProject.name || selectedProject.githubRepoFullName || selectedProjectId)
    : "All Projects"

  return (
    <div 
      className="relative" 
      onBlur={handleBlur}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={isLoading}
        className="flex items-center gap-1.5 text-sm hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
      >
        <span className="text-[var(--text-secondary)] max-w-[120px] lg:max-w-[180px] truncate">
          {displayName}
        </span>
        <ChevronDown size={12} className="text-[var(--text-secondary)] flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-64 rounded-lg border bg-[var(--surface)] shadow-lg z-50 overflow-hidden">
          {/* Available projects info */}
          <div className="px-4 py-3 border-b">
            <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Projects</p>
          </div>

          <div className="py-1 max-h-60 overflow-y-auto">
            <button
              type="button"
              onClick={() => handleSelect("")}
              className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--border)] transition-colors flex items-center justify-between"
            >
              <span>All Projects</span>
              {selectedProjectId === "" && <Check className="w-4 h-4 text-[var(--accent)]" />}
            </button>
            {projectsData?.projects?.map((p: any) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelect(p.id)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--border)] transition-colors flex items-center justify-between"
              >
                <div className="truncate pr-2">
                  <div className="font-semibold truncate">{p.name || p.githubRepoFullName || p.id}</div>
                </div>
                {selectedProjectId === p.id && <Check className="w-4 h-4 text-[var(--accent)] flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
