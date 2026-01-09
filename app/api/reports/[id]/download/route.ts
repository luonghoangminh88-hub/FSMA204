import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// Next.js 15 yêu cầu params phải là Promise
export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Await params để lấy reportId (Lỗi Next.js 15)
    const { id: reportId } = await params

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    // Fetch report
    const { data: report, error: reportError } = await supabase
      .from("compliance_reports")
      .select("*")
      .eq("id", reportId)
      .eq("organization_id", profile.organization_id)
      .single()

    if (reportError || !report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 })
    }

    // Fetch detailed data for PDF
    const { data: lots } = await supabase
      .from("traceability_lots")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .gte("created_at", report.report_period_start)
      .lte("created_at", report.report_period_end)

    const { data: cteEvents } = await supabase
      .from("cte_events")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .gte("event_datetime", report.report_period_start)
      .lte("event_datetime", report.report_period_end)

    const pdfBuffer = generateFDAPDFReport(report, lots || [], cteEvents || [])

    // Sử dụng ép kiểu 'as any' cho pdfBuffer để tránh lỗi TS2345 (Uint8Array)
    return new NextResponse(pdfBuffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="FSMA-204-Report-${reportId}.pdf"`,
        "Cache-Control": "no-cache",
      },
    })
  } catch (error) {
    console.error("[v0] Error downloading report:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function generateFDAPDFReport(report: any, lots: any[], cteEvents: any[]): Uint8Array {
  const startDate = new Date(report.report_period_start).toLocaleDateString("en-US")
  const endDate = new Date(report.report_period_end).toLocaleDateString("en-US")
  const generatedDate = new Date(report.created_at).toLocaleString("en-US")

  // Tạo nội dung PDF (Dạng text mô phỏng PDF)
  const pdfContent = `
═══════════════════════════════════════════════════════════════════════════════
                        FSMA 204 COMPLIANCE REPORT
                                VEXIMGLOBAL
═══════════════════════════════════════════════════════════════════════════════

REPORT METADATA
───────────────────────────────────────────────────────────────────────────────
Report ID:           ${report.id}
Report Type:         ${report.report_type.toUpperCase()}
Report Period:       ${startDate} - ${endDate}
Generated Date:      ${generatedDate}
Compliance Score:    ${report.compliance_score?.toFixed(1)}%

Contact Information:
  Company:           VEXIMGLOBAL
  Address:           Số 25/6/51 Ngoa Long, Tay Tuu, Ha Noi
  Phone:             0344591641
  Email:             support@veximglobal.com

═══════════════════════════════════════════════════════════════════════════════
                               COMPLIANCE SUMMARY
═══════════════════════════════════════════════════════════════════════════════

Overall Compliance Score:         ${report.compliance_score?.toFixed(1)}%
Total Traceability Lots Tracked: ${report.total_lots_tracked}
Total CTE Events Recorded:       ${report.total_cte_events}

Status: ${report.compliance_score >= 95 ? "FULLY COMPLIANT" : report.compliance_score >= 85 ? "NEEDS IMPROVEMENT" : "NON-COMPLIANT"}

═══════════════════════════════════════════════════════════════════════════════
                      TRACEABILITY LOT CODES (TLC)
═══════════════════════════════════════════════════════════════════════════════

Total Lots in Period: ${lots.length}

${lots
  .map(
    (lot, idx) => `
${idx + 1}. Lot Code: ${lot.lot_code || "N/A"}
   Product:        ${lot.product_description || "N/A"}
   Quantity:       ${lot.quantity || 0} ${lot.unit_of_measure || "units"}
   Production:     ${lot.production_date ? new Date(lot.production_date).toLocaleDateString("en-US") : "N/A"}
   Expiration:     ${lot.expiration_date ? new Date(lot.expiration_date).toLocaleDateString("en-US") : "N/A"}
   Status:         ${lot.status || "active"}
   ─────────────────────────────────────────────────────────────────────────
`,
  )
  .join("")}

═══════════════════════════════════════════════════════════════════════════════
                    CRITICAL TRACKING EVENTS (CTE)
═══════════════════════════════════════════════════════════════════════════════

Total CTE Events: ${cteEvents.length}

${cteEvents
  .map(
    (event, idx) => `
${idx + 1}. Event Type:   ${event.event_type || "N/A"}
   Date/Time:     ${event.event_datetime ? new Date(event.event_datetime).toLocaleString("en-US") : "N/A"}
   Reference Doc: ${event.reference_document_number || "N/A"}
   Lot Code:      ${event.traceability_lot_code || "N/A"}
   Location:      ${event.location_id || "N/A"}
   ─────────────────────────────────────────────────────────────────────────
`,
  )
  .join("")}

═══════════════════════════════════════════════════════════════════════════════
                        KEY DATA ELEMENTS (KDE)
═══════════════════════════════════════════════════════════════════════════════

KDE Completeness Analysis:
  - Traceability Lot Code (TLC):     ${lots.filter((l) => l.lot_code).length}/${lots.length}
  - Product Description:             ${lots.filter((l) => l.product_description).length}/${lots.length}
  - Quantity and Unit of Measure:    ${lots.filter((l) => l.quantity && l.unit_of_measure).length}/${lots.length}
  - Production Date:                 ${lots.filter((l) => l.production_date).length}/${lots.length}
  - Expiration Date:                 ${lots.filter((l) => l.expiration_date).length}/${lots.length}

CTE Data Completeness:
  - Event Type Recorded:             ${cteEvents.filter((e) => e.event_type).length}/${cteEvents.length}
  - Event DateTime Recorded:         ${cteEvents.filter((e) => e.event_datetime).length}/${cteEvents.length}
  - Reference Document:              ${cteEvents.filter((e) => e.reference_document_number).length}/${cteEvents.length}
  - TLC Association:                 ${cteEvents.filter((e) => e.traceability_lot_code).length}/${cteEvents.length}

═══════════════════════════════════════════════════════════════════════════════
                         COMPLIANCE NOTES
═══════════════════════════════════════════════════════════════════════════════

This report is generated in compliance with FDA FSMA 204 requirements
(21 CFR Part 1, Subpart S - Additional Traceability Records for Certain Foods).

All data in this report is maintained in accordance with FDA record-keeping
requirements and is available for inspection upon request.

For questions or clarifications regarding this report, please contact:
VEXIMGLOBAL Support Team
Email: support@veximglobal.com
Phone: 0344591641

═══════════════════════════════════════════════════════════════════════════════
                           END OF REPORT
═══════════════════════════════════════════════════════════════════════════════

Generated by VEXIMGLOBAL FSMA 204 Compliance Platform
Platform: First FDA FSMA 204 Compliant Solution in Vietnam
Report Generated: ${generatedDate}
`

  return new TextEncoder().encode(pdfContent)
}
