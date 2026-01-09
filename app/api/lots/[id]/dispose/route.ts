import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { handleError, AppError, ErrorCode } from "@/lib/security/error-handler"

// Next.js 15 yêu cầu params phải được định nghĩa dưới dạng Promise
export async function POST(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // PHẢI await params trước khi lấy id
    const { id } = await params

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new AppError("Authentication required", ErrorCode.UNAUTHORIZED, 401)
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single()

    if (!profile || !["system_admin", "org_admin", "manager"].includes(profile.role)) {
      throw new AppError("Insufficient permissions to dispose lots", ErrorCode.FORBIDDEN, 403)
    }

    const body = await request.json()
    const { quantity, reason, method, notes } = body

    if (!quantity || !reason || !method) {
      throw new AppError("Missing required fields: quantity, reason, method", ErrorCode.MISSING_REQUIRED_FIELD, 400)
    }

    // Sử dụng biến id đã được await ở trên
    const { data, error } = await supabase.rpc("dispose_lot", {
      p_lot_id: id,
      p_quantity: quantity,
      p_reason: reason,
      p_method: method,
      p_notes: notes || null,
      p_user_id: user.id,
    })

    if (error) {
      throw new AppError("Failed to dispose lot", ErrorCode.DATABASE_ERROR, 500)
    }

    const result = typeof data === "string" ? JSON.parse(data) : data

    if (!result.success) {
      throw new AppError(result.error || "Disposal operation failed", ErrorCode.OPERATION_FAILED, 400)
    }

    return NextResponse.json(result)
  } catch (error: any) {
    return handleError(error, {
      endpoint: "/api/lots/[id]/dispose",
      method: "POST",
    })
  }
}
