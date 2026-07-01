"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

export function useOrchStatus() {
  return useQuery({
    queryKey: ["status"],
    queryFn: api.status,
    staleTime: Infinity,
  })
}

export function useModels() {
  return useQuery({
    queryKey: ["models"],
    queryFn: api.models,
    staleTime: 5 * 60_000,
  })
}

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: api.health,
    staleTime: 5 * 60_000,
  })
}

export function useAuditLog(params?: { member_id?: string; limit?: number }) {
  return useQuery({
    queryKey: ["audit-log", params],
    queryFn: () => api.auditLog(params),
    staleTime: 60_000,
  })
}
