import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { handleError, AppError, ErrorCode } from "@/lib/security/error-handler"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new AppError("Authentication required", ErrorCode.UNAUTHORIZED, 401)
    }

    const { searchParams } = new URL(req.url)
    const isRead = searchParams.get("is_read")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    let query = supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (isRead !== null) {
      query = query.eq("is_read", isRead === "true")
    }

    const { data: notifications, count, error } = await query

    if (error) {
      throw new AppError("Failed to fetch notifications", ErrorCode.DATABASE_ERROR, 500)
    }

    const { count: unreadCount } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false)

    return NextResponse.json({
      notifications: notifications || [],
      unread_count: unreadCount || 0,
      total: count || 0,
    })
  } catch (error) {
    return handleError(error, {
      endpoint: "/api/notifications",
      method: "GET",
    })
  }
}
