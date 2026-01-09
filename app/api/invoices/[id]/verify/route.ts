import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { sendEmail } from "@/lib/email/send-email"
import { handleError, AppError, ErrorCode } from "@/lib/security/error-handler"
import { createAuditLog, AuditAction, AuditSeverity, getRequestMetadata } from "@/lib/security/audit-logger"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id: invoiceId } = await params

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new AppError("Authentication required", ErrorCode.UNAUTHORIZED, 401)
    }

    const { data: profile } = await supabase.from("profiles").select("role, organization_id").eq("id", user.id).single()

    if (!profile || !["system_admin", "org_admin"].includes(profile.role)) {
      throw new AppError("Admin access required to verify invoices", ErrorCode.FORBIDDEN, 403)
    }

    const body = await request.json()
    const { transactionId, notes } = body

    const { data: invoice } = await supabase
      .from("invoices")
      .select(`
        *,
        organization_id,
        subscription:organization_subscriptions(
          id,
          subscription_status,
          organization_id
        )
      `)
      .eq("id", invoiceId)
      .single()

    if (!invoice) {
      throw new AppError("Invoice not found", ErrorCode.NOT_FOUND, 404)
    }

    const { data: transaction, error: transactionError } = await supabase
      .from("payment_transactions")
      .update({
        status: "verified",
        verified_by: user.id,
        verified_at: new Date().toISOString(),
        verification_notes: notes,
      })
      .eq("id", transactionId)
      .select()
      .single()

    if (transactionError) {
      throw new AppError("Failed to verify transaction", ErrorCode.DATABASE_ERROR, 500)
    }

    const isUpgradeOrDowngrade =
      invoice.subscription?.subscription_status === "pending_upgrade" ||
      invoice.subscription?.subscription_status === "pending_downgrade"

    if (isUpgradeOrDowngrade) {
      const { error: cancelError } = await supabase
        .from("organization_subscriptions")
        .update({
          subscription_status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", invoice.subscription.organization_id)
        .eq("subscription_status", "active")

      if (cancelError) {
        console.error("[v0] Error cancelling old subscription:", cancelError)
      }
    }

    const { error: markPaidError } = await supabase.rpc("mark_invoice_paid", {
      p_invoice_id: invoiceId,
      p_verified_by: user.id,
    })

    if (markPaidError) {
      throw new AppError("Failed to mark invoice as paid", ErrorCode.DATABASE_ERROR, 500)
    }

    if (invoice.subscription?.id) {
      const { error: activateError } = await supabase
        .from("organization_subscriptions")
        .update({
          subscription_status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoice.subscription.id)

      if (activateError) {
        throw new AppError("Failed to activate subscription", ErrorCode.DATABASE_ERROR, 500)
      }
    }

    await createAuditLog({
      action: AuditAction.INVOICE_VERIFY,
      severity: AuditSeverity.HIGH,
      userId: user.id,
      organizationId: invoice.organization_id,
      tableName: "invoices",
      recordId: invoiceId,
      metadata: {
        transaction_id: transactionId,
        amount: invoice.total_amount,
        notes,
        is_upgrade_downgrade: isUpgradeOrDowngrade,
      },
      ...getRequestMetadata(request),
    })

    const { data: invoiceDetails } = await supabase
      .from("invoices")
      .select(`
        *,
        organization:organizations(organization_name),
        subscription:organization_subscriptions(*)
      `)
      .eq("id", invoiceId)
      .single()

    if (invoiceDetails) {
      const { data: owner } = await supabase
        .from("profiles")
        .select("email, language")
        .eq("organization_id", invoiceDetails.organization_id)
        .eq("role", "org_admin")
        .single()

      if (owner) {
        await sendEmail({
          to: owner.email,
          templateType: "organization_update",
          templateData: {
            organizationName: invoiceDetails.organization.organization_name,
            message:
              owner.language === "vi"
                ? `Thanh toán cho hóa đơn ${invoiceDetails.invoice_number} đã được xác nhận. Dịch vụ của bạn đã được kích hoạt.`
                : `Payment for invoice ${invoiceDetails.invoice_number} has been confirmed. Your service has been activated.`,
            invoiceNumber: invoiceDetails.invoice_number,
            amount: invoiceDetails.total_amount,
            currency: invoiceDetails.currency,
          },
          language: owner.language as "en" | "vi",
          organizationId: invoiceDetails.organization_id,
        })
      }
    }

    return NextResponse.json({ success: true, transaction, is_upgrade_downgrade: isUpgradeOrDowngrade })
  } catch (error: any) {
    return handleError(error, {
      endpoint: "/api/invoices/[id]/verify",
      method: "POST",
    })
  }
}
