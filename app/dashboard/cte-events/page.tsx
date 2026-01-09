"use client"

import Link from "next/link"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Filter, Download, Plus, Search } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import { toast } from "@/hooks/use-toast"
import { exportCTEEventsToCSV } from "@/lib/fsma-export"
import { CTEEventCard } from "@/components/CTEEventCard" // Import CTEEventCard component

export const dynamic = "force-dynamic"

export default function CTEEventsPage() {
  const router = useRouter()
  const { t, locale } = useLanguage()
  const [events, setEvents] = useState<any[]>([])
  const [filteredEvents, setFilteredEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [eventStats, setEventStats] = useState<Record<string, number>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [eventTypeFilter, setEventTypeFilter] = useState("all")
  const [showFilters, setShowFilters] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  )

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    filterEvents()
  }, [searchQuery, eventTypeFilter, events])

  async function fetchData() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/auth/login")
      return
    }

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

    const { data: eventsData } = await supabase
      .from("cte_events")
      .select(
        `
          *,
          locations(location_name, location_code, address, city, state, country),
          cte_lot_links(
            traceability_lots(lot_code, product_description, quantity, unit_of_measure)
          ),
          profiles!cte_events_created_by_fkey(full_name),
          cte_harvesting(*),
          cte_cooling(*),
          cte_initial_packing(*),
          cte_first_receiver(*),
          cte_shipping(*),
          cte_receiving(*),
          cte_transformation(*)
        `,
      )
      .eq("organization_id", profile?.organization_id || "")
      .order("event_datetime", { ascending: false })

    console.log("[v0] Fetched events data:", eventsData)
    if (eventsData && eventsData.length > 0) {
      console.log("[v0] First event sample:", JSON.stringify(eventsData[0], null, 2))
    }

    setEvents(eventsData || [])

    const stats: Record<string, number> = {}
    if (eventsData) {
      eventsData.forEach((event: any) => {
        const eventType = event.event_type
        stats[eventType] = (stats[eventType] || 0) + 1
      })
    }
    setEventStats(stats)

    setLoading(false)
  }

  function filterEvents() {
    let filtered = [...events]

    if (searchQuery) {
      filtered = filtered.filter((event) => {
        const lotData = event.cte_lot_links?.[0]?.traceability_lots
        const detailData = getEventDetails(event)
        return (
          lotData?.lot_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lotData?.product_description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.locations?.location_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.reference_document_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          detailData?.commodity?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          detailData?.product_description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })
    }

    if (eventTypeFilter !== "all") {
      filtered = filtered.filter((event) => event.event_type === eventTypeFilter)
    }

    setFilteredEvents(filtered)
  }

  function getEventDetails(event: any) {
    console.log("[v0] Getting details for event type:", event.event_type)
    console.log("[v0] Event data:", {
      harvesting: event.cte_harvesting,
      cooling: event.cte_cooling,
      initial_packing: event.cte_initial_packing,
    })

    let details = null
    switch (event.event_type) {
      case "harvesting":
        details =
          Array.isArray(event.cte_harvesting) && event.cte_harvesting.length > 0
            ? event.cte_harvesting[0]
            : event.cte_harvesting
        break
      case "cooling":
        details =
          Array.isArray(event.cte_cooling) && event.cte_cooling.length > 0 ? event.cte_cooling[0] : event.cte_cooling
        break
      case "initial_packing":
        details =
          Array.isArray(event.cte_initial_packing) && event.cte_initial_packing.length > 0
            ? event.cte_initial_packing[0]
            : event.cte_initial_packing
        break
      case "first_receiver":
        details =
          Array.isArray(event.cte_first_receiver) && event.cte_first_receiver.length > 0
            ? event.cte_first_receiver[0]
            : event.cte_first_receiver
        break
      case "shipping":
        details =
          Array.isArray(event.cte_shipping) && event.cte_shipping.length > 0
            ? event.cte_shipping[0]
            : event.cte_shipping
        break
      case "receiving":
        details =
          Array.isArray(event.cte_receiving) && event.cte_receiving.length > 0
            ? event.cte_receiving[0]
            : event.cte_receiving
        break
      case "transformation":
        details =
          Array.isArray(event.cte_transformation) && event.cte_transformation.length > 0
            ? event.cte_transformation[0]
            : event.cte_transformation
        break
      default:
        details = null
    }

    console.log("[v0] Extracted details:", details)
    return details
  }

  function handleExport() {
    if (filteredEvents.length === 0) {
      toast({
        title: "Error",
        description: locale === "vi" ? "Không có dữ liệu để xuất" : "No data to export",
        variant: "destructive",
      })
      return
    }

    const exportData: CTEEventExportData[] = filteredEvents.map((event) => {
      const lotData = event.cte_lot_links?.[0]?.traceability_lots
      const detailData = getEventDetails(event)

      return {
        event_id: event.id,
        event_type: event.event_type,
        event_datetime: event.event_datetime,
        lot_code: lotData?.lot_code || detailData?.assigned_lot_code || "N/A",
        product_description:
          lotData?.product_description ||
          detailData?.product_description ||
          detailData?.commodity ||
          detailData?.species ||
          "N/A",
        quantity:
          lotData?.quantity ||
          detailData?.quantity_harvested ||
          detailData?.quantity_cooled ||
          detailData?.quantity_packed ||
          detailData?.quantity_received ||
          detailData?.quantity_shipped ||
          detailData?.output_quantity ||
          0,
        unit_of_measure: lotData?.unit_of_measure || detailData?.unit_of_measure || "units",
        location_name: event.locations?.location_name || "N/A",
        location_code: event.locations?.location_code,
        location_address: event.locations?.address,
        organization_name: "",
        reference_document: event.reference_document_number,
        traceability_lot_code: lotData?.lot_code,
        notes: event.notes,
        created_by: event.profiles?.full_name,
        created_at: event.created_at,
      }
    })

    exportCTEEventsToCSV(exportData, { locale })
    toast({
      title: "Success",
      description: locale === "vi" ? "Đã xuất file thành công" : "File exported successfully",
    })
  }

  function handleViewEvent(event: any) {
    setSelectedEvent(event)
    setShowViewDialog(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    )
  }

  const eventTypeLabels: Record<string, { en: string; vi: string }> = {
    harvesting: { en: "Harvesting", vi: "Thu hoạch" },
    cooling: { en: "Cooling", vi: "Làm lạnh" },
    initial_packing: { en: "Initial Packing", vi: "Đóng gói ban đầu" },
    first_receiver: { en: "First Receiver", vi: "Người nhận đầu tiên" },
    shipping: { en: "Shipping", vi: "Vận chuyển" },
    receiving: { en: "Receiving", vi: "Nhận hàng" },
    transformation: { en: "Transformation", vi: "Chế biến" },
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("cteEvents.title")}</h1>
          <p className="text-muted-foreground">{t("cteEvents.description")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="mr-2 size-4" />
            {t("cteEvents.filter")}
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 size-4" />
            {t("cteEvents.export")}
          </Button>
          <Button asChild data-tour="log-cte-button">
            <Link href="/dashboard/cte-events/new">
              <Plus className="mr-2 size-4" />
              {t("cteEvents.newEvent")}
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={
              locale === "vi"
                ? "Tìm kiếm theo mã lô, sản phẩm, địa điểm..."
                : "Search by lot code, product, location..."
            }
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
              <Filter className="size-4" />
            </Button>
          )}
        </div>

        {showFilters && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {locale === "vi" ? "Lọc theo loại sự kiện" : "Filter by Event Type"}
                  </label>
                  <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{locale === "vi" ? "Tất cả loại sự kiện" : "All Event Types"}</SelectItem>
                      <SelectItem value="harvesting">{eventTypeLabels.harvesting[locale]}</SelectItem>
                      <SelectItem value="cooling">{eventTypeLabels.cooling[locale]}</SelectItem>
                      <SelectItem value="initial_packing">{eventTypeLabels.initial_packing[locale]}</SelectItem>
                      <SelectItem value="first_receiver">{eventTypeLabels.first_receiver[locale]}</SelectItem>
                      <SelectItem value="shipping">{eventTypeLabels.shipping[locale]}</SelectItem>
                      <SelectItem value="receiving">{eventTypeLabels.receiving[locale]}</SelectItem>
                      <SelectItem value="transformation">{eventTypeLabels.transformation[locale]}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Event Type Stats */}
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-7">
        <EventTypeCard type="harvesting" count={eventStats.harvesting || 0} label={t("cte.harvesting")} />
        <EventTypeCard type="cooling" count={eventStats.cooling || 0} label={t("cte.cooling")} />
        <EventTypeCard type="initial_packing" count={eventStats.initial_packing || 0} label={t("cte.initialPacking")} />
        <EventTypeCard type="first_receiver" count={eventStats.first_receiver || 0} label={t("cte.firstReceiver")} />
        <EventTypeCard type="shipping" count={eventStats.shipping || 0} label={t("cte.shipping")} />
        <EventTypeCard type="receiving" count={eventStats.receiving || 0} label={t("cte.receiving")} />
        <EventTypeCard type="transformation" count={eventStats.transformation || 0} label={t("cte.transformation")} />
      </div>

      {/* Events Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredEvents && filteredEvents.length > 0 ? (
          filteredEvents.map((event: any) => {
            const lotData = event.cte_lot_links?.[0]?.traceability_lots
            const detailData = getEventDetails(event)

            return (
              <CTEEventCard
                key={event.id}
                eventType={event.event_type}
                eventDate={event.event_datetime}
                location={event.locations?.location_name || "Unknown Location"}
                lotCode={lotData?.lot_code || detailData?.assigned_lot_code || "N/A"}
                quantity={
                  lotData?.quantity ||
                  detailData?.quantity_harvested ||
                  detailData?.quantity_cooled ||
                  detailData?.quantity_packed ||
                  detailData?.quantity_received ||
                  detailData?.quantity_shipped ||
                  detailData?.output_quantity ||
                  0
                }
                unit={lotData?.unit_of_measure || detailData?.unit_of_measure || "units"}
                status="completed"
                onClick={() => handleViewEvent(event)}
              />
            )
          })
        ) : (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">{t("cteEvents.noEvents")}</p>
              <Button asChild>
                <Link href="/dashboard/cte-events/new">
                  <Plus className="mr-2 size-4" />
                  {t("cteEvents.createFirst")}
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{locale === "vi" ? "Chi tiết sự kiện CTE" : "CTE Event Details"}</DialogTitle>
            <DialogDescription>
              {locale === "vi"
                ? "Thông tin chi tiết về sự kiện truy xuất nguồn gốc"
                : "Detailed information about the traceability event"}
            </DialogDescription>
          </DialogHeader>
          {selectedEvent &&
            (() => {
              const detailData = getEventDetails(selectedEvent)
              const lotData = selectedEvent.cte_lot_links?.[0]?.traceability_lots

              return (
                <div className="grid gap-6">
                  {/* Basic Event Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        {locale === "vi" ? "Loại sự kiện" : "Event Type"}
                      </label>
                      <div className="mt-1">
                        <Badge variant="outline" className="bg-primary/10">
                          {eventTypeLabels[selectedEvent.event_type]?.[locale] || selectedEvent.event_type}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        {locale === "vi" ? "Ngày giờ sự kiện" : "Event Date/Time"}
                      </label>
                      <p className="text-sm mt-1">
                        {new Date(selectedEvent.event_datetime).toLocaleString(locale === "vi" ? "vi-VN" : "en-US")}
                      </p>
                    </div>
                  </div>

                  {/* Location Info */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {locale === "vi" ? "Địa điểm" : "Location"}
                    </label>
                    <p className="text-sm mt-1">
                      {selectedEvent.locations?.location_name || "N/A"}
                      {selectedEvent.locations?.address && ` - ${selectedEvent.locations.address}`}
                      {selectedEvent.locations?.city && `, ${selectedEvent.locations.city}`}
                    </p>
                  </div>

                  {/* Lot Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        {locale === "vi" ? "Mã lô" : "Lot Code"}
                      </label>
                      <p className="text-sm font-mono mt-1">
                        {lotData?.lot_code || detailData?.assigned_lot_code || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        {locale === "vi" ? "Mô tả sản phẩm" : "Product Description"}
                      </label>
                      <p className="text-sm mt-1">
                        {lotData?.product_description ||
                          detailData?.product_description ||
                          detailData?.commodity ||
                          detailData?.species ||
                          "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Event-Specific Fields */}
                  {detailData && (
                    <div className="border-t pt-4">
                      <h3 className="font-semibold mb-3">
                        {locale === "vi" ? "Thông tin chi tiết" : "Detailed Information"}
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        {/* Harvesting specific */}
                        {selectedEvent.event_type === "harvesting" && (
                          <>
                            {detailData.harvest_date && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                  {locale === "vi" ? "Ngày thu hoạch" : "Harvest Date"}
                                </label>
                                <p className="text-sm mt-1">{new Date(detailData.harvest_date).toLocaleDateString()}</p>
                              </div>
                            )}
                            {detailData.field_name && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                  {locale === "vi" ? "Tên cánh đồng" : "Field Name"}
                                </label>
                                <p className="text-sm mt-1">{detailData.field_name}</p>
                              </div>
                            )}
                            {detailData.commodity && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                  {locale === "vi" ? "Hàng hóa" : "Commodity"}
                                </label>
                                <p className="text-sm mt-1">{detailData.commodity}</p>
                              </div>
                            )}
                            {detailData.variety && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                  {locale === "vi" ? "Giống" : "Variety"}
                                </label>
                                <p className="text-sm mt-1">{detailData.variety}</p>
                              </div>
                            )}
                            {detailData.quantity_harvested && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                  {locale === "vi" ? "Số lượng thu hoạch" : "Quantity Harvested"}
                                </label>
                                <p className="text-sm mt-1">
                                  {detailData.quantity_harvested} {detailData.unit_of_measure || "units"}
                                </p>
                              </div>
                            )}
                            {detailData.harvester_name && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                  {locale === "vi" ? "Người thu hoạch" : "Harvester"}
                                </label>
                                <p className="text-sm mt-1">{detailData.harvester_name}</p>
                              </div>
                            )}
                          </>
                        )}

                        {/* Cooling specific */}
                        {selectedEvent.event_type === "cooling" && (
                          <>
                            {detailData.cooling_method && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                  {locale === "vi" ? "Phương pháp làm lạnh" : "Cooling Method"}
                                </label>
                                <p className="text-sm mt-1">{detailData.cooling_method}</p>
                              </div>
                            )}
                            {detailData.cooling_start_datetime && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                  {locale === "vi" ? "Thời gian bắt đầu" : "Start Time"}
                                </label>
                                <p className="text-sm mt-1">
                                  {new Date(detailData.cooling_start_datetime).toLocaleString(
                                    locale === "vi" ? "vi-VN" : "en-US",
                                  )}
                                </p>
                              </div>
                            )}
                            {detailData.cooling_end_datetime && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                  {locale === "vi" ? "Thời gian kết thúc" : "End Time"}
                                </label>
                                <p className="text-sm mt-1">
                                  {new Date(detailData.cooling_end_datetime).toLocaleString(
                                    locale === "vi" ? "vi-VN" : "en-US",
                                  )}
                                </p>
                              </div>
                            )}
                            {detailData.initial_temperature && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                  {locale === "vi" ? "Nhiệt độ ban đầu" : "Initial Temperature"}
                                </label>
                                <p className="text-sm mt-1">{detailData.initial_temperature}°F</p>
                              </div>
                            )}
                            {detailData.final_temperature && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                  {locale === "vi" ? "Nhiệt độ cuối" : "Final Temperature"}
                                </label>
                                <p className="text-sm mt-1">{detailData.final_temperature}°F</p>
                              </div>
                            )}
                            {detailData.quantity_cooled && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                  {locale === "vi" ? "Số lượng làm lạnh" : "Quantity Cooled"}
                                </label>
                                <p className="text-sm mt-1">
                                  {detailData.quantity_cooled} {detailData.unit_of_measure || "units"}
                                </p>
                              </div>
                            )}
                          </>
                        )}

                        {/* Initial Packing specific */}
                        {selectedEvent.event_type === "initial_packing" && (
                          <>
                            {detailData.packing_date && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                  {locale === "vi" ? "Ngày đóng gói" : "Packing Date"}
                                </label>
                                <p className="text-sm mt-1">{new Date(detailData.packing_date).toLocaleDateString()}</p>
                              </div>
                            )}
                            {detailData.quantity_received && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                  {locale === "vi" ? "Số lượng nhận" : "Quantity Received"}
                                </label>
                                <p className="text-sm mt-1">
                                  {detailData.quantity_received} {detailData.unit_of_measure || "units"}
                                </p>
                              </div>
                            )}
                            {detailData.quantity_packed && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                  {locale === "vi" ? "Số lượng đóng gói" : "Quantity Packed"}
                                </label>
                                <p className="text-sm mt-1">
                                  {detailData.quantity_packed} {detailData.unit_of_measure || "units"}
                                </p>
                              </div>
                            )}
                            {detailData.loss_quantity && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                  {locale === "vi" ? "Số lượng hao hụt" : "Loss Quantity"}
                                </label>
                                <p className="text-sm mt-1">
                                  {detailData.loss_quantity} ({detailData.loss_percentage}%)
                                </p>
                              </div>
                            )}
                            {detailData.package_type && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                  {locale === "vi" ? "Loại bao bì" : "Package Type"}
                                </label>
                                <p className="text-sm mt-1">{detailData.package_type}</p>
                              </div>
                            )}
                          </>
                        )}

                        {/* Shipping specific */}
                        {selectedEvent.event_type === "shipping" && (
                          <>
                            {detailData.ship_date && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                  {locale === "vi" ? "Ngày gửi hàng" : "Ship Date"}
                                </label>
                                <p className="text-sm mt-1">{new Date(detailData.ship_date).toLocaleDateString()}</p>
                              </div>
                            )}
                            {detailData.recipient_name && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                  {locale === "vi" ? "Người nhận" : "Recipient"}
                                </label>
                                <p className="text-sm mt-1">{detailData.recipient_name}</p>
                              </div>
                            )}
                            {detailData.quantity_shipped && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                  {locale === "vi" ? "Số lượng gửi" : "Quantity Shipped"}
                                </label>
                                <p className="text-sm mt-1">
                                  {detailData.quantity_shipped} {detailData.unit_of_measure || "units"}
                                </p>
                              </div>
                            )}
                            {detailData.carrier_name && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                  {locale === "vi" ? "Hãng vận chuyển" : "Carrier"}
                                </label>
                                <p className="text-sm mt-1">{detailData.carrier_name}</p>
                              </div>
                            )}
                            {detailData.tracking_number && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                  {locale === "vi" ? "Số theo dõi" : "Tracking Number"}
                                </label>
                                <p className="text-sm mt-1 font-mono">{detailData.tracking_number}</p>
                              </div>
                            )}
                          </>
                        )}

                        {/* Receiving specific */}
                        {selectedEvent.event_type === "receiving" && (
                          <>
                            {detailData.received_date && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                  {locale === "vi" ? "Ngày nhận" : "Received Date"}
                                </label>
                                <p className="text-sm mt-1">
                                  {new Date(detailData.received_date).toLocaleDateString()}
                                </p>
                              </div>
                            )}
                            {detailData.sender_name && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                  {locale === "vi" ? "Người gửi" : "Sender"}
                                </label>
                                <p className="text-sm mt-1">{detailData.sender_name}</p>
                              </div>
                            )}
                            {detailData.quantity_received && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                  {locale === "vi" ? "Số lượng nhận" : "Quantity Received"}
                                </label>
                                <p className="text-sm mt-1">
                                  {detailData.quantity_received} {detailData.unit_of_measure || "units"}
                                </p>
                              </div>
                            )}
                            {detailData.product_condition && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                  {locale === "vi" ? "Tình trạng" : "Condition"}
                                </label>
                                <p className="text-sm mt-1">{detailData.product_condition}</p>
                              </div>
                            )}
                            {detailData.temperature_at_receipt && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                  {locale === "vi" ? "Nhiệt độ khi nhận" : "Temperature"}
                                </label>
                                <p className="text-sm mt-1">{detailData.temperature_at_receipt}°F</p>
                              </div>
                            )}
                          </>
                        )}

                        {/* Transformation specific */}
                        {selectedEvent.event_type === "transformation" && (
                          <>
                            {detailData.transformation_type && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                  {locale === "vi" ? "Loại chế biến" : "Type"}
                                </label>
                                <p className="text-sm mt-1">{detailData.transformation_type}</p>
                              </div>
                            )}
                            {detailData.input_quantity && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                  {locale === "vi" ? "Số lượng đầu vào" : "Input Quantity"}
                                </label>
                                <p className="text-sm mt-1">{detailData.input_quantity}</p>
                              </div>
                            )}
                            {detailData.output_quantity && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                  {locale === "vi" ? "Số lượng đầu ra" : "Output Quantity"}
                                </label>
                                <p className="text-sm mt-1">
                                  {detailData.output_quantity} {detailData.output_unit_of_measure || "units"}
                                </p>
                              </div>
                            )}
                            {detailData.yield_percentage && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                  {locale === "vi" ? "Hiệu suất" : "Yield"}
                                </label>
                                <p className="text-sm mt-1">{detailData.yield_percentage}%</p>
                              </div>
                            )}
                          </>
                        )}

                        {/* First Receiver specific */}
                        {selectedEvent.event_type === "first_receiver" && (
                          <>
                            {detailData.vessel_name && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                  {locale === "vi" ? "Tên tàu" : "Vessel Name"}
                                </label>
                                <p className="text-sm mt-1">{detailData.vessel_name}</p>
                              </div>
                            )}
                            {detailData.species && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                  {locale === "vi" ? "Loài" : "Species"}
                                </label>
                                <p className="text-sm mt-1">{detailData.species}</p>
                              </div>
                            )}
                            {detailData.quantity_received && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                  {locale === "vi" ? "Số lượng nhận" : "Quantity Received"}
                                </label>
                                <p className="text-sm mt-1">
                                  {detailData.quantity_received} {detailData.unit_of_measure || "units"}
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Reference & Notes */}
                  {(selectedEvent.reference_document_number || selectedEvent.notes) && (
                    <div className="border-t pt-4 space-y-3">
                      {selectedEvent.reference_document_number && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            {locale === "vi" ? "Tài liệu tham chiếu" : "Reference Document"}
                          </label>
                          <p className="text-sm mt-1">{selectedEvent.reference_document_number}</p>
                        </div>
                      )}
                      {selectedEvent.notes && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            {locale === "vi" ? "Ghi chú" : "Notes"}
                          </label>
                          <p className="text-sm mt-1 whitespace-pre-wrap">{selectedEvent.notes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="border-t pt-4 mt-2">
                    <p className="text-xs text-muted-foreground">
                      {locale === "vi" ? "Được tạo bởi" : "Created by"}: {selectedEvent.profiles?.full_name || "N/A"} •{" "}
                      {new Date(selectedEvent.created_at).toLocaleString(locale === "vi" ? "vi-VN" : "en-US")}
                    </p>
                  </div>
                </div>
              )
            })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EventTypeCard({ type, count, label }: { type: string; count: number; label: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{count}</div>
      </CardContent>
    </Card>
  )
}

const extendedTranslations = {
  en: {
    cteEvents: {
      title: "CTE Events",
      description: "Manage and view CTE events.",
      filter: "Filter",
      export: "Export",
      newEvent: "New Event",
      noEvents: "No events found.",
      createFirst: "Create your first CTE event",
    },
    cte: {
      harvesting: "Harvesting",
      cooling: "Cooling",
      initialPacking: "Initial Packing",
      firstReceiver: "First Receiver",
      shipping: "Shipping",
      receiving: "Receiving",
      transformation: "Transformation",
    },
  },
  vi: {
    cteEvents: {
      title: "Sự kiện CTE",
      description: "Quản lý và xem các sự kiện CTE.",
      filter: "Lọc",
      export: "Xuất",
      newEvent: "Sự kiện mới",
      noEvents: "Không tìm thấy sự kiện nào.",
      createFirst: "Tạo sự kiện CTE đầu tiên của bạn",
    },
    cte: {
      harvesting: "Thu hoạch",
      cooling: "Làm lạnh",
      initialPacking: "Đóng gói ban đầu",
      firstReceiver: "Người nhận đầu tiên",
      shipping: "Vận chuyển",
      receiving: "Nhận hàng",
      transformation: "Chế biến",
    },
  },
}

interface CTEEventExportData {
  event_id: string
  event_type: string
  event_datetime: string
  lot_code: string
  product_description: string
  quantity: number
  unit_of_measure: string
  location_name: string
  location_code: string
  location_address: string
  organization_name: string
  reference_document: string
  traceability_lot_code: string
  notes: string
  created_by: string
  created_at: string
}
