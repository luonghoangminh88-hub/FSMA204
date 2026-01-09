import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { withRateLimit, RATE_LIMITS } from "@/lib/security/with-rate-limit"
import { handleError, AppError, ErrorCode } from "@/lib/security/error-handler"

export const dynamic = "force-dynamic"

export const POST = withRateLimit(async (req: NextRequest) => {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new AppError("Authentication required", ErrorCode.UNAUTHORIZED, 401)
    }

    const { data, error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("is_read", false)
      .select()

    if (error) {
      throw new AppError("Failed to mark notifications as read", ErrorCode.DATABASE_ERROR, 500)
    }

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
    })
  } catch (error) {
    return handleError(error, {
      endpoint: "/api/notifications/mark-all-read",
      method: "POST",
    })
  }
}, RATE_LIMITS.STANDARD)
