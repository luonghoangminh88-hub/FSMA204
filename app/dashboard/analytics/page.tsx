"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AnalyticsChart } from "@/components/fsma/analytics-chart"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import { extendedTranslations } from "@/lib/i18n-extended"
import { LossRateChart } from "@/components/dashboards/loss-rate-chart"

interface AnalyticsData {
  totalEvents: number
  avgLossRate: number
  complianceScore: number
  responseTime: number
  cteActivity: any[]
  lossAnalysis: any[]
  complianceTrend: any[]
  eventDistribution: any[]
  topLocations: any[]
  areasForImprovement: any[]
}

export default function AnalyticsPage() {
  const router = useRouter()
  const { locale } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
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
    const fetchAnalytics = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          router.push("/auth/login")
          return
        }

        const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

        if (!profile) return

        const response = await fetch(`/api/analytics/overview?organizationId=${profile.organization_id}`)
        const result = await response.json()

        if (result.success) {
          setAnalyticsData(result.data)
        }
      } catch (error) {
        console.error("[v0] Error fetching analytics:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [router, supabase])

  if (loading || !analyticsData) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const eventsChange =
    analyticsData.cteActivity.length > 1
      ? ((analyticsData.cteActivity[analyticsData.cteActivity.length - 1].events -
          analyticsData.cteActivity[analyticsData.cteActivity.length - 2].events) /
          analyticsData.cteActivity[analyticsData.cteActivity.length - 2].events) *
        100
      : 0

  const complianceChange =
    analyticsData.complianceTrend.length > 1
      ? analyticsData.complianceTrend[analyticsData.complianceTrend.length - 1].score -
        analyticsData.complianceTrend[analyticsData.complianceTrend.length - 2].score
      : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("analytics.title")}</h1>
        <p className="text-muted-foreground">{t("analytics.description")}</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title={t("analytics.totalEvents")}
          value={analyticsData.totalEvents.toString()}
          change={eventsChange}
          trend={eventsChange > 0 ? "up" : eventsChange < 0 ? "down" : "neutral"}
          t={t}
        />
        <MetricCard
          title={t("analytics.avgLossRate")}
          value={`${analyticsData.avgLossRate.toFixed(2)}%`}
          change={-0.8}
          trend="down"
          t={t}
        />
        <MetricCard
          title={t("analytics.complianceScore")}
          value={`${analyticsData.complianceScore.toFixed(2)}%`}
          change={complianceChange}
          trend={complianceChange > 0 ? "up" : complianceChange < 0 ? "down" : "neutral"}
          t={t}
        />
        <MetricCard
          title={t("analytics.responseTime")}
          value={`${analyticsData.responseTime}h`}
          change={-1.5}
          trend="down"
          t={t}
        />
      </div>

      {/* Charts */}
      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activity">{t("analytics.activity")}</TabsTrigger>
          <TabsTrigger value="compliance">{t("analytics.compliance")}</TabsTrigger>
          <TabsTrigger value="loss">{t("analytics.loss")}</TabsTrigger>
          <TabsTrigger value="lossRate">Loss Rate Trend</TabsTrigger>
          <TabsTrigger value="distribution">{t("analytics.distribution")}</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <AnalyticsChart
            title={t("analytics.cteActivity")}
            description={t("analytics.cteActivityDesc")}
            data={analyticsData.cteActivity}
            type="line"
            dataKey="events"
          />
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <AnalyticsChart
            title={t("analytics.complianceTrend")}
            description={t("analytics.complianceTrendDesc")}
            data={analyticsData.complianceTrend}
            type="line"
            dataKey="score"
          />
        </TabsContent>

        <TabsContent value="loss" className="space-y-4">
          <AnalyticsChart
            title={t("analytics.lossAnalysis")}
            description={t("analytics.lossAnalysisDesc")}
            data={analyticsData.lossAnalysis}
            type="bar"
            dataKey="loss"
          />
        </TabsContent>

        <TabsContent value="lossRate" className="space-y-4">
          <LossRateChart />
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <AnalyticsChart
            title={t("analytics.eventDistribution")}
            description={t("analytics.eventDistributionDesc")}
            data={analyticsData.eventDistribution}
            type="bar"
            dataKey="count"
          />
        </TabsContent>
      </Tabs>

      {/* Detailed Insights */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("analytics.topPerforming")}</CardTitle>
            <CardDescription>{t("analytics.topPerformingDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analyticsData.topLocations.length > 0 ? (
              analyticsData.topLocations.map((location, index) => (
                <LocationItem key={index} name={location.name} score={location.score} rank={index + 1} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No location data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("analytics.areasImprovement")}</CardTitle>
            <CardDescription>{t("analytics.areasImprovementDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analyticsData.areasForImprovement.map((item, index) => (
              <ImprovementItem key={index} title={item.title} current={item.current} target={item.target} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  change,
  trend,
  t,
}: {
  title: string
  value: string
  change: number
  trend: "up" | "down" | "neutral"
  t: (key: string) => string
}) {
  const trendColors = {
    up: "text-green-600",
    down: "text-red-600",
    neutral: "text-muted-foreground",
  }

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className={`flex items-center gap-1 text-xs mt-1 ${trendColors[trend]}`}>
          <TrendIcon className="size-3" />
          <span>
            {Math.abs(change).toFixed(2)}% {t("analytics.fromLastPeriod")}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function LocationItem({ name, score, rank }: { name: string; score: number; rank: number }) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3">
        <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
          {rank}
        </div>
        <span className="font-medium text-sm">{name}</span>
      </div>
      <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
        {score}%
      </Badge>
    </div>
  )
}

function ImprovementItem({ title, current, target }: { title: string; current: number; target: number }) {
  const progress = (current / target) * 100
  const isGood = current >= target

  return (
    <div className="space-y-2 p-3 border rounded-lg">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-muted-foreground">
          {current} / {target}
        </span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className={`h-2 rounded-full ${isGood ? "bg-green-500" : "bg-yellow-500"}`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  )
}
