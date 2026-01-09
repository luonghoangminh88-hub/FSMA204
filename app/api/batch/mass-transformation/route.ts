import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { withRateLimit, RATE_LIMITS } from "@/lib/security/with-rate-limit"
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

    const { data: profile } = await supabase.from("profiles").select("organization_id, role").eq("id", user.id).single()

    if (!profile?.organization_id) {
      throw new AppError("Organization not found", ErrorCode.NOT_FOUND, 404)
    }

    if (!["manager", "admin", "system_admin"].includes(profile.role)) {
      throw new AppError("Only managers and administrators can perform mass transformations", ErrorCode.FORBIDDEN, 403)
    }

    const body = await request.json()
    const {
      organization_id,
      input_lots,
      transformation_type,
      transformation_description,
      output_product_description,
      outputs_to_create,
      total_output_quantity,
      output_unit,
      location_id,
      transformation_date,
    } = body

    if (
      !organization_id ||
      !input_lots ||
      !transformation_type ||
      !outputs_to_create ||
      !total_output_quantity ||
      !location_id
    ) {
      throw new AppError("Missing required fields", ErrorCode.MISSING_REQUIRED_FIELD, 400)
    }

    if (organization_id !== profile.organization_id) {
      throw new AppError("Cannot perform transformation for another organization", ErrorCode.FORBIDDEN, 403)
    }

    if (!Array.isArray(input_lots) || input_lots.length === 0 || input_lots.length > 100) {
      throw new AppError("Input lots must be array with 1-100 items", ErrorCode.VALIDATION_ERROR, 400)
    }

    if (typeof outputs_to_create !== "number" || outputs_to_create < 1 || outputs_to_create > 1000) {
      throw new AppError("Invalid outputs_to_create value (must be 1-1000)", ErrorCode.VALIDATION_ERROR, 400)
    }

    // Call the database function
    const { data, error } = await supabase.rpc("create_mass_transformation", {
      p_organization_id: organization_id,
      p_input_lots: input_lots,
      p_transformation_type: transformation_type,
      p_transformation_description: transformation_description || "",
      p_output_product_description: output_product_description,
      p_outputs_to_create: outputs_to_create,
      p_total_output_quantity: total_output_quantity,
      p_output_unit: output_unit,
      p_location_id: location_id,
      p_transformation_date: transformation_date || new Date().toISOString().split("T")[0],
    })

    if (error) {
      throw new AppError("Failed to perform mass transformation", ErrorCode.DATABASE_ERROR, 500)
    }

    await auditLog({
      action: "MASS_TRANSFORMATION",
      resource_type: "batch_operation",
      resource_id: location_id,
      user_id: user.id,
      organization_id: organization_id,
      severity: "HIGH",
      metadata: {
        input_lots_count: input_lots.length,
        outputs_created: data?.length || 0,
        transformation_type,
        total_output_quantity,
      },
      request,
    })

    return NextResponse.json({
      success: true,
      output_lots_created: data?.length || 0,
      output_lots: data,
    })
  } catch (error) {
    return handleError(error, {
      endpoint: "/api/batch/mass-transformation",
      method: "POST",
    })
  }
}, RATE_LIMITS.STANDARD)
