import { type NextRequest, NextResponse } from "next/server"
import { sendEmail } from "@/lib/email/send-email"
import { createClient } from "@/lib/supabase/server"
import { handleError, AppError, ErrorCode } from "@/lib/security/error-handler"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new AppError("Authentication required", ErrorCode.UNAUTHORIZED, 401)
    }

    const body = await request.json()
    const { to, templateType, templateData, language } = body

    if (!to || !templateType) {
      throw new AppError("Missing required fields: to, templateType", ErrorCode.MISSING_REQUIRED_FIELD, 400)
    }

    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

    const result = await sendEmail({
      to,
      templateType,
      templateData,
      language: language || "en",
      userId: user.id,
      organizationId: profile?.organization_id,
    })

    if (!result.success) {
      throw new AppError(result.error || "Failed to send email", ErrorCode.EXTERNAL_SERVICE_ERROR, 500)
    }

    return NextResponse.json({
      success: true,
      emailId: result.emailId,
    })
  } catch (error: any) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    return handleError(error, {
      userId: user?.id,
      endpoint: "/api/email/send",
      method: "POST",
    })
  }
}
