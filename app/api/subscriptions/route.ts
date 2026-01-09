import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get("organization_id")

    // Get user profile to check role
    const { data: profile } = await supabase.from("profiles").select("role, organization_id").eq("id", user.id).single()

    let query = supabase.from("organization_subscriptions").select(
      `
        *,
        organization:organizations(id, name, organization_type),
        package:service_packages(*)
      `,
    )

    // System admins can see all subscriptions
    if (profile?.role === "system_admin") {
      if (organizationId) {
        query = query.eq("organization_id", organizationId)
      }
    } else {
      // Others can only see their organization's subscription
      query = query.eq("organization_id", profile?.organization_id)
    }

    const { data: subscriptions, error } = await query.order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ subscriptions })
  } catch (error: any) {
    console.error("[v0] Error fetching subscriptions:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

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

    // Check if user is admin
    const { data: profile } = await supabase.from("profiles").select("role, organization_id").eq("id", user.id).single()

    if (profile?.role !== "system_admin" && profile?.role !== "org_admin") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    }

    const body = await request.json()

    // Add created_by
    body.created_by = user.id

    // Create subscription
    const { data: newSubscription, error } = await supabase
      .from("organization_subscriptions")
      .insert([body])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ subscription: newSubscription }, { status: 201 })
  } catch (error: any) {
    console.error("[v0] Error creating subscription:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
