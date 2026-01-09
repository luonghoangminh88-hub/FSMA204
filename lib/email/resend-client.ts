import { Resend } from "resend"

// Initialize Resend client conditionally
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export { resend }

// Email configuration
export const EMAIL_CONFIG = {
  from: "VEXIM GLOBAL <noreply@veximglobal.com>",
  replyTo: "support@veximglobal.com",
} as const

// Email template types
export type EmailTemplateType =
  | "welcome"
  | "password_reset"
  | "fda_renewal_reminder"
  | "fda_expiration_alert"
  | "lot_expiration_warning"
  | "recall_notification"
  | "compliance_alert"
  | "report_ready"
  | "user_invitation"
  | "organization_update"
