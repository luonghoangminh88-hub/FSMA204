"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLanguage } from "@/hooks/use-language"
import { createBrowserClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { AddressAutocomplete } from "@/components/address-autocomplete"

export default function NewLocationPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [selectedLocationType, setSelectedLocationType] = useState("farm")
  const [addressData, setAddressData] = useState<any>(null)

  const supabase = createBrowserClient()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)

    const formData = new FormData(e.currentTarget)

    const locationData = {
      location_name: formData.get("location_name") as string,
      location_code: formData.get("location_code") as string,
      location_type: selectedLocationType,
      address: addressData?.address || (formData.get("address") as string),
      city: addressData?.city || (formData.get("city") as string),
      state: addressData?.state || (formData.get("state") as string),
      postal_code: addressData?.postalCode || (formData.get("postal_code") as string),
      country: addressData?.country || (formData.get("country") as string) || "US",
      gps_latitude: addressData?.latitude
        ? Number.parseFloat(addressData.latitude)
        : Number.parseFloat(formData.get("gps_latitude") as string) || null,
      gps_longitude: addressData?.longitude
        ? Number.parseFloat(addressData.longitude)
        : Number.parseFloat(formData.get("gps_longitude") as string) || null,
      contact_name: formData.get("contact_name") as string,
      contact_phone: formData.get("contact_phone") as string,
      contact_email: formData.get("contact_email") as string,
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        toast.error(t("authRequired"))
        router.push("/auth/login")
        return
      }

      const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

      if (!profile?.organization_id) {
        toast.error(t("noOrganization"))
        router.push("/dashboard/locations")
        return
      }

      const { data, error } = await supabase
        .from("locations")
        .insert({
          ...locationData,
          organization_id: profile.organization_id,
        })
        .select()
        .single()

      if (error) throw error
      toast.success(t("locationCreated"))
      router.push(`/dashboard/locations/${data.id}`)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/locations")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="font-semibold text-3xl tracking-tight">{t("addLocation")}</h1>
          <p className="text-muted-foreground text-sm">{t("fillLocationDetails")}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>{t("locationInformation")}</CardTitle>
            <CardDescription>{t("createNewLocation")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Info */}
            <div className="gap-4 grid md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location_name">{t("locationName")} *</Label>
                <Input id="location_name" name="location_name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location_code">{t("locationCode")} *</Label>
                <Input id="location_code" name="location_code" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location_type">{t("locationType")} *</Label>
              <Select value={selectedLocationType} onValueChange={setSelectedLocationType} required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="farm">{t("farm")}</SelectItem>
                  <SelectItem value="field">{t("field")}</SelectItem>
                  <SelectItem value="growing_area">{t("growing_area")}</SelectItem>
                  <SelectItem value="aquaculture">{t("aquaculture")}</SelectItem>
                  <SelectItem value="cooling_facility">{t("cooling_facility")}</SelectItem>
                  <SelectItem value="packing_facility">{t("packing_facility")}</SelectItem>
                  <SelectItem value="processing_facility">{t("processing_facility")}</SelectItem>
                  <SelectItem value="warehouse">{t("warehouse")}</SelectItem>
                  <SelectItem value="distribution_center">{t("distribution_center")}</SelectItem>
                  <SelectItem value="retail_location">{t("retail_location")}</SelectItem>
                  <SelectItem value="transport">{t("transport")}</SelectItem>
                  <SelectItem value="other">{t("other")}</SelectItem>
                </SelectContent>
              </Select>
              <input type="hidden" name="location_type" value={selectedLocationType} />
            </div>

            {/* Address with Autocomplete */}
            <AddressAutocomplete name="address" onAddressSelect={setAddressData} />

            <div className="gap-4 grid md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">{t("city")}</Label>
                <Input id="city" name="city" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">{t("state")}</Label>
                <Input id="state" name="state" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal_code">{t("postalCode")}</Label>
                <Input id="postal_code" name="postal_code" />
              </div>
            </div>

            <div className="gap-4 grid md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gps_latitude">{t("latitude")}</Label>
                <Input id="gps_latitude" name="gps_latitude" type="number" step="any" placeholder="37.7749" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gps_longitude">{t("longitude")}</Label>
                <Input id="gps_longitude" name="gps_longitude" type="number" step="any" placeholder="-122.4194" />
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-2">
              <Label htmlFor="contact_name">{t("contactName")}</Label>
              <Input id="contact_name" name="contact_name" />
            </div>

            <div className="gap-4 grid md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contact_phone">{t("contactPhone")}</Label>
                <Input id="contact_phone" name="contact_phone" type="tel" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">{t("contactEmail")}</Label>
                <Input id="contact_email" name="contact_email" type="email" />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => router.push("/dashboard/locations")}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t("creating") : t("createLocation")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
