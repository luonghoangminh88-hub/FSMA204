// Invoice PDF Generator for Vietnamese market
// Using simple HTML template approach (can upgrade to react-pdf later)

export interface InvoiceData {
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  organizationName: string
  organizationAddress?: string
  organizationTaxId?: string
  billingPeriodStart: string
  billingPeriodEnd: string
  lineItems: Array<{
    description: string
    period?: string
    quantity: number
    unitPrice: number
    amount: number
  }>
  subtotal: number
  taxRate: number
  taxAmount: number
  totalAmount: number
  currency: string
  totalAmountUsd?: number
  bankInfo: {
    bankName: string
    accountNumber: string
    accountName: string
    branch: string
    swift?: string
  }
  language: "en" | "vi"
}

export function generateInvoiceHTML(data: InvoiceData): string {
  const isVN = data.language === "vi"

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === "VND") {
      return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
      }).format(amount)
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${isVN ? "Hóa đơn" : "Invoice"} ${data.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Arial', sans-serif; font-size: 14px; line-height: 1.6; color: #333; padding: 40px; }
    .invoice-container { max-width: 800px; margin: 0 auto; background: white; }
    .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #10b981; }
    .logo { font-size: 28px; font-weight: bold; color: #10b981; }
    .logo-sub { font-size: 12px; color: #666; margin-top: 5px; }
    .invoice-info { text-align: right; }
    .invoice-info h1 { font-size: 32px; color: #333; margin-bottom: 10px; }
    .invoice-info p { color: #666; margin: 3px 0; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .party { flex: 1; }
    .party h3 { font-size: 12px; text-transform: uppercase; color: #10b981; margin-bottom: 10px; letter-spacing: 1px; }
    .party p { margin: 5px 0; color: #666; }
    .party strong { color: #333; display: block; font-size: 16px; margin-bottom: 5px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #f9fafb; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #666; border-bottom: 2px solid #e5e7eb; }
    td { padding: 15px 12px; border-bottom: 1px solid #e5e7eb; }
    .text-right { text-align: right; }
    .totals { margin-left: auto; width: 350px; }
    .totals-row { display: flex; justify-content: space-between; padding: 10px 0; }
    .totals-row.subtotal { color: #666; }
    .totals-row.tax { color: #666; border-bottom: 1px solid #e5e7eb; padding-bottom: 15px; }
    .totals-row.total { font-size: 20px; font-weight: bold; color: #10b981; padding-top: 15px; }
    .payment-instructions { background: #f9fafb; padding: 25px; border-radius: 8px; margin-top: 40px; }
    .payment-instructions h3 { font-size: 16px; color: #10b981; margin-bottom: 15px; }
    .bank-details { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .bank-detail { }
    .bank-detail label { font-size: 11px; text-transform: uppercase; color: #666; display: block; margin-bottom: 5px; }
    .bank-detail strong { font-size: 15px; color: #333; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #666; font-size: 12px; }
    .notes { background: #fef3c7; padding: 15px; border-radius: 6px; margin-top: 20px; font-size: 13px; color: #92400e; }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div class="header">
      <div>
        <div class="logo">VEXIM GLOBAL</div>
        <div class="logo-sub">FSMA 204 Compliance Platform</div>
        <p style="margin-top: 15px; color: #666;">
          ${isVN ? "Địa chỉ:" : "Address:"} Hà Nội, Việt Nam<br>
          ${isVN ? "Mã số thuế:" : "Tax ID:"} [TBD]<br>
          Email: billing@veximglobal.com
        </p>
      </div>
      <div class="invoice-info">
        <h1>${isVN ? "HÓA ĐƠN" : "INVOICE"}</h1>
        <p><strong>${data.invoiceNumber}</strong></p>
        <p>${isVN ? "Ngày:" : "Date:"} ${data.invoiceDate}</p>
        <p>${isVN ? "Hạn thanh toán:" : "Due Date:"} <strong style="color: #dc2626;">${data.dueDate}</strong></p>
      </div>
    </div>

    <!-- Parties -->
    <div class="parties">
      <div class="party">
        <h3>${isVN ? "Hóa đơn gửi đến" : "Bill To"}</h3>
        <strong>${data.organizationName}</strong>
        ${data.organizationAddress ? `<p>${data.organizationAddress}</p>` : ""}
        ${data.organizationTaxId ? `<p>${isVN ? "MST:" : "Tax ID:"} ${data.organizationTaxId}</p>` : ""}
      </div>
      <div class="party" style="text-align: right;">
        <h3>${isVN ? "Kỳ thanh toán" : "Billing Period"}</h3>
        <p><strong>${data.billingPeriodStart}</strong></p>
        <p>${isVN ? "đến" : "to"}</p>
        <p><strong>${data.billingPeriodEnd}</strong></p>
      </div>
    </div>

    <!-- Line Items -->
    <table>
      <thead>
        <tr>
          <th>${isVN ? "Mô tả" : "Description"}</th>
          <th class="text-right">${isVN ? "Số lượng" : "Qty"}</th>
          <th class="text-right">${isVN ? "Đơn giá" : "Unit Price"}</th>
          <th class="text-right">${isVN ? "Thành tiền" : "Amount"}</th>
        </tr>
      </thead>
      <tbody>
        ${data.lineItems
          .map(
            (item) => `
          <tr>
            <td>
              <strong>${item.description}</strong>
              ${item.period ? `<br><small style="color: #666;">${item.period}</small>` : ""}
            </td>
            <td class="text-right">${item.quantity}</td>
            <td class="text-right">${formatCurrency(item.unitPrice, data.currency)}</td>
            <td class="text-right"><strong>${formatCurrency(item.amount, data.currency)}</strong></td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals">
      <div class="totals-row subtotal">
        <span>${isVN ? "Tạm tính" : "Subtotal"}:</span>
        <span>${formatCurrency(data.subtotal, data.currency)}</span>
      </div>
      <div class="totals-row tax">
        <span>${isVN ? "Thuế VAT" : "VAT"} (${data.taxRate}%):</span>
        <span>${formatCurrency(data.taxAmount, data.currency)}</span>
      </div>
      <div class="totals-row total">
        <span>${isVN ? "TỔNG CỘNG" : "TOTAL"}:</span>
        <span>${formatCurrency(data.totalAmount, data.currency)}</span>
      </div>
      ${
        data.totalAmountUsd
          ? `
        <div class="totals-row" style="font-size: 13px; color: #666; padding-top: 10px;">
          <span>${isVN ? "Tương đương" : "Equivalent"}:</span>
          <span>${formatCurrency(data.totalAmountUsd, "USD")}</span>
        </div>
      `
          : ""
      }
    </div>

    <!-- Payment Instructions -->
    <div class="payment-instructions">
      <h3>${isVN ? "📋 Hướng dẫn thanh toán" : "📋 Payment Instructions"}</h3>
      <p style="margin-bottom: 20px; color: #666;">
        ${
          isVN
            ? "Vui lòng chuyển khoản đến tài khoản sau và gửi chứng từ thanh toán qua hệ thống:"
            : "Please transfer to the following bank account and upload payment proof via the system:"
        }
      </p>
      <div class="bank-details">
        <div class="bank-detail">
          <label>${isVN ? "Ngân hàng" : "Bank Name"}</label>
          <strong>${data.bankInfo.bankName}</strong>
        </div>
        <div class="bank-detail">
          <label>${isVN ? "Chi nhánh" : "Branch"}</label>
          <strong>${data.bankInfo.branch}</strong>
        </div>
        <div class="bank-detail">
          <label>${isVN ? "Số tài khoản" : "Account Number"}</label>
          <strong>${data.bankInfo.accountNumber}</strong>
        </div>
        <div class="bank-detail">
          <label>${isVN ? "Chủ tài khoản" : "Account Name"}</label>
          <strong>${data.bankInfo.accountName}</strong>
        </div>
        <div class="bank-detail" style="grid-column: 1 / -1;">
          <label>${isVN ? "Nội dung chuyển khoản" : "Transfer Content"}</label>
          <strong style="color: #dc2626; font-size: 18px;">${data.invoiceNumber}</strong>
        </div>
      </div>
    </div>

    <!-- Notes -->
    <div class="notes">
      <strong>⚠️ ${isVN ? "Lưu ý quan trọng" : "Important Notes"}:</strong><br>
      ${
        isVN
          ? "• Vui lòng ghi CHÍNH XÁC mã hóa đơn vào nội dung chuyển khoản<br>• Sau khi chuyển khoản, vui lòng upload chứng từ lên hệ thống<br>• Dịch vụ sẽ được kích hoạt sau khi thanh toán được xác nhận"
          : "• Please include the EXACT invoice number in transfer content<br>• Upload payment proof to the system after transfer<br>• Service will be activated after payment verification"
      }
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>${isVN ? "Cảm ơn quý khách đã sử dụng dịch vụ VEXIM GLOBAL" : "Thank you for using VEXIM GLOBAL services"}</p>
      <p style="margin-top: 10px;">
        ${isVN ? "Có thắc mắc? Liên hệ:" : "Questions? Contact:"} 
        <a href="mailto:support@veximglobal.com" style="color: #10b981;">support@veximglobal.com</a>
      </p>
    </div>
  </div>
</body>
</html>
  `
}

// For future upgrade to proper PDF generation
export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  // Placeholder for react-pdf or puppeteer implementation
  // For now, return HTML as buffer
  const html = generateInvoiceHTML(data)
  return Buffer.from(html, "utf-8")
}
