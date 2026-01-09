import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { withRateLimit, RATE_LIMITS } from "@/lib/security/with-rate-limit"
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

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "system_admin") {
      throw new AppError("System administrator access required", ErrorCode.FORBIDDEN, 403)
    }

    const { data: invoices, error } = await supabase
      .from("invoices")
      .select(
        `
        id,
        invoice_number,
        invoice_date,
        due_date,
        total_amount,
        currency,
        status,
        payment_proof_url,
        paid_at,
        organization_subscriptions!inner(
          organization:organizations(
            id,
            organization_name
          )
        )
      `,
      )
      .order("invoice_date", { ascending: false })

    if (error) {
      throw new AppError("Failed to fetch invoices", ErrorCode.DATABASE_ERROR, 500)
    }

    const formattedInvoices = invoices?.map((inv: any) => ({
      ...inv,
      organization: inv.organization_subscriptions.organization,
      organization_subscriptions: undefined,
    }))

    await auditLog({
      action: "ADMIN_INVOICES_ACCESSED",
      resource_type: "invoice",
      resource_id: null,
      user_id: user.id,
      organization_id: null,
      severity: "MEDIUM",
      metadata: {
        invoice_count: formattedInvoices?.length || 0,
      },
      request,
    })

    return NextResponse.json({ invoices: formattedInvoices })
  } catch (error) {
    return handleError(error, {
      endpoint: "/api/admin/invoices",
      method: "GET",
    })
  }
}, RATE_LIMITS.RELAXED)
