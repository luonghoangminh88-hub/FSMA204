"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle2, AlertTriangle, XCircle, Lock, Settings, Shield } from "lucide-react"
import type { ComplianceReadiness } from "@/lib/vexim-types"
import { useLanguage } from "@/hooks/use-language"
import Link from "next/link"

export function DualComplianceWidget({ organizationId }: { organizationId?: string }) {
  const { t } = useLanguage()
  const [readiness, setReadiness] = useState<ComplianceReadiness | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (organizationId) {
      fetchComplianceReadiness()
    }
  }, [organizationId])

  async function fetchComplianceReadiness() {
    try {
      const response = await fetch(`/api/vexim/compliance-readiness?organizationId=${organizationId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch compliance readiness")
      }
      const data = await response.json()
      setReadiness(data)
    } catch (error) {
      console.error("[v0] Error fetching compliance readiness:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="glass-strong border border-white/10 p-8 rounded-[2.5rem]">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-6 h-6 text-emerald-400" />
          <h3 className="text-xl font-bold text-white">{t("vexim.dualCompliance")}</h3>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-white/5 rounded-full" />
          <div className="h-4 bg-white/5 rounded-full w-2/3" />
        </div>
      </div>
    )
  }

  if (!readiness) {
    return null
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-400"
    if (score >= 75) return "text-amber-400"
    return "text-rose-400"
  }

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <CheckCircle2 className="w-5 h-5 text-emerald-400" />
    if (score >= 75) return <AlertTriangle className="w-5 h-5 text-amber-400" />
    return <XCircle className="w-5 h-5 text-rose-400" />
  }

  const getScoreBg = (score: number) => {
    if (score >= 90) return "border-emerald-500/30 bg-emerald-500/5"
    if (score >= 75) return "border-amber-500/30 bg-amber-500/5"
    return "border-rose-500/30 bg-rose-500/5"
  }

  return (
    <div className={`glass-strong border p-8 rounded-[2.5rem] ${getScoreBg(readiness.overallReadiness)}`}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
            <Shield className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{t("vexim.exportReadiness")}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{t("vexim.exportReadinessDesc")}</p>
          </div>
        </div>
        {getScoreIcon(readiness.overallReadiness)}
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-slate-300">{t("vexim.overallReadiness")}</span>
            <span className={`text-3xl font-black ${getScoreColor(readiness.overallReadiness)}`}>
              {readiness.overallReadiness.toFixed(1)}%
            </span>
          </div>
          <div className="relative h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                readiness.overallReadiness >= 90
                  ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                  : readiness.overallReadiness >= 75
                    ? "bg-gradient-to-r from-amber-500 to-orange-400"
                    : "bg-gradient-to-r from-rose-500 to-pink-400"
              }`}
              style={{ width: `${readiness.overallReadiness}%` }}
            />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">
              {t("vexim.dataReadiness")}
            </span>
            <span className={`text-base font-black ${getScoreColor(readiness.dataReadinessScore)}`}>
              {readiness.dataReadinessScore.toFixed(1)}%
            </span>
          </div>
          <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${readiness.dataReadinessScore}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">{t("vexim.dataReadinessDesc")}</p>
        </div>

        <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">
                {t("vexim.legalReadiness")}
              </span>
              {!readiness.canExportFDA && <Lock className="w-3 h-3 text-amber-400" />}
            </div>
            <span className={`text-base font-black ${getScoreColor(readiness.legalReadinessScore)}`}>
              {readiness.legalReadinessScore.toFixed(1)}%
            </span>
          </div>
          <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${readiness.legalReadinessScore}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">{t("vexim.legalReadinessDesc")}</p>
        </div>

        <div className="pt-4 border-t border-white/10 space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-sm font-bold text-slate-200">{t("vexim.internalExport")}</span>
            <Badge className="bg-emerald-500 text-white border-none shadow-glow-emerald">{t("vexim.available")}</Badge>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-sm font-bold text-slate-200">{t("vexim.fdaExport")}</span>
            {readiness.canExportFDA ? (
              <Badge className="bg-blue-500 text-white border-none">{t("vexim.available")}</Badge>
            ) : (
              <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 gap-1">
                <Lock className="w-3 h-3" />
                {t("vexim.locked")}
              </Badge>
            )}
          </div>
        </div>

        {readiness.missingFields.length > 0 && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30">
            <div className="flex items-start gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-200">{t("vexim.missingFields")}</p>
                <ul className="text-xs text-amber-300 mt-2 space-y-1">
                  {readiness.missingFields.map((field) => (
                    <li key={field} className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-amber-400"></span>
                      {field}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <Button size="sm" asChild className="w-full gradient-rose text-white font-bold border-none shadow-lg">
              <Link href="/dashboard/settings/fda">
                <Settings className="w-3 h-3 mr-1.5" />
                {t("vexim.setupFDA")}
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
