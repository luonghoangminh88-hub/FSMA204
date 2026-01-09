import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { withRateLimit, RATE_LIMITS } from "@/lib/security/with-rate-limit"
import { handleError, AppError, ErrorCode } from "@/lib/security/error-handler"

export const dynamic = "force-dynamic"

export const GET = withRateLimit(async (req: NextRequest) => {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new AppError("Authentication required", ErrorCode.UNAUTHORIZED, 401)
    }

    const { data: profile } = await supabase.from("profiles").select("organization_id, role").eq("id", user.id).single()

    if (!profile?.organization_id) {
      throw new AppError("Organization not found", ErrorCode.NOT_FOUND, 404)
    }

    if (!["admin", "system_admin"].includes(profile.role)) {
      throw new AppError("Only administrators can view audit logs", ErrorCode.FORBIDDEN, 403)
    }

    const { searchParams } = new URL(req.url)
    const limitParam = searchParams.get("limit")
    const limit = limitParam ? Math.min(Math.max(Number.parseInt(limitParam), 1), 1000) : 100

    // Fetch audit logs
    const { data: logs, error } = await supabase
      .from("audit_log")
      .select(
        `
        *,
        profiles!audit_log_user_id_fkey(full_name)
      `,
      )
      .eq("organization_id", profile.organization_id)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      throw new AppError("Failed to fetch audit logs", ErrorCode.DATABASE_ERROR, 500)
    }

    const formattedLogs = logs?.map((log) => ({
      id: log.id,
      table_name: log.table_name,
      operation: log.operation,
      old_data: log.old_data,
      new_data: log.new_data,
      user_id: log.user_id,
      user_name: log.profiles?.full_name || "Unknown User",
      created_at: log.created_at,
    }))

    return NextResponse.json({ logs: formattedLogs || [] })
  } catch (error) {
    return handleError(error, {
      endpoint: "/api/audit-logs",
      method: "GET",
    })
  }
}, RATE_LIMITS.RELAXED)
