"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { PageShell } from "@/components/layout/PageShell"
import { PageSkeleton } from "@/components/shared/LoadingSkeleton"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CustomSelect } from "@/components/ui/custom-select"
import { useProjectStore } from "@/stores/projectStore"
import { api } from "@/lib/api"
import { toast } from "sonner"
import {
  Search, Download, Layers, Check, ExternalLink,
  Plus, ArrowRight, BookOpen, AlertTriangle, Filter, Sparkles,
  Settings2, Trash2, Code2, Globe, CheckCircle2
} from "lucide-react"

const POPULAR_TAGS = ["All", "Next.js", "Security", "Postgres", "Web3 / Solidity", "TypeScript", "Performance"]

interface RuleInput {
  id: string
  type: string
  description: string
  content: string
  goodExample: string
  badExample: string
}

export default function MarketplacePage() {
  const queryClient = useQueryClient()
  const { selectedProjectId } = useProjectStore()
  
  // State
  const [activeTab, setActiveTab] = useState<"discover" | "subscribed" | "publish">("discover")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTag, setSelectedTag] = useState("All")
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  
  // Modals
  const [detailSkillId, setDetailSkillId] = useState<string | null>(null)
  const [subscribeSkill, setSubscribeSkill] = useState<any | null>(null)
  const [subTargetProjectId, setSubTargetProjectId] = useState<string>("")
  const [subPrecedence, setSubPrecedence] = useState<string>("private_overrules")
  const [subExcludedRules, setSubExcludedRules] = useState<string[]>([])

  // Publish Form State
  const [pubName, setPubName] = useState("")
  const [pubSlug, setPubSlug] = useState("")
  const [pubDescription, setPubDescription] = useState("")
  const [pubAuthorName, setPubAuthorName] = useState("")
  const [pubTags, setPubTags] = useState("nextjs, security")
  const [pubRules, setPubRules] = useState<RuleInput[]>([
    {
      id: "no_raw_sql",
      type: "security",
      description: "Disallow raw SQL interpolation to prevent SQL injection vulnerabilities.",
      content: "All database queries must use prepared statements or the type-safe ORM query builder. Never concatenate raw strings into sql template tags.",
      goodExample: "db.select().from(users).where(eq(users.id, id))",
      badExample: "db.execute(`SELECT * FROM users WHERE id = '${id}'`)",
    }
  ])

  // Queries
  const { data: skillsData, isLoading: skillsLoading } = useQuery({
    queryKey: ["marketplace-skills", searchQuery, verifiedOnly],
    queryFn: () => api.listMarketplaceSkills({
      search: searchQuery || undefined,
      verified: verifiedOnly || undefined,
    }),
  })

  const { data: projectsData } = useQuery<{ projects: any[] }>({
    queryKey: ["projects"],
    queryFn: () => api.listProjects(),
  })

  const projectsList = (projectsData as any)?.projects || []
  const effectiveProjectId = subTargetProjectId || selectedProjectId || (projectsList[0]?.id ?? "")

  const { data: subscribedData, isLoading: subscribedLoading } = useQuery({
    queryKey: ["project-subscriptions", effectiveProjectId],
    queryFn: () => api.getProjectSubscriptions(effectiveProjectId),
    enabled: !!effectiveProjectId,
  })

  const { data: skillDetailData, isLoading: detailLoading } = useQuery({
    queryKey: ["marketplace-skill-detail", detailSkillId],
    queryFn: () => api.getMarketplaceSkill(detailSkillId!),
    enabled: !!detailSkillId,
  })

  // Mutations
  const subscribeMutation = useMutation({
    mutationFn: (vars: { skillId: string; body: any }) =>
      api.subscribeProjectSkill(vars.skillId, vars.body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-subscriptions"] })
      queryClient.invalidateQueries({ queryKey: ["marketplace-skills"] })
      toast.success("Subscribed project to skill pack!")
      setSubscribeSkill(null)
    },
    onError: (err: any) => toast.error(err.message || "Failed to subscribe"),
  })

  const unsubscribeMutation = useMutation({
    mutationFn: (vars: { projectId: string; skillId: string }) =>
      api.unsubscribeProjectSkill(vars.projectId, vars.skillId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-subscriptions"] })
      toast.success("Unsubscribed from skill pack")
    },
    onError: (err: any) => toast.error(err.message || "Failed to unsubscribe"),
  })

  const publishMutation = useMutation({
    mutationFn: (body: any) => api.publishMarketplaceSkill(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-skills"] })
      toast.success("Skill pack published to marketplace!")
      setActiveTab("discover")
      setPubName("")
      setPubDescription("")
    },
    onError: (err: any) => toast.error(err.message || "Failed to publish skill"),
  })

  // Filter skills by selected tag in memory
  const filteredSkills = useMemo(() => {
    const list = skillsData?.skills || []
    if (selectedTag === "All") return list
    const lowerTag = selectedTag.toLowerCase().replace(/[^a-z0-9]/g, "")
    return list.filter((s) =>
      s.tags?.some((t: string) => t.toLowerCase().includes(lowerTag))
    )
  }, [skillsData, selectedTag])

  const handleOpenSubscribe = (skill: any) => {
    setSubscribeSkill(skill)
    setSubTargetProjectId(effectiveProjectId)
    setSubPrecedence("private_overrules")
    setSubExcludedRules([])
  }

  const handleAddRuleDraft = () => {
    setPubRules([
      ...pubRules,
      {
        id: `rule_${Date.now()}`,
        type: "tech_stack",
        description: "",
        content: "",
        goodExample: "",
        badExample: "",
      },
    ])
  }

  const handleRuleChange = (index: number, field: keyof RuleInput, val: string) => {
    const updated = [...pubRules]
    updated[index][field] = val
    setPubRules(updated)
  }

  const handleRemoveRuleDraft = (index: number) => {
    setPubRules(pubRules.filter((_, i) => i !== index))
  }

  const handlePublishSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!pubName.trim() || !pubDescription.trim()) {
      toast.error("Name and description are required.")
      return
    }

    const formattedRules = pubRules
      .filter((r) => r.id.trim() && r.content.trim())
      .map((r) => ({
        id: r.id.trim(),
        type: r.type,
        description: r.description.trim(),
        content: r.content.trim(),
        goodExamples: r.goodExample.trim() ? [r.goodExample.trim()] : [],
        badExamples: r.badExample.trim() ? [r.badExample.trim()] : [],
      }))

    publishMutation.mutate({
      name: pubName.trim(),
      slug: pubSlug.trim() || undefined,
      description: pubDescription.trim(),
      authorName: pubAuthorName.trim() || undefined,
      tags: pubTags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
      version: "1.0.0",
      rules: formattedRules,
    })
  }

  if (skillsLoading && !skillsData) return <PageSkeleton />

  return (
    <PageShell
      title="Skill Marketplace"
      description="Discover, subscribe to, and publish verified AI governance skill packs across your organization."
      action={
        <Button
          onClick={() => setActiveTab("publish")}
          className="gap-2 bg-[var(--accent)] hover:opacity-90 text-black font-semibold text-xs h-8"
        >
          <Plus size={14} />
          Publish Skill Pack
        </Button>
      }
    >
      {/* ─── Navigation Tabs ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 mb-6 text-sm font-medium overflow-x-auto scrollbar-none flex-nowrap shrink-0">
        <button
          onClick={() => setActiveTab("discover")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === "discover"
              ? "bg-[var(--surface)] text-[var(--text-primary)] font-semibold border border-[var(--border)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Globe size={15} />
          Discover
        </button>
        <button
          onClick={() => setActiveTab("subscribed")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === "subscribed"
              ? "bg-[var(--surface)] text-[var(--text-primary)] font-semibold border border-[var(--border)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Layers size={15} />
          Subscribed to Project
          {subscribedData?.subscriptions && (
            <span className="ml-1 text-[11px] px-1.5 py-0.2 rounded-full bg-[var(--border)] text-[var(--text-secondary)]">
              {subscribedData.subscriptions.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("publish")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === "publish"
              ? "bg-[var(--surface)] text-[var(--text-primary)] font-semibold border border-[var(--border)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Plus size={15} />
          Publish Skill
        </button>
      </div>

      {/* ─── TAB 1: DISCOVER ─────────────────────────────────────────────────── */}
      {activeTab === "discover" && (
        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 text-[var(--text-secondary)]" size={15} />
              <input
                type="text"
                placeholder="Search skills by framework, author, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            
            <button
              onClick={() => setVerifiedOnly(!verifiedOnly)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                verifiedOnly
                  ? "bg-sky-500/10 border-sky-500/30 text-sky-400 font-medium"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <CheckCircle2 size={14} className={verifiedOnly ? "fill-sky-400 text-[var(--background)]" : "text-sky-400"} />
              Verified Only
            </button>
          </div>

          {/* Tags row */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {POPULAR_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all whitespace-nowrap ${
                  selectedTag === tag
                    ? "bg-[var(--text-primary)] text-[var(--background)] border-[var(--text-primary)] font-medium"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Skills Grid */}
          {filteredSkills.length === 0 ? (
            <div className="border border-dashed border-[var(--border)] rounded-xl p-12 text-center text-[var(--text-secondary)]">
              <Layers className="mx-auto mb-2 opacity-50" size={32} />
              <p className="text-sm font-medium">No skill packs found matching your criteria</p>
              <p className="text-xs mt-1">Try broadening your search or be the first to publish a new pack!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSkills.map((skill) => (
                <div
                  key={skill.id}
                  className="group relative flex flex-col justify-between border border-[var(--border)] rounded-xl p-4 bg-[var(--surface)] hover:border-[var(--border-strong)] transition-all shadow-sm hover:shadow-md"
                >
                  <div>
                    {/* Top Row: Title + Verified Badge */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                          {skill.name}
                        </h3>
                        {skill.isVerified && (
                          <span title="Verified Skill & Creator" className="inline-flex items-center text-sky-400 shrink-0">
                            <CheckCircle2 size={15} className="fill-sky-500 text-[var(--surface)]" />
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-[var(--text-secondary)] px-1.5 py-0.5 rounded border border-[var(--border)]">
                        v{skill.version}
                      </span>
                    </div>

                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-3 leading-relaxed">
                      {skill.description}
                    </p>

                    {/* Tag badges */}
                    <div className="flex flex-wrap gap-1 mb-4">
                      {skill.tags?.slice(0, 3).map((tag: string) => (
                        <span
                          key={tag}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--background)] border border-[var(--border)] text-[var(--text-secondary)]"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Card Footer: Metadata + Actions */}
                  <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[11px] text-[var(--text-secondary)]">
                      <span className="flex items-center gap-1">
                        <BookOpen size={12} />
                        {skill.rulesCount || 0} {skill.rulesCount === 1 ? "rule" : "rules"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Download size={12} />
                        {skill.downloadsCount || 0}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setDetailSkillId(skill.slug || skill.id)}
                        className="text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-1 rounded transition-colors"
                      >
                        Inspect
                      </button>
                      <Button
                        size="sm"
                        onClick={() => handleOpenSubscribe(skill)}
                        className="text-xs h-7 px-3 bg-[var(--accent)] hover:opacity-90 text-black font-semibold"
                      >
                        Subscribe
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: SUBSCRIBED TO PROJECT ───────────────────────────────────── */}
      {activeTab === "subscribed" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <div>
              <p className="text-xs font-semibold text-[var(--text-primary)]">Active Project Context</p>
              <p className="text-xs text-[var(--text-secondary)]">
                Showing public skill subscriptions inherited by this project.
              </p>
            </div>
            <CustomSelect
              value={effectiveProjectId}
              onChange={(val) => setSubTargetProjectId(val)}
              options={projectsList.map((p: any) => ({
                value: p.id,
                label: p.name || p.githubRepoFullName || p.id,
                description: p.githubRepoFullName ? `Repo: ${p.githubRepoFullName}` : undefined,
              }))}
              placeholder="Select project..."
              className="w-full sm:w-auto"
              triggerClassName="w-full sm:min-w-[200px]"
              align="right"
            />
          </div>

          {subscribedLoading ? (
            <PageSkeleton />
          ) : subscribedData?.subscriptions?.length === 0 ? (
            <div className="border border-dashed border-[var(--border)] rounded-xl p-12 text-center text-[var(--text-secondary)]">
              <Layers className="mx-auto mb-2 opacity-50" size={32} />
              <p className="text-sm font-medium">No skills subscribed for this project yet</p>
              <p className="text-xs mt-1">Browse the Discover tab to inherit verified industry standards.</p>
              <Button
                size="sm"
                onClick={() => setActiveTab("discover")}
                className="mt-4 text-xs bg-[var(--accent)] text-black font-semibold"
              >
                Browse Marketplace
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subscribedData?.subscriptions?.map((sub: any) => (
                <div
                  key={sub.subscriptionId}
                  className="border border-[var(--border)] rounded-xl p-4 bg-[var(--surface)] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-[var(--text-primary)]">{sub.skill?.name}</h4>
                        {sub.skill?.isVerified && (
                          <span title="Verified Skill" className="inline-flex items-center text-sky-400 shrink-0">
                            <CheckCircle2 size={15} className="fill-sky-500 text-[var(--surface)]" />
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--background)] border border-[var(--border)] text-[var(--accent)] font-semibold">
                        {sub.precedenceMode}
                      </span>
                    </div>

                    <p className="text-xs text-[var(--text-secondary)] mb-3">{sub.skill?.description}</p>
                    
                    {sub.excludedRuleIds?.length > 0 && (
                      <div className="text-[11px] text-amber-400/90 bg-amber-400/10 border border-amber-400/20 px-2 py-1 rounded mb-3">
                        ⚠️ {sub.excludedRuleIds.length} rule(s) opted out
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs">
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      Author: {sub.skill?.authorName || "Community"}
                    </span>
                    <button
                      onClick={() => unsubscribeMutation.mutate({ projectId: effectiveProjectId, skillId: sub.skill.id })}
                      className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 transition-colors"
                    >
                      <Trash2 size={12} />
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: PUBLISH SKILL PACK ───────────────────────────────────────── */}
      {activeTab === "publish" && (
        <form onSubmit={handlePublishSubmit} className="max-w-2xl space-y-6">
          <div className="border border-[var(--border)] rounded-xl p-5 bg-[var(--surface)] space-y-4">
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Sparkles size={16} className="text-[var(--accent)]" />
              Skill Pack Metadata
            </h3>

            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Skill Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Next.js 15 App Router Strict Standards"
                value={pubName}
                onChange={(e) => {
                  setPubName(e.target.value)
                  if (!pubSlug) {
                    setPubSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"))
                  }
                }}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Slug (Registry ID)</label>
                <input
                  type="text"
                  placeholder="nextjs-15-strict"
                  value={pubSlug}
                  onChange={(e) => setPubSlug(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Author / Org Name</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Engineering"
                  value={pubAuthorName}
                  onChange={(e) => setPubAuthorName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Description *</label>
              <textarea
                required
                rows={2}
                placeholder="1-2 sentences outlining the architectural boundaries enforced by this pack..."
                value={pubDescription}
                onChange={(e) => setPubDescription(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Tags (comma-separated)</label>
              <input
                type="text"
                placeholder="nextjs, react, security, typescript"
                value={pubTags}
                onChange={(e) => setPubTags(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          {/* Rules Builder */}
          <div className="border border-[var(--border)] rounded-xl p-5 bg-[var(--surface)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Code2 size={16} className="text-[var(--accent)]" />
                Included Rules ({pubRules.length})
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddRuleDraft}
                className="text-xs h-7 gap-1"
              >
                <Plus size={12} /> Add Rule
              </Button>
            </div>

            <div className="space-y-4">
              {pubRules.map((rule, idx) => (
                <div key={idx} className="p-4 rounded-lg border border-[var(--border)] bg-[var(--background)] space-y-3 relative">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-[var(--text-secondary)]">Rule #{idx + 1}</span>
                    {pubRules.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRuleDraft(idx)}
                        className="text-rose-400 hover:text-rose-300 text-xs"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Rule ID (e.g. no_raw_sql)"
                      value={rule.id}
                      onChange={(e) => handleRuleChange(idx, "id", e.target.value)}
                      className="px-2.5 py-1.5 rounded border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text-primary)] font-mono"
                    />
                    <CustomSelect
                      value={rule.type}
                      onChange={(val) => handleRuleChange(idx, "type", val)}
                      options={[
                        { value: "security", label: "Security" },
                        { value: "tech_stack", label: "Tech Stack" },
                        { value: "performance", label: "Performance" },
                        { value: "style", label: "Style" },
                      ]}
                      size="sm"
                      fullWidth
                    />
                  </div>

                  <textarea
                    rows={2}
                    placeholder="Full rule statement..."
                    value={rule.content}
                    onChange={(e) => handleRuleChange(idx, "content", e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text-primary)]"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <textarea
                      rows={2}
                      placeholder="Good Example (Clean Code snippet)..."
                      value={rule.goodExample}
                      onChange={(e) => handleRuleChange(idx, "goodExample", e.target.value)}
                      className="px-2 py-1 rounded border border-[var(--border)] bg-[var(--surface)] text-[11px] font-mono text-emerald-400/90"
                    />
                    <textarea
                      rows={2}
                      placeholder="Bad Example (Violation snippet)..."
                      value={rule.badExample}
                      onChange={(e) => handleRuleChange(idx, "badExample", e.target.value)}
                      className="px-2 py-1 rounded border border-[var(--border)] bg-[var(--surface)] text-[11px] font-mono text-rose-400/90"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            disabled={publishMutation.isPending}
            className="w-full bg-[var(--accent)] text-black font-semibold h-9 text-xs"
          >
            {publishMutation.isPending ? "Publishing to Registry..." : "Publish Skill Pack to Registry"}
          </Button>
        </form>
      )}

      {/* ─── MODAL 1: SKILL DETAIL INSPECTION ────────────────────────────────── */}
      <Dialog open={!!detailSkillId} onOpenChange={(open) => !open && setDetailSkillId(null)}>
        <DialogContent className="w-[95vw] sm:max-w-2xl bg-[var(--surface)] border-[var(--border)] max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                {skillDetailData?.skill?.name}
                {skillDetailData?.skill?.isVerified && (
                  <span title="Verified Skill & Creator" className="inline-flex items-center text-sky-400 shrink-0">
                    <CheckCircle2 size={17} className="fill-sky-500 text-[var(--surface)]" />
                  </span>
                )}
              </DialogTitle>
              <span className="text-xs font-mono text-[var(--text-secondary)]">
                v{skillDetailData?.skill?.version}
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {skillDetailData?.skill?.description}
            </p>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
              Enforced Rules ({skillDetailData?.rules?.length || 0})
            </h4>

            {detailLoading ? (
              <div className="p-8 text-center text-xs text-[var(--text-secondary)]">Loading rules...</div>
            ) : (
              <div className="space-y-3">
                {skillDetailData?.rules?.map((rule: any) => (
                  <div key={rule.id} className="border border-[var(--border)] rounded-lg p-3 bg-[var(--background)] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[var(--text-primary)]">{rule.id}</span>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-[var(--surface)] text-[var(--accent)] border border-[var(--border)]">
                        {rule.type}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{rule.content}</p>

                    {(rule.goodExamples?.length > 0 || rule.badExamples?.length > 0) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[var(--border)]">
                        {rule.goodExamples?.[0] && (
                          <div className="bg-emerald-500/5 border border-emerald-500/20 p-2 rounded text-[11px] font-mono text-emerald-400">
                            <span className="text-[9px] uppercase tracking-wider block font-bold mb-1">Good:</span>
                            <pre className="overflow-x-auto">{rule.goodExamples[0]}</pre>
                          </div>
                        )}
                        {rule.badExamples?.[0] && (
                          <div className="bg-rose-500/5 border border-rose-500/20 p-2 rounded text-[11px] font-mono text-rose-400">
                            <span className="text-[9px] uppercase tracking-wider block font-bold mb-1">Bad:</span>
                            <pre className="overflow-x-auto">{rule.badExamples[0]}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <Button variant="outline" size="sm" onClick={() => setDetailSkillId(null)} className="text-xs">
              Close
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const skill = skillDetailData?.skill
                setDetailSkillId(null)
                if (skill) handleOpenSubscribe(skill)
              }}
              className="text-xs bg-[var(--accent)] text-black font-semibold"
            >
              Subscribe Project
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: SUBSCRIBE CONFIGURATION MODAL ─────────────────────────── */}
      <Dialog open={!!subscribeSkill} onOpenChange={(open) => !open && setSubscribeSkill(null)}>
        <DialogContent className="w-[95vw] sm:max-w-lg bg-[var(--surface)] border-[var(--border)] max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              Subscribe to {subscribeSkill?.name}
            </DialogTitle>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Select which project should inherit these AI compliance constraints.
            </p>
          </DialogHeader>

          <div className="space-y-4 my-3 text-xs">
            {/* Target Project */}
            <div>
              <label className="font-semibold text-[var(--text-primary)] block mb-1.5">Target Project</label>
              <CustomSelect
                value={subTargetProjectId || effectiveProjectId}
                onChange={(val) => setSubTargetProjectId(val)}
                options={projectsList.map((p: any) => ({
                  value: p.id,
                  label: `${p.name} ${p.githubRepoFullName ? `(${p.githubRepoFullName})` : ""}`,
                  description: p.githubRepoFullName ? `Repo: ${p.githubRepoFullName}` : undefined,
                }))}
                placeholder="Choose target project..."
                fullWidth
                size="md"
              />
            </div>

            {/* Precedence Mode */}
            <div>
              <label className="font-semibold text-[var(--text-primary)] block mb-1">Conflict Resolution (Precedence)</label>
              <div className="space-y-2">
                <label className="flex items-start gap-2 p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] cursor-pointer hover:border-[var(--accent)]">
                  <input
                    type="radio"
                    name="precedence"
                    value="private_overrules"
                    checked={subPrecedence === "private_overrules"}
                    onChange={(e) => setSubPrecedence(e.target.value)}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-[var(--text-primary)] block">Private Overrules (Recommended)</span>
                    <span className="text-[11px] text-[var(--text-secondary)]">Your team's custom private constraints take absolute precedence over conflicting public rules.</span>
                  </div>
                </label>

                <label className="flex items-start gap-2 p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] cursor-pointer hover:border-[var(--accent)]">
                  <input
                    type="radio"
                    name="precedence"
                    value="strict_union"
                    checked={subPrecedence === "strict_union"}
                    onChange={(e) => setSubPrecedence(e.target.value)}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-[var(--text-primary)] block">Strict Union (Zero Tolerance)</span>
                    <span className="text-[11px] text-[var(--text-secondary)]">Both private and public rules are strictly enforced. Code fails if either policy is violated.</span>
                  </div>
                </label>

                <label className="flex items-start gap-2 p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] cursor-pointer hover:border-[var(--accent)]">
                  <input
                    type="radio"
                    name="precedence"
                    value="public_overrules"
                    checked={subPrecedence === "public_overrules"}
                    onChange={(e) => setSubPrecedence(e.target.value)}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-[var(--text-primary)] block">Public Standards First</span>
                    <span className="text-[11px] text-[var(--text-secondary)]">The public skill is authoritative. Useful for rigid corporate standards.</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <Button variant="outline" size="sm" onClick={() => setSubscribeSkill(null)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={subscribeMutation.isPending}
              onClick={() => {
                if (!subTargetProjectId) {
                  toast.error("Please choose a target project")
                  return
                }
                subscribeMutation.mutate({
                  skillId: subscribeSkill.id,
                  body: {
                    projectId: subTargetProjectId,
                    pinnedVersion: "latest",
                    precedenceMode: subPrecedence,
                    excludedRuleIds: subExcludedRules,
                  }
                })
              }}
              className="text-xs bg-[var(--accent)] text-black font-semibold"
            >
              {subscribeMutation.isPending ? "Subscribing..." : "Confirm Subscription"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
