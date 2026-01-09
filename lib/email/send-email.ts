import { resend, EMAIL_CONFIG, type EmailTemplateType } from "./resend-client"
import {
  WelcomeEmail,
  PasswordResetEmail,
  FDARenewalReminderEmail,
  LotExpirationWarningEmail,
  RecallNotificationEmail,
  ComplianceAlertEmail,
  ReportReadyEmail,
} from "./templates"
import { createClient } from "@/lib/supabase/server"

interface SendEmailParams {
  to: string
  templateType: EmailTemplateType
  templateData: Record<string, any>
  language?: "en" | "vi"
  userId?: string
  organizationId?: string
}

// Get email subject based on template type and language
function getEmailSubject(templateType: EmailTemplateType, language: "en" | "vi"): string {
  const subjects: Record<EmailTemplateType, Record<"en" | "vi", string>> = {
    welcome: {
      en: "Welcome to VEXIM GLOBAL FSMA 204",
      vi: "Chào mừng đến với VEXIM GLOBAL FSMA 204",
    },
    password_reset: {
      en: "Reset Your Password - VEXIM GLOBAL",
      vi: "Đặt lại mật khẩu - VEXIM GLOBAL",
    },
    fda_renewal_reminder: {
      en: "FDA Registration Renewal Reminder",
      vi: "Nhắc nhở gia hạn đăng ký FDA",
    },
    fda_expiration_alert: {
      en: "URGENT: FDA Registration Expiring Soon",
      vi: "KHẨN: Đăng ký FDA sắp hết hạn",
    },
    lot_expiration_warning: {
      en: "Lot Expiration Warning",
      vi: "Cảnh báo lô hàng sắp hết hạn",
    },
    recall_notification: {
      en: "URGENT: Product Recall Notification",
      vi: "KHẨN: Thông báo thu hồi sản phẩm",
    },
    compliance_alert: {
      en: "Compliance Alert - Action Required",
      vi: "Cảnh báo tuân thủ - Yêu cầu hành động",
    },
    report_ready: {
      en: "Your Report is Ready - VEXIM GLOBAL",
      vi: "Báo cáo của bạn đã sẵn sàng - VEXIM GLOBAL",
    },
    user_invitation: {
      en: "You have been invited to VEXIM GLOBAL",
      vi: "Bạn được mời tham gia VEXIM GLOBAL",
    },
    organization_update: {
      en: "Organization Update - VEXIM GLOBAL",
      vi: "Cập nhật tổ chức - VEXIM GLOBAL",
    },
  }

  return subjects[templateType][language]
}

// Get email template HTML based on type
function getEmailTemplate(
  templateType: EmailTemplateType,
  templateData: Record<string, any>,
  language: "en" | "vi",
): string {
  const templates = {
    welcome: WelcomeEmail,
    password_reset: PasswordResetEmail,
    fda_renewal_reminder: FDARenewalReminderEmail,
    lot_expiration_warning: LotExpirationWarningEmail,
    recall_notification: RecallNotificationEmail,
    compliance_alert: ComplianceAlertEmail,
    report_ready: ReportReadyEmail,
    // Add more template mappings as needed
  }

  const TemplateComponent = templates[templateType as keyof typeof templates]
  if (!TemplateComponent) {
    throw new Error(`Template not found for type: ${templateType}`)
  }

  return TemplateComponent({ ...templateData, language })
}

// Main function to send email
export async function sendEmail({
  to,
  templateType,
  templateData,
  language = "en",
  userId,
  organizationId,
}: SendEmailParams) {
  const supabase = await createClient()

  try {
    if (!resend) {
      console.warn("[v0] Resend API key not configured. Email not sent to:", to)
      return {
        success: false,
        error: "Email service not configured. Please add RESEND_API_KEY environment variable.",
      }
    }

    // Get email subject
    const subject = getEmailSubject(templateType, language)

    // Log email attempt to database
    const { data: logData, error: logError } = await supabase.rpc("log_email", {
      p_to_email: to,
      p_subject: subject,
      p_template_type: templateType,
      p_user_id: userId || null,
      p_organization_id: organizationId || null,
      p_email_data: templateData,
      p_language: language,
    })

    if (logError) {
      console.error("[v0] Error logging email:", logError)
    }

    const logId = logData

    // Get email HTML template
    const html = getEmailTemplate(templateType, templateData, language)

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to,
      subject,
      html,
      replyTo: EMAIL_CONFIG.replyTo,
    })

    if (error) {
      console.error("[v0] Error sending email:", error)

      // Update email log with error
      if (logId) {
        await supabase.rpc("update_email_status", {
          p_log_id: logId,
          p_status: "failed",
          p_error_message: error.message,
        })
      }

      return { success: false, error: error.message }
    }

    // Update email log with success
    if (logId && data) {
      await supabase.rpc("update_email_status", {
        p_log_id: logId,
        p_status: "sent",
        p_resend_id: data.id,
      })
    }

    console.log("[v0] Email sent successfully:", data?.id)
    return { success: true, emailId: data?.id }
  } catch (error: any) {
    console.error("[v0] Unexpected error sending email:", error)
    return { success: false, error: error.message }
  }
}

// Helper function to send bulk emails (for recalls, notifications)
export async function sendBulkEmails(
  recipients: Array<{ email: string; userId?: string; data?: Record<string, any> }>,
  templateType: EmailTemplateType,
  baseTemplateData: Record<string, any>,
  language: "en" | "vi" = "en",
  organizationId?: string,
) {
  const results = await Promise.allSettled(
    recipients.map((recipient) =>
      sendEmail({
        to: recipient.email,
        templateType,
        templateData: { ...baseTemplateData, ...recipient.data },
        language,
        userId: recipient.userId,
        organizationId,
      }),
    ),
  )

  const successful = results.filter((r) => r.status === "fulfilled").length
  const failed = results.filter((r) => r.status === "rejected").length

  return { successful, failed, total: recipients.length }
}
