import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { withRateLimit, RATE_LIMITS } from "@/lib/security/with-rate-limit"
import { validateRequest } from "@/lib/validation/validator"
import { updateFDARegistrationPatchSchema } from "@/lib/validation/schemas"
import { handleError, AppError, ErrorCode } from "@/lib/security/error-handler"
import { auditLog } from "@/lib/security/audit-logger"

export const GET = withRateLimit(async (request: Request) => {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new AppError("Authentication required", ErrorCode.UNAUTHORIZED, 401)
    }

    const { data: profile } = await supabase.from("profiles").select("role, organization_id").eq("id", user.id).single()

    if (!profile || !["admin", "system_admin"].includes(profile.role)) {
      throw new AppError("Only administrators can view FDA registrations", ErrorCode.FORBIDDEN, 403)
    }

    let query = supabase.from("organizations").select(
      `
        id, 
        organization_name, 
        organization_type, 
        fda_registration_number, 
        fda_registration_status, 
        fda_registration_date, 
        duns_number, 
        us_agent_name, 
        us_agent_email, 
        us_agent_phone, 
        poa_signed, 
        poa_signed_date
      `,
    )

    if (profile.role === "admin") {
      query = query.eq("id", profile.organization_id)
    }

    const { data, error } = await query.order("organization_name")

    if (error) {
      throw new AppError("Failed to fetch FDA registrations", ErrorCode.DATABASE_ERROR, 500)
    }

    return NextResponse.json(data || [])
  } catch (error) {
    return handleError(error, {
      endpoint: "/api/vexim/fda-registrations",
      method: "GET",
    })
  }
}, RATE_LIMITS.RELAXED)

export const PATCH = withRateLimit(async (request: Request) => {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new AppError("Authentication required", ErrorCode.UNAUTHORIZED, 401)
    }

    const bodyResponse = await validateRequest(updateFDARegistrationPatchSchema, await request.json())
    if (bodyResponse instanceof NextResponse) {
      return bodyResponse
    }

    // Ép kiểu 'as any' để tránh lỗi TS2339: Property 'organizationId' does not exist
    const body = bodyResponse.data as any
    const { organizationId, ...updates } = body

    const { data: profile } = await supabase.from("profiles").select("role, organization_id").eq("id", user.id).single()

    if (!profile) {
      throw new AppError("User profile not found", ErrorCode.NOT_FOUND, 404)
    }

    if (profile.role === "system_admin") {
      // System admin can update any organization
    } else if (profile.role === "admin" && profile.organization_id === organizationId) {
      // Org admin can update their own organization
    } else {
      throw new AppError("You do not have permission to update this FDA registration", ErrorCode.FORBIDDEN, 403)
    }

    const { data, error } = await supabase
      .from("organizations")
      .update(updates)
      .eq("id", organizationId)
      .select()
      .single()

    if (error) {
      throw new AppError("Failed to update FDA registration", ErrorCode.DATABASE_ERROR, 500)
    }

    await auditLog({
      action: "FDA_REGISTRATION_UPDATED",
      resource_type: "organization",
      resource_id: organizationId,
      user_id: user.id,
      organization_id: organizationId,
      severity: "HIGH",
      metadata: updates,
      request,
    })

    return NextResponse.json(data)
  } catch (error) {
    // Xử lý organizationId có thể là null/undefined để tránh lỗi kiểu dữ liệu trong handleError
    const bodyData = (error as any)?.body;
    return handleError(error, {
      organizationId: (bodyData?.organizationId) || undefined,
      endpoint: "/api/vexim/fda-registrations",
      method: "PATCH",
    })
  }
}, RATE_LIMITS.STANDARD)
