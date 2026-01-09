import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { ComplianceReadiness, FDAComplianceReadinessView } from "@/lib/vexim-types"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const searchParams = request.nextUrl.searchParams
  const orgId = searchParams.get("organizationId")

  if (!orgId) {
    return NextResponse.json({ error: "Organization ID required" }, { status: 400 })
  }

  try {
    // Get legal readiness from database view
    const { data: fdaReadiness, error: fdaError } = await supabase
      .from("fda_compliance_readiness")
      .select<"*", FDAComplianceReadinessView>("*")
      .eq("organization_id", orgId)
      .single()

    if (fdaError) {
      console.error("[VEXIM API] Failed to fetch FDA compliance readiness:", fdaError)
      return NextResponse.json({ error: "Failed to fetch compliance data" }, { status: 500 })
    }

    if (!fdaReadiness) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    // Get data readiness from compliance_dashboard view
    const { data: dataStats, error: dataError } = await supabase
      .from("compliance_dashboard")
      .select("lot_completeness_score, cte_completeness_score, overall_compliance_score")
      .eq("organization_id", orgId)
      .single()

    if (dataError) {
      console.error("[VEXIM API] Failed to fetch data compliance stats:", dataError)
      return NextResponse.json({ error: "Failed to fetch compliance data" }, { status: 500 })
    }

    // Calculate data readiness (average of lot and CTE completeness, or use overall if available)
    const dataReadinessScore = dataStats
      ? dataStats.overall_compliance_score || (dataStats.lot_completeness_score + dataStats.cte_completeness_score) / 2
      : 0

    // Legal readiness comes from view
    const legalReadinessScore = fdaReadiness.legal_readiness_score

    // Overall readiness is weighted average (60% data, 40% legal)
    const overallReadiness = dataReadinessScore * 0.6 + legalReadinessScore * 0.4

    // Generate warnings based on missing fields
    const warnings: string[] = []
    if (legalReadinessScore < 100) {
      warnings.push(`Complete ${fdaReadiness.missing_fields.length} FDA requirement(s) to enable USA exports`)
    }
    if (dataReadinessScore < 80) {
      warnings.push("Improve KDE completeness for better data quality")
    }

    const readiness: ComplianceReadiness = {
      dataReadinessScore,
      legalReadinessScore,
      overallReadiness,
      canExportFDA: fdaReadiness.can_export_fda,
      canExportInternal: true, // Always true - VEXIM principle
      missingFields: fdaReadiness.missing_fields,
      warnings,
    }

    return NextResponse.json(readiness)
  } catch (error) {
    console.error("[VEXIM API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
