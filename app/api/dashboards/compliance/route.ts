import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { withRateLimit, RATE_LIMITS } from "@/lib/security/with-rate-limit"
import { handleError, AppError, ErrorCode } from "@/lib/security/error-handler"

export const GET = withRateLimit(async (request: Request) => {
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

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get("organizationId")

    let query = supabase.from("compliance_dashboard").select("*")

    if (organizationId) {
      if (profile.role === "system_admin") {
        query = query.eq("organization_id", organizationId)
      } else if (profile.organization_id === organizationId) {
        query = query.eq("organization_id", organizationId)
      } else {
        throw new AppError("Cannot access compliance data for another organization", ErrorCode.FORBIDDEN, 403)
      }
    } else {
      query = query.eq("organization_id", profile.organization_id)
    }

    const { data, error } = await query.order("overall_compliance_score", { ascending: false })

    if (error) {
      throw new AppError("Failed to fetch compliance dashboard", ErrorCode.DATABASE_ERROR, 500)
    }

    return NextResponse.json({
      success: true,
      data,
      calculated_at: new Date().toISOString(),
    })
  } catch (error) {
    return handleError(error, {
      endpoint: "/api/dashboards/compliance",
      method: "GET",
    })
  }
}, RATE_LIMITS.RELAXED)
