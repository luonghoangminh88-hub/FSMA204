"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FileText, Download, Upload, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/hooks/use-language"

interface Invoice {
  id: string
  invoice_number: string
  invoice_date: string
  due_date: string
  total_amount: number
  currency: string
  status: "draft" | "sent" | "pending_payment" | "paid" | "overdue" | "cancelled"
  payment_proof_url: string | null
  paid_at: string | null
}

export default function InvoicesPage() {
  const { toast } = useToast()
  const { t, locale } = useLanguage()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    loadInvoices()
  }, [])

  const loadInvoices = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/invoices")
      const data = await response.json()

      if (response.ok) {
        setInvoices(data.invoices || [])
      } else {
        toast({
          title: t("common.error"),
          description: data.error || "Failed to load invoices",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error loading invoices:", error)
      toast({
        title: t("common.error"),
        description: "An error occurred while loading invoices",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadInvoice = (invoiceId: string, invoiceNumber: string) => {
    window.open(`/api/invoices/${invoiceId}/download?lang=${locale}`, "_blank")
  }

  const handleUploadProof = async (file: File) => {
    if (!selectedInvoice) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch(`/api/invoices/${selectedInvoice.id}/upload-proof`, {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: locale === "vi" ? "Thành công" : "Success",
          description:
            locale === "vi"
              ? "Đã tải lên chứng từ thanh toán. Đang chờ xác thực."
              : "Payment proof uploaded. Waiting for verification.",
        })
        setIsUploadDialogOpen(false)
        loadInvoices()
      } else {
        toast({
          title: t("common.error"),
          description: data.error || "Failed to upload payment proof",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error uploading proof:", error)
      toast({
        title: t("common.error"),
        description: "An error occurred while uploading",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const getStatusBadge = (status: Invoice["status"]) => {
    const statusConfig = {
      draft: { label: "Draft", variant: "secondary" as const, icon: FileText },
      sent: { label: "Sent", variant: "default" as const, icon: Clock },
      pending_payment: { label: "Pending Payment", variant: "default" as const, icon: Clock },
      paid: { label: "Paid", variant: "default" as const, icon: CheckCircle },
      overdue: { label: "Overdue", variant: "destructive" as const, icon: AlertCircle },
      cancelled: { label: "Cancelled", variant: "secondary" as const, icon: XCircle },
    }

    const config = statusConfig[status] || statusConfig.draft
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="gap-1.5">
        <Icon className="size-3" />
        {config.label}
      </Badge>
    )
  }

  const formatPrice = (amount: number, currency: string) => {
    if (currency === "VND") {
      return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
      }).format(amount)
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{locale === "vi" ? "Hóa đơn thanh toán" : "Invoices"}</h1>
        <p className="text-muted-foreground mt-2">
          {locale === "vi"
            ? "Quản lý hóa đơn và thanh toán subscription của bạn"
            : "Manage your subscription invoices and payments"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{locale === "vi" ? "Danh sách hóa đơn" : "Invoice List"}</CardTitle>
          <CardDescription>
            {locale === "vi" ? "Xem và tải xuống hóa đơn của bạn" : "View and download your invoices"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-sm text-muted-foreground">{t("common.loading")}</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="size-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{locale === "vi" ? "Chưa có hóa đơn nào" : "No invoices yet"}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{locale === "vi" ? "Số hóa đơn" : "Invoice #"}</TableHead>
                  <TableHead>{locale === "vi" ? "Ngày" : "Date"}</TableHead>
                  <TableHead>{locale === "vi" ? "Hạn thanh toán" : "Due Date"}</TableHead>
                  <TableHead>{locale === "vi" ? "Số tiền" : "Amount"}</TableHead>
                  <TableHead>{locale === "vi" ? "Trạng thái" : "Status"}</TableHead>
                  <TableHead className="text-right">{locale === "vi" ? "Thao tác" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                    <TableCell>{formatDate(invoice.due_date)}</TableCell>
                    <TableCell>{formatPrice(invoice.total_amount, invoice.currency)}</TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadInvoice(invoice.id, invoice.invoice_number)}
                      >
                        <Download className="size-4 mr-2" />
                        {locale === "vi" ? "Tải xuống" : "Download"}
                      </Button>
                      {(invoice.status === "sent" || invoice.status === "pending_payment") && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedInvoice(invoice)
                            setIsUploadDialogOpen(true)
                          }}
                        >
                          <Upload className="size-4 mr-2" />
                          {locale === "vi" ? "Upload chứng từ" : "Upload Proof"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{locale === "vi" ? "Tải lên chứng từ thanh toán" : "Upload Payment Proof"}</DialogTitle>
            <DialogDescription>
              {locale === "vi"
                ? "Tải lên ảnh hoặc PDF của biên lai chuyển khoản"
                : "Upload a photo or PDF of your bank transfer receipt"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="size-12 mx-auto text-muted-foreground mb-4" />
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleUploadProof(file)
                }}
                disabled={isUploading}
                className="block w-full text-sm text-muted-foreground
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary file:text-primary-foreground
                  hover:file:bg-primary/90
                  cursor-pointer"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)} disabled={isUploading}>
              {t("common.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
