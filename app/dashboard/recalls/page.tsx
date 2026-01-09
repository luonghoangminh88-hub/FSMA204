"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertTriangle, Plus, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/hooks/use-language" // Changed import to use the correct useLanguage hook from use-language hook
import { createClient } from "@/lib/supabase/client"

interface RecallEvent {
  id: string
  recall_number: string
  recall_initiation_date: string
  recall_type: string
  recall_class: string
  recall_reason: string
  product_description: string
  affected_lot_codes: string[]
  recall_status: string
  recovery_percentage: number
  total_units_affected: number
  total_units_recovered: number
}

export default function RecallsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { t } = useLanguage()
  const [recalls, setRecalls] = useState<RecallEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [initiateDialogOpen, setInitiateDialogOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Form state
  const [recallType, setRecallType] = useState("")
  const [recallClass, setRecallClass] = useState("")
  const [recallReason, setRecallReason] = useState("")
  const [hazardDescription, setHazardDescription] = useState("")
  const [productDescription, setProductDescription] = useState("")
  const [affectedLotCodes, setAffectedLotCodes] = useState("")
  const [distributionPattern, setDistributionPattern] = useState("")
  const [publicNotification, setPublicNotification] = useState(true)

  useEffect(() => {
    fetchRecalls()
  }, [])

  const fetchRecalls = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("recall_events")
        .select("*")
        .order("recall_initiation_date", { ascending: false })

      if (error) throw error
      setRecalls(data || [])
    } catch (error: any) {
      console.error("[v0] Error fetching recalls:", error)
      toast({
        title: t("recalls.loading") as string,
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInitiateRecall = async () => {
    if (!recallType || !recallClass || !recallReason || !hazardDescription || !affectedLotCodes) {
      toast({
        title: t("recalls.missingFields") as string,
        description: t("recalls.fillRequired") as string,
        variant: "destructive",
      })
      return
    }

    setActionLoading(true)
    try {
      const response = await fetch("/api/recalls/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recall_type: recallType,
          recall_class: recallClass,
          recall_reason: recallReason,
          hazard_description: hazardDescription,
          product_description: productDescription,
          affected_lot_codes: affectedLotCodes.split(",").map((c) => c.trim()),
          distribution_pattern: distributionPattern,
          public_notification_required: publicNotification,
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast({
          title: t("recalls.recallInitiated") as string,
          description: `${t("recalls.recallCode")}${result.recall.recall_number}`,
        })
        setInitiateDialogOpen(false)
        fetchRecalls()

        // Reset form
        setRecallType("")
        setRecallClass("")
        setRecallReason("")
        setHazardDescription("")
        setProductDescription("")
        setAffectedLotCodes("")
        setDistributionPattern("")
      } else {
        throw new Error(result.error || "Failed to initiate recall")
      }
    } catch (error: any) {
      toast({
        title: t("recalls.initiateError") as string,
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  const getClassBadge = (recallClass: string) => {
    switch (recallClass) {
      case "class_i":
        return <Badge variant="destructive">{t("recalls.classI")}</Badge>
      case "class_ii":
        return (
          <Badge variant="default" className="bg-orange-500">
            {t("recalls.classII")}
          </Badge>
        )
      case "class_iii":
        return <Badge variant="secondary">{t("recalls.classIII")}</Badge>
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "initiated":
        return <Badge variant="default">{t("recalls.statusInitiated")}</Badge>
      case "in_progress":
        return <Badge variant="secondary">{t("recalls.statusInProgress")}</Badge>
      case "completed":
        return (
          <Badge variant="outline" className="border-green-500 text-green-500">
            {t("recalls.statusCompleted")}
          </Badge>
        )
      case "terminated":
        return <Badge variant="outline">{t("recalls.statusTerminated")}</Badge>
      default:
        return null
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("recalls.title")}</h1>
          <p className="text-muted-foreground">{t("recalls.description")}</p>
        </div>
        <Button onClick={() => setInitiateDialogOpen(true)}>
          <Plus className="mr-2 size-4" />
          {t("recalls.initiateRecall")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5" />
            {t("recalls.recallList")}
          </CardTitle>
          <CardDescription>
            {recalls.length} {t("recalls.recallCount")},{" "}
            {recalls.filter((r) => r.recall_status === "in_progress").length} {t("recalls.inProgress")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("recalls.loading")}</p>
          ) : recalls.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("recalls.noRecalls")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("recalls.recallNumber")}</TableHead>
                  <TableHead>{t("recalls.initiationDate")}</TableHead>
                  <TableHead>{t("recalls.classification")}</TableHead>
                  <TableHead>{t("recalls.reason")}</TableHead>
                  <TableHead>{t("recalls.affectedLots")}</TableHead>
                  <TableHead>{t("recalls.status")}</TableHead>
                  <TableHead>{t("recalls.recoveryRate")}</TableHead>
                  <TableHead>{t("recalls.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recalls.map((recall) => (
                  <TableRow key={recall.id}>
                    <TableCell className="font-medium">{recall.recall_number}</TableCell>
                    <TableCell>{new Date(recall.recall_initiation_date).toLocaleDateString("vi-VN")}</TableCell>
                    <TableCell>{getClassBadge(recall.recall_class)}</TableCell>
                    <TableCell className="max-w-xs truncate">{recall.recall_reason}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {recall.affected_lot_codes?.length || 0} {t("lots.unit.unit")}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(recall.recall_status)}</TableCell>
                    <TableCell>
                      {recall.recovery_percentage ? (
                        <span className={recall.recovery_percentage >= 90 ? "text-green-600 font-medium" : ""}>
                          {recall.recovery_percentage.toFixed(1)}%
                        </span>
                      ) : (
                        "0%"
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <FileText className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={initiateDialogOpen} onOpenChange={setInitiateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("recalls.initiateRecallDialog")}</DialogTitle>
            <DialogDescription>{t("recalls.initiateDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("recalls.recallType")}</Label>
                <Select value={recallType} onValueChange={setRecallType}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("recalls.selectRecallType") as string} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="voluntary_firm">{t("recalls.voluntaryFirm")}</SelectItem>
                    <SelectItem value="voluntary_fda_request">{t("recalls.voluntaryFDA")}</SelectItem>
                    <SelectItem value="fda_mandated">{t("recalls.fdaMandated")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("recalls.classification")}</Label>
                <Select value={recallClass} onValueChange={setRecallClass}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("recalls.selectClassification") as string} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="class_i">{t("recalls.classI")}</SelectItem>
                    <SelectItem value="class_ii">{t("recalls.classII")}</SelectItem>
                    <SelectItem value="class_iii">{t("recalls.classIII")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("recalls.recallReason")}</Label>
              <Input
                value={recallReason}
                onChange={(e) => setRecallReason(e.target.value)}
                placeholder={t("recalls.recallReasonPlaceholder") as string}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("recalls.hazardDescription")}</Label>
              <Textarea
                value={hazardDescription}
                onChange={(e) => setHazardDescription(e.target.value)}
                placeholder={t("recalls.hazardDescriptionPlaceholder") as string}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("recalls.productDescription")}</Label>
              <Input
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder={t("recalls.productDescriptionPlaceholder") as string}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("recalls.affectedLotCodes")}</Label>
              <Textarea
                value={affectedLotCodes}
                onChange={(e) => setAffectedLotCodes(e.target.value)}
                placeholder={t("recalls.affectedLotCodesPlaceholder") as string}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("recalls.distributionPattern")}</Label>
              <Input
                value={distributionPattern}
                onChange={(e) => setDistributionPattern(e.target.value)}
                placeholder={t("recalls.distributionPatternPlaceholder") as string}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="publicNotification"
                checked={publicNotification}
                onChange={(e) => setPublicNotification(e.target.checked)}
                className="size-4"
              />
              <Label htmlFor="publicNotification" className="cursor-pointer">
                {t("recalls.publicNotification")}
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInitiateDialogOpen(false)}>
              {t("recalls.cancel")}
            </Button>
            <Button onClick={handleInitiateRecall} disabled={actionLoading}>
              {actionLoading ? t("recalls.processing") : t("recalls.initiateButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
