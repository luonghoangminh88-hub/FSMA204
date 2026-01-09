import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { withRateLimit, RATE_LIMITS } from "@/lib/security/with-rate-limit"
import { handleError, AppError, ErrorCode } from "@/lib/security/error-handler"
import { auditLog } from "@/lib/security/audit-logger"

export const POST = withRateLimit(async (request: NextRequest) => {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new AppError("Authentication required", ErrorCode.UNAUTHORIZED, 401)
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, organization_id, role")
      .eq("id", user.id)
      .single()

    if (!profile || !["system_admin", "admin", "manager"].includes(profile.role)) {
      throw new AppError("Only administrators and managers can initiate recalls", ErrorCode.FORBIDDEN, 403)
    }

    const body = await request.json()

    const {
      recall_type,
      recall_class,
      recall_reason,
      hazard_description,
      product_description,
      affected_lot_codes,
      distribution_pattern,
      public_notification_required,
    } = body

    if (!recall_type || !recall_class || !recall_reason || !hazard_description || !affected_lot_codes?.length) {
      throw new AppError("Missing required fields for recall initiation", ErrorCode.MISSING_REQUIRED_FIELD, 400)
    }

    if (!Array.isArray(affected_lot_codes) || affected_lot_codes.length === 0 || affected_lot_codes.length > 100) {
      throw new AppError("Affected lot codes must be array with 1-100 items", ErrorCode.VALIDATION_ERROR, 400)
    }

    // Generate recall number
    const year = new Date().getFullYear()
    const { data: orgData } = await supabase
      .from("organizations")
      .select("organization_name")
      .eq("id", profile.organization_id)
      .single()

    const orgCode = orgData?.organization_name.substring(0, 3).toUpperCase() || "ORG"

    // Get next recall number for this year
    const { data: lastRecall } = await supabase
      .from("recall_events")
      .select("recall_number")
      .eq("organization_id", profile.organization_id)
      .like("recall_number", `${orgCode}-${year}-%`)
      .order("recall_number", { ascending: false })
      .limit(1)
      .single()

    let nextNumber = 1
    if (lastRecall) {
      const parts = lastRecall.recall_number.split("-")
      nextNumber = Number.parseInt(parts[2]) + 1
    }

    const recallNumber = `${orgCode}-${year}-${String(nextNumber).padStart(3, "0")}`

    // Create recall event
    const { data: recall, error: recallError } = await supabase
      .from("recall_events")
      .insert({
        organization_id: profile.organization_id,
        recall_number: recallNumber,
        recall_type,
        recall_class,
        recall_reason,
        hazard_description,
        product_description,
        affected_lot_codes,
        distribution_pattern,
        public_notification_required,
        initiated_by: user.id,
      })
      .select()
      .single()

    if (recallError) {
      throw new AppError("Failed to create recall event", ErrorCode.DATABASE_ERROR, 500)
    }

    // Get affected lots and create recall_affected_lots records
    const { data: lots } = await supabase
      .from("traceability_lots")
      .select("id, lot_code, quantity, unit_of_measure")
      .in("lot_code", affected_lot_codes)
      .eq("organization_id", profile.organization_id)

    if (lots && lots.length > 0) {
      const affectedLots = lots.map((lot) => ({
        recall_id: recall.id,
        lot_id: lot.id,
        lot_code: lot.lot_code,
        quantity_produced: lot.quantity,
      }))

      await supabase.from("recall_affected_lots").insert(affectedLots)

      // Update lot status to recalled
      await supabase
        .from("traceability_lots")
        .update({ status: "recalled" })
        .in(
          "id",
          lots.map((l) => l.id),
        )
    }

    // Get downstream contacts using function
    const { data: downstreamData } = await supabase.rpc("get_recall_downstream_impact", {
      p_lot_codes: affected_lot_codes,
    })

    await auditLog({
      action: "RECALL_INITIATED",
      resource_type: "recall",
      resource_id: recall.id,
      user_id: user.id,
      organization_id: profile.organization_id,
      severity: "CRITICAL",
      metadata: {
        recall_number: recallNumber,
        recall_class,
        affected_lots_count: lots?.length || 0,
        public_notification: public_notification_required,
      },
      request,
    })

    return NextResponse.json({
      success: true,
      recall,
      downstream_contacts: downstreamData || [],
      affected_lots: lots || [],
    })
  } catch (error) {
    return handleError(error, {
      endpoint: "/api/recalls/initiate",
      method: "POST",
    })
  }
}, RATE_LIMITS.STANDARD)
