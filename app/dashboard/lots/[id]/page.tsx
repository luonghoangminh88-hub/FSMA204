"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import { useLanguage } from "@/hooks/use-language"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Pencil, Trash2, Loader2, Package, Calendar, FileText, Network, Download } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TraceabilityChainViewer } from "@/components/fsma/traceability-chain-viewer"
import { SmartExportButtons } from "@/components/vexim/smart-export-buttons"

export default function LotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { t, locale } = useLanguage()
  const supabase = createBrowserClient()
  const unwrappedParams = use(params)

  const [lot, setLot] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [organizationId, setOrganizationId] = useState<string>("")

  useEffect(() => {
    fetchLotDetails()
  }, [unwrappedParams.id])

  async function fetchLotDetails() {
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

      if (profile?.organization_id) {
        setOrganizationId(profile.organization_id)
      }

      const { data: lotData, error: lotError } = await supabase
        .from("traceability_lots")
        .select(`
          *,
          ftl_foods(food_name, food_code),
          organizations(name),
          profiles!traceability_lots_created_by_fkey(full_name)
        `)
        .eq("id", unwrappedParams.id)
        .single()

      if (lotError) throw lotError
      setLot(lotData)

      const { data: eventsData, error: eventsError } = await supabase
        .from("cte_lot_links")
        .select(`
          *,
          cte_events(
            id,
            event_type,
            event_datetime,
            reference_document_type,
            reference_document_number,
            locations(location_name)
          )
        `)
        .eq("lot_id", unwrappedParams.id)
        .order("created_at", { ascending: false })

      if (eventsError) throw eventsError
      setEvents(eventsData || [])
    } catch (error) {
      console.error("[v0] Error fetching lot details:", error)
      toast.error(t("common.error"))
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    try {
      setDeleting(true)
      const { error } = await supabase.from("traceability_lots").delete().eq("id", unwrappedParams.id)

      if (error) throw error

      toast.success(t("lots.lotDeleted"))
      router.push("/dashboard/lots")
    } catch (error) {
      console.error("[v0] Error deleting lot:", error)
      toast.error(t("lots.lotDeleteError"))
    } finally {
      setDeleting(false)
    }
  }

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

  if (!lot) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Package className="size-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">{t("lots.lotNotFound")}</h2>
          <p className="text-muted-foreground mb-4">{t("lots.lotNotFoundDescription")}</p>
          <Button asChild>
            <Link href="/dashboard/lots">{t("lots.backToLots")}</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/lots">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight font-mono">{lot.lot_code}</h1>
              <Badge variant="outline" className={statusColors[lot.status]}>
                {t(`lots.${lot.status}Status`)}
              </Badge>
            </div>
            <p className="text-muted-foreground">{t("lots.lotDetails")}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/lots/${lot.id}/edit`}>
              <Pencil className="mr-2 size-4" />
              {t("common.edit")}
            </Link>
          </Button>
          <Button variant="outline" onClick={() => setShowDeleteDialog(true)} className="text-red-600">
            <Trash2 className="mr-2 size-4" />
            {t("common.delete")}
          </Button>
        </div>
      </div>

      {/* Export Options Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="size-5" />
            {t("common.export")} {t("lots.lotCode")}
          </CardTitle>
          <CardDescription>{t("export.selectExportType")}</CardDescription>
        </CardHeader>
        <CardContent>
          {organizationId && <SmartExportButtons lotCodes={[lot.lot_code]} organizationId={organizationId} />}
        </CardContent>
      </Card>

      {/* Basic Information */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="size-5" />
              {t("lots.productInformation")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t("lots.product")}</label>
              <p className="text-sm mt-1">{lot.product_description}</p>
            </div>
            {lot.ftl_foods && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t("lots.ftlFood")}</label>
                <p className="text-sm mt-1">
                  {lot.ftl_foods.food_name} ({lot.ftl_foods.food_code})
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t("lots.quantity")}</label>
                <p className="text-sm mt-1 font-semibold">
                  {lot.quantity} {lot.unit_of_measure}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t("common.status")}</label>
                <div className="mt-1">
                  <Badge variant="outline" className={statusColors[lot.status]}>
                    {t(`lots.${lot.status}Status`)}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="size-5" />
              {t("lots.dateInformation")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t("lots.productionDate")}</label>
              <p className="text-sm mt-1">
                {lot.production_date
                  ? new Date(lot.production_date).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "N/A"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t("lots.expiration")}</label>
              <p className="text-sm mt-1">
                {lot.expiration_date
                  ? new Date(lot.expiration_date).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "N/A"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t("lots.createdAt")}</label>
              <p className="text-sm mt-1">
                {new Date(lot.created_at).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CTE Events History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5" />
            {t("lots.cteEventsHistory")}
          </CardTitle>
          <CardDescription>{t("lots.cteEventsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {events.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("cteEvents.eventType")}</TableHead>
                  <TableHead>{t("cteEvents.location")}</TableHead>
                  <TableHead>{t("cteEvents.quantity")}</TableHead>
                  <TableHead>{t("cteEvents.dateTime")}</TableHead>
                  <TableHead>{t("cteEvents.reference")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((link: any) => (
                  <TableRow key={link.id}>
                    <TableCell className="font-medium">
                      <Badge variant="outline">{t(`cteEvents.${link.cte_events.event_type}`)}</Badge>
                    </TableCell>
                    <TableCell>{link.cte_events.locations?.location_name || "N/A"}</TableCell>
                    <TableCell>
                      {link.quantity} {link.unit_of_measure}
                    </TableCell>
                    <TableCell>
                      {new Date(link.cte_events.event_datetime).toLocaleDateString(
                        locale === "vi" ? "vi-VN" : "en-US",
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {link.cte_events.reference_document_type && (
                        <>
                          {link.cte_events.reference_document_type}: {link.cte_events.reference_document_number}
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="size-12 mx-auto mb-2 opacity-50" />
              <p>{t("lots.noEventsYet")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Traceability Chain section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="size-5" />
            {t("traceability.chainView")}
          </CardTitle>
          <CardDescription>{t("traceability.chainViewDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <TraceabilityChainViewer initialLotCode={lot.lot_code} />
        </CardContent>
      </Card>

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
              {deleting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {t("lots.deleting")}
                </>
              ) : (
                t("common.delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
