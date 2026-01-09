import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get("organizationId")
    const locationId = searchParams.get("locationId")
    const status = searchParams.get("status")

    let query = supabase.from("inventory_dashboard").select("*")

    if (organizationId) {
      query = query.eq("organization_id", organizationId)
    }

    if (locationId) {
      query = query.eq("location_id", locationId)
    }

    if (status) {
      query = query.eq("expiration_status", status)
    }

    const { data, error } = await query.order("updated_at", { ascending: false })

    if (error) throw error

    // Calculate summary statistics
    const summary = {
      total_lots: data?.length || 0,
      total_quantity: data?.reduce((sum, item) => sum + (item.current_quantity || 0), 0) || 0,
      total_value:
        data?.reduce((sum, item) => sum + (item.current_quantity || 0) * (item.available_quantity || 0), 0) || 0,
      expired_count: data?.filter((item) => item.expiration_status === "expired").length || 0,
      expiring_soon_count: data?.filter((item) => item.expiration_status === "expiring_soon").length || 0,
      avg_loss_percentage: data?.reduce((sum, item) => sum + (item.loss_percentage || 0), 0) / (data?.length || 1) || 0,
    }

    return NextResponse.json({
      success: true,
      data,
      summary,
    })
  } catch (error: any) {
    console.error("[v0] Inventory dashboard error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST() {
  try {
    const supabase = await createClient()

    // Refresh materialized view
    const { error } = await supabase.rpc("refresh_inventory_dashboard")

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: "Inventory dashboard refreshed",
      refreshed_at: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[v0] Inventory dashboard refresh error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
