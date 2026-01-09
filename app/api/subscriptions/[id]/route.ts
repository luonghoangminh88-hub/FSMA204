import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// Next.js 15 yêu cầu params phải là một Promise
export async function PATCH(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    // Phải await params để lấy id (Lỗi Next.js 15)
    const { id: subscriptionId } = await params

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "system_admin" && profile?.role !== "org_admin") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    }

    const body = await request.json()

    // Update subscription sử dụng subscriptionId đã await
    const { data: updatedSubscription, error } = await supabase
      .from("organization_subscriptions")
      .update(body)
      .eq("id", subscriptionId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ subscription: updatedSubscription })
  } catch (error: any) {
    console.error("[v0] Error updating subscription:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
