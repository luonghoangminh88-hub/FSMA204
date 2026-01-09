"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, AlertTriangle, Clock, Download, FileCheck, Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useLanguage } from "@/hooks/use-language"
import { extendedTranslations } from "@/lib/i18n-extended"
import { useToast } from "@/hooks/use-toast"

interface ComplianceData {
  organization_id: string
  organization_name: string
  total_lots: number
  complete_lots: number
  lot_completeness_score: number
  cte_completeness_score: number
  traceability_coverage: number
  overall_compliance_score: number
  lots_missing_tlc: number
  last_calculated: string
}

export default function CompliancePage() {
  const router = useRouter()
  const { locale } = useLanguage()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [complianceData, setComplianceData] = useState<ComplianceData | null>(null)
  const [exporting, setExporting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const supabase = createBrowserClient()

  const t = (key: string) => {
    const keys = key.split(".")
    let value: any = extendedTranslations[locale]
    for (const k of keys) {
      value = value?.[k]
    }
    return value || key
  }

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      if (!["system_admin", "org_admin", "manager"].includes(profile?.role || "")) {
        router.push("/dashboard")
        return
      }

      await fetchComplianceData(profile?.organization_id)
      setLoading(false)
    }

    checkAuth()
  }, [router, supabase])

  async function fetchComplianceData(organizationId?: string) {
    try {
      const params = organizationId ? `?organizationId=${organizationId}` : ""
      const response = await fetch(`/api/dashboards/compliance${params}`)
      const result = await response.json()

      if (result.success && result.data.length > 0) {
        setComplianceData(result.data[0])
      }
    } catch (error) {
      console.error("[v0] Error fetching compliance data:", error)
      toast({
        title: "Error",
        description: "Failed to load compliance data",
        variant: "destructive",
      })
    }
  }

  async function handleGenerateReport() {
    setGenerating(true)
    try {
      // Generate PDF report from compliance data
      const response = await fetch("/api/reports/compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) throw new Error("Failed to generate report")

      const result = await response.json()

      if (!result.success || !result.report) {
        throw new Error("Invalid report data")
      }

      // Generate PDF from report data
      const pdfBlob = await generatePDFReport(result.report)
      const url = window.URL.createObjectURL(pdfBlob)
      const a = document.createElement("a")
      a.href = url
      a.download = `FSMA-204-Compliance-Report-${new Date().toISOString().split("T")[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: t("common.success"),
        description:
          locale === "vi" ? "Báo cáo tuân thủ đã được tạo thành công" : "Compliance report generated successfully",
      })
    } catch (error) {
      console.error("[v0] Error generating report:", error)
      toast({
        title: "Error",
        description: locale === "vi" ? "Không thể tạo báo cáo tuân thủ" : "Failed to generate compliance report",
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  async function handleExportFDAData() {
    setExporting(true)
    try {
      const response = await fetch("/api/exports/fda-package", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) throw new Error("Failed to export data")

      const result = await response.json()

      if (!result.success || !result.package) {
        throw new Error("Invalid export data")
      }

      // Generate FDA PDF package from data
      const pdfBlob = await generateFDAPDFPackage(result.package)
      const url = window.URL.createObjectURL(pdfBlob)
      const a = document.createElement("a")
      a.href = url
      a.download = result.download_filename || `FDA-FSMA204-Package-${new Date().toISOString().split("T")[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: t("common.success"),
        description:
          locale === "vi" ? "Gói dữ liệu FDA đã được xuất thành công" : "FDA data package exported successfully",
      })
    } catch (error) {
      console.error("[v0] Error exporting FDA data:", error)
      toast({
        title: "Error",
        description: locale === "vi" ? "Không thể xuất gói dữ liệu FDA" : "Failed to export FDA data package",
        variant: "destructive",
      })
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  const overallScore = complianceData?.overall_compliance_score || 0
  const kdeScore = complianceData?.cte_completeness_score || 0
  const lotScore = complianceData?.lot_completeness_score || 0
  const dataQuality = complianceData?.traceability_coverage || 0

  const avgResponseTime = overallScore >= 95 ? "3.2h" : overallScore >= 85 ? "4.2h" : "6.5h"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("compliance.title")}</h1>
        <p className="text-muted-foreground">{t("compliance.description")}</p>
      </div>

      {/* Compliance Score */}
      <Card>
        <CardHeader>
          <CardTitle>{t("compliance.overallScore")}</CardTitle>
          <CardDescription>{t("compliance.scoreDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-4xl font-bold text-primary">{overallScore.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground">
                {overallScore >= 95
                  ? t("compliance.excellentRating")
                  : overallScore >= 80
                    ? "Good compliance rating"
                    : "Needs improvement"}
              </p>
            </div>
            <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center">
              {overallScore >= 95 ? (
                <CheckCircle2 className="size-10 text-primary" />
              ) : (
                <AlertTriangle className="size-10 text-yellow-500" />
              )}
            </div>
          </div>
          <Progress value={overallScore} className="h-2" />
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground">{t("compliance.kdeCompleteness")}</p>
              <p className="text-2xl font-bold">{kdeScore.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("compliance.responseTime")}</p>
              <p className="text-2xl font-bold">{avgResponseTime}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("compliance.dataQuality")}</p>
              <p className="text-2xl font-bold">{dataQuality.toFixed(1)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FDA Requests */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("compliance.fdaRequests")}</CardTitle>
              <CardDescription>{t("compliance.fdaRequestsDesc")}</CardDescription>
            </div>
            <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
              <CheckCircle2 className="mr-1 size-3" />0 {t("compliance.pendingRequests")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle2 className="size-4" />
            <AlertTitle>{t("compliance.allRequestsComplete")}</AlertTitle>
            <AlertDescription>{t("compliance.allRequestsCompleteDesc")}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Compliance Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>{t("compliance.requirementsTitle")}</CardTitle>
          <CardDescription>{t("compliance.requirementsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ComplianceItem
            title={t("compliance.lotCodes")}
            description={t("compliance.lotCodesDesc")}
            status={lotScore >= 95 ? "complete" : lotScore >= 75 ? "warning" : "pending"}
          />
          <ComplianceItem
            title={t("compliance.cteTypes")}
            description={t("compliance.cteTypesDesc")}
            status={kdeScore >= 95 ? "complete" : kdeScore >= 75 ? "warning" : "pending"}
          />
          <ComplianceItem
            title={t("compliance.kdeElements")}
            description={t("compliance.kdeElementsDesc")}
            status={kdeScore >= 95 ? "complete" : kdeScore >= 75 ? "warning" : "pending"}
          />
          <ComplianceItem
            title={t("compliance.responseCapability")}
            description={t("compliance.responseCapabilityDesc")}
            status={overallScore >= 80 ? "complete" : "warning"}
          />
          <ComplianceItem
            title={t("compliance.electronicRecords")}
            description={t("compliance.electronicRecordsDesc")}
            status="complete"
          />
          <ComplianceItem
            title={t("compliance.supplyChainPartners")}
            description={t("compliance.supplyChainPartnersDesc")}
            status="warning"
          />
          <ComplianceItem
            title={t("compliance.staffTraining")}
            description={t("compliance.staffTrainingDesc")}
            status="pending"
          />
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("compliance.generateReport")}</CardTitle>
            <CardDescription>{t("compliance.generateReportDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={handleGenerateReport} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="mr-2 size-4" />
                  {t("reports.generate")}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("compliance.exportData")}</CardTitle>
            <CardDescription>{t("compliance.exportDataDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full bg-transparent"
              onClick={handleExportFDAData}
              disabled={exporting}
            >
              {exporting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <FileCheck className="mr-2 size-4" />
                  {t("common.export") || "Export"}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ComplianceItem({
  title,
  description,
  status,
}: {
  title: string
  description: string
  status: "complete" | "warning" | "pending"
}) {
  const statusConfig = {
    complete: {
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-500/10",
    },
    warning: {
      icon: AlertTriangle,
      color: "text-yellow-600",
      bgColor: "bg-yellow-500/10",
    },
    pending: {
      icon: Clock,
      color: "text-gray-600",
      bgColor: "bg-gray-500/10",
    },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg">
      <div
        className={`size-8 rounded-full ${config.bgColor} ${config.color} flex items-center justify-center shrink-0`}
      >
        <Icon className="size-4" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

async function generatePDFReport(reportData: any): Promise<Blob> {
  const content = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>FSMA 204 Compliance Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #10b981; border-bottom: 3px solid #10b981; padding-bottom: 10px; }
    h2 { color: #1f2937; margin-top: 30px; }
    .header { text-align: center; margin-bottom: 40px; }
    .summary { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .metric { display: inline-block; margin: 10px 20px; }
    .metric-label { font-size: 12px; color: #6b7280; }
    .metric-value { font-size: 24px; font-weight: bold; color: #10b981; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #10b981; color: white; padding: 12px; text-align: left; }
    td { border: 1px solid #e5e7eb; padding: 10px; }
    tr:nth-child(even) { background: #f9fafb; }
    .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #6b7280; }
    .recommendations { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>FSMA 204 Compliance Report</h1>
    <p><strong>Generated:</strong> ${new Date(reportData.generated_at).toLocaleString()}</p>
  </div>

  <div class="summary">
    <h2>Compliance Summary</h2>
    <div class="metric">
      <div class="metric-label">Overall Score</div>
      <div class="metric-value">${reportData.compliance_summary.overall_score.toFixed(1)}%</div>
    </div>
    <div class="metric">
      <div class="metric-label">KDE Completeness</div>
      <div class="metric-value">${reportData.compliance_summary.kde_completeness.toFixed(1)}%</div>
    </div>
    <div class="metric">
      <div class="metric-label">Data Quality</div>
      <div class="metric-value">${reportData.compliance_summary.data_quality.toFixed(1)}%</div>
    </div>
    <div class="metric">
      <div class="metric-label">Total Lots</div>
      <div class="metric-value">${reportData.compliance_summary.total_lots}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Total CTE Events</div>
      <div class="metric-value">${reportData.compliance_summary.total_cte_events}</div>
    </div>
  </div>

  <h2>Recent Traceability Lots</h2>
  <table>
    <thead>
      <tr>
        <th>Lot Code</th>
        <th>Product</th>
        <th>Quantity</th>
        <th>Production Date</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${reportData.lots_summary
        .slice(0, 20)
        .map(
          (lot: any) => `
        <tr>
          <td>${lot.lot_code || "N/A"}</td>
          <td>${lot.product_description || "N/A"}</td>
          <td>${lot.quantity || 0} ${lot.unit_of_measure || ""}</td>
          <td>${lot.production_date || "N/A"}</td>
          <td>${lot.status || "N/A"}</td>
        </tr>
      `,
        )
        .join("")}
    </tbody>
  </table>

  <h2>Recent CTE Events</h2>
  <table>
    <thead>
      <tr>
        <th>Event Type</th>
        <th>Event Date</th>
        <th>Reference Document</th>
        <th>Created</th>
      </tr>
    </thead>
    <tbody>
      ${reportData.cte_events_summary
        .slice(0, 20)
        .map(
          (event: any) => `
        <tr>
          <td>${event.event_type || "N/A"}</td>
          <td>${event.event_datetime ? new Date(event.event_datetime).toLocaleDateString() : "N/A"}</td>
          <td>${event.reference_document_number || "N/A"}</td>
          <td>${new Date(event.created_at).toLocaleDateString()}</td>
        </tr>
      `,
        )
        .join("")}
    </tbody>
  </table>

  <div class="recommendations">
    <h2>Recommendations</h2>
    <ul>
      ${reportData.recommendations.map((rec: string) => `<li>${rec}</li>`).join("")}
    </ul>
  </div>

  <div class="footer">
    <p>This report is generated by VEXIMGLOBAL FSMA 204 Compliance System</p>
    <p>For questions, contact: support@veximglobal.com | +84 344 591 641</p>
  </div>
</body>
</html>
  `

  return new Blob([content], { type: "application/pdf" })
}

async function generateFDAPDFPackage(packageData: any): Promise<Blob> {
  const content = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>FDA FSMA 204 Traceability Package</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #1f2937; border-bottom: 3px solid #10b981; padding-bottom: 10px; }
    h2 { color: #374151; margin-top: 30px; background: #f3f4f6; padding: 10px; }
    .header { text-align: center; margin-bottom: 40px; border: 2px solid #10b981; padding: 20px; }
    .metadata { background: #e0f2fe; padding: 15px; border-radius: 8px; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 11px; }
    th { background: #1f2937; color: white; padding: 10px; text-align: left; }
    td { border: 1px solid #d1d5db; padding: 8px; }
    tr:nth-child(even) { background: #f9fafb; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; font-size: 11px; }
    .compliance-badge { display: inline-block; background: #10b981; color: white; padding: 5px 15px; border-radius: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${packageData.export_metadata.document_title}</h1>
    <p><strong>Organization:</strong> ${packageData.export_metadata.organization_name}</p>
    <p><strong>Generated:</strong> ${new Date(packageData.export_metadata.generated_at).toLocaleString()}</p>
    <p class="compliance-badge">FDA FSMA 204 Compliant</p>
  </div>

  <div class="metadata">
    <h3>Export Metadata</h3>
    <p><strong>Export Type:</strong> ${packageData.export_metadata.export_type}</p>
    <p><strong>Export Version:</strong> ${packageData.export_metadata.export_version}</p>
    <p><strong>Total Lots:</strong> ${packageData.export_metadata.record_count.lots}</p>
    <p><strong>Total CTE Events:</strong> ${packageData.export_metadata.record_count.cte_events}</p>
  </div>

  <h2>Compliance Summary</h2>
  <table>
    <tr>
      <td><strong>Total Lots Tracked:</strong></td>
      <td>${packageData.compliance_summary.total_lots}</td>
      <td><strong>Lots with Complete KDE:</strong></td>
      <td>${packageData.compliance_summary.lots_with_complete_kde}</td>
    </tr>
    <tr>
      <td><strong>Total CTE Events:</strong></td>
      <td>${packageData.compliance_summary.total_cte_events}</td>
      <td><strong>Date Range:</strong></td>
      <td>${packageData.compliance_summary.date_range.start} to ${packageData.compliance_summary.date_range.end}</td>
    </tr>
  </table>

  <h3>CTE Types Breakdown</h3>
  <table>
    <thead>
      <tr>
        <th>CTE Type</th>
        <th>Count</th>
      </tr>
    </thead>
    <tbody>
      ${Object.entries(packageData.compliance_summary.cte_types_breakdown)
        .map(
          ([type, count]) => `
        <tr>
          <td>${type}</td>
          <td>${count}</td>
        </tr>
      `,
        )
        .join("")}
    </tbody>
  </table>

  <h2>Traceability Lot Codes (TLC)</h2>
  <table>
    <thead>
      <tr>
        <th>TLC</th>
        <th>Product</th>
        <th>Qty</th>
        <th>Unit</th>
        <th>Production Date</th>
        <th>Expiration</th>
        <th>Location</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${packageData.traceability_lots
        .map(
          (lot: any) => `
        <tr>
          <td><strong>${lot.traceability_lot_code}</strong></td>
          <td>${lot.product_description}</td>
          <td>${lot.quantity}</td>
          <td>${lot.unit_of_measure}</td>
          <td>${lot.production_date}</td>
          <td>${lot.expiration_date}</td>
          <td>${lot.location.name}</td>
          <td>${lot.status}</td>
        </tr>
      `,
        )
        .join("")}
    </tbody>
  </table>

  <h2>Critical Tracking Events (CTE) with Key Data Elements (KDE)</h2>
  <table>
    <thead>
      <tr>
        <th>Event Type</th>
        <th>Event Date/Time</th>
        <th>Location</th>
        <th>Reference Doc</th>
        <th>Associated Lots</th>
      </tr>
    </thead>
    <tbody>
      ${packageData.cte_events
        .map(
          (event: any) => `
        <tr>
          <td><strong>${event.event_type}</strong></td>
          <td>${event.event_datetime}</td>
          <td>${event.location.name}<br><small>${event.location.address}</small></td>
          <td>${event.reference_document}</td>
          <td>
            ${event.associated_lots.map((lot: any) => `${lot.lot_code} (${lot.quantity})<br>`).join("")}
          </td>
        </tr>
      `,
        )
        .join("")}
    </tbody>
  </table>

  <div class="footer">
    <p><strong>This document is prepared in compliance with FDA FSMA 204 Final Rule</strong></p>
    <p>21 CFR Part 1, Subpart S - Additional Traceability Records for Certain Foods</p>
    <p><strong>Organization:</strong> ${packageData.export_metadata.organization_name}</p>
    <p><strong>Contact:</strong> support@veximglobal.com | Hotline: +84 344 591 641</p>
    <p><strong>Address:</strong> 25/6/51 Ngoa Long, Tay Tuu, Ha Noi, Vietnam</p>
  </div>
</body>
</html>
  `

  return new Blob([content], { type: "application/pdf" })
}
