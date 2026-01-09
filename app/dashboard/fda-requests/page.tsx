"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
  Calendar,
  Clock,
  Search,
  Filter,
  FileText,
  AlertTriangle,
  CheckCircle2,
  MoreVertical,
  Edit,
  Trash2,
  Download,
  Loader2,
} from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useLanguage } from "@/hooks/use-language"
import { usePermissions } from "@/hooks/use-permissions"
import { createBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface FDARequest {
  id: string
  organization_id: string
  request_date: string
  requested_lot_codes: string[]
  request_type: string
  fda_contact_name: string
  fda_contact_email: string
  fda_contact_phone: string
  response_due_date: string
  response_status: string
  notes: string
  created_at: string
}

export const dynamic = "force-dynamic"

export default function FDARequestsPage() {
  const { t, locale } = useLanguage()
  const { canCreate, canEdit, canDelete } = usePermissions()
  const { toast } = useToast()
  const router = useRouter()
  const [requests, setRequests] = useState<FDARequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRequest, setEditingRequest] = useState<FDARequest | null>(null)
  const [generatingReport, setGeneratingReport] = useState<string | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const supabase = createBrowserClient()

  useEffect(() => {
    fetchRequests()
  }, [])

  async function fetchRequests() {
    try {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

      if (!profile?.organization_id) return

      const { data, error } = await supabase
        .from("fda_requests")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("request_date", { ascending: false })

      if (error) throw error
      setRequests(data || [])
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
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setIsSubmitting(false)
      return
    }

    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

    const requestDate = new Date(formData.get("request_date") as string)
    const responseDueDate = new Date(requestDate)
    responseDueDate.setHours(responseDueDate.getHours() + 24) // FDA 24-hour requirement

    const requestData = {
      organization_id: profile?.organization_id,
      request_date: requestDate.toISOString(),
      requested_lot_codes: (formData.get("requested_lot_codes") as string).split(",").map((code) => code.trim()),
      request_type: formData.get("request_type") as string,
      fda_contact_name: formData.get("fda_contact_name") as string,
      fda_contact_email: formData.get("fda_contact_email") as string,
      fda_contact_phone: formData.get("fda_contact_phone") as string,
      response_due_date: responseDueDate.toISOString(),
      notes: formData.get("notes") as string,
      response_status: "pending",
      created_by: user.id,
    }

    try {
      if (editingRequest) {
        const { error } = await supabase.from("fda_requests").update(requestData).eq("id", editingRequest.id)

        if (error) throw error
        toast({ title: t("success"), description: t("fdaRequestUpdated") })
      } else {
        const { error } = await supabase.from("fda_requests").insert([requestData])

        if (error) throw error
        toast({ title: t("success"), description: t("fdaRequestCreated") })
      }

      setIsDialogOpen(false)
      setEditingRequest(null)
      fetchRequests()
    } catch (error: any) {
      toast({
        title: t("error"),
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("confirmDelete"))) return

    setIsDeleting(true)

    try {
      const { error } = await supabase.from("fda_requests").delete().eq("id", id)

      if (error) throw error
      toast({ title: t("success"), description: t("fdaRequestDeleted") })
      fetchRequests()
    } catch (error: any) {
      toast({
        title: t("error"),
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  function getTimeRemaining(dueDate: string): { hours: number; minutes: number; isOverdue: boolean } {
    const now = new Date()
    const due = new Date(dueDate)
    const diffMs = due.getTime() - now.getTime()
    const isOverdue = diffMs < 0

    const absDiffMs = Math.abs(diffMs)
    const hours = Math.floor(absDiffMs / (1000 * 60 * 60))
    const minutes = Math.floor((absDiffMs % (1000 * 60 * 60)) / (1000 * 60))

    return { hours, minutes, isOverdue }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30">
            {t("pending")}
          </Badge>
        )
      case "in_progress":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
            {t("inProgress")}
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
            {t("completed")}
          </Badge>
        )
      case "overdue":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
            {t("overdue")}
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-gray-500/10 text-gray-400 border-gray-500/30">
            {status}
          </Badge>
        )
    }
  }

  async function generateReport(requestId: string) {
    try {
      setGeneratingReport(requestId)
      const response = await fetch(`/api/fda/generate-report/${requestId}`, {
        method: "POST",
      })

      const data = await response.json()

      if (data.error) throw new Error(data.error)

      toast({
        title: t("success"),
        description: t("reportGenerated"),
      })
    } catch (error: any) {
      toast({
        title: t("error"),
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setGeneratingReport(null)
    }
  }

  const filteredRequests = requests.filter((req) => {
    const matchesSearch =
      req.fda_contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.requested_lot_codes.some((code) => code.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = filterStatus === "all" || req.response_status === filterStatus
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-semibold text-3xl tracking-tight">{t("fdaRequests")}</h1>
          <p className="text-muted-foreground text-sm">{t("manageFDARequestsDescription")}</p>
        </div>
        {canCreate?.("fda_requests") && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingRequest(null)}>
                <Plus className="mr-2 h-4 w-4" />
                {t("createRequest")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingRequest ? t("editRequest") : t("createRequest")}</DialogTitle>
                  <DialogDescription>{t("fillRequestDetails")}</DialogDescription>
                </DialogHeader>
                <div className="gap-4 grid py-4">
                  <div className="gap-2 grid">
                    <Label htmlFor="request_date">{t("requestDate")} *</Label>
                    <Input
                      id="request_date"
                      name="request_date"
                      type="datetime-local"
                      defaultValue={
                        editingRequest
                          ? new Date(editingRequest.request_date).toISOString().slice(0, 16)
                          : new Date().toISOString().slice(0, 16)
                      }
                      required
                    />
                  </div>
                  <div className="gap-2 grid">
                    <Label htmlFor="request_type">{t("requestType")} *</Label>
                    <Select name="request_type" defaultValue={editingRequest?.request_type || "recall"} required>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recall">{t("recall")}</SelectItem>
                        <SelectItem value="outbreak">{t("outbreak")}</SelectItem>
                        <SelectItem value="inspection">{t("inspection")}</SelectItem>
                        <SelectItem value="audit">{t("audit")}</SelectItem>
                        <SelectItem value="other">{t("other")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="gap-2 grid">
                    <Label htmlFor="requested_lot_codes">{t("requestedLotCodes")} *</Label>
                    <Input
                      id="requested_lot_codes"
                      name="requested_lot_codes"
                      defaultValue={editingRequest?.requested_lot_codes?.join(", ")}
                      placeholder="LOT-001, LOT-002, LOT-003"
                      required
                    />
                    <p className="text-xs text-muted-foreground">{t("separateLotCodesWithCommas")}</p>
                  </div>
                  <div className="gap-2 grid grid-cols-2">
                    <div className="gap-2 grid">
                      <Label htmlFor="fda_contact_name">{t("fdaContactName")} *</Label>
                      <Input
                        id="fda_contact_name"
                        name="fda_contact_name"
                        defaultValue={editingRequest?.fda_contact_name}
                        required
                      />
                    </div>
                    <div className="gap-2 grid">
                      <Label htmlFor="fda_contact_phone">{t("fdaContactPhone")}</Label>
                      <Input
                        id="fda_contact_phone"
                        name="fda_contact_phone"
                        type="tel"
                        defaultValue={editingRequest?.fda_contact_phone}
                      />
                    </div>
                  </div>
                  <div className="gap-2 grid">
                    <Label htmlFor="fda_contact_email">{t("fdaContactEmail")} *</Label>
                    <Input
                      id="fda_contact_email"
                      name="fda_contact_email"
                      type="email"
                      defaultValue={editingRequest?.fda_contact_email}
                      required
                    />
                  </div>
                  <div className="gap-2 grid">
                    <Label htmlFor="notes">{t("notes")}</Label>
                    <Textarea id="notes" name="notes" defaultValue={editingRequest?.notes} rows={3} />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={isSubmitting}
                  >
                    {t("cancel")}
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSubmitting ? t("saving") : editingRequest ? t("update") : t("create")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("totalRequests")}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("pending")}</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.filter((r) => r.response_status === "pending").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("completed")}</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.filter((r) => r.response_status === "completed").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("overdue")}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.filter((r) => r.response_status === "overdue").length}</div>
          </CardContent>
        </Card>
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
                placeholder={t("searchRequests")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="mr-2 w-4 h-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allStatuses")}</SelectItem>
                <SelectItem value="pending">{t("pending")}</SelectItem>
                <SelectItem value="in_progress">{t("inProgress")}</SelectItem>
                <SelectItem value="completed">{t("completed")}</SelectItem>
                <SelectItem value="overdue">{t("overdue")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("requestsList")}</CardTitle>
          <CardDescription>
            {t("totalRequests")}: {filteredRequests.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("requestDate")}</TableHead>
                <TableHead>{t("type")}</TableHead>
                <TableHead>{t("lotCodes")}</TableHead>
                <TableHead>{t("fdaContact")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("timeRemaining")}</TableHead>
                <TableHead className="text-right">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    <Loader2 className="size-4 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    {t("noRequestsFound")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((req) => {
                  const timeRemaining = getTimeRemaining(req.response_due_date)
                  return (
                    <TableRow key={req.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {new Date(req.request_date).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{t(req.request_type)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {req.requested_lot_codes.slice(0, 2).map((code, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {code}
                            </Badge>
                          ))}
                          {req.requested_lot_codes.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{req.requested_lot_codes.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{req.fda_contact_name}</div>
                          <div className="text-muted-foreground text-xs">{req.fda_contact_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(req.response_status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className={timeRemaining.isOverdue ? "text-red-500 font-medium" : ""}>
                            {timeRemaining.isOverdue && "-"}
                            {timeRemaining.hours}h {timeRemaining.minutes}m
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => generateReport(req.id)}>
                              {generatingReport === req.id ? (
                                <>
                                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                                  {t("generating")}...
                                </>
                              ) : (
                                <>
                                  <Download className="mr-2 w-4 h-4" />
                                  {t("generateReport")}
                                </>
                              )}
                            </DropdownMenuItem>
                            {canEdit?.("fda_requests") && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingRequest(req)
                                  setIsDialogOpen(true)
                                }}
                              >
                                <Edit className="mr-2 w-4 h-4" />
                                {t("edit")}
                              </DropdownMenuItem>
                            )}
                            {canDelete?.("fda_requests") && (
                              <DropdownMenuItem onClick={() => handleDelete(req.id)} className="text-red-600">
                                {isDeleting ? (
                                  <>
                                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                                    {t("deleting")}...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="mr-2 w-4 h-4" />
                                    {t("delete")}
                                  </>
                                )}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
