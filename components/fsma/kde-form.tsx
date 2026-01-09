"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createBrowserClient } from "@/lib/supabase/client"
import type { CTEType } from "@/lib/types"
import { getCteFormTranslation } from "@/lib/cte-form-i18n"

interface KDEField {
  name: string
  labelKey: string // Changed from label to labelKey for i18n
  type: "text" | "number" | "date" | "datetime" | "select" | "textarea" | "location"
  required: boolean
  options?: string[]
  descriptionKey?: string // Changed from description to descriptionKey for i18n
  dbColumn?: string
}

const kdeFieldsByEvent: Record<CTEType, KDEField[]> = {
  harvesting: [
    { name: "harvest_date", labelKey: "cteForm.harvestDate", type: "date", required: true },
    { name: "harvest_location_id", labelKey: "cteForm.harvestLocation", type: "location", required: true },
    { name: "field_name", labelKey: "cteForm.fieldName", type: "text", required: true },
    { name: "container_name", labelKey: "cteForm.containerName", type: "text", required: false },
    { name: "commodity", labelKey: "cteForm.commodity", type: "text", required: true },
    { name: "variety", labelKey: "cteForm.variety", type: "text", required: false },
    { name: "quantity_harvested", labelKey: "cteForm.quantityHarvested", type: "number", required: true },
    {
      name: "unit_of_measure",
      labelKey: "cteForm.unitOfMeasure",
      type: "select",
      required: true,
      options: ["kg", "lb", "case", "box", "pallet"],
    },
    { name: "harvester_name", labelKey: "cteForm.harvesterName", type: "text", required: true },
    { name: "harvester_phone", labelKey: "cteForm.harvesterPhone", type: "text", required: false },
    { name: "weather_conditions", labelKey: "cteForm.weatherConditions", type: "textarea", required: false },
  ],
  cooling: [
    { name: "cooling_start_datetime", labelKey: "cteForm.coolingStartDatetime", type: "datetime", required: true },
    { name: "cooling_end_datetime", labelKey: "cteForm.coolingEndDatetime", type: "datetime", required: false },
    { name: "cooling_location_id", labelKey: "cteForm.coolingLocationId", type: "location", required: true },
    {
      name: "cooling_method",
      labelKey: "cteForm.coolingMethod",
      type: "select",
      required: true,
      options: ["forced_air", "hydro_cooling", "ice", "vacuum_cooling", "room_cooling"],
    },
    { name: "initial_temperature", labelKey: "cteForm.initialTemperature", type: "number", required: false },
    { name: "final_temperature", labelKey: "cteForm.finalTemperature", type: "number", required: false },
    { name: "target_temperature", labelKey: "cteForm.targetTemperature", type: "number", required: false },
    { name: "quantity_cooled", labelKey: "cteForm.quantityCooled", type: "number", required: true },
    {
      name: "unit_of_measure",
      labelKey: "cteForm.unitOfMeasure",
      type: "select",
      required: true,
      options: ["kg", "lb", "case", "box"],
    },
  ],
  initial_packing: [
    { name: "packing_date", labelKey: "cteForm.packingDate", type: "date", required: true },
    { name: "packing_location_id", labelKey: "cteForm.packingLocationId", type: "location", required: true },
    { name: "harvest_location_id", labelKey: "cteForm.originalHarvestLocation", type: "location", required: true },
    { name: "field_name", labelKey: "cteForm.fieldGrowingArea", type: "text", required: true },
    { name: "harvest_date", labelKey: "cteForm.originalHarvestDate", type: "date", required: true },
    { name: "harvester_name", labelKey: "cteForm.harvesterName", type: "text", required: true },
    { name: "harvester_phone", labelKey: "cteForm.harvesterPhone", type: "text", required: false },
    { name: "commodity_received", labelKey: "cteForm.commodityReceived", type: "text", required: true },
    { name: "variety_received", labelKey: "cteForm.varietyReceived", type: "text", required: false },
    { name: "quantity_received", labelKey: "cteForm.quantityReceived", type: "number", required: true },
    { name: "quantity_packed", labelKey: "cteForm.quantityPacked", type: "number", required: true },
    {
      name: "unit_of_measure",
      labelKey: "cteForm.unitOfMeasure",
      type: "select",
      required: true,
      options: ["kg", "lb", "case", "box"],
    },
    {
      name: "loss_quantity",
      labelKey: "cteForm.lossQuantity",
      type: "number",
      required: false,
      descriptionKey: "cteForm.lossQuantityDesc",
    },
    {
      name: "loss_percentage",
      labelKey: "cteForm.lossPercentage",
      type: "number",
      required: false,
      descriptionKey: "cteForm.lossPercentageDesc",
    },
    { name: "loss_reason", labelKey: "cteForm.lossReason", type: "textarea", required: false },
    { name: "assigned_lot_code", labelKey: "cteForm.assignedLotCode", type: "text", required: true },
    { name: "product_description", labelKey: "cteForm.productDescription", type: "text", required: true },
    { name: "package_type", labelKey: "cteForm.packageType", type: "text", required: false },
    { name: "packages_count", labelKey: "cteForm.packagesCount", type: "number", required: false },
  ],
  first_receiver: [
    { name: "received_date", labelKey: "cteForm.receivedDate", type: "date", required: true },
    { name: "receiver_location_id", labelKey: "cteForm.receiverLocationId", type: "location", required: true },
    { name: "vessel_name", labelKey: "cteForm.vesselName", type: "text", required: false },
    { name: "vessel_registration", labelKey: "cteForm.vesselRegistration", type: "text", required: false },
    { name: "captain_name", labelKey: "cteForm.captainName", type: "text", required: false },
    {
      name: "harvest_location_description",
      labelKey: "cteForm.harvestLocationDescription",
      type: "text",
      required: true,
    },
    { name: "harvest_date", labelKey: "cteForm.harvestDate", type: "date", required: true },
    { name: "species", labelKey: "cteForm.species", type: "text", required: true },
    { name: "quantity_received", labelKey: "cteForm.quantityReceived", type: "number", required: true },
    {
      name: "unit_of_measure",
      labelKey: "cteForm.unitOfMeasure",
      type: "select",
      required: true,
      options: ["kg", "lb", "each", "box"],
    },
    {
      name: "product_form",
      labelKey: "cteForm.productForm",
      type: "select",
      required: false,
      options: ["whole", "filleted", "shucked", "other"],
    },
    { name: "assigned_lot_code", labelKey: "cteForm.assignedLotCode", type: "text", required: true },
  ],
  shipping: [
    { name: "ship_date", labelKey: "cteForm.shipDate", type: "date", required: true },
    { name: "shipping_location_id", labelKey: "cteForm.shippingLocationId", type: "location", required: true },
    { name: "recipient_name", labelKey: "cteForm.recipientName", type: "text", required: true },
    { name: "recipient_address", labelKey: "cteForm.recipientAddress", type: "textarea", required: true },
    { name: "recipient_city", labelKey: "cteForm.recipientCity", type: "text", required: false },
    { name: "recipient_state", labelKey: "cteForm.recipientState", type: "text", required: false },
    { name: "recipient_postal_code", labelKey: "cteForm.recipientPostalCode", type: "text", required: false },
    { name: "recipient_phone", labelKey: "cteForm.recipientPhone", type: "text", required: false },
    { name: "expected_delivery_date", labelKey: "cteForm.expectedDeliveryDate", type: "date", required: false },
    { name: "carrier_name", labelKey: "cteForm.carrierName", type: "text", required: false },
    { name: "tracking_number", labelKey: "cteForm.trackingNumber", type: "text", required: false },
    {
      name: "transport_method",
      labelKey: "cteForm.transportMethod",
      type: "select",
      required: false,
      options: ["truck", "rail", "air", "ship"],
    },
    { name: "transport_temperature", labelKey: "cteForm.transportTemperature", type: "number", required: false },
    { name: "quantity_shipped", labelKey: "cteForm.quantityShipped", type: "number", required: true },
    {
      name: "unit_of_measure",
      labelKey: "cteForm.unitOfMeasure",
      type: "select",
      required: true,
      options: ["kg", "lb", "case", "box", "pallet"],
    },
  ],
  receiving: [
    { name: "received_date", labelKey: "cteForm.receivedDate", type: "date", required: true },
    { name: "receiving_location_id", labelKey: "cteForm.receivingLocationId", type: "location", required: true },
    { name: "sender_name", labelKey: "cteForm.senderName", type: "text", required: true },
    { name: "sender_address", labelKey: "cteForm.senderAddress", type: "textarea", required: false },
    { name: "sender_phone", labelKey: "cteForm.senderPhone", type: "text", required: false },
    { name: "quantity_received", labelKey: "cteForm.quantityReceived", type: "number", required: true },
    {
      name: "unit_of_measure",
      labelKey: "cteForm.unitOfMeasure",
      type: "select",
      required: true,
      options: ["kg", "lb", "case", "box", "pallet"],
    },
    { name: "product_description", labelKey: "cteForm.productDescription", type: "text", required: true },
    {
      name: "product_condition",
      labelKey: "cteForm.productCondition",
      type: "select",
      required: false,
      options: ["excellent", "good", "acceptable", "damaged", "rejected"],
    },
    { name: "temperature_at_receipt", labelKey: "cteForm.temperatureAtReceipt", type: "number", required: false },
    { name: "quality_notes", labelKey: "cteForm.qualityNotes", type: "textarea", required: false },
    { name: "po_number", labelKey: "cteForm.poNumber", type: "text", required: false },
  ],
  transformation: [
    { name: "transformation_date", labelKey: "cteForm.transformationDate", type: "date", required: true },
    {
      name: "transformation_location_id",
      labelKey: "cteForm.transformationLocationId",
      type: "location",
      required: true,
    },
    {
      name: "transformation_type",
      labelKey: "cteForm.transformationType",
      type: "select",
      required: true,
      options: ["cutting", "cooking", "mixing", "packaging", "processing", "manufacturing"],
    },
    {
      name: "transformation_description",
      labelKey: "cteForm.transformationDescription",
      type: "textarea",
      required: true,
    },
    { name: "input_quantity", labelKey: "cteForm.inputQuantity", type: "number", required: true },
    { name: "output_quantity", labelKey: "cteForm.outputQuantity", type: "number", required: true },
    {
      name: "output_unit_of_measure",
      labelKey: "cteForm.outputUnitOfMeasure",
      type: "select",
      required: true,
      options: ["kg", "lb", "case", "box", "unit", "gallon", "liter"],
    },
    {
      name: "yield_percentage",
      labelKey: "cteForm.yieldPercentage",
      type: "number",
      required: false,
      descriptionKey: "cteForm.yieldPercentageDesc",
    },
    {
      name: "loss_quantity",
      labelKey: "cteForm.lossQuantityTransform",
      type: "number",
      required: false,
      descriptionKey: "cteForm.lossQuantityTransformDesc",
    },
    { name: "loss_reason", labelKey: "cteForm.lossReason", type: "textarea", required: false },
    { name: "output_product_description", labelKey: "cteForm.outputProductDescription", type: "text", required: true },
    { name: "assigned_lot_code", labelKey: "cteForm.assignedOutputLotCode", type: "text", required: true },
    { name: "batch_code", labelKey: "cteForm.batchCode", type: "text", required: false },
  ],
}

interface KDEFormProps {
  eventType: CTEType
  locale?: "en" | "vi"
}

export function KDEForm({ eventType, locale = "en" }: KDEFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createBrowserClient()

  const [formData, setFormData] = useState<Record<string, any>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [locations, setLocations] = useState<any[]>([])
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const fields = kdeFieldsByEvent[eventType]
  const requiredFields = fields.filter((f) => f.required).length
  const completedFields = Object.keys(formData).filter((key) => {
    const field = fields.find((f) => f.name === key)
    return field?.required && formData[key]
  }).length

  const t = (key: string, replacements?: Record<string, string>) => getCteFormTranslation(locale, key, replacements)

  const progressPercentage = requiredFields > 0 ? (completedFields / requiredFields) * 100 : 0

  useEffect(() => {
    const loadData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        toast({
          title: t("cteForm.authRequired"),
          description: t("cteForm.authRequiredDesc"),
          variant: "destructive",
        })
        router.push("/auth/login")
        return
      }

      setUserId(user.id)

      const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

      if (profile) {
        setOrganizationId(profile.organization_id)

        const { data: locsData } = await supabase
          .from("locations")
          .select("*")
          .eq("organization_id", profile.organization_id)
          .eq("is_active", true)
          .order("location_name")

        setLocations(locsData || [])
      }
    }
    loadData()
  }, [])

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }))

    if (eventType === "initial_packing" && (fieldName === "quantity_received" || fieldName === "quantity_packed")) {
      const received = fieldName === "quantity_received" ? Number(value) : Number(formData.quantity_received || 0)
      const packed = fieldName === "quantity_packed" ? Number(value) : Number(formData.quantity_packed || 0)
      if (received && packed) {
        const loss = received - packed
        const lossPercent = (loss / received) * 100
        setFormData((prev) => ({
          ...prev,
          loss_quantity: loss,
          loss_percentage: Number(lossPercent.toFixed(2)),
        }))
      }
    }

    if (eventType === "transformation" && (fieldName === "input_quantity" || fieldName === "output_quantity")) {
      const input = fieldName === "input_quantity" ? Number(value) : Number(formData.input_quantity || 0)
      const output = fieldName === "output_quantity" ? Number(value) : Number(formData.output_quantity || 0)
      if (input && output) {
        const loss = input - output
        const yieldPercent = (output / input) * 100
        setFormData((prev) => ({
          ...prev,
          loss_quantity: loss,
          yield_percentage: Number(yieldPercent.toFixed(2)),
        }))
      }
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      const missingFields = fields.filter((f) => f.required && !formData[f.name])
      if (missingFields.length > 0) {
        toast({
          title: t("cteForm.missingFields"),
          description: t("cteForm.fillInFields", { fields: missingFields.map((f) => t(f.labelKey)).join(", ") }),
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      if (!organizationId || !userId) {
        throw new Error("Organization or user not found")
      }

      const locationIdField = fields.find((f) => f.type === "location")
      const locationId = formData[locationIdField?.name || "location_id"] || locations[0]?.id

      if (!locationId) {
        toast({
          title: t("cteForm.locationRequired"),
          description: t("cteForm.locationRequiredDesc"),
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      const { data: cteEvent, error: cteError } = await supabase
        .from("cte_events")
        .insert({
          organization_id: organizationId,
          event_type: eventType,
          event_datetime: new Date().toISOString(),
          location_id: locationId,
          reference_document_type: formData.reference_document_type || null,
          reference_document_number: formData.reference_document_number || null,
          notes: formData.notes || null,
          created_by: userId,
        })
        .select()
        .single()

      if (cteError) {
        throw cteError
      }

      const eventTableMap: Record<CTEType, string> = {
        harvesting: "cte_harvesting",
        cooling: "cte_cooling",
        initial_packing: "cte_initial_packing",
        first_receiver: "cte_first_receiver",
        shipping: "cte_shipping",
        receiving: "cte_receiving",
        transformation: "cte_transformation",
      }

      const tableName = eventTableMap[eventType]

      const eventData: Record<string, any> = { cte_event_id: cteEvent.id }

      fields.forEach((field) => {
        if (formData[field.name] !== undefined && formData[field.name] !== null && formData[field.name] !== "") {
          eventData[field.name] = formData[field.name]
        }
      })

      const { error: detailError } = await supabase.from(tableName).insert(eventData)

      if (detailError) {
        throw detailError
      }

      toast({
        title: t("cteForm.successTitle"),
        description: t("cteForm.successDesc", { eventType: eventType.replace("_", " ") }),
      })

      router.push("/dashboard/cte-events")
    } catch (error: any) {
      toast({
        title: t("cteForm.errorTitle"),
        description: error.message || t("cteForm.errorDesc"),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getOptionLabel = (fieldName: string, option: string) => {
    // Cooling methods: forced_air -> forcedAir
    if (fieldName === "cooling_method") {
      const coolingMethodMap: Record<string, string> = {
        forced_air: "cteForm.coolingMethod.forcedAir",
        hydro_cooling: "cteForm.coolingMethod.hydroCooling",
        ice: "cteForm.coolingMethod.ice",
        vacuum_cooling: "cteForm.coolingMethod.vacuumCooling",
        room_cooling: "cteForm.coolingMethod.roomCooling",
      }
      return t(coolingMethodMap[option] || option)
    }

    // Transport methods: truck -> truck
    if (fieldName === "transport_method") {
      const transportMap: Record<string, string> = {
        truck: "cteForm.transportMethod.truck",
        rail: "cteForm.transportMethod.rail",
        air: "cteForm.transportMethod.air",
        ship: "cteForm.transportMethod.ship",
      }
      return t(transportMap[option] || option)
    }

    // Product forms: whole -> whole
    if (fieldName === "product_form") {
      const productFormMap: Record<string, string> = {
        whole: "cteForm.productForm.whole",
        filleted: "cteForm.productForm.filleted",
        shucked: "cteForm.productForm.shucked",
        other: "cteForm.productForm.other",
      }
      return t(productFormMap[option] || option)
    }

    // Product conditions: excellent -> excellent
    if (fieldName === "product_condition") {
      const conditionMap: Record<string, string> = {
        excellent: "cteForm.productCondition.excellent",
        good: "cteForm.productCondition.good",
        acceptable: "cteForm.productCondition.acceptable",
        damaged: "cteForm.productCondition.damaged",
        rejected: "cteForm.productCondition.rejected",
      }
      return t(conditionMap[option] || option)
    }

    // Transformation types: cutting -> cutting
    if (fieldName === "transformation_type") {
      const transformMap: Record<string, string> = {
        cutting: "cteForm.transformationType.cutting",
        cooking: "cteForm.transformationType.cooking",
        mixing: "cteForm.transformationType.mixing",
        packaging: "cteForm.transformationType.packaging",
        processing: "cteForm.transformationType.processing",
        manufacturing: "cteForm.transformationType.manufacturing",
      }
      return t(transformMap[option] || option)
    }

    // Fallback to option value if no translation found
    return option
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("cteForm.kdeTitle")}</CardTitle>
              <CardDescription>{t("cteForm.kdeDesc", { eventType: eventType.replace("_", " ") })}</CardDescription>
            </div>
            <Badge variant="outline">
              {t("cteForm.requiredCount", {
                completed: completedFields.toString(),
                required: requiredFields.toString(),
              })}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span className="text-muted-foreground">
                {locale === "vi" ? "Tiến độ hoàn thành" : "Completion Progress"}
              </span>
              <span className="text-primary">{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Form Fields */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>
                  {t(field.labelKey)}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {field.type === "location" && (
                  <Select
                    required={field.required}
                    value={formData[field.name]}
                    onValueChange={(value) => handleFieldChange(field.name, value)}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue
                        placeholder={t("cteForm.selectLocation", { location: t(field.labelKey).toLowerCase() })}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.length === 0 ? (
                        <SelectItem value="none" disabled>
                          {t("cteForm.noLocationsAvailable")}
                        </SelectItem>
                      ) : (
                        locations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.location_name} ({location.location_code})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
                {field.type === "select" && field.name !== "unit_of_measure" && (
                  <Select
                    required={field.required}
                    value={formData[field.name]}
                    onValueChange={(value) => handleFieldChange(field.name, value)}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue placeholder={`${t("common.select")} ${t(field.labelKey).toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((option) => (
                        <SelectItem key={option} value={option}>
                          {getOptionLabel(field.name, option)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {field.name === "unit_of_measure" && (
                  <Select
                    required={field.required}
                    value={formData[field.name]}
                    onValueChange={(value) => handleFieldChange(field.name, value)}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue placeholder={t("cteForm.selectUnitOfMeasure")} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {field.type === "textarea" && (
                  <Textarea
                    id={field.name}
                    required={field.required}
                    value={formData[field.name] || ""}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    rows={3}
                  />
                )}
                {field.type === "text" && (
                  <Input
                    id={field.name}
                    type="text"
                    required={field.required}
                    value={formData[field.name] || ""}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  />
                )}
                {field.type === "number" && (
                  <Input
                    id={field.name}
                    type="number"
                    step="any"
                    required={field.required}
                    value={formData[field.name] || ""}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    disabled={field.descriptionKey?.includes("Auto-calculated")}
                  />
                )}
                {field.type === "date" && (
                  <Input
                    id={field.name}
                    type="date"
                    required={field.required}
                    value={formData[field.name] || ""}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  />
                )}
                {field.type === "datetime" && (
                  <Input
                    id={field.name}
                    type="datetime-local"
                    required={field.required}
                    value={formData[field.name] || ""}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  />
                )}
                {field.descriptionKey && <p className="text-xs text-muted-foreground">{t(field.descriptionKey)}</p>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push("/dashboard/cte-events")}>
          {t("common.cancel")}
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting || completedFields < requiredFields}>
          {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          {isSubmitting ? t("cteForm.submitting") : t("cteForm.submit")}
        </Button>
      </div>
    </div>
  )
}
