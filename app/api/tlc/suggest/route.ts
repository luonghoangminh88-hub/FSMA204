// API endpoint to suggest TLC for lot creation
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's organization
    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const body = await request.json()
    const { food_id, location_id, production_date } = body

    // Call the suggest_tlc database function
    const { data, error } = await supabase.rpc("suggest_tlc", {
      p_organization_id: profile.organization_id,
      p_food_id: food_id || null,
      p_location_id: location_id || null,
      p_production_date: production_date || new Date().toISOString().split("T")[0],
    })

    if (error) {
      console.error("[v0] Error suggesting TLC:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ suggested_tlc: data })
  } catch (error: any) {
    console.error("[v0] Error in TLC suggestion:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
