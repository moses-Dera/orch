"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export function TrialBanner() {
  const [billing, setBilling] = useState<any>(null)

  useEffect(() => {
    fetch('/api/orch/v1/billing')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setBilling(data)
      })
      .catch(console.error)
  }, [])

  if (!billing || billing.hasApiKey) return null;

  const isExhausted = billing.budget.consumedTokens >= billing.budget.allocatedTokens;

  return (
    <div className={`mb-6 p-4 rounded-lg border text-sm font-medium ${
      isExhausted 
        ? "bg-red-500/10 border-red-500/20 text-red-500" 
        : "bg-amber-500/10 border-amber-500/20 text-amber-500"
    }`}>
      <div className="flex items-center justify-between">
        <span>
          {isExhausted 
            ? "Trial Exhausted. AI Code Reviews are paused." 
            : `Trial Active: ${billing.budget.consumedTokens.toLocaleString()} / ${billing.budget.allocatedTokens.toLocaleString()} tokens consumed.`}
        </span>
        <Link href="/settings" className="underline underline-offset-2 hover:opacity-80">
          Add API Key
        </Link>
      </div>
    </div>
  )
}
