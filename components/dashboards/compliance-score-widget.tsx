"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"

interface ComplianceData {
  organization_name: string
  total_lots: number
  complete_lots: number
  lot_completeness_score: number
  cte_completeness_score: number
  traceability_coverage: number
  overall_compliance_score: number
  lots_missing_tlc: number
}

export function ComplianceScoreWidget({ organizationId }: { organizationId?: string }) {
  const [data, setData] = useState<ComplianceData | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient()

  useEffect(() => {
    fetchComplianceData()
  }, [organizationId])

  async function fetchComplianceData() {
    try {
      const params = organizationId ? `?organizationId=${organizationId}` : ""
      const response = await fetch(`/api/dashboards/compliance${params}`)
      const result = await response.json()

      if (result.success && result.data.length > 0) {
        setData(result.data[0])
      }
    } catch (error) {
      console.error("[v0] Error fetching compliance data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Compliance Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return null
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600"
    if (score >= 75) return "text-yellow-600"
    return "text-red-600"
  }

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <CheckCircle2 className="size-5 text-green-600" />
    if (score >= 75) return <AlertCircle className="size-5 text-yellow-600" />
    return <XCircle className="size-5 text-red-600" />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>FSMA 204 Compliance Score</span>
          {getScoreIcon(data.overall_compliance_score)}
        </CardTitle>
        <CardDescription>{data.organization_name}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Compliance</span>
            <span className={`text-2xl font-bold ${getScoreColor(data.overall_compliance_score)}`}>
              {data.overall_compliance_score.toFixed(1)}%
            </span>
          </div>
          <Progress value={data.overall_compliance_score} className="h-2" />
        </div>

        {/* Detailed Scores */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Lot Completeness</span>
              <span className="text-sm font-medium">{data.lot_completeness_score.toFixed(1)}%</span>
            </div>
            <Progress value={data.lot_completeness_score} className="h-1.5" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">CTE Coverage</span>
              <span className="text-sm font-medium">{data.cte_completeness_score.toFixed(1)}%</span>
            </div>
            <Progress value={data.cte_completeness_score} className="h-1.5" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Traceability Coverage</span>
              <span className="text-sm font-medium">{data.traceability_coverage.toFixed(1)}%</span>
            </div>
            <Progress value={data.traceability_coverage} className="h-1.5" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t">
          <div>
            <div className="text-xs text-muted-foreground">Total Lots</div>
            <div className="text-lg font-semibold">{data.total_lots}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Complete Lots</div>
            <div className="text-lg font-semibold">{data.complete_lots}</div>
          </div>
        </div>

        {/* Warnings */}
        {data.lots_missing_tlc > 0 && (
          <Badge variant="destructive" className="w-full justify-center">
            {data.lots_missing_tlc} lots missing TLC
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}
