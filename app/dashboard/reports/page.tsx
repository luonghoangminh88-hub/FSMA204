"use client"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, FileText, TrendingUp, Calendar, BarChart3, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/hooks/use-language"
import { extendedTranslations } from "@/lib/i18n-extended"
import { useEffect, useState } from "react"
import type React from "react"
import { useToast } from "@/hooks/use-toast"

interface ReportStats {
  complianceScore: number
  totalEvents: number
  avgResponseTime: string
  dataQuality: number
}

interface Report {
  id: string
  report_type: string
  report_period_start: string
  report_period_end: string
  compliance_score: number
  total_lots_tracked: number
  total_cte_events: number
  created_at: string
}

export default function ReportsPage() {
  const { locale } = useLanguage()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<ReportStats | null>(null)
  const [recentReports, setRecentReports] = useState<Report[]>([])
  const [generating, setGenerating] = useState<string | null>(null)

  const t = (key: string) => {
    const keys = key.split(".")
    let value: any = extendedTranslations[locale as keyof typeof extendedTranslations]
    for (const k of keys) {
      value = value?.[k]
    }
    return value || key
  }

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (!authUser) {
        redirect("/auth/login")
      }

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", authUser.id).single()

      if (!["system_admin", "org_admin", "manager"].includes(profileData?.role || "")) {
        redirect("/dashboard")
      }

      setUser(authUser)
      setProfile(profileData)

      await fetchStats()
      await fetchReports()

      setLoading(false)
    }

    checkAuth()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/reports/stats")
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error("[v0] Error fetching stats:", error)
    }
  }

  const fetchReports = async () => {
    try {
      const response = await fetch("/api/reports/list")
      const data = await response.json()
      setRecentReports(data.reports || [])
    } catch (error) {
      console.error("[v0] Error fetching reports:", error)
    }
  }

  const handleGenerateReport = async (reportType: string) => {
    setGenerating(reportType)
    try {
      const now = new Date()
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const periodEnd = now.toISOString()

      const response = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType, periodStart, periodEnd }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: locale === "vi" ? "Thành công" : "Success",
          description: locale === "vi" ? "Báo cáo đã được tạo" : "Report generated successfully",
        })
        await fetchReports()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error("[v0] Error generating report:", error)
      toast({
        title: locale === "vi" ? "Lỗi" : "Error",
        description: locale === "vi" ? "Không thể tạo báo cáo" : "Failed to generate report",
        variant: "destructive",
      })
    } finally {
      setGenerating(null)
    }
  }

  const handleDownloadReport = async (reportId: string) => {
    try {
      const response = await fetch(`/api/reports/${reportId}/download`)

      if (!response.ok) {
        throw new Error("Failed to download report")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `fsma-report-${reportId}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast({
        title: locale === "vi" ? "Thành công" : "Success",
        description: locale === "vi" ? "Báo cáo đã được tải xuống" : "Report downloaded successfully",
      })
    } catch (error) {
      console.error("[v0] Error downloading report:", error)
      toast({
        title: locale === "vi" ? "Lỗi" : "Error",
        description: locale === "vi" ? "Không thể tải báo cáo" : "Failed to download report",
        variant: "destructive",
      })
    }
  }

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("reports.title")}</h1>
        <p className="text-muted-foreground">{t("reports.description")}</p>
      </div>

      {/* Quick Stats - Using real data from API */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("reports.complianceScore")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.complianceScore.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">{t("reports.fromLastMonth")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("reports.totalEvents")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvents.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">{t("reports.fromLastMonth")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("reports.avgResponseTime")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgResponseTime}h</div>
            <p className="text-xs text-muted-foreground mt-1">{t("reports.wellUnder24h")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("reports.dataQuality")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.dataQuality.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">{t("reports.completeKDEs")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Report Templates - Added working generate functions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ReportCard
          title={t("reports.complianceSummary")}
          description={t("reports.complianceSummaryDesc")}
          icon={<ShieldIcon />}
          period={t("reports.monthly")}
          reportType="monthly"
          onGenerate={handleGenerateReport}
          generating={generating === "monthly"}
          t={t}
        />
        <ReportCard
          title={t("reports.cteActivityReport")}
          description={t("reports.cteActivityReportDesc")}
          icon={<FileText className="size-5" />}
          period={t("reports.weekly")}
          reportType="weekly"
          onGenerate={handleGenerateReport}
          generating={generating === "weekly"}
          t={t}
        />
        <ReportCard
          title={t("reports.lossAnalysis")}
          description={t("reports.lossAnalysisDesc")}
          icon={<TrendingUp className="size-5" />}
          period={t("reports.monthly")}
          reportType="monthly"
          onGenerate={handleGenerateReport}
          generating={generating === "monthly"}
          t={t}
        />
        <ReportCard
          title={t("reports.fdaResponseLog")}
          description={t("reports.fdaResponseLogDesc")}
          icon={<Calendar className="size-5" />}
          period={t("reports.quarterly")}
          reportType="quarterly"
          onGenerate={handleGenerateReport}
          generating={generating === "quarterly"}
          t={t}
        />
        <ReportCard
          title={t("reports.supplyChainOverview")}
          description={t("reports.supplyChainOverviewDesc")}
          icon={<BarChart3 className="size-5" />}
          period={t("reports.monthly")}
          reportType="monthly"
          onGenerate={handleGenerateReport}
          generating={generating === "monthly"}
          t={t}
        />
        <ReportCard
          title={t("reports.customReport")}
          description={t("reports.customReportDesc")}
          icon={<FileText className="size-5" />}
          period={t("reports.onDemand")}
          reportType="ad_hoc"
          onGenerate={handleGenerateReport}
          generating={generating === "ad_hoc"}
          t={t}
        />
      </div>

      {/* Recent Reports - Using real data from database */}
      <Card>
        <CardHeader>
          <CardTitle>{t("reports.recentReports")}</CardTitle>
          <CardDescription>{t("reports.recentReportsDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {recentReports.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {locale === "vi" ? "Chưa có báo cáo nào" : "No reports yet"}
            </p>
          ) : (
            <div className="space-y-3">
              {recentReports.map((report) => (
                <RecentReportItem
                  key={report.id}
                  report={report}
                  locale={locale}
                  onDownload={handleDownloadReport}
                  t={t}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ShieldIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function ReportCard({
  title,
  description,
  icon,
  period,
  reportType,
  onGenerate,
  generating,
  t,
}: {
  title: string
  description: string
  icon: React.ReactNode
  period: string
  reportType: string
  onGenerate: (type: string) => Promise<void>
  generating: boolean
  t: (key: string) => string
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">{icon}</div>
          <Badge variant="outline">{period}</Badge>
        </div>
        <CardTitle className="text-lg mt-4">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Button size="sm" className="flex-1" onClick={() => onGenerate(reportType)} disabled={generating}>
            {generating ? <Loader2 className="mr-2 size-3 animate-spin" /> : <Download className="mr-2 size-3" />}
            {t("reports.generate")}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function RecentReportItem({
  report,
  locale,
  onDownload,
  t,
}: {
  report: Report
  locale: string
  onDownload: (id: string) => Promise<void>
  t: (key: string) => string
}) {
  const getReportTitle = () => {
    const startDate = new Date(report.report_period_start).toLocaleDateString()
    const endDate = new Date(report.report_period_end).toLocaleDateString()
    return `${report.report_type} (${startDate} - ${endDate})`
  }

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-3">
        <FileText className="size-5 text-muted-foreground" />
        <div>
          <p className="font-medium text-sm">{getReportTitle()}</p>
          <p className="text-xs text-muted-foreground">
            {report.report_type} · {new Date(report.created_at).toLocaleDateString()} · Score:{" "}
            {report.compliance_score?.toFixed(1)}%
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
          {t("reports.completed")}
        </Badge>
        <Button size="sm" variant="ghost" onClick={() => onDownload(report.id)}>
          <Download className="size-4" />
        </Button>
      </div>
    </div>
  )
}
