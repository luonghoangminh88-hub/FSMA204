import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { reportType, periodStart, periodEnd } = await request.json()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    // Fetch data for report
    const { data: lots } = await supabase
      .from("traceability_lots")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .gte("created_at", periodStart)
      .lte("created_at", periodEnd)

    const { data: cteEvents } = await supabase
      .from("cte_events")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .gte("event_datetime", periodStart)
      .lte("event_datetime", periodEnd)

    // Calculate compliance score
    const completeKDEs =
      lots?.filter((lot) => lot.lot_code && lot.product_description && lot.quantity && lot.production_date).length || 0
    const complianceScore = lots && lots.length > 0 ? (completeKDEs / lots.length) * 100 : 0

    // Insert report record
    const { data: newReport, error: insertError } = await supabase
      .from("compliance_reports")
      .insert({
        organization_id: profile.organization_id,
        report_type: reportType || "ad_hoc",
        report_period_start: periodStart,
        report_period_end: periodEnd,
        total_lots_tracked: lots?.length || 0,
        total_cte_events: cteEvents?.length || 0,
        compliance_score: complianceScore,
        generated_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      console.error("[v0] Insert report error:", insertError)
      return NextResponse.json({ error: "Failed to create report" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      report: newReport,
      data: {
        lots: lots || [],
        cteEvents: cteEvents || [],
        complianceScore,
      },
    })
  } catch (error) {
    console.error("[v0] Error generating report:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
