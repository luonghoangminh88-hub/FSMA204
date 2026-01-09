import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Next.js 15 yêu cầu params phải là một Promise
export async function PATCH(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Phải await params trước khi truy cập id (Lỗi Next.js 15)
    const { id: subscriptionId } = await params

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "system_admin") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    }

    const body = await request.json()
    const { 
      custom_max_users, 
      custom_max_locations, 
      custom_max_lots_per_month, 
      custom_storage_gb 
    } = body

    // Cập nhật subscription với các hạn mức tùy chỉnh sử dụng subscriptionId đã await
    const { data: updatedSubscription, error } = await supabase
      .from("organization_subscriptions")
      .update({
        custom_max_users,
        custom_max_locations,
        custom_max_lots_per_month,
        custom_storage_gb,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscriptionId)
      .select(
        `
        *,
        service_package:service_packages(*),
        organization:organizations(id, name)
      `,
      )
      .single()

    if (error) throw error

    return NextResponse.json({ subscription: updatedSubscription })
  } catch (error: any) {
    console.error("[v0] Error customizing quota:", error)
    return NextResponse.json({ error: error.message || "Failed to customize quota" }, { status: 500 })
  }
}
