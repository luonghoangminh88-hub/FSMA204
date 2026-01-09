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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, CreditCard, TrendingUp, Users, AlertCircle, Settings, Loader2 } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import { useToast } from "@/hooks/use-toast"

interface Subscription {
  id: string
  organization_id: string
  package_id: string
  subscription_status: string
  billing_cycle: string
  subscription_start_date: string
  subscription_end_date: string | null
  next_billing_date: string | null
  base_price: number
  monthly_total: number
  extra_users_count: number
  extra_locations_count: number
  extra_lots_count: number
  current_users_count: number
  current_locations_count: number
  current_lots_count: number
  organization?: {
    id: string
    name: string
    organization_type: string
  }
  package?: {
    package_name: string
    package_code: string
    package_tier: number
  }
}

interface ServicePackage {
  id: string
  package_name: string
  package_code: string
  price_monthly: number
  price_yearly: number | null
}

export default function AdminSubscriptionsPage() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const router = useRouter()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [packages, setPackages] = useState<ServicePackage[]>([])
  const [organizations, setOrganizations] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isSavingQuota, setIsSavingQuota] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isQuotaDialogOpen, setIsQuotaDialogOpen] = useState(false)
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string>("all")

  const [formData, setFormData] = useState({
    organization_id: "",
    package_id: "",
    billing_cycle: "monthly" as "monthly" | "yearly",
    subscription_start_date: new Date().toISOString().split("T")[0],
  })

  const [quotaFormData, setQuotaFormData] = useState({
    custom_max_users: null as number | null,
    custom_max_locations: null as number | null,
    custom_max_lots_per_month: null as number | null,
    custom_storage_gb: null as number | null,
  })

  useEffect(() => {
    checkAuth()
    loadData()
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

    if (profileData?.role !== "system_admin" && profileData?.role !== "org_admin") {
      router.push("/dashboard")
      return
    }

    setProfile(profileData)
  }

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load subscriptions
      const subsResponse = await fetch("/api/subscriptions")
      const subsData = await subsResponse.json()

      if (subsResponse.ok) {
        setSubscriptions(subsData.subscriptions || [])
      }

      // Load packages
      const pkgResponse = await fetch("/api/packages")
      const pkgData = await pkgResponse.json()

      if (pkgResponse.ok) {
        setPackages(pkgData.packages?.filter((p: any) => p.is_active) || [])
      }

      // Load organizations
      const supabase = createClient()
      const { data: orgsData } = await supabase.from("organizations").select("*").order("name")
      setOrganizations(orgsData || [])
    } catch (error: any) {
      console.error("[v0] Error loading data:", error)
      toast({
        title: t("common.error"),
        description: error.message || "Failed to load data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateSubscription = async () => {
    if (!formData.organization_id || !formData.package_id) {
      toast({
        title: t("common.error"),
        description: "Please select organization and package",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)
    try {
      const selectedPackage = packages.find((p) => p.id === formData.package_id)
      if (!selectedPackage) return

      const basePrice =
        formData.billing_cycle === "yearly" && selectedPackage.price_yearly
          ? selectedPackage.price_yearly
          : selectedPackage.price_monthly

      const subscriptionData = {
        organization_id: formData.organization_id,
        package_id: formData.package_id,
        subscription_status: "active",
        billing_cycle: formData.billing_cycle,
        subscription_start_date: formData.subscription_start_date,
        base_price: basePrice,
        monthly_total: basePrice,
        extra_users_count: 0,
        extra_locations_count: 0,
        extra_lots_count: 0,
        current_users_count: 0,
        current_locations_count: 0,
        current_lots_count: 0,
      }

      const response = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscriptionData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error)
      }

      toast({
        title: t("common.success"),
        description: t("add-subscription") + " successfully",
      })

      setIsDialogOpen(false)
      setFormData({
        organization_id: "",
        package_id: "",
        billing_cycle: "monthly",
        subscription_start_date: new Date().toISOString().split("T")[0],
      })
      loadData()
    } catch (error: any) {
      console.error("[v0] Error creating subscription:", error)
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleCustomizeQuota = (sub: Subscription) => {
    setSelectedSubscription(sub)
    setQuotaFormData({
      custom_max_users: (sub as any).custom_max_users || null,
      custom_max_locations: (sub as any).custom_max_locations || null,
      custom_max_lots_per_month: (sub as any).custom_max_lots_per_month || null,
      custom_storage_gb: (sub as any).custom_storage_gb || null,
    })
    setIsQuotaDialogOpen(true)
  }

  const handleSaveCustomQuota = async () => {
    if (!selectedSubscription) return

    setIsSavingQuota(true)
    try {
      const response = await fetch(`/api/subscriptions/${selectedSubscription.id}/customize-quota`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quotaFormData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error)
      }

      toast({
        title: t("common.success"),
        description: "Custom quota updated successfully",
      })

      setIsQuotaDialogOpen(false)
      setSelectedSubscription(null)
      loadData()
    } catch (error: any) {
      console.error("[v0] Error updating quota:", error)
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsSavingQuota(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(price)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; variant: any }> = {
      active: { label: "Active", variant: "default" },
      trial: { label: "Trial", variant: "secondary" },
      past_due: { label: "Past Due", variant: "destructive" },
      cancelled: { label: "Cancelled", variant: "outline" },
      suspended: { label: "Suspended", variant: "destructive" },
      expired: { label: "Expired", variant: "secondary" },
    }
    return badges[status] || badges.active
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

  const filteredSubscriptions =
    selectedOrgFilter && selectedOrgFilter !== "all"
      ? subscriptions.filter((s) => s.organization_id === selectedOrgFilter)
      : subscriptions

  const totalMRR = subscriptions
    .filter((s) => s.subscription_status === "active")
    .reduce((sum, s) => sum + s.monthly_total, 0)

  const activeSubscriptions = subscriptions.filter((s) => s.subscription_status === "active").length

  if (!profile || (profile.role !== "system_admin" && profile.role !== "org_admin")) {
    return null
  }

  return (
    <div className="flex-1 space-y-6 p-6 md:p-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("subscriptions")}</h1>
          <p className="text-muted-foreground">{t("manage-company-service-package-subscriptions")}</p>
        </div>
        {profile.role === "system_admin" && (
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="size-4" />
            {t("add-subscription")}
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("total-subscriptions")}</CardTitle>
            <CreditCard className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscriptions.length}</div>
            <p className="text-xs text-muted-foreground">{activeSubscriptions} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(totalMRR)}</div>
            <p className="text-xs text-muted-foreground">from active subscriptions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Revenue</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeSubscriptions > 0 ? formatPrice(totalMRR / activeSubscriptions) : formatPrice(0)}
            </div>
            <p className="text-xs text-muted-foreground">per organization</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("subscription-list")}</CardTitle>
              <CardDescription>All subscription records in the system</CardDescription>
            </div>
            {profile.role === "system_admin" && (
              <Select value={selectedOrgFilter} onValueChange={setSelectedOrgFilter}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Filter by organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Organizations</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">{t("common.loading")}</div>
          ) : filteredSubscriptions.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="size-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t("no-subscriptions-yet")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Monthly Total</TableHead>
                  <TableHead>Next Billing</TableHead>
                  {profile.role === "system_admin" && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions.map((sub) => {
                  const statusBadge = getStatusBadge(sub.subscription_status)
                  const tierBadge = sub.package ? getTierBadge(sub.package.package_tier) : null

                  return (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{sub.organization?.name || "Unknown"}</span>
                          <span className="text-xs text-muted-foreground">
                            {sub.organization?.organization_type
                              ? t(`orgType.${sub.organization.organization_type}`)
                              : "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{sub.package?.package_name || "Unknown"}</span>
                          {tierBadge && <Badge variant={tierBadge.variant}>{tierBadge.label}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium capitalize">{sub.billing_cycle}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatPrice(sub.base_price)}/{sub.billing_cycle === "monthly" ? "mo" : "yr"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs space-y-1">
                          <div>
                            Users: {sub.current_users_count}
                            {sub.extra_users_count > 0 && (
                              <span className="text-orange-600"> (+{sub.extra_users_count})</span>
                            )}
                          </div>
                          <div>
                            Locations: {sub.current_locations_count}
                            {sub.extra_locations_count > 0 && (
                              <span className="text-orange-600"> (+{sub.extra_locations_count})</span>
                            )}
                          </div>
                          <div>
                            Lots: {sub.current_lots_count}
                            {sub.extra_lots_count > 0 && (
                              <span className="text-orange-600"> (+{sub.extra_lots_count})</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-lg">{formatPrice(sub.monthly_total)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{formatDate(sub.next_billing_date)}</span>
                      </TableCell>
                      {profile.role === "system_admin" && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleCustomizeQuota(sub)}>
                            <Settings className="size-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("add-subscription")}</DialogTitle>
            <DialogDescription>Create a new subscription for an organization</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="organization">Organization</Label>
              <Select
                value={formData.organization_id}
                onValueChange={(value) => setFormData({ ...formData, organization_id: value })}
                disabled={isCreating}
              >
                <SelectTrigger id="organization">
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="package">Package</Label>
              <Select
                value={formData.package_id}
                onValueChange={(value) => setFormData({ ...formData, package_id: value })}
                disabled={isCreating}
              >
                <SelectTrigger id="package">
                  <SelectValue placeholder="Select package" />
                </SelectTrigger>
                <SelectContent>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.package_name} - {formatPrice(pkg.price_monthly)}/mo
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="billing_cycle">Billing Cycle</Label>
              <Select
                value={formData.billing_cycle}
                onValueChange={(value) => setFormData({ ...formData, billing_cycle: value as "monthly" | "yearly" })}
                disabled={isCreating}
              >
                <SelectTrigger id="billing_cycle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.subscription_start_date}
                onChange={(e) => setFormData({ ...formData, subscription_start_date: e.target.value })}
                disabled={isCreating}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button onClick={handleCreateSubscription} disabled={isCreating}>
              {isCreating && <Loader2 className="size-4 mr-2 animate-spin" />}
              {isCreating ? "Creating..." : t("add-subscription")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isQuotaDialogOpen} onOpenChange={setIsQuotaDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Customize Quota</DialogTitle>
            <DialogDescription>Override default package limits for this subscription</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">Leave empty to use package default limits</p>
            <div className="space-y-2">
              <Label htmlFor="custom_max_users">Custom Max Users</Label>
              <Input
                id="custom_max_users"
                type="number"
                placeholder="Use package default"
                value={quotaFormData.custom_max_users || ""}
                onChange={(e) =>
                  setQuotaFormData({
                    ...quotaFormData,
                    custom_max_users: e.target.value ? Number.parseInt(e.target.value) : null,
                  })
                }
                disabled={isSavingQuota}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom_max_locations">Custom Max Locations</Label>
              <Input
                id="custom_max_locations"
                type="number"
                placeholder="Use package default"
                value={quotaFormData.custom_max_locations || ""}
                onChange={(e) =>
                  setQuotaFormData({
                    ...quotaFormData,
                    custom_max_locations: e.target.value ? Number.parseInt(e.target.value) : null,
                  })
                }
                disabled={isSavingQuota}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom_max_lots_per_month">Custom Max Lots/Month</Label>
              <Input
                id="custom_max_lots_per_month"
                type="number"
                placeholder="Use package default"
                value={quotaFormData.custom_max_lots_per_month || ""}
                onChange={(e) =>
                  setQuotaFormData({
                    ...quotaFormData,
                    custom_max_lots_per_month: e.target.value ? Number.parseInt(e.target.value) : null,
                  })
                }
                disabled={isSavingQuota}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom_storage_gb">Custom Storage (GB)</Label>
              <Input
                id="custom_storage_gb"
                type="number"
                placeholder="Use package default"
                value={quotaFormData.custom_storage_gb || ""}
                onChange={(e) =>
                  setQuotaFormData({
                    ...quotaFormData,
                    custom_storage_gb: e.target.value ? Number.parseInt(e.target.value) : null,
                  })
                }
                disabled={isSavingQuota}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQuotaDialogOpen(false)} disabled={isSavingQuota}>
              Cancel
            </Button>
            <Button onClick={handleSaveCustomQuota} disabled={isSavingQuota}>
              {isSavingQuota && <Loader2 className="size-4 mr-2 animate-spin" />}
              {isSavingQuota ? "Saving..." : "Save Custom Quota"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
