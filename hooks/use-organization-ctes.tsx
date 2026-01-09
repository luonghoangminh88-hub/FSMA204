"use client"

import { useMemo } from "react"
import type { OrganizationType, CTEType } from "@/lib/types"
import { ORGANIZATION_CTE_MAPPINGS } from "@/lib/types"

/**
 * Hook to get allowed CTE types for an organization
 * Based on FSMA 204 compliance rules
 */
export function useOrganizationCTEs(organizationType: OrganizationType | null | undefined) {
  const allowedCTEs = useMemo(() => {
    if (!organizationType) return []
    return ORGANIZATION_CTE_MAPPINGS[organizationType] || []
  }, [organizationType])

  const canUseCTE = (cteType: CTEType) => {
    return allowedCTEs.includes(cteType)
  }

  return {
    allowedCTEs,
    canUseCTE,
  }
}
