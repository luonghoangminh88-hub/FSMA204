import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's profile and organization
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("organization_id, role")
      .eq("id", user.id)
      .single()

    if (profileError || !profile?.organization_id) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    console.log("[v0] Fetching subscription for org:", profile.organization_id)

    const { data: subscription, error: subError } = await supabase
      .from("organization_subscriptions")
      .select(
        `
        id,
        organization_id,
        subscription_status,
        current_users_count,
        current_locations_count,
        current_lots_count,
        custom_max_users,
        custom_max_locations,
        custom_max_lots_per_month,
        package:service_packages!organization_subscriptions_package_id_fkey (
          package_name,
          package_code,
          package_tier,
          max_users,
          max_locations,
          max_lots_per_month
        )
      `,
      )
      .eq("organization_id", profile.organization_id)
      .eq("subscription_status", "active")
      .maybeSingle()

    console.log("[v0] Subscription query result:", { subscription, error: subError })

    if (subError) {
      console.error("[v0] Error fetching subscription:", subError)
      return NextResponse.json({ error: subError.message }, { status: 500 })
    }

    if (!subscription) {
      console.log("[v0] No active subscription found for org:", profile.organization_id)
      return NextResponse.json({
        hasSubscription: false,
        message: "No active subscription found",
      })
    }

    // Calculate effective quotas and usage percentages
    const package_data = Array.isArray(subscription.package) ? subscription.package[0] : subscription.package

    console.log("[v0] Package data:", package_data)

    if (!package_data) {
      console.error("[v0] No package data found for subscription")
      return NextResponse.json({ error: "Package data not found" }, { status: 500 })
    }

    const maxUsers = subscription.custom_max_users ?? package_data.max_users
    const maxLocations = subscription.custom_max_locations ?? package_data.max_locations
    const maxLots = subscription.custom_max_lots_per_month ?? package_data.max_lots_per_month

    const usersPercent = maxUsers ? (subscription.current_users_count / maxUsers) * 100 : null
    const locationsPercent = maxLocations ? (subscription.current_locations_count / maxLocations) * 100 : null
    const lotsPercent = maxLots ? (subscription.current_lots_count / maxLots) * 100 : null

    const response = {
      hasSubscription: true,
      subscription_id: subscription.id,
      organization_id: subscription.organization_id,
      package_name: package_data.package_name,
      package_code: package_data.package_code,
      package_tier: package_data.package_tier,
      subscription_status: subscription.subscription_status,
      current_users: subscription.current_users_count,
      max_users: maxUsers,
      users_usage_percent: usersPercent,
      current_locations: subscription.current_locations_count,
      max_locations: maxLocations,
      locations_usage_percent: locationsPercent,
      current_lots: subscription.current_lots_count,
      max_lots: maxLots,
      lots_usage_percent: lotsPercent,
    }

    console.log("[v0] Returning subscription response:", response)
    return NextResponse.json(response)
  } catch (error: any) {
    console.error("[v0] Error in subscription-status API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
