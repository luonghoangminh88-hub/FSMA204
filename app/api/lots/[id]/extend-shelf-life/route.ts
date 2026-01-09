import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { withRateLimit, RATE_LIMITS } from "@/lib/security/with-rate-limit"
import { validateRequest } from "@/lib/validation/validator"
import { extendShelfLifeSchema } from "@/lib/validation/schemas"
import { handleError, AppError, ErrorCode } from "@/lib/security/error-handler"
import { auditLog } from "@/lib/security/audit-logger"

// Next.js 15 yêu cầu params phải được bọc trong Promise
export const POST = withRateLimit(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const supabase = await createClient()
    
    // Phải await params trước khi sử dụng id (Lỗi Next.js 15)
    const { id } = await params;

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new AppError("Authentication required", ErrorCode.UNAUTHORIZED, 401)
    }

    // Kiểm tra định dạng ID sử dụng biến id đã await
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new AppError("Invalid lot ID format", ErrorCode.VALIDATION_ERROR, 400)
    }

    const bodyResponse = await validateRequest(extendShelfLifeSchema, await request.json())

    if (bodyResponse instanceof NextResponse) {
      return bodyResponse
    }

    // Ép kiểu 'as any' để TypeScript cho phép lấy dữ liệu từ kết quả validation
    const { new_expiration_date, reason, justification } = bodyResponse.data as any

    const { data: profile } = await supabase.from("profiles").select("id, role").eq("id", user.id).single()

    if (!profile || !["system_admin", "admin", "manager"].includes(profile.role)) {
      throw new AppError("Only administrators and managers can extend shelf life", ErrorCode.FORBIDDEN, 403)
    }

    // Gọi Database Function (RPC) với biến id
    const { data, error } = await supabase.rpc("extend_lot_shelf_life", {
      p_lot_id: id,
      p_new_expiration_date: new_expiration_date,
      p_reason: reason,
      p_justification: justification || null,
      p_user_id: user.id,
    })

    if (error) {
      throw new AppError("Failed to extend shelf life", ErrorCode.DATABASE_ERROR, 500)
    }

    // Xử lý kết quả trả về từ Postgres
    const result = typeof data === "string" ? JSON.parse(data) : data

    if (!result.success) {
      throw new AppError(result.error, ErrorCode.VALIDATION_ERROR, 400)
    }

    // Ghi log hoạt động với resource_id là id
    await auditLog({
      action: "LOT_SHELF_LIFE_EXTENDED",
      resource_type: "lot",
      resource_id: id,
      user_id: user.id,
      organization_id: result.organization_id,
      severity: "MEDIUM",
      metadata: {
        new_expiration_date,
        reason,
        old_expiration_date: result.old_expiration_date,
      },
      request,
    })

    return NextResponse.json(result)
  } catch (error) {
    return handleError(error, {
      endpoint: "/api/lots/[id]/extend-shelf-life",
      method: "POST",
    })
  }
}, RATE_LIMITS.STANDARD)
