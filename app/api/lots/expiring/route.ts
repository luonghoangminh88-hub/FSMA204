import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { withRateLimit, RATE_LIMITS } from "@/lib/security/with-rate-limit"
import { handleError, AppError, ErrorCode } from "@/lib/security/error-handler"

export const GET = withRateLimit(async (request: Request) => {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new AppError("Authentication required", ErrorCode.UNAUTHORIZED, 401)
    }

    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

    if (!profile?.organization_id) {
      throw new AppError("Organization not found", ErrorCode.NOT_FOUND, 404)
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    const validStatuses = ["expired", "expiring_soon", "expiring_month", "all"]
    if (status && !validStatuses.includes(status)) {
      throw new AppError("Invalid status parameter", ErrorCode.VALIDATION_ERROR, 400)
    }

    // Query the expiration alerts view
    let query = supabase.from("lot_expiration_alerts").select("*").eq("organization_id", profile.organization_id)

    if (status && status !== "all") {
      query = query.eq("expiration_status", status)
    }

    const { data, error } = await query.order("expiration_date", { ascending: true })

    if (error) {
      throw new AppError("Failed to fetch expiring lots", ErrorCode.DATABASE_ERROR, 500)
    }

    return NextResponse.json({ lots: data })
  } catch (error) {
    return handleError(error, {
      endpoint: "/api/lots/expiring",
      method: "GET",
    })
  }
}, RATE_LIMITS.RELAXED)
