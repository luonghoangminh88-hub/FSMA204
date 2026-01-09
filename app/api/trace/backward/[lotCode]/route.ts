import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { withRateLimit, RATE_LIMITS } from "@/lib/security/with-rate-limit"
import { handleError, AppError, ErrorCode } from "@/lib/security/error-handler"
import { auditLog } from "@/lib/security/audit-logger"

export const dynamic = "force-dynamic"

export const GET = withRateLimit(async (request: NextRequest, { params }: { params: Promise<{ lotCode: string }> }) => {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new AppError("Authentication required", ErrorCode.UNAUTHORIZED, 401)
    }

    const { lotCode } = await params
    const trimmedLotCode = lotCode.trim()

    if (!trimmedLotCode || trimmedLotCode.length > 100) {
      throw new AppError("Invalid lot code format", ErrorCode.VALIDATION_ERROR, 400)
    }

    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

    if (!profile?.organization_id) {
      throw new AppError("Organization not found", ErrorCode.NOT_FOUND, 404)
    }

    // Call the backward trace function
    const { data, error } = await supabase.rpc("trace_backward", {
      p_lot_code: trimmedLotCode,
      p_organization_id: profile.organization_id,
    })

    if (error) {
      throw new AppError("Failed to trace backward", ErrorCode.DATABASE_ERROR, 500)
    }

    await auditLog({
      action: "TRACEABILITY_QUERY",
      resource_type: "lot",
      resource_id: trimmedLotCode,
      user_id: user.id,
      organization_id: profile.organization_id,
      severity: "MEDIUM",
      metadata: {
        direction: "backward",
        results_count: data?.length || 0,
      },
      request,
    })

    return NextResponse.json({ data, direction: "backward" })
  } catch (error) {
    return handleError(error, { endpoint: "trace backward" })
  }
}, RATE_LIMITS.RELAXED)
