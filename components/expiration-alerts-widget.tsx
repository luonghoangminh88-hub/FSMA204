"use client"

import { useEffect, useState } from "react"
import { useLanguage } from "@/hooks/use-language"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Calendar, Package, MoreVertical, Trash2, Clock } from "lucide-react"
import Link from "next/link"
import { phase2Translations } from "@/lib/cte-form-i18n"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

interface ExpiringLot {
  id: string
  lot_code: string
  product_description: string
  expiration_date: string
  quantity: number
  unit_of_measure: string
  expiration_status: "expired" | "expiring_soon" | "expiring_month"
  days_until_expiration: number
}

export function ExpirationAlertsWidget() {
  const { locale, t } = useLanguage()
  const { toast } = useToast()
  const [lots, setLots] = useState<ExpiringLot[]>([])
  const [loading, setLoading] = useState(true)

  const [extendDialogOpen, setExtendDialogOpen] = useState(false)
  const [selectedLot, setSelectedLot] = useState<ExpiringLot | null>(null)
  const [newExpirationDate, setNewExpirationDate] = useState("")
  const [extensionReason, setExtensionReason] = useState("")
  const [extensionJustification, setExtensionJustification] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchExpiringLots()
  }, [])

  const fetchExpiringLots = async () => {
    try {
      const response = await fetch("/api/lots/expiring?status=all")
      if (response.ok) {
        const data = await response.json()
        setLots(data.lots?.slice(0, 5) || [])
      }
    } catch (error) {
      console.error("[v0] Error fetching expiring lots:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDispose = async (lot: ExpiringLot) => {
    if (!confirm(`Xác nhận thanh lý lô ${lot.lot_code}?`)) return

    setActionLoading(true)
    try {
      const response = await fetch(`/api/lots/${lot.id}/dispose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: lot.quantity,
          reason: lot.expiration_status === "expired" ? "expired" : "quality_issue",
          method: "composting",
          notes: `Thanh lý do ${lot.expiration_status === "expired" ? "hết hạn" : "sắp hết hạn"}`,
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast({
          title: "Thanh lý thành công",
          description: `Lô ${lot.lot_code} đã được thanh lý`,
        })
        fetchExpiringLots()
      } else {
        throw new Error(result.error || "Failed to dispose lot")
      }
    } catch (error: any) {
      toast({
        title: "Lỗi thanh lý",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleExtendShelfLife = async () => {
    if (!selectedLot || !newExpirationDate || !extensionReason) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng điền đầy đủ thông tin",
        variant: "destructive",
      })
      return
    }

    setActionLoading(true)
    try {
      const response = await fetch(`/api/lots/${selectedLot.id}/extend-shelf-life`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          new_expiration_date: newExpirationDate,
          reason: extensionReason,
          justification: extensionJustification,
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast({
          title: "Gia hạn thành công",
          description: `Lô ${selectedLot.lot_code} đã được gia hạn đến ${newExpirationDate}`,
        })
        setExtendDialogOpen(false)
        fetchExpiringLots()
      } else {
        throw new Error(result.error || "Failed to extend shelf life")
      }
    } catch (error: any) {
      toast({
        title: "Lỗi gia hạn",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "expired":
        return <Badge variant="destructive">{phase2Translations[locale]["expiration.expired"]}</Badge>
      case "expiring_soon":
        return (
          <Badge variant="default" className="bg-orange-500">
            {phase2Translations[locale]["expiration.expiringSoon"]}
          </Badge>
        )
      case "expiring_month":
        return <Badge variant="secondary">{phase2Translations[locale]["expiration.expiringMonth"]}</Badge>
      default:
        return null
    }
  }

  const getDaysText = (days: number) => {
    if (days < 0) {
      return phase2Translations[locale]["expiration.expiredDays"].replace("{days}", Math.abs(days).toString())
    }
    return phase2Translations[locale]["expiration.daysRemaining"].replace("{days}", days.toString())
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5" />
            {phase2Translations[locale]["expiration.viewExpiring"]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  if (lots.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="size-5" />
            {phase2Translations[locale]["expiration.viewExpiring"]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{phase2Translations[locale]["expiration.noExpiring"]}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-orange-500" />
            {phase2Translations[locale]["expiration.viewExpiring"]}
          </CardTitle>
          <CardDescription>
            {lots.filter((l) => l.expiration_status === "expired").length} expired,{" "}
            {lots.filter((l) => l.expiration_status === "expiring_soon").length} expiring soon
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {lots.map((lot) => (
              <div key={lot.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                <div className="flex items-start gap-3 flex-1">
                  <Package className="mt-0.5 size-4 text-muted-foreground" />
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{lot.lot_code}</p>
                      {getStatusBadge(lot.expiration_status)}
                    </div>
                    <p className="text-xs text-muted-foreground">{lot.product_description}</p>
                    <p className="text-xs text-muted-foreground">{getDaysText(lot.days_until_expiration)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium whitespace-nowrap">
                    {lot.quantity} {lot.unit_of_measure}
                  </p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedLot(lot)
                          setNewExpirationDate("")
                          setExtensionReason("")
                          setExtensionJustification("")
                          setExtendDialogOpen(true)
                        }}
                        disabled={lot.expiration_status === "expired"}
                      >
                        <Clock className="mr-2 size-4" />
                        Gia hạn hạn sử dụng
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDispose(lot)}
                        disabled={actionLoading}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 size-4" />
                        Thanh lý
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full bg-transparent" asChild>
              <Link href="/dashboard/lots?filter=expiring">View All Expiring Lots</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gia hạn hạn sử dụng</DialogTitle>
            <DialogDescription>Gia hạn hạn sử dụng cho lô {selectedLot?.lot_code}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Hạn sử dụng hiện tại</Label>
              <Input type="date" value={selectedLot?.expiration_date || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Hạn sử dụng mới *</Label>
              <Input
                type="date"
                value={newExpirationDate}
                onChange={(e) => setNewExpirationDate(e.target.value)}
                min={selectedLot?.expiration_date}
              />
            </div>
            <div className="space-y-2">
              <Label>Lý do gia hạn *</Label>
              <Select value={extensionReason} onValueChange={setExtensionReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn lý do" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quality_test_passed">Kiểm tra chất lượng đạt chuẩn</SelectItem>
                  <SelectItem value="storage_condition_optimal">Điều kiện bảo quản tối ưu</SelectItem>
                  <SelectItem value="additional_preservatives">Bổ sung chất bảo quản</SelectItem>
                  <SelectItem value="repackaging">Đóng gói lại</SelectItem>
                  <SelectItem value="other">Khác</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Giải trình chi tiết</Label>
              <Textarea
                value={extensionJustification}
                onChange={(e) => setExtensionJustification(e.target.value)}
                placeholder="Nhập thông tin chi tiết về kiểm tra chất lượng, điều kiện bảo quản..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleExtendShelfLife} disabled={actionLoading}>
              {actionLoading ? "Đang xử lý..." : "Xác nhận gia hạn"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
