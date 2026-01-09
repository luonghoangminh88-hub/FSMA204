"use client"

import { useEffect, useState } from "react"
import { useLanguage } from "@/hooks/use-language"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Clock, CheckCircle2, XCircle, AlertTriangle, Package, Truck, Inbox } from "lucide-react"
import { toast } from "sonner"

interface Approval {
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

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const { t } = useLanguage() // Added useLanguage hook

  useEffect(() => {
    loadApprovals()
  }, [])

  async function loadApprovals() {
    try {
      setLoading(true)
      const response = await fetch("/api/approvals/list")
      const data = await response.json()

      if (data.error) throw new Error(data.error)

      setApprovals(data.approvals || [])
    } catch (error: any) {
      console.error("[v0] Error loading approvals:", error)
      toast.error("Không thể tải danh sách phê duyệt")
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(approval: Approval) {
    try {
      setProcessing(true)
      const response = await fetch("/api/approvals/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: approval.id,
          approvalType: approval.approval_type,
        }),
      })

      const data = await response.json()

      if (data.error) throw new Error(data.error)

      toast.success("Đã phê duyệt thành công")
      await loadApprovals()
    } catch (error: any) {
      console.error("[v0] Error approving:", error)
      toast.error(error.message || "Không thể phê duyệt")
    } finally {
      setProcessing(false)
    }
  }

  async function handleReject() {
    if (!selectedApproval || !rejectionReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối")
      return
    }

    try {
      setProcessing(true)
      const response = await fetch("/api/approvals/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: selectedApproval.id,
          approvalType: selectedApproval.approval_type,
          reason: rejectionReason,
        }),
      })

      const data = await response.json()

      if (data.error) throw new Error(data.error)

      toast.success("Đã từ chối thành công")
      setShowRejectDialog(false)
      setRejectionReason("")
      setSelectedApproval(null)
      await loadApprovals()
    } catch (error: any) {
      console.error("[v0] Error rejecting:", error)
      toast.error(error.message || "Không thể từ chối")
    } finally {
      setProcessing(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "transformation":
        return <Package className="w-5 h-5" />
      case "shipping":
        return <Truck className="w-5 h-5" />
      case "receiving":
        return <Inbox className="w-5 h-5" />
      default:
        return <Clock className="w-5 h-5" />
    }
  }

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {t("approvals.urgentCritical")}
          </Badge>
        )
      case "warning":
        return (
          <Badge variant="outline" className="border-amber-500 text-amber-400">
            {t("approvals.urgentWarning")}
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="border-blue-500 text-blue-400">
            {t("approvals.urgentNormal")}
          </Badge>
        )
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "transformation":
        return t("approvals.transformationType")
      case "shipping":
        return t("approvals.shippingType")
      case "receiving":
        return t("approvals.receivingType")
      default:
        return type
    }
  }

  const filteredApprovals = approvals.filter((a) => filterType === "all" || a.approval_type === filterType)

  const stats = {
    total: approvals.length,
    critical: approvals.filter((a) => a.urgency === "critical").length,
    transformation: approvals.filter((a) => a.approval_type === "transformation").length,
    shipping: approvals.filter((a) => a.approval_type === "shipping").length,
    receiving: approvals.filter((a) => a.approval_type === "receiving").length,
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <Clock className="w-12 h-12 text-amber-400 mx-auto mb-4 animate-spin" />
          <p className="text-slate-400">{t("approvals.loading")}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">{t("approvals.title")}</h1>
        <p className="text-slate-400">{t("approvals.description")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-strong border-amber-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-400">{t("approvals.totalPending")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-400">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="glass-strong border-red-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-400">{t("approvals.critical")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-400">{stats.critical}</div>
          </CardContent>
        </Card>

        <Card className="glass-strong border-blue-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-400">{t("approvals.transformation")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400">{stats.transformation}</div>
          </CardContent>
        </Card>

        <Card className="glass-strong border-emerald-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-400">{t("approvals.shipping")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-400">{stats.shipping}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-strong border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("approvals.approvalList")}</CardTitle>
              <CardDescription>
                {filteredApprovals.length} {t("approvals.itemsToProcess")}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterType("all")}
                className={filterType === "all" ? "bg-white/10" : ""}
              >
                {t("approvals.allFilter")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterType("transformation")}
                className={filterType === "transformation" ? "bg-white/10" : ""}
              >
                {t("approvals.transformationFilter")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterType("shipping")}
                className={filterType === "shipping" ? "bg-white/10" : ""}
              >
                {t("approvals.shippingFilter")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterType("receiving")}
                className={filterType === "receiving" ? "bg-white/10" : ""}
              >
                {t("approvals.receivingFilter")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredApprovals.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4 opacity-50" />
              <p className="text-slate-400 text-lg">{t("approvals.noItemsNeeded")}</p>
              <p className="text-slate-500 text-sm mt-2">{t("approvals.allProcessed")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredApprovals.map((approval) => (
                <Card key={approval.id} className="glass-strong border-white/5 hover:border-white/10 transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="p-3 rounded-xl bg-white/5">{getTypeIcon(approval.approval_type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{getTypeLabel(approval.approval_type)}</Badge>
                            {getUrgencyBadge(approval.urgency)}
                          </div>
                          <h3 className="text-lg font-semibold text-white mb-1">{approval.item_description}</h3>
                          <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                            <div>
                              <p className="text-slate-500">{t("approvals.quantity")}</p>
                              <p className="text-slate-300 font-medium">{approval.quantity}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">{t("approvals.location")}</p>
                              <p className="text-slate-300 font-medium">{approval.location_name}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">{t("approvals.creator")}</p>
                              <p className="text-slate-300 font-medium">{approval.created_by_name}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">{t("approvals.waitTime")}</p>
                              <p className="text-slate-300 font-medium">
                                {Math.round(approval.hours_pending)} {t("approvals.hours")}
                              </p>
                            </div>
                          </div>
                          {approval.details && (
                            <div className="mt-3">
                              <p className="text-slate-500 text-sm">{t("approvals.details")}</p>
                              <p className="text-slate-300 text-sm">{approval.details}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={() => handleApprove(approval)}
                          disabled={processing}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          {t("approvals.approve")}
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedApproval(approval)
                            setShowRejectDialog(true)
                          }}
                          disabled={processing}
                          variant="destructive"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          {t("approvals.reject")}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="glass-strong border-white/10">
          <DialogHeader>
            <DialogTitle>{t("approvals.rejectDialog")}</DialogTitle>
            <DialogDescription>{t("approvals.rejectDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="reason">{t("approvals.rejectReason")}</Label>
              <Textarea
                id="reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={t("approvals.rejectPlaceholder")}
                className="mt-2 min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)} disabled={processing}>
              {t("approvals.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={processing || !rejectionReason.trim()}>
              {t("approvals.confirmReject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
