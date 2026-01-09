"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Package, Eye, CheckCircle, XCircle, Plus, Pencil, Loader2 } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ServicePackage {
  id: string
  package_name: string
  package_code: string
  package_tier: number
  description: string
  price_monthly: number
  price_yearly: number | null
  max_users: number | null
  max_locations: number | null
  max_lots_per_month: number | null
  storage_gb: number
  is_active: boolean
  is_popular: boolean
  is_featured: boolean
  has_batch_operations: boolean
  has_us_agent_service: boolean
  has_api_access: boolean
  support_level: string
  extra_user_price: number
  extra_location_price: number
  extra_lot_price: number
  has_basic_cte: boolean
  has_fda_compliance: boolean
  has_traceability: boolean
  has_quantity_reconciliation: boolean
  has_loss_analytics: boolean
  has_automated_alerts: boolean
  has_tlc_auto_generation: boolean
  has_approval_workflows: boolean
  has_shelf_life_monitoring: boolean
  has_advanced_analytics: boolean
  has_custom_integrations: boolean
  has_blockchain_verification: boolean
  has_white_label_branding: boolean
}

const initialPackageForm: Partial<ServicePackage> = {
  package_name: "",
  package_code: "",
  package_tier: 1,
  description: "",
  price_monthly: 0,
  price_yearly: 0,
  max_users: null,
  max_locations: null,
  max_lots_per_month: null,
  storage_gb: 100,
  is_active: true,
  is_popular: false,
  is_featured: false,
  has_basic_cte: true,
  has_fda_compliance: true,
  has_traceability: true,
  has_batch_operations: false,
  has_us_agent_service: false,
  has_quantity_reconciliation: false,
  has_loss_analytics: false,
  has_automated_alerts: false,
  has_tlc_auto_generation: false,
  has_approval_workflows: false,
  has_shelf_life_monitoring: false,
  has_advanced_analytics: false,
  has_api_access: false,
  has_custom_integrations: false,
  has_blockchain_verification: false,
  has_white_label_branding: false,
  support_level: "email_48h",
  extra_user_price: 0,
  extra_location_price: 0,
  extra_lot_price: 0,
}

export default function AdminPackagesPage() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const router = useRouter()
  const [packages, setPackages] = useState<ServicePackage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCreateMode, setIsCreateMode] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [packageForm, setPackageForm] = useState<Partial<ServicePackage>>(initialPackageForm)

  useEffect(() => {
    checkAuth()
    loadPackages()
  }, [])

  const checkAuth = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/auth/login")
      return
    }

    const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single()

    if (profileData?.role !== "system_admin") {
      router.push("/dashboard")
      return
    }

    setProfile(profileData)
  }

  const loadPackages = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/packages")
      const data = await response.json()

      if (response.ok) {
        setPackages(data.packages || [])
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      console.error("[v0] Error loading packages:", error)
      toast({
        title: t("common.error"),
        description: error.message || "Failed to load packages",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewPackage = (pkg: ServicePackage) => {
    setSelectedPackage(pkg)
    setIsViewDialogOpen(true)
  }

  const handleCreatePackage = () => {
    setIsCreateMode(true)
    setPackageForm(initialPackageForm)
    setIsEditDialogOpen(true)
  }

  const handleEditPackage = (pkg: ServicePackage) => {
    setIsCreateMode(false)
    setPackageForm(pkg)
    setIsEditDialogOpen(true)
  }

  const handleSavePackage = async () => {
    setIsSaving(true)
    try {
      const url = isCreateMode ? "/api/packages" : `/api/packages/${packageForm.id}`
      const method = isCreateMode ? "POST" : "PATCH"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(packageForm),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error)
      }

      toast({
        title: t("common.success"),
        description: isCreateMode ? "Package created successfully" : "Package updated successfully",
      })

      setIsEditDialogOpen(false)
      loadPackages()
    } catch (error: any) {
      console.error("[v0] Error saving package:", error)
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const togglePackageStatus = async (pkg: ServicePackage) => {
    setTogglingId(pkg.id)
    try {
      const response = await fetch(`/api/packages/${pkg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !pkg.is_active }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error)
      }

      toast({
        title: t("common.success"),
        description: `Package ${pkg.is_active ? "deactivated" : "activated"} successfully`,
      })

      loadPackages()
    } catch (error: any) {
      console.error("[v0] Error toggling package:", error)
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setTogglingId(null)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(price)
  }

  const getTierBadge = (tier: number) => {
    const badges = [
      { label: "Starter", variant: "secondary" as const },
      { label: "Professional", variant: "default" as const },
      { label: "Enterprise", variant: "destructive" as const },
      { label: "White Label", variant: "outline" as const },
    ]
    return badges[tier - 1] || badges[0]
  }

  if (!profile || profile.role !== "system_admin") {
    return null
  }

  return (
    <div className="flex-1 space-y-6 p-6 md:p-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("service_packages")}</h1>
          <p className="text-muted-foreground">{t("create_and_manage_service_packages")}</p>
        </div>
        <Button onClick={handleCreatePackage}>
          <Plus className="size-4 mr-2" />
          Create Package
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("total_packages")}</CardTitle>
            <Package className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{packages.length}</div>
            <p className="text-xs text-muted-foreground">
              {packages.filter((p) => p.is_active).length} active packages
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Starter Tier</CardTitle>
            <Badge variant="secondary">Tier 1</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(packages.find((p) => p.package_code === "starter")?.price_monthly || 0)}
            </div>
            <p className="text-xs text-muted-foreground">per month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Professional</CardTitle>
            <Badge variant="default">Tier 2</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(packages.find((p) => p.package_code === "professional")?.price_monthly || 0)}
            </div>
            <p className="text-xs text-muted-foreground">per month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enterprise</CardTitle>
            <Badge variant="destructive">Tier 3</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(packages.find((p) => p.package_code === "enterprise")?.price_monthly || 0)}
            </div>
            <p className="text-xs text-muted-foreground">per month</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("package_list")}</CardTitle>
          <CardDescription>{t("packages_in_system")}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">{t("common.loading")}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Package Name</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Limits</TableHead>
                  <TableHead>Features</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.map((pkg) => {
                  const tierBadge = getTierBadge(pkg.package_tier)
                  const isToggling = togglingId === pkg.id
                  return (
                    <TableRow key={pkg.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{pkg.package_name}</span>
                          <span className="text-xs text-muted-foreground">{pkg.package_code}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={tierBadge.variant}>{tierBadge.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold">{formatPrice(pkg.price_monthly)}/mo</span>
                          {pkg.price_yearly && (
                            <span className="text-xs text-muted-foreground">{formatPrice(pkg.price_yearly)}/yr</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          <div>{pkg.max_users ? `${pkg.max_users} users` : "Unlimited users"}</div>
                          <div>{pkg.max_locations ? `${pkg.max_locations} locations` : "Unlimited locations"}</div>
                          <div>{pkg.max_lots_per_month ? `${pkg.max_lots_per_month} lots/mo` : "Unlimited lots"}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {pkg.has_batch_operations && (
                            <Badge variant="outline" className="text-xs">
                              Batch Ops
                            </Badge>
                          )}
                          {pkg.has_us_agent_service && (
                            <Badge variant="outline" className="text-xs">
                              US Agent
                            </Badge>
                          )}
                          {pkg.has_api_access && (
                            <Badge variant="outline" className="text-xs">
                              API
                            </Badge>
                          )}
                          {/* Add other feature badges here based on the ServicePackage interface */}
                          {pkg.has_basic_cte && (
                            <Badge variant="outline" className="text-xs">
                              Basic CTE
                            </Badge>
                          )}
                          {pkg.has_fda_compliance && (
                            <Badge variant="outline" className="text-xs">
                              FDA Compliance
                            </Badge>
                          )}
                          {pkg.has_traceability && (
                            <Badge variant="outline" className="text-xs">
                              Traceability
                            </Badge>
                          )}
                          {pkg.has_quantity_reconciliation && (
                            <Badge variant="outline" className="text-xs">
                              Quantity Reconciliation
                            </Badge>
                          )}
                          {pkg.has_loss_analytics && (
                            <Badge variant="outline" className="text-xs">
                              Loss Analytics
                            </Badge>
                          )}
                          {pkg.has_automated_alerts && (
                            <Badge variant="outline" className="text-xs">
                              Automated Alerts
                            </Badge>
                          )}
                          {pkg.has_tlc_auto_generation && (
                            <Badge variant="outline" className="text-xs">
                              TLC Auto Generation
                            </Badge>
                          )}
                          {pkg.has_approval_workflows && (
                            <Badge variant="outline" className="text-xs">
                              Approval Workflows
                            </Badge>
                          )}
                          {pkg.has_shelf_life_monitoring && (
                            <Badge variant="outline" className="text-xs">
                              Shelf Life Monitoring
                            </Badge>
                          )}
                          {pkg.has_advanced_analytics && (
                            <Badge variant="outline" className="text-xs">
                              Advanced Analytics
                            </Badge>
                          )}
                          {pkg.has_custom_integrations && (
                            <Badge variant="outline" className="text-xs">
                              Custom Integrations
                            </Badge>
                          )}
                          {pkg.has_blockchain_verification && (
                            <Badge variant="outline" className="text-xs">
                              Blockchain Verification
                            </Badge>
                          )}
                          {pkg.has_white_label_branding && (
                            <Badge variant="outline" className="text-xs">
                              White Label Branding
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={pkg.is_active}
                            onCheckedChange={() => togglePackageStatus(pkg)}
                            disabled={isToggling}
                          />
                          {isToggling ? (
                            <Loader2 className="size-4 animate-spin text-muted-foreground" />
                          ) : pkg.is_active ? (
                            <CheckCircle className="size-4 text-green-600" />
                          ) : (
                            <XCircle className="size-4 text-gray-400" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditPackage(pkg)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleViewPackage(pkg)}>
                            <Eye className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isCreateMode ? "Create New Package" : "Edit Package"}</DialogTitle>
            <DialogDescription>
              {isCreateMode ? "Add a new service package to the system" : "Update package details and features"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="package_name">Package Name*</Label>
                  <Input
                    id="package_name"
                    value={packageForm.package_name}
                    onChange={(e) => setPackageForm({ ...packageForm, package_name: e.target.value })}
                    placeholder="e.g., Starter"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="package_code">Package Code*</Label>
                  <Select
                    value={packageForm.package_code}
                    onValueChange={(value) => setPackageForm({ ...packageForm, package_code: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select code" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">starter</SelectItem>
                      <SelectItem value="professional">professional</SelectItem>
                      <SelectItem value="enterprise">enterprise</SelectItem>
                      <SelectItem value="white_label">white_label</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="package_tier">Package Tier*</Label>
                  <Select
                    value={packageForm.package_tier?.toString()}
                    onValueChange={(value) => setPackageForm({ ...packageForm, package_tier: Number.parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Starter</SelectItem>
                      <SelectItem value="2">2 - Professional</SelectItem>
                      <SelectItem value="3">3 - Enterprise</SelectItem>
                      <SelectItem value="4">4 - White Label</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="support_level">Support Level*</Label>
                  <Select
                    value={packageForm.support_level}
                    onValueChange={(value) => setPackageForm({ ...packageForm, support_level: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select support" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email_48h">Email (48h)</SelectItem>
                      <SelectItem value="email_chat_24h">Email & Chat (24h)</SelectItem>
                      <SelectItem value="priority_4h">Priority (4h)</SelectItem>
                      <SelectItem value="dedicated_24_7">Dedicated 24/7</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description*</Label>
                <Textarea
                  id="description"
                  value={packageForm.description}
                  onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })}
                  placeholder="Describe the package features and benefits"
                  rows={3}
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold text-lg">Pricing</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price_monthly">Monthly Price ($)*</Label>
                  <Input
                    id="price_monthly"
                    type="number"
                    value={packageForm.price_monthly}
                    onChange={(e) =>
                      setPackageForm({ ...packageForm, price_monthly: Number.parseFloat(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price_yearly">Yearly Price ($)</Label>
                  <Input
                    id="price_yearly"
                    type="number"
                    value={packageForm.price_yearly || ""}
                    onChange={(e) =>
                      setPackageForm({
                        ...packageForm,
                        price_yearly: e.target.value ? Number.parseFloat(e.target.value) : null,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="extra_user_price">Extra User Price ($)</Label>
                  <Input
                    id="extra_user_price"
                    type="number"
                    value={packageForm.extra_user_price}
                    onChange={(e) =>
                      setPackageForm({ ...packageForm, extra_user_price: Number.parseFloat(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="extra_location_price">Extra Location Price ($)</Label>
                  <Input
                    id="extra_location_price"
                    type="number"
                    value={packageForm.extra_location_price}
                    onChange={(e) =>
                      setPackageForm({ ...packageForm, extra_location_price: Number.parseFloat(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="extra_lot_price">Extra Lot Price ($)</Label>
                  <Input
                    id="extra_lot_price"
                    type="number"
                    step="0.01"
                    value={packageForm.extra_lot_price}
                    onChange={(e) =>
                      setPackageForm({ ...packageForm, extra_lot_price: Number.parseFloat(e.target.value) })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Usage Limits */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold text-lg">Usage Limits</h3>
              <p className="text-sm text-muted-foreground">Leave empty or 0 for unlimited</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_users">Max Users</Label>
                  <Input
                    id="max_users"
                    type="number"
                    value={packageForm.max_users || ""}
                    onChange={(e) =>
                      setPackageForm({
                        ...packageForm,
                        max_users: e.target.value ? Number.parseInt(e.target.value) : null,
                      })
                    }
                    placeholder="Unlimited"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_locations">Max Locations</Label>
                  <Input
                    id="max_locations"
                    type="number"
                    value={packageForm.max_locations || ""}
                    onChange={(e) =>
                      setPackageForm({
                        ...packageForm,
                        max_locations: e.target.value ? Number.parseInt(e.target.value) : null,
                      })
                    }
                    placeholder="Unlimited"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_lots_per_month">Max Lots/Month</Label>
                  <Input
                    id="max_lots_per_month"
                    type="number"
                    value={packageForm.max_lots_per_month || ""}
                    onChange={(e) =>
                      setPackageForm({
                        ...packageForm,
                        max_lots_per_month: e.target.value ? Number.parseInt(e.target.value) : null,
                      })
                    }
                    placeholder="Unlimited"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storage_gb">Storage (GB)*</Label>
                  <Input
                    id="storage_gb"
                    type="number"
                    value={packageForm.storage_gb}
                    onChange={(e) => setPackageForm({ ...packageForm, storage_gb: Number.parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold text-lg">Features</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="has_basic_cte">Basic CTE</Label>
                  <Switch
                    id="has_basic_cte"
                    checked={packageForm.has_basic_cte}
                    onCheckedChange={(checked) => setPackageForm({ ...packageForm, has_basic_cte: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="has_fda_compliance">FDA Compliance</Label>
                  <Switch
                    id="has_fda_compliance"
                    checked={packageForm.has_fda_compliance}
                    onCheckedChange={(checked) => setPackageForm({ ...packageForm, has_fda_compliance: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="has_traceability">Traceability</Label>
                  <Switch
                    id="has_traceability"
                    checked={packageForm.has_traceability}
                    onCheckedChange={(checked) => setPackageForm({ ...packageForm, has_traceability: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="has_batch_operations">Batch Operations</Label>
                  <Switch
                    id="has_batch_operations"
                    checked={packageForm.has_batch_operations}
                    onCheckedChange={(checked) => setPackageForm({ ...packageForm, has_batch_operations: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="has_us_agent_service">US Agent Service</Label>
                  <Switch
                    id="has_us_agent_service"
                    checked={packageForm.has_us_agent_service}
                    onCheckedChange={(checked) => setPackageForm({ ...packageForm, has_us_agent_service: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="has_quantity_reconciliation">Quantity Reconciliation</Label>
                  <Switch
                    id="has_quantity_reconciliation"
                    checked={packageForm.has_quantity_reconciliation}
                    onCheckedChange={(checked) =>
                      setPackageForm({ ...packageForm, has_quantity_reconciliation: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="has_loss_analytics">Loss Analytics</Label>
                  <Switch
                    id="has_loss_analytics"
                    checked={packageForm.has_loss_analytics}
                    onCheckedChange={(checked) => setPackageForm({ ...packageForm, has_loss_analytics: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="has_automated_alerts">Automated Alerts</Label>
                  <Switch
                    id="has_automated_alerts"
                    checked={packageForm.has_automated_alerts}
                    onCheckedChange={(checked) => setPackageForm({ ...packageForm, has_automated_alerts: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="has_tlc_auto_generation">TLC Auto Generation</Label>
                  <Switch
                    id="has_tlc_auto_generation"
                    checked={packageForm.has_tlc_auto_generation}
                    onCheckedChange={(checked) => setPackageForm({ ...packageForm, has_tlc_auto_generation: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="has_approval_workflows">Approval Workflows</Label>
                  <Switch
                    id="has_approval_workflows"
                    checked={packageForm.has_approval_workflows}
                    onCheckedChange={(checked) => setPackageForm({ ...packageForm, has_approval_workflows: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="has_shelf_life_monitoring">Shelf Life Monitoring</Label>
                  <Switch
                    id="has_shelf_life_monitoring"
                    checked={packageForm.has_shelf_life_monitoring}
                    onCheckedChange={(checked) =>
                      setPackageForm({ ...packageForm, has_shelf_life_monitoring: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="has_advanced_analytics">Advanced Analytics</Label>
                  <Switch
                    id="has_advanced_analytics"
                    checked={packageForm.has_advanced_analytics}
                    onCheckedChange={(checked) => setPackageForm({ ...packageForm, has_advanced_analytics: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="has_api_access">API Access</Label>
                  <Switch
                    id="has_api_access"
                    checked={packageForm.has_api_access}
                    onCheckedChange={(checked) => setPackageForm({ ...packageForm, has_api_access: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="has_custom_integrations">Custom Integrations</Label>
                  <Switch
                    id="has_custom_integrations"
                    checked={packageForm.has_custom_integrations}
                    onCheckedChange={(checked) => setPackageForm({ ...packageForm, has_custom_integrations: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="has_blockchain_verification">Blockchain Verification</Label>
                  <Switch
                    id="has_blockchain_verification"
                    checked={packageForm.has_blockchain_verification}
                    onCheckedChange={(checked) =>
                      setPackageForm({ ...packageForm, has_blockchain_verification: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="has_white_label_branding">White Label Branding</Label>
                  <Switch
                    id="has_white_label_branding"
                    checked={packageForm.has_white_label_branding}
                    onCheckedChange={(checked) => setPackageForm({ ...packageForm, has_white_label_branding: checked })}
                  />
                </div>
              </div>
            </div>

            {/* Status & Display */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold text-lg">Status & Display</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_active">Active</Label>
                  <Switch
                    id="is_active"
                    checked={packageForm.is_active}
                    onCheckedChange={(checked) => setPackageForm({ ...packageForm, is_active: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_popular">Popular</Label>
                  <Switch
                    id="is_popular"
                    checked={packageForm.is_popular}
                    onCheckedChange={(checked) => setPackageForm({ ...packageForm, is_popular: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_featured">Featured</Label>
                  <Switch
                    id="is_featured"
                    checked={packageForm.is_featured}
                    onCheckedChange={(checked) => setPackageForm({ ...packageForm, is_featured: checked })}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSavePackage} disabled={isSaving}>
              {isSaving && <Loader2 className="size-4 mr-2 animate-spin" />}
              {isSaving ? "Saving..." : isCreateMode ? "Create Package" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Package Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Package Details</DialogTitle>
            <DialogDescription>Complete information about this service package</DialogDescription>
          </DialogHeader>
          {selectedPackage && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Package Name</Label>
                  <p className="text-lg font-semibold">{selectedPackage.package_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tier</Label>
                  <div className="mt-1">
                    <Badge variant={getTierBadge(selectedPackage.package_tier).variant}>
                      {getTierBadge(selectedPackage.package_tier).label}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Description</Label>
                <p className="text-sm mt-1">{selectedPackage.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Monthly Price</Label>
                  <p className="text-2xl font-bold">{formatPrice(selectedPackage.price_monthly)}</p>
                </div>
                {selectedPackage.price_yearly && (
                  <div>
                    <Label className="text-muted-foreground">Yearly Price</Label>
                    <p className="text-2xl font-bold">{formatPrice(selectedPackage.price_yearly)}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Usage Limits</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Max Users</Label>
                    <p className="font-medium">{selectedPackage.max_users || "Unlimited"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Max Locations</Label>
                    <p className="font-medium">{selectedPackage.max_locations || "Unlimited"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Max Lots/Month</Label>
                    <p className="font-medium">{selectedPackage.max_lots_per_month || "Unlimited"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Storage</Label>
                    <p className="font-medium">{selectedPackage.storage_gb} GB</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Extra Pricing</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Extra User</Label>
                    <p className="font-medium">{formatPrice(selectedPackage.extra_user_price)}/mo</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Extra Location</Label>
                    <p className="font-medium">{formatPrice(selectedPackage.extra_location_price)}/mo</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Extra Lot</Label>
                    <p className="font-medium">{formatPrice(selectedPackage.extra_lot_price)}/lot</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Support Level</h3>
                <Badge>{selectedPackage.support_level.replace(/_/g, " ").toUpperCase()}</Badge>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>{t("common.close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
