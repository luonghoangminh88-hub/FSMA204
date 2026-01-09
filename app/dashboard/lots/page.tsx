"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { useLanguage } from "@/hooks/use-language"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Download, Filter, Search, Eye, Pencil, Trash2, X, Package, TrendingUp, Truck, Send } from "lucide-react"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export const dynamic = "force-dynamic"

export default function LotsPage() {
  const { t, locale } = useLanguage()
  const router = useRouter()
  const supabase = createBrowserClient()

  const [lots, setLots] = useState<any[]>([])
  const [filteredLots, setFilteredLots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showFilters, setShowFilters] = useState(false)
  const [selectedLot, setSelectedLot] = useState<any>(null)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const statusColors: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    in_transit: "bg-blue-500/10 text-blue-700 border-blue-500/20",
    received: "bg-purple-500/10 text-purple-700 border-purple-500/20",
    transformed: "bg-orange-500/10 text-orange-700 border-orange-500/20",
    shipped: "bg-pink-500/10 text-pink-700 border-pink-500/20",
    consumed: "bg-gray-500/10 text-gray-700 border-gray-500/20",
    disposed: "bg-red-500/10 text-red-700 border-red-500/20",
    recalled: "bg-red-500/10 text-red-700 border-red-500/20",
  }

  useEffect(() => {
    fetchLots()
  }, [])

  useEffect(() => {
    filterLots()
  }, [searchQuery, statusFilter, lots])

  async function fetchLots() {
    try {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

      const { data, error } = await supabase
        .from("traceability_lots")
        .select(`
          *,
          ftl_foods(food_name, food_code)
        `)
        .eq("organization_id", profile?.organization_id || "")
        .order("created_at", { ascending: false })

      if (error) throw error
      setLots(data || [])
    } catch (error) {
      console.error("Error fetching lots:", error)
      toast.error(t("common.error"))
    } finally {
      setLoading(false)
    }
  }

  function filterLots() {
    let filtered = [...lots]

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (lot) =>
          lot.lot_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lot.product_description?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((lot) => lot.status === statusFilter)
    }

    setFilteredLots(filtered)
  }

  async function handleDelete() {
    if (!selectedLot) return

    try {
      setDeleting(true)
      const { error } = await supabase.from("traceability_lots").delete().eq("id", selectedLot.id)

      if (error) throw error

      toast.success(t("lots.lotDeleted"))
      setShowDeleteDialog(false)
      fetchLots()
    } catch (error) {
      console.error("Error deleting lot:", error)
      toast.error(t("lots.lotDeleteError"))
    } finally {
      setDeleting(false)
    }
  }

  function exportToCSV() {
    const headers = [
      t("lots.lotCode"),
      t("lots.product"),
      t("lots.quantity"),
      t("lots.productionDate"),
      t("lots.expiration"),
      t("common.status"),
    ]

    const csvData = filteredLots.map((lot) => [
      lot.lot_code,
      lot.product_description,
      `${lot.quantity} ${lot.unit_of_measure}`,
      lot.production_date
        ? new Date(lot.production_date).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US")
        : "N/A",
      lot.expiration_date
        ? new Date(lot.expiration_date).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US")
        : "N/A",
      t(`lots.${lot.status}Status`),
    ])

    const csv = [headers, ...csvData].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `traceability-lots-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    toast.success(t("lots.exported"))
  }

  function handleExport() {
    exportToCSV()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("lots.title")}</h1>
          <p className="text-muted-foreground">{t("lots.description")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="mr-2 size-4" />
            {t("common.filter")}
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 size-4" />
            {t("lots.export")}
          </Button>
          <Button
            asChild
            data-tour="create-lot-button"
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/30"
          >
            <Link href="/dashboard/lots/new">
              <Plus className="mr-2 size-4" />
              {t("lots.createLot")}
            </Link>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={t("lots.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2"
              onClick={() => setSearchQuery("")}
            >
              <X className="size-4" />
            </Button>
          )}
        </div>

        {showFilters && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-2 block">{t("lots.filterByStatus")}</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("lots.allStatus")}</SelectItem>
                      <SelectItem value="active">{t("lots.activeStatus")}</SelectItem>
                      <SelectItem value="in_transit">{t("lots.inTransitStatus")}</SelectItem>
                      <SelectItem value="received">{t("lots.receivedStatus")}</SelectItem>
                      <SelectItem value="transformed">{t("lots.transformedStatus")}</SelectItem>
                      <SelectItem value="shipped">{t("lots.shippedStatus")}</SelectItem>
                      <SelectItem value="consumed">{t("lots.consumedStatus")}</SelectItem>
                      <SelectItem value="disposed">{t("lots.disposedStatus")}</SelectItem>
                      <SelectItem value="recalled">{t("lots.recalledStatus")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-bl-[80px]" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("lots.totalLots")}</CardTitle>
              <div className="size-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Package className="size-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredLots.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{t("lots.totalLotsDesc")}</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-bl-[80px]" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("lots.activeLots")}</CardTitle>
              <div className="size-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <TrendingUp className="size-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredLots.filter((l) => l.status === "active").length}</div>
            <p className="text-xs text-muted-foreground mt-1">{t("lots.activeLotsDesc")}</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-bl-[80px]" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("lots.inTransit")}</CardTitle>
              <div className="size-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Truck className="size-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredLots.filter((l) => l.status === "in_transit").length}</div>
            <p className="text-xs text-muted-foreground mt-1">{t("lots.inTransitDesc")}</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/20 to-orange-600/20 rounded-bl-[80px]" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("lots.shipped")}</CardTitle>
              <div className="size-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Send className="size-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredLots.filter((l) => l.status === "shipped").length}</div>
            <p className="text-xs text-muted-foreground mt-1">{t("lots.shippedDesc")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Lots Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("lots.lotCode")}</TableHead>
                <TableHead>{t("lots.product")}</TableHead>
                <TableHead>{t("lots.quantity")}</TableHead>
                <TableHead>{t("lots.productionDate")}</TableHead>
                <TableHead>{t("lots.expiration")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLots.length > 0 ? (
                filteredLots.map((lot: any) => (
                  <TableRow key={lot.id}>
                    <TableCell className="font-medium">{lot.lot_code}</TableCell>
                    <TableCell>{lot.product_description}</TableCell>
                    <TableCell>
                      {lot.quantity} {lot.unit_of_measure}
                    </TableCell>
                    <TableCell>
                      {lot.production_date
                        ? new Date(lot.production_date).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US")
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      {lot.expiration_date
                        ? new Date(lot.expiration_date).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US")
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[lot.status] || ""}>
                        {t(`lots.${lot.status}Status`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedLot(lot)
                            setShowViewDialog(true)
                          }}
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/lots/${lot.id}/edit`}>
                            <Pencil className="size-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedLot(lot)
                            setShowDeleteDialog(true)
                          }}
                        >
                          <Trash2 className="size-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-4">
                        <Package className="size-6" />
                      </div>
                      <p className="font-medium mb-1">{t("lots.noLotsFound")}</p>
                      <p className="text-sm">{t("lots.createFirstLot")}</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("lots.lotDetails")}</DialogTitle>
            <DialogDescription>{t("lots.lotDetailsDescription")}</DialogDescription>
          </DialogHeader>
          {selectedLot && (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t("lots.lotCode")}</label>
                  <p className="text-sm font-mono mt-1">{selectedLot.lot_code}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t("common.status")}</label>
                  <div className="mt-1">
                    <Badge variant="outline" className={statusColors[selectedLot.status]}>
                      {t(`lots.${selectedLot.status}Status`)}
                    </Badge>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t("lots.product")}</label>
                <p className="text-sm mt-1">{selectedLot.product_description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t("lots.quantity")}</label>
                  <p className="text-sm mt-1">
                    {selectedLot.quantity} {selectedLot.unit_of_measure}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t("lots.productionDate")}</label>
                  <p className="text-sm mt-1">
                    {selectedLot.production_date
                      ? new Date(selectedLot.production_date).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US")
                      : "N/A"}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t("lots.expiration")}</label>
                <p className="text-sm mt-1">
                  {selectedLot.expiration_date
                    ? new Date(selectedLot.expiration_date).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US")
                    : "N/A"}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("lots.deleteLotTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("lots.deleteLotDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting && (
                <div className="animate-spin mr-2 size-4 border-2 border-white border-t-transparent rounded-full" />
              )}
              {deleting ? t("lots.deleting") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
