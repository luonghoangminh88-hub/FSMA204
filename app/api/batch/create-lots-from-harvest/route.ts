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
      throw new AppError("Only managers and administrators can create batch lots", ErrorCode.FORBIDDEN, 403)
    }

    const body = await request.json()
    const { harvest_event_id, lot_prefix, lots_to_create, organization_id } = body

    if (!harvest_event_id || !lots_to_create || !organization_id) {
      throw new AppError("Missing required fields", ErrorCode.MISSING_REQUIRED_FIELD, 400)
    }

    if (organization_id !== profile.organization_id) {
      throw new AppError("Cannot create lots for another organization", ErrorCode.FORBIDDEN, 403)
    }

    if (typeof lots_to_create !== "number" || lots_to_create < 1 || lots_to_create > 1000) {
      throw new AppError("Invalid lots_to_create value (must be 1-1000)", ErrorCode.VALIDATION_ERROR, 400)
    }

    // Call the database function
    const { data, error } = await supabase.rpc("create_lots_from_harvest_batch", {
      p_harvest_event_id: harvest_event_id,
      p_lot_prefix: lot_prefix || "BATCH",
      p_lots_to_create: lots_to_create,
      p_organization_id: organization_id,
    })

    if (error) {
      throw new AppError("Failed to create batch lots", ErrorCode.DATABASE_ERROR, 500)
    }

    await auditLog({
      action: "BATCH_LOTS_CREATED",
      resource_type: "batch_operation",
      resource_id: harvest_event_id,
      user_id: user.id,
      organization_id: organization_id,
      severity: "HIGH",
      metadata: {
        lots_created: data?.length || 0,
        lot_prefix,
        harvest_event_id,
      },
      request,
    })

    return NextResponse.json({
      success: true,
      lots_created: data?.length || 0,
      lots: data,
    })
  } catch (error) {
    return handleError(error, {
      endpoint: "/api/batch/create-lots-from-harvest",
      method: "POST",
    })
  }
}, RATE_LIMITS.STANDARD)
