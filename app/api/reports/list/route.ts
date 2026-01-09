import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

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

    // Fetch compliance reports from database
    const { data: reports, error: reportsError } = await supabase
      .from("compliance_reports")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .order("created_at", { ascending: false })
      .limit(10)

    if (reportsError) {
      console.error("[v0] Reports error:", reportsError)
      return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 })
    }

    return NextResponse.json({ reports: reports || [] })
  } catch (error) {
    console.error("[v0] Error fetching reports:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
