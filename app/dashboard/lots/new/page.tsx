"use client"

import type React from "react"

export const dynamic = "force-dynamic"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/hooks/use-language"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { ArrowLeft, Loader2, Package, Sparkles } from "lucide-react"
import Link from "next/link"

export default function NewLotPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [suggestingTLC, setSuggestingTLC] = useState(false)
  const [formData, setFormData] = useState({
    lot_code: "",
    product_description: "",
    food_id: "",
    quantity: "",
    unit_of_measure: "kg",
    production_date: "",
    expiration_date: "",
    status: "active",
  })

  const units = [
    { value: "kg", label: t("lots.unit.kg") },
    { value: "lb", label: t("lots.unit.lb") },
    { value: "oz", label: t("lots.unit.oz") },
    { value: "g", label: t("lots.unit.g") },
    { value: "case", label: t("lots.unit.case") },
    { value: "box", label: t("lots.unit.box") },
    { value: "pallet", label: t("lots.unit.pallet") },
    { value: "unit", label: t("lots.unit.unit") },
    { value: "gallon", label: t("lots.unit.gallon") },
    { value: "liter", label: t("lots.unit.liter") },
    { value: "each", label: t("lots.unit.each") },
  ]

  const statuses = [
    { value: "active", label: t("lots.activeStatus") },
    { value: "in_transit", label: t("lots.inTransitStatus") },
    { value: "received", label: t("lots.receivedStatus") },
    { value: "transformed", label: t("lots.transformedStatus") },
    { value: "shipped", label: t("lots.shippedStatus") },
  ]

  const handleSuggestTLC = async () => {
    setSuggestingTLC(true)
    try {
      const response = await fetch("/api/tlc/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          food_id: formData.food_id || null,
          location_id: null,
          production_date: formData.production_date || new Date().toISOString().split("T")[0],
        }),
      })

      if (!response.ok) throw new Error("Failed to suggest TLC")

      const { suggested_tlc } = await response.json()
      setFormData({ ...formData, lot_code: suggested_tlc })
      toast.success(t("common.success"), { description: "TLC được tạo tự động theo chuẩn FSMA 204" })
    } catch (error: any) {
      console.error("[v0] Error suggesting TLC:", error)
      toast.error(t("common.error"), { description: error.message })
    } finally {
      setSuggestingTLC(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createBrowserClient()

      // Get user and organization
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        toast.error(t("common.error"), { description: "User not authenticated" })
        return
      }

      const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

      if (!profile?.organization_id) {
        toast.error(t("common.error"), { description: "Organization not found" })
        return
      }

      // Create lot (TLC will be auto-generated if empty via database trigger)
      const { error } = await supabase.from("traceability_lots").insert({
        organization_id: profile.organization_id,
        lot_code: formData.lot_code || null, // Allow empty for auto-generation
        product_description: formData.product_description,
        food_id: formData.food_id || null,
        quantity: Number.parseFloat(formData.quantity),
        unit_of_measure: formData.unit_of_measure,
        production_date: formData.production_date || null,
        expiration_date: formData.expiration_date || null,
        status: formData.status,
        created_by: user.id,
      })

      if (error) throw error

      toast.success(t("common.success"), { description: t("lots.lotCreated") })
      router.push("/dashboard/lots")
    } catch (error: any) {
      console.error("[v0] Error creating lot:", error)
      toast.error(t("common.error"), { description: error.message || t("lots.lotCreateError") })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/lots">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("lots.newLot")}</h1>
          <p className="text-muted-foreground">{t("lots.newLotDescription")}</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="size-5" />
                {t("lots.basicInfo")}
              </CardTitle>
              <CardDescription>{t("lots.basicInfoDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lot_code">
                  {t("lots.lotCode")} (TLC)
                  <span className="ml-2 text-xs text-muted-foreground">
                    {t("lots.optional")} - Tự động tạo theo FSMA 204
                  </span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="lot_code"
                    placeholder={t("lots.lotCodePlaceholder")}
                    value={formData.lot_code}
                    onChange={(e) => setFormData({ ...formData, lot_code: e.target.value })}
                  />
                  <Button type="button" variant="outline" onClick={handleSuggestTLC} disabled={suggestingTLC}>
                    {suggestingTLC ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Định dạng: ORG-FOOD-LOC-YYYYMMDD-####. Bỏ trống để tự động tạo.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Product Details */}
          <Card>
            <CardHeader>
              <CardTitle>{t("lots.productDetails")}</CardTitle>
              <CardDescription>{t("lots.productDetailsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="product_description">{t("lots.productDescription")}</Label>
                <Textarea
                  id="product_description"
                  placeholder={t("lots.productDescriptionPlaceholder")}
                  value={formData.product_description}
                  onChange={(e) => setFormData({ ...formData, product_description: e.target.value })}
                  required
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Quantity & Dates */}
          <Card>
            <CardHeader>
              <CardTitle>{t("lots.quantityAndDates")}</CardTitle>
              <CardDescription>{t("lots.quantityAndDatesDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="quantity">{t("lots.quantity")}</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.001"
                    placeholder={t("lots.quantityPlaceholder")}
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">{t("lots.unitOfMeasure")}</Label>
                  <Select
                    value={formData.unit_of_measure}
                    onValueChange={(value) => setFormData({ ...formData, unit_of_measure: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("lots.selectUnit")} />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit.value} value={unit.value}>
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="production_date">
                    {t("lots.productionDateLabel")} {t("lots.optional")}
                  </Label>
                  <Input
                    id="production_date"
                    type="date"
                    value={formData.production_date}
                    onChange={(e) => setFormData({ ...formData, production_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiration_date">
                    {t("lots.expirationDateLabel")} {t("lots.optional")}
                  </Label>
                  <Input
                    id="expiration_date"
                    type="date"
                    value={formData.expiration_date}
                    onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Sẽ tự động tính dựa vào ngày sản xuất và thời hạn sử dụng của sản phẩm
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">{t("lots.status")}</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("lots.selectStatus")} />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {loading ? t("lots.creating") : t("lots.createLotButton")}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
