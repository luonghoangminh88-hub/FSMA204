"use client"

import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { TraceabilityChainViewer } from "@/components/fsma/traceability-chain-viewer"
import { useLanguage } from "@/hooks/use-language"
import { extendedTranslations } from "@/lib/i18n-extended"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Network, Package, TrendingUp, AlertCircle, CheckCircle, Shield, Clock, Scale } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

interface ComplianceMetrics {
  traceability_coverage: number
  quantity_reconciliation: number
  audit_logging: number
  timeline_validation: number
  overall_score: number
}

export default function TraceabilityPage() {
  const { locale } = useLanguage()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalLots: 0,
    totalEvents: 0,
    avgChainLength: 0,
    incompleteChains: 0,
  })
  const [complianceMetrics, setComplianceMetrics] = useState<ComplianceMetrics>({
    traceability_coverage: 0,
    quantity_reconciliation: 0,
    audit_logging: 0,
    timeline_validation: 0,
    overall_score: 0,
  })

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
        window.location.href = "/auth/login"
        return
      }

      setUser(authUser)
      await fetchStats(supabase, authUser)
      await fetchComplianceMetrics(supabase, authUser)
      setLoading(false)
    }

    checkAuth()
  }, [])

  async function fetchStats(supabase: any, authUser: any) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", authUser?.id)
        .single()

      if (!profile?.organization_id) return

      const { count: lotsCount } = await supabase
        .from("traceability_lots")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", profile.organization_id)

      const { count: eventsCount } = await supabase
        .from("cte_events")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", profile.organization_id)

      setStats({
        totalLots: lotsCount || 0,
        totalEvents: eventsCount || 0,
        avgChainLength: lotsCount ? Math.round((eventsCount || 0) / lotsCount) : 0,
        incompleteChains: 0,
      })
    } catch (error) {
      console.error("[v0] Error fetching traceability stats:", error)
    }
  }

  async function fetchComplianceMetrics(supabase: any, authUser: any) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", authUser?.id)
        .single()

      if (!profile?.organization_id) return

      const { data, error } = await supabase.rpc("get_phase1_compliance_score", {
        p_organization_id: profile.organization_id,
      })

      if (error) {
        console.error("[v0] Error fetching compliance metrics:", error)
        return
      }

      if (data && data.length > 0) {
        const metrics = data[0]
        setComplianceMetrics({
          traceability_coverage: Number.parseFloat(metrics.traceability_coverage) || 0,
          quantity_reconciliation: Number.parseFloat(metrics.quantity_reconciliation) || 0,
          audit_logging: Number.parseFloat(metrics.audit_logging) || 0,
          timeline_validation: Number.parseFloat(metrics.timeline_validation) || 0,
          overall_score: Number.parseFloat(metrics.overall_score) || 0,
        })
      }
    } catch (error) {
      console.error("[v0] Error fetching compliance metrics:", error)
    }
  }

  const getComplianceColor = (score: number) => {
    if (score >= 90) return "text-green-600"
    if (score >= 70) return "text-yellow-600"
    return "text-red-600"
  }

  const getComplianceBgColor = (score: number) => {
    if (score >= 90) return "bg-green-500/10"
    if (score >= 70) return "bg-yellow-500/10"
    return "bg-red-500/10"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("traceability.title")}</h1>
        <p className="text-muted-foreground">{t("traceability.description")}</p>
      </div>

      <Tabs defaultValue="traceability" className="space-y-6">
        <TabsList>
          <TabsTrigger value="traceability">
            <Network className="size-4 mr-2" />
            {locale === "vi" ? "Chuỗi Truy Xuất" : "Traceability Chain"}
          </TabsTrigger>
          <TabsTrigger value="compliance" data-tour="compliance-tab">
            <Shield className="size-4 mr-2" />
            {locale === "vi" ? "Tuân Thủ FSMA 204" : "FSMA 204 Compliance"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="traceability" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("traceability.totalLots")}</CardTitle>
                <Package className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalLots}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("traceability.totalEvents")}</CardTitle>
                <Network className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalEvents}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("traceability.avgChainLength")}</CardTitle>
                <TrendingUp className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.avgChainLength}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("traceability.incompleteChains")}</CardTitle>
                <AlertCircle className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.incompleteChains}</div>
              </CardContent>
            </Card>
          </div>

          <div data-tour="test-trace-button">
            <TraceabilityChainViewer />
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <Card className={getComplianceBgColor(complianceMetrics.overall_score)}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{locale === "vi" ? "Điểm Tuân Thủ FSMA 204" : "FSMA 204 Compliance Score"}</CardTitle>
                  <CardDescription>
                    {locale === "vi"
                      ? "Đánh giá tuân thủ các yêu cầu CTE (Critical Tracking Events) và KDE (Key Data Elements)"
                      : "Assessment of CTE (Critical Tracking Events) and KDE (Key Data Elements) requirements"}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {complianceMetrics.overall_score >= 90 ? (
                    <CheckCircle className="size-8 text-green-600" />
                  ) : (
                    <AlertCircle className="size-8 text-yellow-600" />
                  )}
                  <span className={`text-4xl font-bold ${getComplianceColor(complianceMetrics.overall_score)}`}>
                    {complianceMetrics.overall_score.toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Progress value={complianceMetrics.overall_score} className="h-3" />
              <p className="text-sm text-muted-foreground mt-2">
                {complianceMetrics.overall_score >= 90
                  ? locale === "vi"
                    ? "Tuân thủ tuyệt vời! Hệ thống đáp ứng 90%+ yêu cầu FSMA 204."
                    : "Excellent compliance! System meets 90%+ FSMA 204 requirements."
                  : locale === "vi"
                    ? "Cần cải thiện để đạt 90% tuân thủ FSMA 204."
                    : "Improvements needed to reach 90% FSMA 204 compliance."}
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    <Network className="size-5 inline mr-2" />
                    {locale === "vi" ? "Truy Xuất Hai Chiều (TLC)" : "Bidirectional Traceability (TLC)"}
                  </CardTitle>
                  <Badge variant={complianceMetrics.traceability_coverage >= 90 ? "default" : "secondary"}>
                    {complianceMetrics.traceability_coverage.toFixed(1)}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={complianceMetrics.traceability_coverage} />
                <p className="text-sm text-muted-foreground">
                  {locale === "vi"
                    ? "Truy xuất nguồn gốc (backward) và điểm đến (forward) qua Traceability Lot Code (TLC)"
                    : "Trace origins (backward) and destinations (forward) via Traceability Lot Code (TLC)"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    <Scale className="size-5 inline mr-2" />
                    {locale === "vi" ? "Đối Soát Số Lượng (KDE)" : "Quantity Reconciliation (KDE)"}
                  </CardTitle>
                  <Badge variant={complianceMetrics.quantity_reconciliation >= 90 ? "default" : "secondary"}>
                    {complianceMetrics.quantity_reconciliation.toFixed(1)}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={complianceMetrics.quantity_reconciliation} />
                <p className="text-sm text-muted-foreground">
                  {locale === "vi"
                    ? "Key Data Elements: Số lượng đầu vào = Số lượng đầu ra + Hao hụt được ghi nhận"
                    : "Key Data Elements: Input quantity = Output quantity + Documented losses"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    <Shield className="size-5 inline mr-2" />
                    {locale === "vi" ? "Nhật Ký CTE" : "CTE Audit Logging"}
                  </CardTitle>
                  <Badge variant={complianceMetrics.audit_logging >= 90 ? "default" : "secondary"}>
                    {complianceMetrics.audit_logging.toFixed(1)}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={complianceMetrics.audit_logging} />
                <p className="text-sm text-muted-foreground">
                  {locale === "vi"
                    ? "Tự động ghi lại mọi thay đổi Critical Tracking Events và KDEs"
                    : "Automatic recording of all Critical Tracking Events and KDE changes"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    <Clock className="size-5 inline mr-2" />
                    {locale === "vi" ? "Trình Tự CTE" : "CTE Sequence Validation"}
                  </CardTitle>
                  <Badge variant={complianceMetrics.timeline_validation >= 90 ? "default" : "secondary"}>
                    {complianceMetrics.timeline_validation.toFixed(1)}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={complianceMetrics.timeline_validation} />
                <p className="text-sm text-muted-foreground">
                  {locale === "vi"
                    ? "Xác thực trình tự thời gian các CTEs (Harvesting → Cooling → Packing → Shipping)"
                    : "Validate CTE chronological sequence (Harvesting → Cooling → Packing → Shipping)"}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{locale === "vi" ? "Hành Động Cần Thực Hiện" : "Required Actions"}</CardTitle>
              <CardDescription>
                {locale === "vi" ? "Các bước để cải thiện tuân thủ FSMA 204" : "Steps to improve FSMA 204 compliance"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {complianceMetrics.traceability_coverage < 90 && (
                <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <AlertCircle className="size-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">
                      {locale === "vi"
                        ? "Cải thiện truy xuất TLC (Traceability Lot Code)"
                        : "Improve TLC (Traceability Lot Code) traceability"}
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      {locale === "vi"
                        ? "Đảm bảo mỗi lô hàng FTL có TLC và ít nhất 1 CTE với KDEs đầy đủ."
                        : "Ensure each FTL lot has a TLC and at least 1 CTE with complete KDEs."}
                    </p>
                  </div>
                </div>
              )}
              {complianceMetrics.quantity_reconciliation < 90 && (
                <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <AlertCircle className="size-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">
                      {locale === "vi" ? "Hoàn thiện KDEs về số lượng" : "Complete quantity KDEs"}
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      {locale === "vi"
                        ? "Ghi nhận đầy đủ KDEs: quantity received, quantity shipped, và loss quantity cho mỗi CTE."
                        : "Record complete KDEs: quantity received, quantity shipped, and loss quantity for each CTE."}
                    </p>
                  </div>
                </div>
              )}
              {complianceMetrics.overall_score >= 90 && (
                <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <CheckCircle className="size-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-green-800 dark:text-green-200">
                      {locale === "vi" ? "Hệ thống tuân thủ FSMA 204!" : "System is FSMA 204 compliant!"}
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      {locale === "vi"
                        ? "Tiếp tục duy trì ghi nhận CTEs và KDEs theo quy định. Chuẩn bị sẵn sàng cho FDA audit."
                        : "Continue maintaining CTE and KDE records as required. Ready for FDA audit."}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
