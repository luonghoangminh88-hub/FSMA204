"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, XCircle, Calendar, FileText, ExternalLink, X } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useLanguage } from "@/hooks/use-language"

interface AlertData {
  alert_level: string
  alert_message: string
  days_until_fda_renewal: number | null
  days_until_agent_expiry: number | null
  action_required: boolean
  can_export_fda: boolean
  fda_registration_status: string
  agent_contract_status: string
  recommended_action: string | null
}

export function AgentAlertBanner({ organizationId }: { organizationId: string }) {
  const { t } = useLanguage()
  const [alertData, setAlertData] = useState<AlertData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    async function fetchAlertData() {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("organization_alert_dashboard")
        .select("*")
        .eq("id", organizationId)
        .single()

      if (!error && data) {
        setAlertData(data)
      }

      setLoading(false)
    }

    fetchAlertData()

    // Refresh every 5 minutes
    const interval = setInterval(fetchAlertData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [organizationId])

  if (loading || !alertData || dismissed || alertData.alert_level === "safe") {
    return null
  }

  const isCritical = alertData.alert_level === "critical"
  const isWarning = alertData.alert_level === "warning"

  return (
    <Alert
      variant={isCritical ? "destructive" : isWarning ? "default" : "default"}
      className={`mb-6 border-2 ${
        isCritical
          ? "bg-red-50 dark:bg-red-950/20 border-red-500"
          : "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-500"
      }`}
    >
      <div className="flex items-center justify-between gap-6">
        {/* Left: Icon and Message */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="shrink-0">
            {isCritical ? (
              <XCircle className="size-6 text-red-600" />
            ) : (
              <AlertTriangle className="size-6 text-yellow-600" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <AlertTitle className="text-base font-bold">
                {isCritical ? t("vexim.alerts.critical") : t("vexim.alerts.warning")}
              </AlertTitle>

              {/* Status Badges inline */}
              <div className="flex items-center gap-2">
                <Badge
                  variant={alertData.fda_registration_status === "active" ? "default" : "destructive"}
                  className="text-xs"
                >
                  FDA: {alertData.fda_registration_status?.toUpperCase() || "N/A"}
                </Badge>
                <Badge
                  variant={alertData.agent_contract_status === "active" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {t("vexim.alerts.agent")}: {alertData.agent_contract_status?.toUpperCase() || "N/A"}
                </Badge>
                {isCritical && (
                  <Badge variant="destructive" className="animate-pulse text-xs">
                    {t("vexim.alerts.exportBlocked")}
                  </Badge>
                )}
              </div>
            </div>

            {/* Message and action in one line */}
            <div className="flex items-center gap-4 text-sm">
              <AlertDescription className="text-sm">{alertData.alert_message}</AlertDescription>

              {alertData.recommended_action && (
                <span className="text-sm text-muted-foreground shrink-0">
                  <strong>{t("vexim.alerts.recommendedAction")}:</strong> {alertData.recommended_action}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Middle: Deadline Info */}
        <div className="flex items-center gap-6 shrink-0">
          {alertData.days_until_fda_renewal !== null && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="size-4" />
              <span>
                {t("vexim.alerts.fdaRenewal")}:{" "}
                <strong className="text-base">{alertData.days_until_fda_renewal}</strong> {t("common.days")}
              </span>
            </div>
          )}

          {alertData.days_until_agent_expiry !== null && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="size-4" />
              <span>
                {t("vexim.alerts.agentExpiry")}:{" "}
                <strong className="text-base">{alertData.days_until_agent_expiry}</strong> {t("common.days")}
              </span>
            </div>
          )}
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button variant={isCritical ? "default" : "secondary"} size="sm" asChild>
            <Link href="/dashboard/settings/fda">
              <FileText className="size-4 mr-2" />
              {isCritical ? t("vexim.alerts.updateNow") : t("vexim.alerts.reviewSettings")}
            </Link>
          </Button>

          <Button variant="outline" size="sm" asChild>
            <Link
              href="https://www.fda.gov/food/food-facility-registration-fsvp/how-register-your-food-facility-fda"
              target="_blank"
            >
              {t("vexim.alerts.fdaGuide")}
              <ExternalLink className="size-4 ml-2" />
            </Link>
          </Button>

          {!isCritical && (
            <Button variant="ghost" size="icon" onClick={() => setDismissed(true)}>
              <X className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </Alert>
  )
}
