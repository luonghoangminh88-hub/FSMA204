"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Edit,
  Trash2,
  Navigation,
  Building2,
  Calendar,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { useLanguage } from "@/hooks/use-language"
import { usePermissions } from "@/hooks/use-permissions"
import { createBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { toast as sonnerToast } from "sonner"

interface Location {
  id: string
  location_name: string
  location_code: string
  location_type: string
  address: string
  city: string
  state: string
  postal_code: string
  country: string
  gps_latitude: number | null
  gps_longitude: number | null
  contact_name: string
  contact_phone: string
  contact_email: string
  is_active: boolean
  organization_id: string
  created_at: string
  updated_at: string
}

interface CTEEvent {
  id: string
  event_type: string
  event_datetime: string
  reference_document_number: string
  notes: string
}

export default function LocationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { t } = useLanguage()
  const { canEdit, canDelete } = usePermissions()
  const { toast } = useToast()
  const router = useRouter()
  const unwrappedParams = use(params)
  const [location, setLocation] = useState<Location | null>(null)
  const [events, setEvents] = useState<CTEEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  const supabase = createBrowserClient()

  useEffect(() => {
    fetchLocationDetails()
    fetchRelatedEvents()
  }, [unwrappedParams.id])

  async function fetchLocationDetails() {
    try {
      setLoading(true)
      const { data: user } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.user?.id)
        .single()

      if (!profile?.organization_id) {
        toast({
          title: t("error"),
          description: "No organization found",
          variant: "destructive",
        })
        router.push("/dashboard/locations")
        return
      }

      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("id", unwrappedParams.id)
        .eq("organization_id", profile.organization_id)
        .single()

      if (error) throw error
      setLocation(data)
    } catch (error: any) {
      toast({
        title: t("error"),
        description: error.message,
        variant: "destructive",
      })
      if (error.message.includes("not found") || error.code === "PGRST116") {
        router.push("/dashboard/locations")
      }
    } finally {
      setLoading(false)
    }
  }

  async function fetchRelatedEvents() {
    try {
      const { data, error } = await supabase
        .from("cte_events")
        .select("id, event_type, event_datetime, reference_document_number, notes")
        .eq("location_id", unwrappedParams.id)
        .order("event_datetime", { ascending: false })
        .limit(10)

      if (error) throw error
      setEvents(data || [])
    } catch (error: any) {
      console.error("Error fetching events:", error)
    }
  }

  async function handleDelete() {
    if (!confirm(t("confirmDelete"))) return

    try {
      setDeleting(true)
      const { error } = await supabase.from("locations").delete().eq("id", unwrappedParams.id)

      if (error) throw error
      sonnerToast.success(t("locationDeleted"))
      router.push("/dashboard/locations")
    } catch (error: any) {
      sonnerToast.error(error.message)
    } finally {
      setDeleting(false)
    }
  }

  const locationTypeColors: Record<string, string> = {
    farm: "bg-green-100 text-green-800",
    field: "bg-emerald-100 text-emerald-800",
    growing_area: "bg-lime-100 text-lime-800",
    aquaculture: "bg-cyan-100 text-cyan-800",
    cooling_facility: "bg-blue-100 text-blue-800",
    packing_facility: "bg-indigo-100 text-indigo-800",
    processing_facility: "bg-purple-100 text-purple-800",
    warehouse: "bg-orange-100 text-orange-800",
    distribution_center: "bg-amber-100 text-amber-800",
    retail_location: "bg-pink-100 text-pink-800",
    transport: "bg-gray-100 text-gray-800",
    other: "bg-slate-100 text-slate-800",
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="border-primary mx-auto mb-4 border-4 border-t-transparent rounded-full w-12 h-12 animate-spin"></div>
          <p className="text-muted-foreground">{t("loading")}...</p>
        </div>
      </div>
    )
  }

  if (!location) {
    return (
      <div className="text-center py-12">
        <Building2 className="mx-auto mb-4 w-16 h-16 text-muted-foreground" />
        <h2 className="mb-2 font-semibold text-2xl">{t("locationNotFound")}</h2>
        <p className="mb-6 text-muted-foreground">{t("locationNotFoundDescription")}</p>
        <Button onClick={() => router.push("/dashboard/locations")}>
          <ArrowLeft className="mr-2 w-4 h-4" />
          {t("backToLocations")}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/locations")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="font-semibold text-3xl tracking-tight">{location.location_name}</h1>
            <p className="text-muted-foreground text-sm">
              <code className="bg-muted px-2 py-1 rounded text-xs">{location.location_code}</code>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit?.("locations") && (
            <Button onClick={() => router.push(`/dashboard/locations/${unwrappedParams.id}/edit`)}>
              <Edit className="mr-2 w-4 h-4" />
              {t("edit")}
            </Button>
          )}
          {canDelete?.("locations") && (
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              <Trash2 className="mr-2 w-4 h-4" />
              {deleting ? t("deleting") : t("delete")}
            </Button>
          )}
        </div>
      </div>

      <div className="gap-6 grid md:grid-cols-3">
        {/* Main Info Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t("locationDetails")}</CardTitle>
            <CardDescription>{t("locationDetailsDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Type and Status */}
            <div className="flex items-center gap-4">
              <div>
                <p className="mb-1 text-muted-foreground text-sm">{t("type")}</p>
                <Badge className={locationTypeColors[location.location_type]}>{t(location.location_type)}</Badge>
              </div>
              <Separator orientation="vertical" className="h-10" />
              <div>
                <p className="mb-1 text-muted-foreground text-sm">{t("status")}</p>
                <Badge variant={location.is_active ? "default" : "secondary"}>
                  {location.is_active ? (
                    <>
                      <CheckCircle2 className="mr-1 w-3 h-3" />
                      {t("active")}
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-1 w-3 h-3" />
                      {t("inactive")}
                    </>
                  )}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Address Information */}
            <div>
              <h3 className="flex items-center gap-2 mb-3 font-semibold text-lg">
                <MapPin className="w-5 h-5" />
                {t("address")}
              </h3>
              <div className="space-y-2 text-sm">
                <p>{location.address}</p>
                <p>
                  {location.city}, {location.state} {location.postal_code}
                </p>
                <p>{location.country}</p>
              </div>
            </div>

            {/* GPS Coordinates */}
            {location.gps_latitude && location.gps_longitude && (
              <>
                <Separator />
                <div>
                  <h3 className="flex items-center gap-2 mb-3 font-semibold text-lg">
                    <Navigation className="w-5 h-5" />
                    {t("gpsCoordinates")}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("latitude")}:</span>
                      <span className="font-mono">{location.gps_latitude.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("longitude")}:</span>
                      <span className="font-mono">{location.gps_longitude.toFixed(6)}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2 bg-transparent"
                      onClick={() =>
                        window.open(
                          `https://www.google.com/maps?q=${location.gps_latitude},${location.gps_longitude}`,
                          "_blank",
                        )
                      }
                    >
                      <MapPin className="mr-2 w-4 h-4" />
                      {t("viewOnMap")}
                    </Button>
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Contact Information */}
            <div>
              <h3 className="mb-3 font-semibold text-lg">{t("contactInformation")}</h3>
              <div className="space-y-3">
                {location.contact_name && (
                  <div className="flex items-center gap-3 text-sm">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span>{location.contact_name}</span>
                  </div>
                )}
                {location.contact_phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <a href={`tel:${location.contact_phone}`} className="hover:underline">
                      {location.contact_phone}
                    </a>
                  </div>
                )}
                {location.contact_email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <a href={`mailto:${location.contact_email}`} className="hover:underline">
                      {location.contact_email}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar - Metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("metadata")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-1 text-muted-foreground text-xs">{t("createdAt")}</p>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                {new Date(location.created_at).toLocaleDateString()}
              </div>
            </div>
            <Separator />
            <div>
              <p className="mb-1 text-muted-foreground text-xs">{t("lastUpdated")}</p>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                {new Date(location.updated_at).toLocaleDateString()}
              </div>
            </div>
            <Separator />
            <div>
              <p className="mb-1 text-muted-foreground text-xs">{t("locationId")}</p>
              <code className="block bg-muted p-2 rounded break-all font-mono text-xs">{location.id}</code>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Related CTE Events */}
      <Card>
        <CardHeader>
          <CardTitle>{t("recentCTEEvents")}</CardTitle>
          <CardDescription>{t("recentCTEEventsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">{t("noEventsYet")}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("eventType")}</TableHead>
                  <TableHead>{t("dateTime")}</TableHead>
                  <TableHead>{t("referenceDoc")}</TableHead>
                  <TableHead className="text-right">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <Badge variant="outline">{t(event.event_type)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{new Date(event.event_datetime).toLocaleString()}</TableCell>
                    <TableCell>
                      <code className="text-xs">{event.reference_document_number || "-"}</code>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/dashboard/cte-events/${event.id}`)}
                      >
                        {t("view")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
