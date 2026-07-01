"use client"

import { Suspense } from "react"
import OnboardingContent from "./OnboardingContent"

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="rounded-lg border bg-[var(--surface)] p-8 text-center">
        <p className="text-sm text-[var(--text-secondary)]">Loading...</p>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  )
}
