import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { createNotification } from "@/lib/create-notification"
import { withRateLimit, RATE_LIMITS } from "@/lib/security/with-rate-limit"
import { validateRequest } from "@/lib/validation/validator"
import { updateFDARegistrationSchema } from "@/lib/validation/schemas"
import { handleError, AppError, ErrorCode } from "@/lib/security/error-handler"
import { auditLog } from "@/lib/security/audit-logger"

export const POST = withRateLimit(async (request: Request) => {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new AppError("Authentication required", ErrorCode.UNAUTHORIZED, 401)
    }

    const bodyResponse = await validateRequest(updateFDARegistrationSchema, await request.json())
    if (bodyResponse instanceof NextResponse) {
      return bodyResponse
    }
    const body = bodyResponse.data as any

    const {
      organization_id,
      fda_registration_number,
      duns_number,
      fda_registration_status,
      fda_registration_date,
      poa_signed,
      poa_signed_date,
      us_agent_name,
      us_agent_company,
      us_agent_email,
      us_agent_phone,
      us_agent_address,
      us_agent_city,
      us_agent_state,
      us_agent_postal_code,
      contract_duration,
    } = body

    const { data: profile } = await supabase.from("profiles").select("organization_id, role").eq("id", user.id).single()

    if (!profile || profile.organization_id !== organization_id) {
      throw new AppError("You do not have permission to register FDA for this organization", ErrorCode.FORBIDDEN, 403)
    }

    if (!["admin", "system_admin"].includes(profile.role)) {
      throw new AppError("Only administrators can register FDA", ErrorCode.FORBIDDEN, 403)
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    // Add FDA fields if provided
    if (fda_registration_number !== undefined) updateData.fda_registration_number = fda_registration_number
    if (duns_number !== undefined) updateData.duns_number = duns_number
    if (fda_registration_status !== undefined) updateData.fda_registration_status = fda_registration_status || "active"
    if (fda_registration_date !== undefined) updateData.fda_registration_date = fda_registration_date
    if (poa_signed !== undefined) updateData.poa_signed = poa_signed
    if (poa_signed_date !== undefined) updateData.poa_signed_date = poa_signed_date

    // Add U.S. Agent fields if provided
    if (us_agent_name !== undefined) updateData.us_agent_name = us_agent_name
    if (us_agent_company !== undefined) updateData.us_agent_company = us_agent_company
    if (us_agent_email !== undefined) updateData.us_agent_email = us_agent_email
    if (us_agent_phone !== undefined) updateData.us_agent_phone = us_agent_phone
    if (us_agent_address !== undefined) updateData.us_agent_address = us_agent_address
    if (us_agent_city !== undefined) updateData.us_agent_city = us_agent_city
    if (us_agent_state !== undefined) updateData.us_agent_state = us_agent_state
    if (us_agent_postal_code !== undefined) updateData.us_agent_postal_code = us_agent_postal_code

    if (fda_registration_date !== undefined) {
      updateData.agent_contract_start_date = fda_registration_date
    }
    if (contract_duration !== undefined) {
      const years = Number.parseInt(contract_duration)
      if (!isNaN(years) && [1, 2, 5].includes(years)) {
        updateData.agent_contract_years = years
      }
    }

    const { error: updateError } = await supabase.from("organizations").update(updateData).eq("id", organization_id)

    if (updateError) {
      throw new AppError("Failed to update FDA registration", ErrorCode.DATABASE_ERROR, 500)
    }

    await auditLog({
      action: "FDA_REGISTRATION_CREATED",
      resource_type: "organization",
      resource_id: organization_id,
      user_id: user.id,
      organization_id: organization_id,
      severity: "CRITICAL",
      metadata: {
        fda_registration_number,
        duns_number,
        us_agent_name,
        poa_signed,
      },
      request,
    })

    await createNotification({
      userId: user.id,
      organizationId: organization_id,
      type: "fda_registration_success",
      title: "FDA Registration Successful",
      message: `Your FDA registration has been completed successfully. Registration number: ${fda_registration_number || "pending"}`,
      link: "/dashboard/fda-compliance",
      priority: "high",
    })

    return NextResponse.json({ success: true, message: "FDA registration successful" })
  } catch (error) {
    return handleError(error, {
      endpoint: "/api/vexim/register-fda",
      method: "POST",
    })
  }
}, RATE_LIMITS.STANDARD)
