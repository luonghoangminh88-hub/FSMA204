"use client"

import type React from "react"

import { useState } from "react"
import { useLanguage } from "@/hooks/use-language"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Package, ArrowRightLeft, CheckCircle, Upload } from "lucide-react"
import { toast } from "sonner"
import { createBrowserClient } from "@/lib/supabase/client"

export default function BatchOperationsPage() {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const supabase = createBrowserClient()

  // Bulk Lot Creation State
  const [bulkLotData, setBulkLotData] = useState({
    harvest_event_id: "",
    lot_prefix: "",
    quantity_per_lot: "",
    number_of_lots: "",
  })

  // Mass Transformation State
  const [transformData, setTransformData] = useState({
    input_lot_ids: "",
    output_product_description: "",
    output_quantity: "",
    transformation_type: "",
  })

  // Batch Status Update State
  const [statusUpdateData, setStatusUpdateData] = useState({
    lot_codes: "",
    new_status: "",
    notes: "",
  })

  const handleBulkLotCreation = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/batch/create-lots-from-harvest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          harvest_event_id: bulkLotData.harvest_event_id,
          lot_prefix: bulkLotData.lot_prefix,
          quantity_per_lot: Number.parseFloat(bulkLotData.quantity_per_lot),
          number_of_lots: Number.parseInt(bulkLotData.number_of_lots),
        }),
      })

      if (!response.ok) throw new Error("Failed to create lots")

      const result = await response.json()
      toast.success(t("batch.lotsCreated"), {
        description: `${result.created_lots.length} ${t("batch.lotsCreatedSuccess")}`,
      })

      // Reset form
      setBulkLotData({
        harvest_event_id: "",
        lot_prefix: "",
        quantity_per_lot: "",
        number_of_lots: "",
      })
    } catch (error: any) {
      console.error("[v0] Batch lot creation error:", error)
      toast.error(t("common.error"), { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleMassTransformation = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const inputLotIds = transformData.input_lot_ids.split(",").map((id) => id.trim())

      const response = await fetch("/api/batch/mass-transformation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input_lot_ids: inputLotIds,
          output_product_description: transformData.output_product_description,
          output_quantity: Number.parseFloat(transformData.output_quantity),
          transformation_type: transformData.transformation_type,
        }),
      })

      if (!response.ok) throw new Error("Failed to process transformation")

      const result = await response.json()
      toast.success(t("batch.transformationComplete"), {
        description: `${result.created_output_lots.length} ${t("batch.outputLotsCreated")}`,
      })

      // Reset form
      setTransformData({
        input_lot_ids: "",
        output_product_description: "",
        output_quantity: "",
        transformation_type: "",
      })
    } catch (error: any) {
      console.error("[v0] Mass transformation error:", error)
      toast.error(t("common.error"), { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleBatchStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const lotCodes = statusUpdateData.lot_codes.split(",").map((code) => code.trim())

      const { data: lots, error: fetchError } = await supabase
        .from("traceability_lots")
        .select("id")
        .in("lot_code", lotCodes)

      if (fetchError) throw fetchError

      const lotIds = lots.map((lot) => lot.id)

      const { error: updateError } = await supabase
        .from("traceability_lots")
        .update({
          status: statusUpdateData.new_status,
          updated_at: new Date().toISOString(),
        })
        .in("id", lotIds)

      if (updateError) throw updateError

      toast.success(t("batch.statusUpdated"), {
        description: `${lotIds.length} ${t("batch.lotsUpdated")}`,
      })

      // Reset form
      setStatusUpdateData({
        lot_codes: "",
        new_status: "",
        notes: "",
      })
    } catch (error: any) {
      console.error("[v0] Batch status update error:", error)
      toast.error(t("common.error"), { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <ArrowRightLeft className="size-8 text-primary" />
          {t("batch.title")}
        </h1>
        <p className="text-muted-foreground mt-2">{t("batch.description")}</p>
      </div>

      {/* Batch Operations Tabs */}
      <Tabs defaultValue="bulk-lots" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bulk-lots" className="flex items-center gap-2">
            <Package className="size-4" />
            {t("batch.bulkLots")}
          </TabsTrigger>
          <TabsTrigger value="transformation" className="flex items-center gap-2">
            <ArrowRightLeft className="size-4" />
            {t("batch.massTransformation")}
          </TabsTrigger>
          <TabsTrigger value="status-update" className="flex items-center gap-2">
            <CheckCircle className="size-4" />
            {t("batch.statusUpdate")}
          </TabsTrigger>
        </TabsList>

        {/* Bulk Lot Creation */}
        <TabsContent value="bulk-lots">
          <Card>
            <CardHeader>
              <CardTitle>{t("batch.bulkLotCreation")}</CardTitle>
              <CardDescription>{t("batch.bulkLotCreationDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBulkLotCreation} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="harvest_event_id">{t("batch.harvestEventId")}</Label>
                  <Input
                    id="harvest_event_id"
                    placeholder="Enter harvest event ID"
                    value={bulkLotData.harvest_event_id}
                    onChange={(e) => setBulkLotData({ ...bulkLotData, harvest_event_id: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">{t("batch.harvestEventIdHelp")}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="lot_prefix">{t("batch.lotPrefix")}</Label>
                    <Input
                      id="lot_prefix"
                      placeholder="FARM-APPLE-"
                      value={bulkLotData.lot_prefix}
                      onChange={(e) => setBulkLotData({ ...bulkLotData, lot_prefix: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="number_of_lots">{t("batch.numberOfLots")}</Label>
                    <Input
                      id="number_of_lots"
                      type="number"
                      min="1"
                      placeholder="10"
                      value={bulkLotData.number_of_lots}
                      onChange={(e) => setBulkLotData({ ...bulkLotData, number_of_lots: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity_per_lot">{t("batch.quantityPerLot")}</Label>
                  <Input
                    id="quantity_per_lot"
                    type="number"
                    step="0.01"
                    placeholder="100"
                    value={bulkLotData.quantity_per_lot}
                    onChange={(e) => setBulkLotData({ ...bulkLotData, quantity_per_lot: e.target.value })}
                    required
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {t("batch.createLots")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mass Transformation */}
        <TabsContent value="transformation">
          <Card>
            <CardHeader>
              <CardTitle>{t("batch.massTransformation")}</CardTitle>
              <CardDescription>{t("batch.massTransformationDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleMassTransformation} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="input_lot_ids">{t("batch.inputLotIds")}</Label>
                  <Textarea
                    id="input_lot_ids"
                    placeholder="LOT-001, LOT-002, LOT-003"
                    rows={3}
                    value={transformData.input_lot_ids}
                    onChange={(e) => setTransformData({ ...transformData, input_lot_ids: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">{t("batch.inputLotIdsHelp")}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transformation_type">{t("batch.transformationType")}</Label>
                  <Select
                    value={transformData.transformation_type}
                    onValueChange={(value) => setTransformData({ ...transformData, transformation_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("batch.selectType")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cutting">{t("batch.transformation.cutting")}</SelectItem>
                      <SelectItem value="mixing">{t("batch.transformation.mixing")}</SelectItem>
                      <SelectItem value="packaging">{t("batch.transformation.packaging")}</SelectItem>
                      <SelectItem value="processing">{t("batch.transformation.processing")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="output_product_description">{t("batch.outputProductDesc")}</Label>
                  <Input
                    id="output_product_description"
                    placeholder="Sliced apples, ready to eat"
                    value={transformData.output_product_description}
                    onChange={(e) => setTransformData({ ...transformData, output_product_description: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="output_quantity">{t("batch.outputQuantity")}</Label>
                  <Input
                    id="output_quantity"
                    type="number"
                    step="0.01"
                    placeholder="850"
                    value={transformData.output_quantity}
                    onChange={(e) => setTransformData({ ...transformData, output_quantity: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">{t("batch.outputQuantityHelp")}</p>
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {t("batch.processTransformation")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Batch Status Update */}
        <TabsContent value="status-update">
          <Card>
            <CardHeader>
              <CardTitle>{t("batch.batchStatusUpdate")}</CardTitle>
              <CardDescription>{t("batch.batchStatusUpdateDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBatchStatusUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lot_codes">{t("batch.lotCodes")}</Label>
                  <Textarea
                    id="lot_codes"
                    placeholder="LOT-001, LOT-002, LOT-003"
                    rows={3}
                    value={statusUpdateData.lot_codes}
                    onChange={(e) => setStatusUpdateData({ ...statusUpdateData, lot_codes: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">{t("batch.lotCodesHelp")}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new_status">{t("batch.newStatus")}</Label>
                  <Select
                    value={statusUpdateData.new_status}
                    onValueChange={(value) => setStatusUpdateData({ ...statusUpdateData, new_status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("batch.selectStatus")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t("batch.lotStatus.active")}</SelectItem>
                      <SelectItem value="in_transit">{t("batch.lotStatus.in_transit")}</SelectItem>
                      <SelectItem value="received">{t("batch.lotStatus.received")}</SelectItem>
                      <SelectItem value="transformed">{t("batch.lotStatus.transformed")}</SelectItem>
                      <SelectItem value="shipped">{t("batch.lotStatus.shipped")}</SelectItem>
                      <SelectItem value="consumed">{t("batch.lotStatus.consumed")}</SelectItem>
                      <SelectItem value="disposed">{t("batch.lotStatus.disposed")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">{t("batch.notes")}</Label>
                  <Textarea
                    id="notes"
                    placeholder={t("batch.notesPlaceholder")}
                    rows={3}
                    value={statusUpdateData.notes}
                    onChange={(e) => setStatusUpdateData({ ...statusUpdateData, notes: e.target.value })}
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {t("batch.updateStatus")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info Alert */}
      <Card className="bg-yellow-500/5 border-yellow-500/20">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Upload className="size-5 text-yellow-600 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium">{t("batch.csvImport")}</p>
              <p className="text-sm text-muted-foreground">{t("batch.csvImportDesc")}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
