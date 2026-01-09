import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Get current user and organization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's organization
    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    // Fetch compliance data
    const { data: complianceData, error: complianceError } = await supabase
      .from("compliance_dashboard")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .single()

    if (complianceError) {
      console.error("[v0] Compliance data error:", complianceError)
    }

    const { data: lots, error: lotsError } = await supabase
      .from("traceability_lots")
      .select(
        `
        id,
        lot_code,
        product_description,
        quantity,
        unit_of_measure,
        production_date,
        status,
        created_at
      `,
      )
      .eq("organization_id", profile.organization_id)
      .order("created_at", { ascending: false })

    if (lotsError) {
      console.error("[v0] Lots error:", lotsError)
    }

    const { data: cteEvents, error: cteError } = await supabase
      .from("cte_events")
      .select(
        `
        id,
        event_type,
        event_datetime,
        reference_document_number,
        created_at
      `,
      )
      .eq("organization_id", profile.organization_id)
      .order("event_datetime", { ascending: false })
      .limit(100)

    if (cteError) {
      console.error("[v0] CTE events error:", cteError)
    }

    // Generate report data
    const reportData = {
      report_type: "FSMA 204 Compliance Report",
      generated_at: new Date().toISOString(),
      organization_id: profile.organization_id,
      compliance_summary: {
        overall_score: complianceData?.overall_compliance_score || 0,
        kde_completeness: complianceData?.kde_completeness_rate || 0,
        data_quality: complianceData?.data_quality_score || 0,
        total_lots: lots?.length || 0,
        total_cte_events: cteEvents?.length || 0,
      },
      lots_summary: lots || [],
      cte_events_summary: cteEvents || [],
      recommendations: generateRecommendations(complianceData),
    }

    return NextResponse.json({
      success: true,
      report: reportData,
      format: "pdf",
    })
  } catch (error) {
    console.error("[v0] Error generating compliance report:", error)
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 })
  }
}

function generateRecommendations(complianceData: any) {
  const recommendations = []

  if (!complianceData) {
    return ["Complete basic compliance setup"]
  }

  if (complianceData.kde_completeness_rate < 90) {
    recommendations.push("Improve KDE data completeness - ensure all lots have complete traceability information")
  }

  if (complianceData.data_quality_score < 95) {
    recommendations.push("Enhance data quality - review and correct incomplete or inconsistent records")
  }

  if (complianceData.overall_compliance_score < 85) {
    recommendations.push("Increase overall compliance score - focus on completing all required FSMA 204 data points")
  }

  if (recommendations.length === 0) {
    recommendations.push("Excellent compliance! Maintain current practices.")
  }

  return recommendations
}
