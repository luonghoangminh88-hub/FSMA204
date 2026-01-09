import { type NextRequest, NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { handleError, AppError, ErrorCode } from "@/lib/security/error-handler"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      throw new AppError("Authentication required", ErrorCode.UNAUTHORIZED, 401)
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (!profile || !["system_admin", "org_admin", "manager"].includes(profile.role)) {
      throw new AppError("Insufficient permissions to reject items", ErrorCode.FORBIDDEN, 403)
    }

    const { itemId, approvalType, reason } = await request.json()

    if (!itemId || !approvalType || !reason) {
      throw new AppError(
        "Missing required fields: itemId, approvalType, and reason",
        ErrorCode.MISSING_REQUIRED_FIELD,
        400,
      )
    }

    const { data, error } = await supabase.rpc("reject_item", {
      p_item_id: itemId,
      p_approver_id: user.id,
      p_approval_type: approvalType,
      p_rejection_reason: reason,
    })

    if (error) throw error

    if (!data.success) {
      throw new AppError(data.message || "Rejection operation failed", ErrorCode.OPERATION_FAILED, 400)
    }

    return NextResponse.json({ success: true, message: data.message })
  } catch (error: any) {
    return handleError(error, {
      endpoint: "/api/approvals/reject",
      method: "POST",
    })
  }
}
