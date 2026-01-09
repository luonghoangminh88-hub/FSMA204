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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Download, CheckCircle, XCircle, Clock, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/hooks/use-language"
import Image from "next/image"

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
  organization: {
    organization_name: string
    id: string
  }
}

export default function AdminInvoicesPage() {
  const { toast } = useToast()
  const { t } = useLanguage()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [activeTab, setActiveTab] = useState("pending_payment")

  useEffect(() => {
    loadInvoices()
  }, [])

  const loadInvoices = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/invoices")
      const data = await response.json()

      if (response.ok) {
        setInvoices(data.invoices || [])
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to load invoices",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error loading invoices:", error)
      toast({
        title: "Error",
        description: "An error occurred while loading invoices",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyPayment = async (approve: boolean) => {
    if (!selectedInvoice) return

    setIsVerifying(true)
    try {
      const endpoint = approve
        ? `/api/invoices/${selectedInvoice.id}/verify`
        : `/api/invoices/${selectedInvoice.id}/reject`

      const response = await fetch(endpoint, {
        method: "POST",
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: approve ? "Payment verified and subscription activated" : "Payment rejected",
        })
        setIsVerifyDialogOpen(false)
        loadInvoices()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to process payment",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error verifying payment:", error)
      toast({
        title: "Error",
        description: "An error occurred while processing",
        variant: "destructive",
      })
    } finally {
      setIsVerifying(false)
    }
  }

  const getStatusBadge = (status: Invoice["status"]) => {
    const statusConfig = {
      draft: { label: "Draft", variant: "secondary" as const },
      sent: { label: "Sent", variant: "default" as const },
      pending_payment: { label: "Pending Verification", variant: "default" as const },
      paid: { label: "Paid", variant: "default" as const },
      overdue: { label: "Overdue", variant: "destructive" as const },
      cancelled: { label: "Cancelled", variant: "secondary" as const },
    }

    const config = statusConfig[status] || statusConfig.draft

    return <Badge variant={config.variant}>{config.label}</Badge>
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
    return new Date(dateString).toLocaleDateString("en-US")
  }

  const filteredInvoices = invoices.filter((inv) => {
    if (activeTab === "all") return true
    return inv.status === activeTab
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Invoice Management</h1>
        <p className="text-muted-foreground mt-2">Verify payments and manage customer invoices</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending_payment">
            <Clock className="size-4 mr-2" />
            Pending Verification
          </TabsTrigger>
          <TabsTrigger value="paid">
            <CheckCircle className="size-4 mr-2" />
            Paid
          </TabsTrigger>
          <TabsTrigger value="all">All Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.invoices.title")}</CardTitle>
              <CardDescription>
                {filteredInvoices.length} {t("admin.invoices.count")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
                </div>
              ) : filteredInvoices.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="size-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No invoices found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell>{invoice.organization.organization_name}</TableCell>
                        <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                        <TableCell>{formatPrice(invoice.total_amount, invoice.currency)}</TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell className="text-right space-x-2">
                          {invoice.status === "pending_payment" && invoice.payment_proof_url && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedInvoice(invoice)
                                setIsVerifyDialogOpen(true)
                              }}
                            >
                              <Eye className="size-4 mr-2" />
                              Verify Payment
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`/api/invoices/${invoice.id}/download`, "_blank")}
                          >
                            <Download className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Verify Payment - {selectedInvoice?.invoice_number}</DialogTitle>
            <DialogDescription>Review the payment proof and approve or reject the payment</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Organization</p>
                <p className="text-sm text-muted-foreground">{selectedInvoice?.organization.organization_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Amount</p>
                <p className="text-sm text-muted-foreground">
                  {selectedInvoice && formatPrice(selectedInvoice.total_amount, selectedInvoice.currency)}
                </p>
              </div>
            </div>

            {selectedInvoice?.payment_proof_url && (
              <div className="border rounded-lg p-4">
                <p className="text-sm font-medium mb-4">Payment Proof</p>
                <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
                  {selectedInvoice.payment_proof_url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                    <Image
                      src={selectedInvoice.payment_proof_url || "/placeholder.svg"}
                      alt="Payment proof"
                      fill
                      className="object-contain"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Button
                        variant="outline"
                        onClick={() => window.open(selectedInvoice.payment_proof_url || "", "_blank")}
                      >
                        <Download className="size-4 mr-2" />
                        View Payment Proof
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVerifyDialogOpen(false)} disabled={isVerifying}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => handleVerifyPayment(false)} disabled={isVerifying}>
              <XCircle className="size-4 mr-2" />
              Reject
            </Button>
            <Button onClick={() => handleVerifyPayment(true)} disabled={isVerifying}>
              <CheckCircle className="size-4 mr-2" />
              Approve & Activate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
