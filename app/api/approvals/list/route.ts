import { type NextRequest, NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { withRateLimit, RATE_LIMITS } from "@/lib/security/with-rate-limit"
import { handleError, AppError, ErrorCode } from "@/lib/security/error-handler"

export const GET = withRateLimit(async (request: NextRequest) => {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      throw new AppError("Authentication required", ErrorCode.UNAUTHORIZED, 401)
    }

    const { data: profile } = await supabase.from("profiles").select("organization_id, role").eq("id", user.id).single()

    if (!profile?.organization_id) {
      throw new AppError("Organization not found", ErrorCode.NOT_FOUND, 404)
    }

    if (!["manager", "admin", "system_admin"].includes(profile.role)) {
      throw new AppError("Only managers and administrators can view approvals", ErrorCode.FORBIDDEN, 403)
    }

    const { data: approvals, error } = await supabase
      .from("pending_approvals_dashboard")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .order("urgency", { ascending: false })
      .order("hours_pending", { ascending: false })

    if (error) {
      throw new AppError("Failed to fetch approvals", ErrorCode.DATABASE_ERROR, 500)
    }

    return NextResponse.json({ approvals })
  } catch (error) {
    return handleError(error, {
      endpoint: "/api/approvals/list",
      method: "GET",
    })
  }
}, RATE_LIMITS.RELAXED)
