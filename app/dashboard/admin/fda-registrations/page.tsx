"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Building2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  FileText,
  MoreVertical,
  Eye,
  Trash2,
  Download,
  Edit,
} from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { useToast } from "@/hooks/use-toast"

interface Organization {
  id: string
  name: string
  organization_type: string
  fda_registration_number: string | null
  fda_registration_status: string | null
  duns_number: string | null
  us_agent_name: string | null
  us_agent_email: string | null
  poa_signed: boolean
}

interface FDARegistration {
  id: string
  name: string
  organization_type: string
  fda_registration_number: string | null
  fda_registration_status: "inactive" | "pending" | "active" | "expired" | null
  fda_registration_date: string | null
  duns_number: string | null
  us_agent_name: string | null
  us_agent_email: string | null
  us_agent_phone: string | null
  poa_signed: boolean
  poa_signed_date: string | null
}

export default function FDARegistrationsPage() {
  const { toast } = useToast()
  const { t } = useLanguage()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [registrations, setRegistrations] = useState<FDARegistration[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")

  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedRegistration, setSelectedRegistration] = useState<FDARegistration | null>(null)
  const [editFormData, setEditFormData] = useState<Partial<FDARegistration>>({})
  const [isUpdating, setIsUpdating] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [fdaNumber, setFdaNumber] = useState("")
  const [dunsNumber, setDunsNumber] = useState("")
  const [fdaStatus, setFdaStatus] = useState<"pending" | "active">("pending")
  const [poaSigned, setPoaSigned] = useState(false)
  const [useVeximAgent, setUseVeximAgent] = useState(true)
  const [contractStartDate, setContractStartDate] = useState(new Date().toISOString().split("T")[0])
  const [contractDuration, setContractDuration] = useState("1")
  const [customAgentName, setCustomAgentName] = useState("")
  const [customAgentCompany, setCustomAgentCompany] = useState("")
  const [customAgentEmail, setCustomAgentEmail] = useState("")
  const [customAgentPhone, setCustomAgentPhone] = useState("")

  const confirmDeleteRegistration = async () => {
    if (!selectedRegistration) return

    setIsDeleting(true)
    try {
      const response = await fetch("/api/vexim/fda-registrations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: selectedRegistration.id }),
      })

      if (!response.ok) throw new Error("Failed to delete registration")

      toast({
        title: "Success",
        description: "Xóa đăng ký thành công!",
      })
      setDeleteDialogOpen(false)
      fetchData()
    } catch (error) {
      console.error("Error deleting registration:", error)
      toast({
        title: "Error",
        description: "Không thể xóa đăng ký",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      console.log("[v0] Fetching organizations from /api/organizations")
      const orgsRes = await fetch("/api/organizations")
      const orgsData = await orgsRes.json()
      console.log("[v0] Organizations API response:", orgsData)
      console.log("[v0] Is array?", Array.isArray(orgsData))
      setOrganizations(Array.isArray(orgsData) ? orgsData : [])

      console.log("[v0] Fetching FDA registrations from /api/vexim/fda-registrations")
      const fdaRes = await fetch("/api/vexim/fda-registrations")
      const fdaData = await fdaRes.json()
      console.log("[v0] FDA registrations API response:", fdaData)
      console.log("[v0] Is array?", Array.isArray(fdaData))
      setRegistrations(Array.isArray(fdaData) ? fdaData : [])
    } catch (error) {
      console.error("[v0] Error fetching data:", error)
      toast({
        title: "Error",
        description: "Không thể tải dữ liệu",
        variant: "destructive",
      })
      setOrganizations([])
      setRegistrations([])
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterFDA = async () => {
    if (!selectedOrgId || !fdaNumber || !dunsNumber) {
      toast({
        title: "Validation Error",
        description: "Vui lòng điền đầy đủ thông tin",
        variant: "destructive",
      })
      return
    }

    setIsRegistering(true)

    try {
      const payload = {
        organizationId: selectedOrgId,
        fda_registration_number: fdaNumber,
        duns_number: dunsNumber,
        fda_status: fdaStatus,
        poa_signed: poaSigned,
        use_vexim_agent: useVeximAgent,
        contract_start_date: contractStartDate,
        contract_duration_years: Number.parseInt(contractDuration),
      }

      const response = await fetch("/api/vexim/register-fda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to register FDA")
      }

      toast({
        title: "Success",
        description: "Đăng ký FDA thành công!",
      })
      setSelectedOrgId("")
      setFdaNumber("")
      setDunsNumber("")
      setFdaStatus("pending")
      setPoaSigned(false)
      fetchData()
    } catch (error) {
      console.error("Error registering FDA:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Không thể đăng ký FDA",
        variant: "destructive",
      })
    } finally {
      setIsRegistering(false)
    }
  }

  const resetForm = () => {
    setSelectedOrgId("")
    setFdaNumber("")
    setDunsNumber("")
    setFdaStatus("pending")
    setPoaSigned(false)
    setUseVeximAgent(true)
    setContractStartDate(new Date().toISOString().split("T")[0])
    setContractDuration("1")
    setCustomAgentName("")
    setCustomAgentCompany("")
    setCustomAgentEmail("")
    setCustomAgentPhone("")
  }

  const getStatusBadge = (status: string | null) => {
    const statusConfig = {
      inactive: { label: "Chưa đăng ký", variant: "secondary" as const, color: "text-gray-400" },
      pending: { label: "Chờ duyệt", variant: "secondary" as const, color: "text-yellow-400" },
      active: { label: "Đang hoạt động", variant: "default" as const, color: "text-emerald-400" },
      expired: { label: "Hết hạn", variant: "destructive" as const, color: "text-red-400" },
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive
    return (
      <Badge variant={config.variant} className={config.color}>
        {config.label}
      </Badge>
    )
  }

  const handleViewDetails = (reg: FDARegistration) => {
    setSelectedRegistration(reg)
    setViewDialogOpen(true)
  }

  const handleEditRegistration = (reg: FDARegistration) => {
    setSelectedRegistration(reg)
    setEditFormData({
      fda_registration_number: reg.fda_registration_number || "",
      duns_number: reg.duns_number || "",
      fda_registration_status: reg.fda_registration_status || "pending",
      fda_registration_date: reg.fda_registration_date || "",
      us_agent_name: reg.us_agent_name || "",
      us_agent_email: reg.us_agent_email || "",
      us_agent_phone: reg.us_agent_phone || "",
      poa_signed: reg.poa_signed,
      poa_signed_date: reg.poa_signed_date || "",
    })
    setEditDialogOpen(true)
  }

  const handleDeleteRegistration = (reg: FDARegistration) => {
    setSelectedRegistration(reg)
    setDeleteDialogOpen(true)
  }

  const handleUpdateRegistration = async () => {
    if (!selectedRegistration) return

    setIsUpdating(true)
    try {
      const response = await fetch("/api/vexim/fda-registrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: selectedRegistration.id,
          ...editFormData,
        }),
      })

      if (!response.ok) throw new Error("Failed to update registration")

      toast({
        title: "Success",
        description: "Cập nhật thành công!",
      })
      setEditDialogOpen(false)
      fetchData()
    } catch (error) {
      console.error("Error updating registration:", error)
      toast({
        title: "Error",
        description: "Không thể cập nhật thông tin",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDownloadCertificate = async (reg: FDARegistration) => {
    try {
      const response = await fetch(`/api/vexim/generate-certificate?orgId=${reg.id}`)
      if (!response.ok) throw new Error("Failed to generate certificate")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      window.open(url, "_blank")
      toast({
        title: "Success",
        description: "Đang mở chứng chỉ FDA",
      })
    } catch (error) {
      console.error("Error downloading certificate:", error)
      toast({
        title: "Error",
        description: "Không thể tải chứng chỉ",
        variant: "destructive",
      })
    }
  }

  const unregisteredOrgs = organizations.filter((org) => {
    return !registrations.some((reg) => reg.id === org.id && reg.fda_registration_number)
  })

  const availableOrgsForRegistration = organizations.filter((org) => {
    return !registrations.some((reg) => reg.id === org.id && reg.fda_registration_number)
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <div className="animate-spin size-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-base text-gray-400">Đang tải...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Quản lý Đăng ký FDA</h1>
          <p className="text-gray-400 mt-1">Đăng ký và quản lý FDA Registration cho khách hàng</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="new">
            Đăng ký mới
            {unregisteredOrgs.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30">
                {unregisteredOrgs.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <div className="animate-spin size-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto" />
                <p className="text-base text-gray-400">Đang tải...</p>
              </div>
            </div>
          ) : registrations.length === 0 ? (
            <Card className="glass-card p-12 text-center">
              <FileText className="size-12 text-gray-500 mx-auto mb-4" />
              <p className="text-lg text-gray-400">Chưa có tổ chức nào đăng ký FDA</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {registrations.map((reg) => (
                <Card key={reg.id} className="bg-slate-800/50 border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-emerald-500/10 rounded-lg">
                          <Building2 className="size-6 text-emerald-400" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-xl font-bold text-white">{reg.name}</h3>
                          <p className="text-sm text-gray-400">{reg.fda_registration_number || "Chưa có FDA Number"}</p>
                          {reg.duns_number && <p className="text-xs text-gray-500">DUNS: {reg.duns_number}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {reg.fda_registration_number && (
                          <Badge variant="default" className="bg-emerald-500/20 text-emerald-400">
                            Đã đăng ký
                          </Badge>
                        )}
                        {getStatusBadge(reg.fda_registration_status)}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(reg)}>
                              <Eye className="size-4 mr-2" />
                              Xem chi tiết
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditRegistration(reg)}>
                              <Edit className="size-4 mr-2" />
                              Chỉnh sửa
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownloadCertificate(reg)}>
                              <Download className="size-4 mr-2" />
                              Tải chứng chỉ
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDeleteRegistration(reg)} className="text-red-400">
                              <Trash2 className="size-4 mr-2" />
                              Xóa đăng ký
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">PoA Status</p>
                        <div className="flex items-center gap-2">
                          {reg.poa_signed ? (
                            <>
                              <CheckCircle2 className="size-4 text-emerald-400" />
                              <span className="text-sm text-emerald-400">Đã ký</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="size-4 text-yellow-400" />
                              <span className="text-sm text-yellow-400">Chưa ký</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 mb-1">U.S. Agent</p>
                        <p className="text-sm text-white">{reg.us_agent_name || "Chưa có"}</p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 mb-1">Ngày đăng ký</p>
                        <p className="text-sm text-white">
                          {reg.fda_registration_date
                            ? new Date(reg.fda_registration_date).toLocaleDateString("vi-VN")
                            : "N/A"}
                        </p>
                      </div>
                    </div>

                    {reg.us_agent_email && (
                      <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <Calendar className="size-4" />
                          <span>Agent Email: {reg.us_agent_email}</span>
                          {reg.us_agent_phone && <span className="ml-4">Phone: {reg.us_agent_phone}</span>}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="new">
          <Card className="bg-slate-800/50 border-white/10">
            <CardHeader>
              <CardTitle>Đăng ký FDA mới</CardTitle>
              <CardDescription>
                {availableOrgsForRegistration.length === 0
                  ? "Tất cả các tổ chức đã được đăng ký FDA."
                  : `Có ${availableOrgsForRegistration.length} tổ chức chưa đăng ký FDA.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {availableOrgsForRegistration.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="size-12 text-emerald-400 mx-auto mb-4" />
                  <p className="text-lg text-white mb-2">Tất cả tổ chức đã đăng ký</p>
                  <p className="text-sm text-gray-400">
                    Không có tổ chức nào cần đăng ký FDA. Tạo tổ chức mới hoặc quản lý đăng ký hiện có.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleRegisterFDA()
                  }}
                  className="space-y-6"
                >
                  <div>
                    <Label htmlFor="organization" className="text-base font-bold text-white">
                      Chọn Tổ chức
                    </Label>
                    <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Chọn tổ chức cần đăng ký FDA" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableOrgsForRegistration.map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            <div className="flex items-center gap-2">
                              <span>{org.name}</span>
                              <span className="text-gray-400 text-xs">({org.organization_type})</span>
                              <Badge variant="secondary" className="ml-2 bg-amber-500/20 text-amber-400 text-xs">
                                Chưa đăng ký
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-400 mt-2">
                      Chỉ hiển thị các tổ chức chưa đăng ký FDA. Đã đăng ký sẽ được ẩn để tránh trùng lặp.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="fdaNumber" className="text-base font-bold text-white">
                      FDA Registration Number
                    </Label>
                    <Input
                      id="fdaNumber"
                      value={fdaNumber}
                      onChange={(e) => setFdaNumber(e.target.value)}
                      placeholder="12345678901 (11 chữ số)"
                      maxLength={11}
                      className="mt-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">{fdaNumber.length}/11 chữ số</p>
                  </div>

                  <div>
                    <Label htmlFor="dunsNumber" className="text-base font-bold text-white">
                      Mã DUNS
                    </Label>
                    <Input
                      id="dunsNumber"
                      value={dunsNumber}
                      onChange={(e) => setDunsNumber(e.target.value)}
                      placeholder="123456789 (9 chữ số - tùy chọn)"
                      maxLength={9}
                      className="mt-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {dunsNumber.length}/9 chữ số (Dun & Bradstreet Universal Numbering System)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="fdaStatus" className="text-base font-bold text-white">
                      Trạng thái FDA
                    </Label>
                    <Select value={fdaStatus} onValueChange={(v) => setFdaStatus(v as "pending" | "active")}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Chờ duyệt (Pending)</SelectItem>
                        <SelectItem value="active">Đã kích hoạt (Active)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                    <div>
                      <Label className="text-base font-bold text-white">Power of Attorney đã ký</Label>
                      <p className="text-sm text-gray-400 mt-1">Khách hàng đã ký giấy ủy quyền cho U.S. Agent</p>
                    </div>
                    <Switch checked={poaSigned} onCheckedChange={setPoaSigned} />
                  </div>

                  <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <Label className="text-base font-bold text-white">Sử dụng VEXIM làm U.S. Agent</Label>
                        <p className="text-sm text-gray-400 mt-1">Tự động điền thông tin Agent của VEXIM</p>
                      </div>
                      <Switch checked={useVeximAgent} onCheckedChange={setUseVeximAgent} />
                    </div>

                    {!useVeximAgent && (
                      <div className="space-y-4 mt-4 pt-4 border-t border-white/10">
                        <Input
                          placeholder="Tên Đại diện"
                          value={customAgentName}
                          onChange={(e) => setCustomAgentName(e.target.value)}
                        />
                        <Input
                          placeholder="Tên công ty"
                          value={customAgentCompany}
                          onChange={(e) => setCustomAgentCompany(e.target.value)}
                        />
                        <Input
                          type="email"
                          placeholder="Email"
                          value={customAgentEmail}
                          onChange={(e) => setCustomAgentEmail(e.target.value)}
                        />
                        <Input
                          placeholder="Số điện thoại"
                          value={customAgentPhone}
                          onChange={(e) => setCustomAgentPhone(e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-base font-bold text-white">Ngày bắt đầu hợp đồng</Label>
                      <Input
                        type="date"
                        value={contractStartDate}
                        onChange={(e) => setContractStartDate(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label className="text-base font-bold text-white">Thời hạn hợp đồng</Label>
                      <Select value={contractDuration} onValueChange={setContractDuration}>
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 năm</SelectItem>
                          <SelectItem value="2">2 năm</SelectItem>
                          <SelectItem value="3">3 năm</SelectItem>
                          <SelectItem value="4">4 năm</SelectItem>
                          <SelectItem value="5">5 năm</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    onClick={handleRegisterFDA}
                    disabled={!selectedOrgId || !fdaNumber || !dunsNumber || isRegistering}
                    className="w-full"
                  >
                    {isRegistering && (
                      <div className="animate-spin mr-2 size-4 border-2 border-white border-t-transparent rounded-full" />
                    )}
                    {isRegistering ? "Đang đăng ký..." : "Đăng ký FDA"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chi tiết Đăng ký FDA</DialogTitle>
            <DialogDescription>Thông tin chi tiết về đăng ký FDA của tổ chức</DialogDescription>
          </DialogHeader>
          {selectedRegistration && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-500">Tổ chức</Label>
                  <p className="text-base font-bold text-white">{selectedRegistration.name}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Loại hình</Label>
                  <p className="text-base text-white">{selectedRegistration.organization_type}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">FDA Number</Label>
                  <p className="text-base font-bold text-white">
                    {selectedRegistration.fda_registration_number || "N/A"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">DUNS Number</Label>
                  <p className="text-base text-white">{selectedRegistration.duns_number || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Trạng thái</Label>
                  <div className="mt-1">{getStatusBadge(selectedRegistration.fda_registration_status)}</div>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Ngày đăng ký</Label>
                  <p className="text-base text-white">
                    {selectedRegistration.fda_registration_date
                      ? new Date(selectedRegistration.fda_registration_date).toLocaleDateString("vi-VN")
                      : "N/A"}
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t border-white/10">
                <Label className="text-sm text-gray-500 mb-2 block">U.S. Agent Information</Label>
                <div className="space-y-2">
                  <p className="text-base text-white">{selectedRegistration.us_agent_name || "N/A"}</p>
                  <p className="text-sm text-gray-400">{selectedRegistration.us_agent_email || "N/A"}</p>
                  <p className="text-sm text-gray-400">{selectedRegistration.us_agent_phone || "N/A"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedRegistration.poa_signed ? (
                  <>
                    <CheckCircle2 className="size-5 text-emerald-400" />
                    <span className="text-sm text-emerald-400">Power of Attorney đã ký</span>
                    {selectedRegistration.poa_signed_date && (
                      <span className="text-xs text-gray-500">
                        ({new Date(selectedRegistration.poa_signed_date).toLocaleDateString("vi-VN")})
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <AlertCircle className="size-5 text-yellow-400" />
                    <span className="text-sm text-yellow-400">Power of Attorney chưa ký</span>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa Đăng ký FDA</DialogTitle>
            <DialogDescription>Cập nhật thông tin đăng ký FDA cho {selectedRegistration?.name}</DialogDescription>
          </DialogHeader>
          {selectedRegistration && (
            <div className="space-y-6">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">FDA Registration Number</label>
                  <input
                    type="text"
                    value={editFormData.fda_registration_number || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, fda_registration_number: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="11132132167"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">DUNS Number</label>
                  <input
                    type="text"
                    value={editFormData.duns_number || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, duns_number: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="556788767"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Trạng thái</label>
                  <select
                    value={editFormData.fda_registration_status || "pending"}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        fda_registration_status: e.target.value as FDARegistration["fda_registration_status"],
                      })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Ngày đăng ký FDA</label>
                  <input
                    type="date"
                    value={editFormData.fda_registration_date || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, fda_registration_date: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold mb-4">Thông tin U.S. Agent</h3>

                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Tên Agent</label>
                      <input
                        type="text"
                        value={editFormData.us_agent_name || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, us_agent_name: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="VEXIM Compliance Services"
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Email</label>
                      <input
                        type="email"
                        value={editFormData.us_agent_email || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, us_agent_email: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="fda-agent@vexim.com"
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Số điện thoại</label>
                      <input
                        type="tel"
                        value={editFormData.us_agent_phone || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, us_agent_phone: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="+1 (301) 555-0100"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold mb-4">Power of Attorney (PoA)</h3>

                  <div className="grid gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="poa_signed"
                        checked={editFormData.poa_signed || false}
                        onChange={(e) => setEditFormData({ ...editFormData, poa_signed: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <label htmlFor="poa_signed" className="text-sm font-medium">
                        Đã ký PoA
                      </label>
                    </div>

                    {editFormData.poa_signed && (
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Ngày ký PoA</label>
                        <input
                          type="date"
                          value={editFormData.poa_signed_date || ""}
                          onChange={(e) => setEditFormData({ ...editFormData, poa_signed_date: e.target.value })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleUpdateRegistration}
                  disabled={isUpdating}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  {isUpdating && (
                    <div className="animate-spin mr-2 size-4 border-2 border-white border-t-transparent rounded-full" />
                  )}
                  {isUpdating ? "Đang cập nhật..." : "Cập nhật"}
                </Button>
                <Button
                  onClick={() => setEditDialogOpen(false)}
                  variant="outline"
                  className="flex-1"
                  disabled={isUpdating}
                >
                  Hủy
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa đăng ký FDA</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa đăng ký FDA của <strong>{selectedRegistration?.name}</strong>? Hành động này
              không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteRegistration}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting && (
                <div className="animate-spin mr-2 size-4 border-2 border-white border-t-transparent rounded-full" />
              )}
              {isDeleting ? "Đang xóa..." : "Xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
