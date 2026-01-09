"use client"

export const dynamic = "force-dynamic"

import type React from "react"
import { Loader2 } from "lucide-react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, MapPin, Navigation, Phone, Search, Filter, MoreVertical, Edit, Trash2, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useLanguage } from "@/hooks/use-language"
import { usePermissions } from "@/hooks/use-permissions"
import { createBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { AddressAutocomplete } from "@/components/address-autocomplete"

interface Location {
  id: string
  organization_id: string
  location_type: string
  location_name: string
  location_code: string
  address: string
  city: string
  state: string
  country: string
  postal_code: string
  gps_latitude: number
  gps_longitude: number
  contact_name: string
  contact_phone: string
  contact_email: string
  is_active: boolean
  created_at: string
}

export default function LocationsPage() {
  const { t } = useLanguage()
  const { canCreate, canEdit, canDelete } = usePermissions()
  const { toast } = useToast()
  const router = useRouter()
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [addressData, setAddressData] = useState<{
    city: string
    state: string
    postalCode: string
    country: string
    latitude: number
    longitude: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedLocationType, setSelectedLocationType] = useState<string>(editingLocation?.location_type || "farm")

  const supabase = createBrowserClient()

  useEffect(() => {
    fetchLocations()
  }, [])

  async function fetchLocations() {
    try {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

      if (!profile?.organization_id) return

      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setLocations(data || [])
    } catch (error: any) {
      toast({
        title: t("error"),
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      toast({
        title: t("error"),
        description: "User not authenticated",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single()

    if (profileError || !profile?.organization_id) {
      toast({
        title: t("error"),
        description: "Organization not found. Please contact support.",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    const locationData = {
      organization_id: profile.organization_id,
      location_type: formData.get("location_type") as string,
      location_name: formData.get("location_name") as string,
      location_code: formData.get("location_code") as string,
      address: formData.get("address") as string,
      city: addressData?.city || (formData.get("city") as string),
      state: addressData?.state || (formData.get("state") as string),
      country: addressData?.country || (formData.get("country") as string) || "US",
      postal_code: addressData?.postalCode || (formData.get("postal_code") as string),
      gps_latitude:
        addressData?.latitude ||
        (formData.get("gps_latitude") ? Number.parseFloat(formData.get("gps_latitude") as string) : null),
      gps_longitude:
        addressData?.longitude ||
        (formData.get("gps_longitude") ? Number.parseFloat(formData.get("gps_longitude") as string) : null),
      contact_name: formData.get("contact_name") as string,
      contact_phone: formData.get("contact_phone") as string,
      contact_email: formData.get("contact_email") as string,
    }

    console.log("[v0] Submitting location data:", locationData)

    try {
      if (editingLocation) {
        const { error } = await supabase.from("locations").update(locationData).eq("id", editingLocation.id)

        if (error) {
          console.error("[v0] Update error:", error)
          throw error
        }
        toast({ title: t("success"), description: t("locationUpdated") })
      } else {
        const { error } = await supabase.from("locations").insert([locationData])

        if (error) {
          console.error("[v0] Insert error:", error)
          throw error
        }
        toast({ title: t("success"), description: t("locationCreated") })
      }

      setIsDialogOpen(false)
      setEditingLocation(null)
      setAddressData(null)
      fetchLocations()
    } catch (error: any) {
      console.error("[v0] Location submission error:", error)
      toast({
        title: t("error"),
        description: error.message || "Failed to save location",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("confirmDelete"))) return

    setIsLoading(true)

    try {
      const { error } = await supabase.from("locations").delete().eq("id", id)

      if (error) throw error
      toast({ title: t("success"), description: t("locationDeleted") })
      fetchLocations()
    } catch (error: any) {
      toast({
        title: t("error"),
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filteredLocations = locations.filter((loc) => {
    const matchesSearch =
      loc.location_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loc.location_code.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === "all" || loc.location_type === filterType
    return matchesSearch && matchesType
  })

  const locationTypeColors: Record<string, string> = {
    farm: "bg-green-100 text-green-800",
    field: "bg-lime-100 text-lime-800",
    growing_area: "bg-emerald-100 text-emerald-800",
    aquaculture: "bg-cyan-100 text-cyan-800",
    cooling_facility: "bg-blue-100 text-blue-800",
    packing_facility: "bg-indigo-100 text-indigo-800",
    processing_facility: "bg-purple-100 text-purple-800",
    warehouse: "bg-orange-100 text-orange-800",
    distribution_center: "bg-amber-100 text-amber-800",
    retail_location: "bg-pink-100 text-pink-800",
    transport: "bg-yellow-100 text-yellow-800",
    other: "bg-gray-100 text-gray-800",
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-semibold text-3xl tracking-tight">{t("locations")}</h1>
          <p className="text-muted-foreground text-sm">{t("manageLocationsDescription")}</p>
        </div>
        {canCreate?.("locations") && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingLocation(null)
                  setSelectedLocationType("farm")
                  setAddressData(null)
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("addLocation")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingLocation ? t("editLocation") : t("addLocation")}</DialogTitle>
                  <DialogDescription>{t("fillLocationDetails")}</DialogDescription>
                </DialogHeader>
                <div className="gap-4 grid py-4">
                  <div className="gap-2 grid grid-cols-2">
                    <div className="gap-2 grid">
                      <Label htmlFor="location_name">{t("locationName")} *</Label>
                      <Input
                        id="location_name"
                        name="location_name"
                        defaultValue={editingLocation?.location_name}
                        required
                      />
                    </div>
                    <div className="gap-2 grid">
                      <Label htmlFor="location_code">{t("locationCode")} *</Label>
                      <Input
                        id="location_code"
                        name="location_code"
                        defaultValue={editingLocation?.location_code}
                        required
                      />
                    </div>
                  </div>
                  <div className="gap-2 grid">
                    <Label htmlFor="location_type">{t("locationType")} *</Label>
                    <input type="hidden" name="location_type" value={selectedLocationType} />
                    <Select value={selectedLocationType} onValueChange={setSelectedLocationType} required>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="farm">{t("farm")}</SelectItem>
                        <SelectItem value="field">{t("field")}</SelectItem>
                        <SelectItem value="growing_area">{t("growingArea")}</SelectItem>
                        <SelectItem value="aquaculture">{t("aquaculture")}</SelectItem>
                        <SelectItem value="cooling_facility">{t("coolingFacility")}</SelectItem>
                        <SelectItem value="packing_facility">{t("packingFacility")}</SelectItem>
                        <SelectItem value="processing_facility">{t("processingFacility")}</SelectItem>
                        <SelectItem value="warehouse">{t("warehouse")}</SelectItem>
                        <SelectItem value="distribution_center">{t("distributionCenter")}</SelectItem>
                        <SelectItem value="retail_location">{t("retailLocation")}</SelectItem>
                        <SelectItem value="transport">{t("transport")}</SelectItem>
                        <SelectItem value="other">{t("other")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="gap-2 grid">
                    <AddressAutocomplete
                      name="address"
                      label={t("address")}
                      placeholder={t("searchAddress") || "Enter street address to search..."}
                      defaultValue={editingLocation?.address}
                      onAddressSelect={(data) => {
                        setAddressData(data)
                      }}
                    />
                  </div>
                  <div className="gap-2 grid grid-cols-3">
                    <div className="gap-2 grid">
                      <Label htmlFor="city">{t("city")}</Label>
                      <Input
                        id="city"
                        name="city"
                        key={addressData?.city || "city-default"}
                        defaultValue={addressData?.city || editingLocation?.city}
                      />
                    </div>
                    <div className="gap-2 grid">
                      <Label htmlFor="state">{t("state")}</Label>
                      <Input
                        id="state"
                        name="state"
                        key={addressData?.state || "state-default"}
                        defaultValue={addressData?.state || editingLocation?.state}
                      />
                    </div>
                    <div className="gap-2 grid">
                      <Label htmlFor="postal_code">{t("postalCode")}</Label>
                      <Input
                        id="postal_code"
                        name="postal_code"
                        key={addressData?.postalCode || "postal-default"}
                        defaultValue={addressData?.postalCode || editingLocation?.postal_code}
                      />
                    </div>
                  </div>
                  <div className="gap-2 grid grid-cols-2">
                    <div className="gap-2 grid">
                      <Label htmlFor="gps_latitude">{t("latitude")}</Label>
                      <Input
                        id="gps_latitude"
                        name="gps_latitude"
                        type="number"
                        step="0.000001"
                        key={addressData?.latitude || "lat-default"}
                        defaultValue={addressData?.latitude || editingLocation?.gps_latitude}
                        placeholder="37.7749"
                      />
                    </div>
                    <div className="gap-2 grid">
                      <Label htmlFor="gps_longitude">{t("longitude")}</Label>
                      <Input
                        id="gps_longitude"
                        name="gps_longitude"
                        type="number"
                        step="0.000001"
                        key={addressData?.longitude || "lng-default"}
                        defaultValue={addressData?.longitude || editingLocation?.gps_longitude}
                        placeholder="-122.4194"
                      />
                    </div>
                  </div>
                  <div className="gap-2 grid">
                    <Label htmlFor="contact_name">{t("contactName")}</Label>
                    <Input id="contact_name" name="contact_name" defaultValue={editingLocation?.contact_name} />
                  </div>
                  <div className="gap-2 grid grid-cols-2">
                    <div className="gap-2 grid">
                      <Label htmlFor="contact_phone">{t("contactPhone")}</Label>
                      <Input
                        id="contact_phone"
                        name="contact_phone"
                        type="tel"
                        defaultValue={editingLocation?.contact_phone}
                      />
                    </div>
                    <div className="gap-2 grid">
                      <Label htmlFor="contact_email">{t("contactEmail")}</Label>
                      <Input
                        id="contact_email"
                        name="contact_email"
                        type="email"
                        defaultValue={editingLocation?.contact_email}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    {t("cancel")}
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                        {t("saving")}...
                      </>
                    ) : editingLocation ? (
                      t("update")
                    ) : (
                      t("create")
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("filters")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="top-3 left-3 absolute w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("searchLocations")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="mr-2 w-4 h-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allTypes")}</SelectItem>
                <SelectItem value="farm">{t("farm")}</SelectItem>
                <SelectItem value="packing_facility">{t("packingFacility")}</SelectItem>
                <SelectItem value="processing_facility">{t("processingFacility")}</SelectItem>
                <SelectItem value="warehouse">{t("warehouse")}</SelectItem>
                <SelectItem value="distribution_center">{t("distributionCenter")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Locations Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("locationsList")}</CardTitle>
          <CardDescription>
            {t("totalLocations")}: {filteredLocations.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("code")}</TableHead>
                <TableHead>{t("type")}</TableHead>
                <TableHead>{t("location")}</TableHead>
                <TableHead>{t("contact")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead className="text-right">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    {t("loading")}...
                  </TableCell>
                </TableRow>
              ) : filteredLocations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    {t("noLocationsFound")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLocations.map((loc) => (
                  <TableRow key={loc.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        {loc.location_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="bg-muted px-2 py-1 rounded text-xs">{loc.location_code}</code>
                    </TableCell>
                    <TableCell>
                      <Badge className={locationTypeColors[loc.location_type]}>{t(loc.location_type)}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {loc.city}, {loc.state}
                        {loc.gps_latitude && loc.gps_longitude && (
                          <div className="flex items-center gap-1 mt-1 text-muted-foreground text-xs">
                            <Navigation className="w-3 h-3" />
                            <span>
                              {loc.gps_latitude.toFixed(4)}, {loc.gps_longitude.toFixed(4)}
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        {loc.contact_name && <div>{loc.contact_name}</div>}
                        {loc.contact_phone && (
                          <div className="flex items-center gap-1 text-muted-foreground text-xs">
                            <Phone className="w-3 h-3" />
                            <span>{loc.contact_phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={loc.is_active ? "default" : "secondary"}>
                        {loc.is_active ? t("active") : t("inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/locations/${loc.id}`)}>
                            <Eye className="mr-2 w-4 h-4" />
                            {t("view")}
                          </DropdownMenuItem>
                          {canEdit?.("locations") && (
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingLocation(loc)
                                setIsDialogOpen(true)
                              }}
                            >
                              <Edit className="mr-2 w-4 h-4" />
                              {t("edit")}
                            </DropdownMenuItem>
                          )}
                          {canDelete?.("locations") && (
                            <DropdownMenuItem onClick={() => handleDelete(loc.id)} className="text-red-600">
                              <Trash2 className="mr-2 w-4 h-4" />
                              {t("delete")}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
