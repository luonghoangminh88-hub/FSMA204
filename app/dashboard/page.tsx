"use client"

import type React from "react"
import { redirect } from "next/navigation"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Package,
  TrendingUp,
  CheckCircle2,
  Clock,
  FileText,
  PlusCircle,
  MapPin,
  ChevronRight,
  Activity,
  Shield,
  Sprout,
  Snowflake,
  Truck,
  Download,
  Layers,
  Building,
} from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/hooks/use-language"
import dynamic from "next/dynamic"

const ProductTour = dynamic(() => import("@/components/fsma/product-tour").then((mod) => mod.ProductTour), {
  ssr: false,
})

import { CTEFlowDiagram } from "@/components/fsma/cte-flow-diagram"
import { ExpirationAlertsWidget } from "@/components/expiration-alerts-widget"
import { InventoryLevelsWidget } from "@/components/dashboards/inventory-levels-widget"
import { DualComplianceWidget } from "@/components/vexim/dual-compliance-widget"
import { PendingApprovalsWidget } from "@/components/dashboards/pending-approvals-widget"
import { StatsCard } from "@/components/dashboards/stats-card"
import { QuickActionButton } from "@/components/dashboards/quick-action-button"

interface ComplianceAlert {
  id: string
  title: string
  description: string
  severity: "critical" | "warning" | "info"
  timestamp: Date
  timeAgo: string
}

export default function DashboardPage() {
  const { t } = useLanguage()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [organization, setOrganization] = useState<any>(null)
  const [stats, setStats] = useState({
    lotsCount: 0,
    eventsCount: 0,
    locationsCount: 0,
  })
  const [prevMonthStats, setPrevMonthStats] = useState({
    lotsCount: 0,
    eventsCount: 0,
  })
  const [complianceScore, setComplianceScore] = useState<number>(0)
  const [recentEvents, setRecentEvents] = useState<any[]>([])
  const [cteCompletedStages, setCteCompletedStages] = useState<any[]>([])
  const [cteCurrentStage, setCteCurrentStage] = useState<any>(null)
  const [complianceAlerts, setComplianceAlerts] = useState<ComplianceAlert[]>([])

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()

      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (!currentUser) {
        redirect("/auth/login")
        return
      }

      setUser(currentUser)

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", currentUser.id).single()

      setProfile(profileData)

      if (profileData?.organization_id) {
        const { data: orgData } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", profileData.organization_id)
          .single()

        setOrganization(orgData)

        await fetchComplianceAlerts(supabase, profileData.organization_id, orgData)

        const { count: lotsCount } = await supabase
          .from("traceability_lots")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", profileData.organization_id)

        const { count: eventsCount } = await supabase
          .from("cte_events")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", profileData.organization_id)

        const { count: locationsCount } = await supabase
          .from("locations")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", profileData.organization_id)

        const lastMonth = new Date()
        lastMonth.setMonth(lastMonth.getMonth() - 1)
        lastMonth.setDate(1)
        const lastMonthEnd = new Date()
        lastMonthEnd.setDate(0)

        const { count: prevLotsCount } = await supabase
          .from("traceability_lots")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", profileData.organization_id)
          .lte("created_at", lastMonthEnd.toISOString())

        const { count: prevEventsCount } = await supabase
          .from("cte_events")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", profileData.organization_id)
          .lte("created_at", lastMonthEnd.toISOString())

        setPrevMonthStats({
          lotsCount: prevLotsCount || 0,
          eventsCount: prevEventsCount || 0,
        })

        setStats({
          lotsCount: lotsCount || 0,
          eventsCount: eventsCount || 0,
          locationsCount: locationsCount || 0,
        })

        const { data: lots } = await supabase
          .from("traceability_lots")
          .select("*")
          .eq("organization_id", profileData.organization_id)

        const completeKDEs =
          lots?.filter((lot) => lot.lot_code && lot.product_description && lot.quantity && lot.production_date)
            .length || 0

        const calculatedScore = lots && lots.length > 0 ? (completeKDEs / lots.length) * 100 : 0
        setComplianceScore(calculatedScore)

        const { data: eventsData } = await supabase
          .from("cte_events")
          .select(
            `
          *,
          locations(location_name)
        `,
          )
          .eq("organization_id", profileData.organization_id)
          .order("created_at", { ascending: false })
          .limit(5)

        setRecentEvents(eventsData || [])

        const { data: allCteEvents } = await supabase
          .from("cte_events")
          .select("event_type")
          .eq("organization_id", profileData.organization_id)
          .order("event_datetime", { ascending: false })

        if (allCteEvents && allCteEvents.length > 0) {
          const completed = Array.from(new Set(allCteEvents.map((e) => e.event_type)))
          setCteCompletedStages(completed)
          setCteCurrentStage(allCteEvents[0]?.event_type || null)
        } else {
          setCteCompletedStages([])
          setCteCurrentStage(null)
        }
      }
    }

    loadData()
  }, [])

  async function fetchComplianceAlerts(supabase: any, orgId: string, orgData: any) {
    const alerts: ComplianceAlert[] = []

    const { data: lotsData } = await supabase
      .from("traceability_lots")
      .select("id, status")
      .eq("organization_id", orgId)
      .limit(100)

    if (lotsData && lotsData.length > 0) {
      const lotsNeedingReview = lotsData.filter((lot: any) => !lot.status || lot.status === "active").length

      if (lotsNeedingReview > 5) {
        alerts.push({
          id: "incomplete-transformation",
          title: "Incomplete Transformation Data",
          description: `Phát hiện ${lotsNeedingReview} lô hàng cần cập nhật trạng thái theo chuẩn FSMA.`,
          severity: "critical",
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          timeAgo: "2 giờ trước",
        })
      }
    }

    if (orgData) {
      const { data: alertData } = await supabase
        .from("organization_alert_dashboard")
        .select("*")
        .eq("id", orgId)
        .single()

      if (alertData && alertData.action_required) {
        const daysUntilExpiry = alertData.days_until_agent_expiry || alertData.days_until_fda_renewal

        if (daysUntilExpiry !== null && daysUntilExpiry <= 30) {
          alerts.push({
            id: "fda-response-due",
            title: "FDA Response Due",
            description: alertData.alert_message || `Cần phản hồi FDA trong vòng ${daysUntilExpiry} ngày tới.`,
            severity: alertData.alert_level === "critical" ? "critical" : "warning",
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
            timeAgo: "4 giờ trước",
          })
        }
      }

      if (
        orgData.fda_registration_status !== "active" ||
        !orgData.us_agent_name ||
        !orgData.us_agent_email ||
        !orgData.poa_signed
      ) {
        alerts.push({
          id: "fda-registration-incomplete",
          title: "Thiếu thông tin đăng ký FDA",
          description: "Vui lòng bổ sung các thông tin bắt buộc để xuất báo cáo tuân thủ FDA.",
          severity: "warning",
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          timeAgo: "1 ngày trước",
        })
      }
    }

    setComplianceAlerts(alerts)
  }

  const getCTEIcon = (eventType: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      harvesting: <Sprout className="w-6 h-6" />,
      cooling: <Snowflake className="w-6 h-6" />,
      initial_packing: <Package className="w-6 h-6" />,
      shipping: <Truck className="w-6 h-6" />,
      receiving: <Download className="w-6 h-6" />,
      transformation: <Layers className="w-6 h-6" />,
      first_receiver: <Building className="w-6 h-6" />,
    }
    return iconMap[eventType] || <Activity className="w-6 h-6" />
  }

  const getCTEColor = (eventType: string) => {
    const colorMap: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
      harvesting: {
        bg: "bg-green-500/10",
        text: "text-green-400",
        border: "border-green-500/20",
        gradient: "bg-gradient-to-br from-green-500 to-emerald-500",
      },
      cooling: {
        bg: "bg-blue-500/10",
        text: "text-blue-400",
        border: "border-blue-500/20",
        gradient: "bg-gradient-to-br from-blue-500 to-cyan-500",
      },
      initial_packing: {
        bg: "bg-amber-500/10",
        text: "text-amber-400",
        border: "border-amber-500/20",
        gradient: "bg-gradient-to-br from-amber-500 to-orange-500",
      },
      shipping: {
        bg: "bg-purple-500/10",
        text: "text-purple-400",
        border: "border-purple-500/20",
        gradient: "bg-gradient-to-br from-purple-500 to-pink-500",
      },
      receiving: {
        bg: "bg-teal-500/10",
        text: "text-teal-400",
        border: "border-teal-500/20",
        gradient: "bg-gradient-to-br from-teal-500 to-cyan-500",
      },
      transformation: {
        bg: "bg-rose-500/10",
        text: "text-rose-400",
        border: "border-rose-500/20",
        gradient: "bg-gradient-to-br from-rose-500 to-pink-500",
      },
      first_receiver: {
        bg: "bg-indigo-500/10",
        text: "text-indigo-400",
        border: "border-indigo-500/20",
        gradient: "bg-gradient-to-br from-indigo-500 to-purple-500",
      },
    }
    return (
      colorMap[eventType] || {
        bg: "bg-slate-500/10",
        text: "text-slate-400",
        border: "border-slate-500/20",
        gradient: "bg-gradient-to-br from-slate-500 to-gray-500",
      }
    )
  }

  const lotsTrend =
    prevMonthStats.lotsCount > 0 ? ((stats.lotsCount - prevMonthStats.lotsCount) / prevMonthStats.lotsCount) * 100 : 0

  const eventsTrend =
    prevMonthStats.eventsCount > 0
      ? ((stats.eventsCount - prevMonthStats.eventsCount) / prevMonthStats.eventsCount) * 100
      : 0

  const formatTrend = (trend: number) => {
    const sign = trend >= 0 ? "+" : ""
    return `${sign}${trend.toFixed(1)}% ${t("dashboard.stats.fromLastMonth")}`
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex-1 overflow-auto">
      <ProductTour userRole={profile?.role} />

      <div className="p-8 max-w-[1600px] mx-auto space-y-8">
        <div className="glass-strong border border-white/10 p-8 rounded-[2.5rem]" data-tour="dashboard-overview">
          <div className="animate-in fade-in slide-in-from-left duration-700">
            <h1 className="text-4xl font-black tracking-tight text-white">{t("dashboard.title")}</h1>
            <p className="text-slate-400 mt-1 text-base">
              {t("dashboard.welcome")},{" "}
              <span className="text-emerald-400 font-bold">{profile?.full_name || user.email}</span>
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title={t("dashboard.stats.totalLots")}
              value={stats.lotsCount.toString()}
              description={t("dashboard.stats.totalLotsDesc")}
              icon={<Package className="w-7 h-7" />}
              trend={formatTrend(lotsTrend)}
              colorClass="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              iconBg="gradient-emerald"
            />
            <StatsCard
              title={t("dashboard.stats.cteEvents")}
              value={stats.eventsCount.toString()}
              description={t("dashboard.stats.cteEventsDesc")}
              icon={<Activity className="w-7 h-7" />}
              trend={formatTrend(eventsTrend)}
              colorClass="bg-blue-500/20 text-blue-400 border border-blue-500/30"
              iconBg="bg-gradient-to-br from-blue-500 to-cyan-500"
            />
            <StatsCard
              title={t("dashboard.stats.locations")}
              value={stats.locationsCount.toString()}
              description={t("dashboard.stats.locationsDesc")}
              icon={<MapPin className="w-7 h-7" />}
              colorClass="bg-purple-500/20 text-purple-400 border border-purple-500/30"
              iconBg="bg-gradient-to-br from-purple-500 to-pink-500"
            />
            <div className="glass-strong border border-emerald-500/30 p-6 rounded-[2rem] relative overflow-hidden group hover:border-emerald-500/50 transition-all duration-300">
              <div className="absolute -top-4 -right-4 opacity-5 group-hover:scale-110 transition-transform">
                <Shield className="w-32 h-32 text-emerald-500" />
              </div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="p-3 rounded-2xl gradient-emerald text-white shadow-glow-emerald">
                  <Shield className="w-7 h-7" />
                </div>
                {complianceScore >= 90 && (
                  <span className="bg-emerald-500 text-white text-xs font-black px-2.5 py-1 rounded-lg shadow-lg uppercase tracking-widest">
                    {t("dashboard.stats.excellent")}
                  </span>
                )}
                {complianceScore >= 70 && complianceScore < 90 && (
                  <span className="bg-yellow-500 text-white text-xs font-black px-2.5 py-1 rounded-lg shadow-lg uppercase tracking-widest">
                    GOOD
                  </span>
                )}
                {complianceScore < 70 && (
                  <span className="bg-amber-500 text-white text-xs font-black px-2.5 py-1 rounded-lg shadow-lg uppercase tracking-widest">
                    NEEDS WORK
                  </span>
                )}
              </div>
              <p className="text-6xl font-extrabold text-white relative z-10">
                {complianceScore > 0 ? `${complianceScore.toFixed(1)}%` : "N/A"}
              </p>
              <p className="text-base text-emerald-400 mt-2 font-bold relative z-10">
                {t("dashboard.stats.compliance")}
              </p>
              <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold relative z-10">
                {complianceScore > 0
                  ? t("dashboard.stats.complianceDesc")
                  : "Create lots with complete KDEs to see score"}
              </p>
            </div>
          </div>

          <div className="glass-strong border border-white/10 p-8 rounded-[2.5rem] hover:border-emerald-500/20 transition-all duration-300 mt-8">
            <h3 className="text-xl font-bold mb-8 flex items-center gap-3 text-white">
              <span className="w-1.5 h-6 bg-gradient-to-b from-emerald-400 to-teal-500 rounded-full shadow-glow-emerald"></span>
              {t("dashboard.quickActions")}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <QuickActionButton
                href="/dashboard/lots/new"
                icon={<PlusCircle className="w-6 h-6" />}
                label={t("dashboard.createLot")}
                color="text-emerald-400"
              />
              <QuickActionButton
                href="/dashboard/cte-events/new"
                icon={<FileText className="w-6 h-6" />}
                label={t("dashboard.logEvent")}
                color="text-blue-400"
              />
              <QuickActionButton
                href="/dashboard/locations/new"
                icon={<MapPin className="w-6 h-6" />}
                label={t("dashboard.addLocation")}
                color="text-purple-400"
              />
              <QuickActionButton
                href="/dashboard/reports"
                icon={<TrendingUp className="w-6 h-6" />}
                label={t("dashboard.viewReports")}
                color="text-amber-400"
              />
            </div>
          </div>

          {organization && (
            <div className="mt-8">
              <CTEFlowDiagram
                organizationType={organization.organization_type}
                organizationName={organization.name}
                completedStages={cteCompletedStages}
                currentStage={cteCurrentStage}
              />
            </div>
          )}

          <div className="grid gap-8 lg:grid-cols-2 mt-8">
            {profile?.organization_id && <DualComplianceWidget organizationId={profile.organization_id} />}
            {profile?.organization_id && <PendingApprovalsWidget organizationId={profile.organization_id} />}

            <div className="glass-strong border border-white/10 p-8 rounded-[2.5rem]">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold text-white">{t("dashboard.recentEvents")}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-xl"
                >
                  <Link href="/dashboard/cte-events" className="text-sm font-bold flex items-center gap-1">
                    {t("dashboard.viewAll")} <ChevronRight className="w-3 h-3" />
                  </Link>
                </Button>
              </div>
              <div className="space-y-4">
                {recentEvents && recentEvents.length > 0 ? (
                  recentEvents.map((event: any) => {
                    const colors = getCTEColor(event.event_type)
                    const icon = getCTEIcon(event.event_type)

                    return (
                      <Link
                        key={event.id}
                        href={`/dashboard/cte-events?eventId=${event.id}`}
                        className="flex items-center justify-between p-5 rounded-3xl glass-light border border-white/5 hover:border-white/10 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-5">
                          <div
                            className={`w-12 h-12 rounded-2xl ${colors.bg} ${colors.text} flex items-center justify-center group-hover:scale-110 transition-transform border ${colors.border} shadow-lg`}
                          >
                            {icon}
                          </div>
                          <div>
                            <p className="font-bold text-white capitalize text-base">
                              {t(`cte.${event.event_type.replace("_", "")}` as any) ||
                                event.event_type.replace("_", " ")}
                            </p>
                            <p className="text-xs text-slate-500 font-medium uppercase mt-1">
                              {event.locations?.location_name || "N/A"} •{" "}
                              {new Date(event.event_datetime).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="px-4 py-1.5 bg-emerald-500/10 text-emerald-400 text-xs font-black rounded-full border border-emerald-500/20 uppercase">
                          {t("dashboard.completed")}
                        </div>
                      </Link>
                    )
                  })
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-base font-medium">{t("dashboard.noEvents")}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="glass-strong border border-white/10 p-8 rounded-[2.5rem]">
              <h3 className="text-xl font-bold mb-8 text-white">{t("dashboard.complianceAlerts")}</h3>
              <div className="space-y-6">
                {complianceAlerts.length > 0 ? (
                  complianceAlerts.map((alert, index) => (
                    <div
                      key={alert.id}
                      className={`flex gap-5 group ${index > 0 ? "border-t border-white/5 pt-6" : ""}`}
                    >
                      <div className="relative">
                        <div
                          className={`w-2.5 h-2.5 rounded-full mt-2 ${
                            alert.severity === "critical"
                              ? "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.6)]"
                              : alert.severity === "warning"
                                ? "bg-amber-500 shadow-[0_0_12px_rgba(251,191,36,0.6)]"
                                : "bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]"
                          }`}
                        ></div>
                        {alert.severity === "critical" && (
                          <div className="absolute top-2 left-0 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <p
                            className={`font-bold text-base group-hover:transition-colors ${
                              alert.severity === "critical"
                                ? "text-white group-hover:text-rose-400"
                                : "text-white group-hover:text-amber-400"
                            }`}
                          >
                            {alert.title}
                          </p>
                          <span className="text-xs font-black text-slate-600 flex items-center gap-1 uppercase">
                            <Clock className="w-3 h-3" /> {alert.timeAgo}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 mt-1 leading-relaxed">{alert.description}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50 text-emerald-500" />
                    <p className="text-base font-medium">Không có cảnh báo tuân thủ</p>
                    <p className="text-xs text-slate-500 mt-1">Hệ thống đang hoạt động bình thường</p>
                  </div>
                )}
              </div>
            </div>

            <ExpirationAlertsWidget />
            <InventoryLevelsWidget />
          </div>
        </div>
      </div>
    </div>
  )
}
