import type React from "react"
// Email templates with i18n support for VEXIM GLOBAL FSMA 204

export interface EmailTemplateProps {
  language: "en" | "vi"
  [key: string]: any
}

// Base email layout
export const EmailLayout = ({ children, language }: { children: React.ReactNode; language: "en" | "vi" }) => `
<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VEXIM GLOBAL</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px 20px; text-align: center; }
    .logo { font-size: 24px; font-weight: bold; color: #ffffff; margin: 0; }
    .subtitle { font-size: 12px; color: #d1fae5; margin: 5px 0 0 0; }
    .content { padding: 40px 30px; }
    .button { display: inline-block; padding: 12px 30px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .footer { background-color: #f9fafb; padding: 20px 30px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
    .alert { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
    .urgent { background-color: #fee2e2; border-left: 4px solid #ef4444; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">VEXIM GLOBAL</h1>
      <p class="subtitle">FSMA 204 Compliance Platform</p>
    </div>
    ${children}
    <div class="footer">
      <p>© 2025 VEXIM GLOBAL. All rights reserved.</p>
      <p>${language === "vi" ? "Email này được gửi từ hệ thống tuân thủ FSMA 204" : "This email was sent from FSMA 204 compliance system"}</p>
    </div>
  </div>
</body>
</html>
`

// Welcome email template
export const WelcomeEmail = ({ language, userName }: EmailTemplateProps) => {
  const content =
    language === "vi"
      ? {
          greeting: `Xin chào ${userName},`,
          title: "Chào mừng đến với VEXIM GLOBAL!",
          body: "Chúng tôi rất vui mừng chào đón bạn đến với nền tảng tuân thủ FSMA 204 hàng đầu. Hệ thống của chúng tôi giúp bạn quản lý truy xuất nguồn gốc, tuân thủ FDA và đảm bảo an toàn thực phẩm.",
          button: "Bắt đầu ngay",
          buttonUrl: "/dashboard",
        }
      : {
          greeting: `Hello ${userName},`,
          title: "Welcome to VEXIM GLOBAL!",
          body: "We are excited to welcome you to the leading FSMA 204 compliance platform. Our system helps you manage traceability, FDA compliance, and ensure food safety.",
          button: "Get Started",
          buttonUrl: "/dashboard",
        }

  return EmailLayout({
    language,
    children: `
      <div class="content">
        <p>${content.greeting}</p>
        <h2>${content.title}</h2>
        <p>${content.body}</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}${content.buttonUrl}" class="button">${content.button}</a>
      </div>
    `,
  })
}

// Password reset email template
export const PasswordResetEmail = ({ language, resetLink }: EmailTemplateProps) => {
  const content =
    language === "vi"
      ? {
          title: "Đặt lại mật khẩu",
          body: "Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhấp vào nút bên dưới để tạo mật khẩu mới.",
          button: "Đặt lại mật khẩu",
          expiry: "Link này sẽ hết hạn sau 1 giờ.",
          ignore: "Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.",
        }
      : {
          title: "Reset Your Password",
          body: "We received a request to reset your password. Click the button below to create a new password.",
          button: "Reset Password",
          expiry: "This link will expire in 1 hour.",
          ignore: "If you did not request a password reset, please ignore this email.",
        }

  return EmailLayout({
    language,
    children: `
      <div class="content">
        <h2>${content.title}</h2>
        <p>${content.body}</p>
        <a href="${resetLink}" class="button">${content.button}</a>
        <p style="font-size: 14px; color: #6b7280;">${content.expiry}</p>
        <p style="font-size: 14px; color: #6b7280;">${content.ignore}</p>
      </div>
    `,
  })
}

// FDA renewal reminder email template
export const FDARenewalReminderEmail = ({
  language,
  registrationNumber,
  expiryDate,
  daysRemaining,
}: EmailTemplateProps) => {
  const content =
    language === "vi"
      ? {
          title: "Nhắc nhở: Gia hạn đăng ký FDA",
          body: `Đăng ký FDA của bạn (#${registrationNumber}) sẽ hết hạn trong ${daysRemaining} ngày.`,
          expiryLabel: "Ngày hết hạn:",
          action: "Vui lòng gia hạn đăng ký của bạn để tránh gián đoạn dịch vụ và vi phạm tuân thủ.",
          button: "Gia hạn ngay",
          buttonUrl: "/dashboard/fda-compliance",
        }
      : {
          title: "Reminder: FDA Registration Renewal",
          body: `Your FDA registration (#${registrationNumber}) will expire in ${daysRemaining} days.`,
          expiryLabel: "Expiry Date:",
          action: "Please renew your registration to avoid service interruption and compliance violations.",
          button: "Renew Now",
          buttonUrl: "/dashboard/fda-compliance",
        }

  return EmailLayout({
    language,
    children: `
      <div class="content">
        <div class="alert">
          <h2 style="margin-top: 0;">${content.title}</h2>
          <p>${content.body}</p>
          <p><strong>${content.expiryLabel}</strong> ${new Date(expiryDate).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US")}</p>
        </div>
        <p>${content.action}</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}${content.buttonUrl}" class="button">${content.button}</a>
      </div>
    `,
  })
}

// Lot expiration warning email template
export const LotExpirationWarningEmail = ({
  language,
  lotCode,
  productName,
  expiryDate,
  daysRemaining,
}: EmailTemplateProps) => {
  const content =
    language === "vi"
      ? {
          title: "Cảnh báo: Lô hàng sắp hết hạn",
          body: `Lô hàng ${lotCode} sắp hết hạn sử dụng.`,
          product: "Sản phẩm:",
          expiry: "Ngày hết hạn:",
          remaining: "Còn lại:",
          days: "ngày",
          action: "Vui lòng xem xét và thực hiện hành động phù hợp.",
          button: "Xem chi tiết",
          buttonUrl: `/dashboard/traceability?lot=${lotCode}`,
        }
      : {
          title: "Warning: Lot Expiration",
          body: `Lot ${lotCode} is approaching expiration.`,
          product: "Product:",
          expiry: "Expiry Date:",
          remaining: "Days Remaining:",
          days: "days",
          action: "Please review and take appropriate action.",
          button: "View Details",
          buttonUrl: `/dashboard/traceability?lot=${lotCode}`,
        }

  return EmailLayout({
    language,
    children: `
      <div class="content">
        <div class="alert">
          <h2 style="margin-top: 0;">${content.title}</h2>
          <p><strong>${content.body}</strong></p>
          <p><strong>${content.product}</strong> ${productName}</p>
          <p><strong>${content.expiry}</strong> ${new Date(expiryDate).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US")}</p>
          <p><strong>${content.remaining}</strong> ${daysRemaining} ${content.days}</p>
        </div>
        <p>${content.action}</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}${content.buttonUrl}" class="button">${content.button}</a>
      </div>
    `,
  })
}

// Recall notification email template
export const RecallNotificationEmail = ({ language, recallId, reason, affectedLots }: EmailTemplateProps) => {
  const content =
    language === "vi"
      ? {
          title: "THÔNG BÁO KHẨN: Thu hồi sản phẩm",
          body: "Một sự kiện thu hồi sản phẩm đã được khởi tạo trong hệ thống của bạn.",
          recallLabel: "Mã thu hồi:",
          reasonLabel: "Lý do:",
          lotsLabel: "Số lô bị ảnh hưởng:",
          action: "Vui lòng xem chi tiết và thực hiện các bước cần thiết ngay lập tức.",
          button: "Xem chi tiết thu hồi",
          buttonUrl: "/dashboard/recalls",
        }
      : {
          title: "URGENT: Product Recall",
          body: "A product recall event has been initiated in your system.",
          recallLabel: "Recall ID:",
          reasonLabel: "Reason:",
          lotsLabel: "Affected Lots:",
          action: "Please review details and take necessary actions immediately.",
          button: "View Recall Details",
          buttonUrl: "/dashboard/recalls",
        }

  return EmailLayout({
    language,
    children: `
      <div class="content">
        <div class="alert urgent">
          <h2 style="margin-top: 0; color: #dc2626;">${content.title}</h2>
          <p>${content.body}</p>
          <p><strong>${content.recallLabel}</strong> ${recallId}</p>
          <p><strong>${content.reasonLabel}</strong> ${reason}</p>
          <p><strong>${content.lotsLabel}</strong> ${affectedLots}</p>
        </div>
        <p>${content.action}</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}${content.buttonUrl}" class="button" style="background-color: #dc2626;">${content.button}</a>
      </div>
    `,
  })
}

// Compliance alert email template
export const ComplianceAlertEmail = ({ language, alertType, message, score }: EmailTemplateProps) => {
  const content =
    language === "vi"
      ? {
          title: "Cảnh báo tuân thủ",
          body: "Điểm tuân thủ của bạn đã giảm xuống dưới ngưỡng.",
          scoreLabel: "Điểm hiện tại:",
          alertLabel: "Loại cảnh báo:",
          action: "Vui lòng xem xét và cải thiện các lĩnh vực cần chú ý.",
          button: "Xem báo cáo tuân thủ",
          buttonUrl: "/dashboard/compliance",
        }
      : {
          title: "Compliance Alert",
          body: "Your compliance score has dropped below threshold.",
          scoreLabel: "Current Score:",
          alertLabel: "Alert Type:",
          action: "Please review and improve areas of concern.",
          button: "View Compliance Report",
          buttonUrl: "/dashboard/compliance",
        }

  return EmailLayout({
    language,
    children: `
      <div class="content">
        <div class="alert">
          <h2 style="margin-top: 0;">${content.title}</h2>
          <p>${content.body}</p>
          <p><strong>${content.scoreLabel}</strong> ${score}%</p>
          <p><strong>${content.alertLabel}</strong> ${alertType}</p>
          <p>${message}</p>
        </div>
        <p>${content.action}</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}${content.buttonUrl}" class="button">${content.button}</a>
      </div>
    `,
  })
}

// Report ready email template
export const ReportReadyEmail = ({ language, reportType, reportPeriod, downloadUrl }: EmailTemplateProps) => {
  const content =
    language === "vi"
      ? {
          title: "Báo cáo của bạn đã sẵn sàng",
          body: `Báo cáo ${reportType} cho kỳ ${reportPeriod} đã được tạo thành công.`,
          action: "Bạn có thể tải xuống báo cáo của mình ngay bây giờ.",
          button: "Tải xuống báo cáo",
        }
      : {
          title: "Your Report is Ready",
          body: `The ${reportType} report for ${reportPeriod} has been generated successfully.`,
          action: "You can download your report now.",
          button: "Download Report",
        }

  return EmailLayout({
    language,
    children: `
      <div class="content">
        <h2>${content.title}</h2>
        <p>${content.body}</p>
        <p>${content.action}</p>
        <a href="${downloadUrl}" class="button">${content.button}</a>
      </div>
    `,
  })
}
