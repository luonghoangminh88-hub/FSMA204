import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { generateInvoiceHTML, type InvoiceData } from "@/lib/invoice/generate-pdf"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  try {
    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch invoice with organization details
    const { data: invoice, error: fetchError } = await supabase
      .from("invoices")
      .select(`
        *,
        organization:organizations(organization_name, address, tax_id)
      `)
      .eq("id", id)
      .single()

    if (fetchError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    // Get user language preference
    const { data: profile } = await supabase.from("profiles").select("language").eq("id", user.id).single()

    const language = (profile?.language as "en" | "vi") || "en"

    // Format invoice data
    const invoiceData: InvoiceData = {
      invoiceNumber: invoice.invoice_number,
      invoiceDate: new Date(invoice.invoice_date).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US"),
      dueDate: new Date(invoice.due_date).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US"),
      organizationName: invoice.organization.organization_name,
      organizationAddress: invoice.organization.address,
      organizationTaxId: invoice.organization.tax_id,
      billingPeriodStart: new Date(invoice.billing_period_start).toLocaleDateString(
        language === "vi" ? "vi-VN" : "en-US",
      ),
      billingPeriodEnd: new Date(invoice.billing_period_end).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US"),
      lineItems: invoice.line_items,
      subtotal: Number.parseFloat(invoice.subtotal),
      taxRate: Number.parseFloat(invoice.tax_rate),
      taxAmount: Number.parseFloat(invoice.tax_amount),
      totalAmount: Number.parseFloat(invoice.total_amount),
      currency: invoice.currency,
      totalAmountUsd: invoice.total_amount_usd ? Number.parseFloat(invoice.total_amount_usd) : undefined,
      bankInfo: invoice.bank_info,
      language,
    }

    // Generate HTML
    const html = generateInvoiceHTML(invoiceData)

    // Return HTML response
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="${invoice.invoice_number}.html"`,
      },
    })
  } catch (error: any) {
    console.error("[v0] Error generating invoice:", error)
    return NextResponse.json({ error: "Failed to generate invoice" }, { status: 500 })
  }
}
