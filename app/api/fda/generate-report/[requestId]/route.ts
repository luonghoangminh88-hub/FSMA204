import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { withRateLimit, RATE_LIMITS } from "@/lib/security/with-rate-limit"
import { handleError, AppError, ErrorCode } from "@/lib/security/error-handler"
import { auditLog } from "@/lib/security/audit-logger"

// Next.js 15: Định nghĩa params là một Promise để tránh lỗi Type mismatch
export const GET = withRateLimit(async (request: NextRequest, { params }: { params: Promise<{ requestId: string }> }) => {
  try {
    const supabase = await createClient()
    
    // BẮT BUỘC: Await params trước khi sử dụng requestId
    const { requestId } = await params

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new AppError("Authentication required", ErrorCode.UNAUTHORIZED, 401)
    }

    // Kiểm tra định dạng UUID sử dụng biến requestId đã await
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId)) {
      throw new AppError("Invalid request ID format", ErrorCode.VALIDATION_ERROR, 400)
    }

    // Lấy chi tiết yêu cầu FDA
    const { data: fdaRequest, error: requestError } = await supabase
      .from("fda_requests")
      .select("*")
      .eq("id", requestId)
      .single()

    if (requestError || !fdaRequest) {
      throw new AppError("FDA request not found", ErrorCode.NOT_FOUND, 404)
    }

    const { data: profile } = await supabase.from("profiles").select("organization_id, role").eq("id", user.id).single()

    if (profile?.role !== "system_admin" && profile?.organization_id !== fdaRequest.organization_id) {
      throw new AppError("You do not have permission to access this FDA request", ErrorCode.FORBIDDEN, 403)
    }

    // Gọi database function (RPC) để tạo báo cáo
    const { data: report, error: reportError } = await supabase.rpc("generate_fda_traceability_report", {
      p_lot_codes: fdaRequest.requested_lot_codes,
      p_fda_request_id: requestId,
    })

    if (reportError) {
      throw new AppError("Failed to generate FDA report", ErrorCode.DATABASE_ERROR, 500)
    }

    // Cập nhật trạng thái yêu cầu FDA
    await supabase
      .from("fda_requests")
      .update({
        response_status: "completed",
        response_date: new Date().toISOString(),
      })
      .eq("id", requestId)

    // Ghi log bảo mật
    await auditLog({
      action: "FDA_REPORT_GENERATED",
      resource_type: "fda_request",
      resource_id: requestId,
      user_id: user.id,
      organization_id: fdaRequest.organization_id,
      severity: "CRITICAL",
      metadata: {
        lot_codes: fdaRequest.requested_lot_codes,
        request_date: fdaRequest.request_date,
      },
      request,
    })

    return NextResponse.json({
      success: true,
      report,
      generated_at: new Date().toISOString(),
    })
  } catch (error) {
    return handleError(error, {
      endpoint: "/api/fda/generate-report/[requestId]",
      method: "GET",
    })
  }
}, RATE_LIMITS.RELAXED)
