"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, CheckCircle2, AlertTriangle, ChevronRight, Package, Truck, Inbox } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/hooks/use-language"

interface PendingApproval {
  id: string
  approval_type: string
  organization_id: string
  event_date: string
  item_description: string
  quantity: string
  details: string
  location_name: string
  created_by_name: string
  created_at: string
  hours_pending: number
  urgency: "critical" | "warning" | "normal"
}

export function PendingApprovalsWidget({ organizationId }: { organizationId: string }) {
  const [approvals, setApprovals] = useState<PendingApproval[]>([])
  const [loading, setLoading] = useState(true)
  const [count, setCount] = useState(0)
  const router = useRouter()
  const { t } = useLanguage()

  useEffect(() => {
    loadApprovals()
  }, [organizationId])

  async function loadApprovals() {
    try {
      const supabase = createBrowserClient()

      // Get count
      const { data: countData } = await supabase.rpc("get_pending_approvals_count", {
        p_organization_id: organizationId,
      })

      setCount(countData || 0)

      // Get top 5 pending approvals
      const { data, error } = await supabase
        .from("pending_approvals_dashboard")
        .select("*")
        .eq("organization_id", organizationId)
        .order("urgency", { ascending: false })
        .order("hours_pending", { ascending: false })
        .limit(5)

      if (error) throw error

      setApprovals(data || [])
    } catch (error) {
      console.error("Error loading approvals:", error)
    } finally {
      setLoading(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "transformation":
        return <Package className="w-4 h-4" />
      case "shipping":
        return <Truck className="w-4 h-4" />
      case "receiving":
        return <Inbox className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      case "warning":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30"
      default:
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "transformation":
        return "Chuyển đổi"
      case "shipping":
        return "Vận chuyển"
      case "receiving":
        return "Nhận hàng"
      default:
        return type
    }
  }

  if (loading) {
    return (
      <Card className="glass-strong border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            {t("dashboard.pendingApprovals")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-400">{t("common.loading")}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-strong border-white/10 hover:border-amber-500/20 transition-all duration-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-white">{t("dashboard.pendingApprovals")}</CardTitle>
              <CardDescription>
                {count} {t("dashboard.pendingApprovalsDesc")}
              </CardDescription>
            </div>
          </div>
          {count > 0 && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
            >
              <Link href="/dashboard/approvals" className="flex items-center gap-1">
                {t("dashboard.viewAllApprovals")} <ChevronRight className="w-4 h-4" />
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {approvals.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-50" />
            <p className="text-slate-400 text-sm">{t("dashboard.noPendingApprovals")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {approvals.map((approval) => (
              <div
                key={approval.id}
                className={`p-4 rounded-xl border ${getUrgencyColor(approval.urgency)} hover:scale-[1.02] transition-transform cursor-pointer`}
                onClick={() => router.push(`/dashboard/approvals?id=${approval.id}&type=${approval.approval_type}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {getTypeIcon(approval.approval_type)}
                        <span className="ml-1">{getTypeLabel(approval.approval_type)}</span>
                      </Badge>
                      {approval.urgency === "critical" && (
                        <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
                      )}
                    </div>
                    <p className="font-semibold text-white text-sm truncate">{approval.item_description}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {approval.quantity} • {approval.location_name}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {t("dashboard.waitingHours")} {Math.round(approval.hours_pending)}h • {t("dashboard.by")}{" "}
                      {approval.created_by_name}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
