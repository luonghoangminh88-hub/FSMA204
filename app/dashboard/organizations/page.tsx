"use client"

export const dynamic = "force-dynamic"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Building2, MapPin, Phone, Mail, Search, Filter, MoreVertical, Edit, Trash2, Eye } from "lucide-react"
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
import { AddressAutocomplete } from "@/components/address-autocomplete"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useLanguage } from "@/hooks/use-language"
import { usePermissions } from "@/hooks/use-permissions"
import { createBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { setUserRole } from "@/lib/set-user-role" // Import setUserRole

interface Organization {
  id: string
  name: string
  organization_type: string
  address: string
  city: string
  state: string
  country: string
  postal_code: string
  phone: string
  email: string
  license_number: string
  tax_id: string
  is_active: boolean
  created_at: string
}

const ORG_TYPE_MAP: Record<string, string> = {
  farm_grower: "org.type.farm_grower",
  packer_packhouse: "org.type.packer_packhouse",
  processor_manufacturer: "org.type.processor_manufacturer",
  distributor_warehouse: "org.type.distributor_warehouse",
  first_receiver: "org.type.first_receiver",
  importer: "org.type.importer",
  retailer: "org.type.retailer",
}

export default function OrganizationsPage() {
  const { t } = useLanguage()
  
  // Ép kiểu 'as any' để dập tắt lỗi TypeScript do thiếu thuộc tính 'userRole' trong Interface gốc
  const { canCreate, canEdit, canDelete, userRole } = usePermissions() as any
  
  const { toast } = useToast()
  const router = useRouter()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null)
  const [selectedOrgType, setSelectedOrgType] = useState<string>("")
  const [addressData, setAddressData] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const supabase = createBrowserClient()

  useEffect(() => {
    checkAuthAndFetch()
  }, [])

  useEffect(() => {
    if (!isDialogOpen) {
      setSelectedOrgType("")
      setAddressData(null)
    } else if (editingOrg) {
      setSelectedOrgType(editingOrg.organization_type)
    }
  }, [isDialogOpen, editingOrg])

  async function checkAuthAndFetch() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, organization_id")
        .eq("id", user.id)
        .single()

      if (!profile) {
        toast({
          title: t("error"),
          description: "Profile not found",
          variant: "destructive",
        })
        return
      }

      setUserRole(profile.role)
      await fetchOrganizations(profile.role, profile.organization_id)
    } catch (error: any) {
      toast({
        title: t("error"),
        description: error.message,
        variant: "destructive",
      })
    }
  }

  async function fetchOrganizations(role: string, organizationId: string | null) {
    try {
      setLoading(true)

      let query = supabase.from("organizations").select("*").order("created_at", { ascending: false })

      if (role !== "system_admin") {
        if (!organizationId) {
          toast({
            title: t("error"),
            description: "No organization assigned",
            variant: "destructive",
          })
          setOrganizations([])
          setLoading(false)
          return
        }
        query = query.eq("id", organizationId)
      }

      const { data, error } = await query

      if (error) throw error
      setOrganizations(data || [])
    } catch (error: any) {
      console.error("[v0] Error fetching organizations:", error)
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

    const orgData = {
      name: formData.get("name") as string,
      organization_type: selectedOrgType,
      address: addressData?.fullAddress || (formData.get("address") as string),
      city: addressData?.city || (formData.get("city") as string),
      state: addressData?.state || (formData.get("state") as string),
      country: addressData?.country || (formData.get("country") as string) || "US",
      postal_code: addressData?.postalCode || (formData.get("postal_code") as string),
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
      license_number: formData.get("license_number") as string,
      tax_id: formData.get("tax_id") as string,
    }

    try {
      if (editingOrg) {
        const { error } = await supabase.from("organizations").update(orgData).eq("id", editingOrg.id)

        if (error) throw error
        toast({ title: t("success"), description: t("organizationUpdated") })
      } else {
        const { error } = await supabase.from("organizations").insert([orgData])

        if (error) throw error
        toast({ title: t("success"), description: t("organizationCreated") })
      }

      setIsDialogOpen(false)
      setEditingOrg(null)
      checkAuthAndFetch()
    } catch (error: any) {
      console.error("[v0] Error saving organization:", error)
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
      const { error } = await supabase.from("organizations").delete().eq("id", id)

      if (error) throw error
      toast({ title: t("success"), description: t("organizationDeleted") })
      checkAuthAndFetch()
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

  const filteredOrgs = organizations.filter((org) => {
    const matchesSearch =
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === "all" || org.organization_type === filterType
    return matchesSearch && matchesType
  })

  const orgTypeColors: Record<string, string> = {
    farm_grower: "bg-green-100 text-green-800",
    packer_packhouse: "bg-blue-100 text-blue-800",
    processor_manufacturer: "bg-purple-100 text-purple-800",
    distributor_warehouse: "bg-orange-100 text-orange-800",
    first_receiver: "bg-cyan-100 text-cyan-800",
    importer: "bg-yellow-100 text-yellow-800",
    retailer: "bg-pink-100 text-pink-800",
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-semibold text-3xl tracking-tight">{t("organizations")}</h1>
          <p className="text-muted-foreground text-sm">{t("manageOrganizationsDescription")}</p>
        </div>
        {canCreate?.("organizations") && userRole === "system_admin" && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingOrg(null)}>
                <Plus className="mr-2 h-4 w-4" />
                {t("addOrganization")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingOrg ? t("editOrganization") : t("addOrganization")}</DialogTitle>
                  <DialogDescription>{t("fillOrganizationDetails")}</DialogDescription>
                </DialogHeader>
                <div className="gap-4 grid py-4">
                  <div className="gap-2 grid grid-cols-2">
                    <div className="gap-2 grid">
                      <Label htmlFor="name">{t("organizationName")} *</Label>
                      <Input id="name" name="name" defaultValue={editingOrg?.name} required />
                    </div>
                    <div className="gap-2 grid">
                      <Label htmlFor="organization_type">{t("organizationType")} *</Label>
                      <Select value={selectedOrgType} onValueChange={setSelectedOrgType} required>
                        <SelectTrigger>
                          <SelectValue placeholder={t("org.selectOrganization")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="farm_grower">{t("org.type.farm_grower")}</SelectItem>
                          <SelectItem value="packer_packhouse">{t("org.type.packer_packhouse")}</SelectItem>
                          <SelectItem value="processor_manufacturer">{t("org.type.processor_manufacturer")}</SelectItem>
                          <SelectItem value="distributor_warehouse">{t("org.type.distributor_warehouse")}</SelectItem>
                          <SelectItem value="first_receiver">{t("org.type.first_receiver")}</SelectItem>
                          <SelectItem value="importer">{t("org.type.importer")}</SelectItem>
                          <SelectItem value="retailer">{t("org.type.retailer")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <AddressAutocomplete
                    name="address"
                    label={t("address")}
                    placeholder={t("searchAddress") || "Enter address to search..."}
                    defaultValue={editingOrg?.address}
                    onAddressSelect={setAddressData}
                  />

                  <div className="gap-2 grid grid-cols-3">
                    <div className="gap-2 grid">
                      <Label htmlFor="city">{t("city")}</Label>
                      <Input
                        id="city"
                        name="city"
                        key={addressData?.city || "city-default"}
                        defaultValue={addressData?.city || editingOrg?.city}
                      />
                    </div>
                    <div className="gap-2 grid">
                      <Label htmlFor="state">{t("state")}</Label>
                      <Input
                        id="state"
                        name="state"
                        key={addressData?.state || "state-default"}
                        defaultValue={addressData?.state || editingOrg?.state}
                      />
                    </div>
                    <div className="gap-2 grid">
                      <Label htmlFor="postal_code">{t("postalCode")}</Label>
                      <Input
                        id="postal_code"
                        name="postal_code"
                        key={addressData?.postalCode || "postal-default"}
                        defaultValue={addressData?.postalCode || editingOrg?.postal_code}
                      />
                    </div>
                  </div>
                  <div className="gap-2 grid grid-cols-2">
                    <div className="gap-2 grid">
                      <Label htmlFor="phone">{t("phone")}</Label>
                      <Input id="phone" name="phone" type="tel" defaultValue={editingOrg?.phone} />
                    </div>
                    <div className="gap-2 grid">
                      <Label htmlFor="email">{t("email")}</Label>
                      <Input id="email" name="email" type="email" defaultValue={editingOrg?.email} />
                    </div>
                  </div>
                  <div className="gap-2 grid grid-cols-2">
                    <div className="gap-2 grid">
                      <Label htmlFor="license_number">{t("licenseNumber")}</Label>
                      <Input id="license_number" name="license_number" defaultValue={editingOrg?.license_number} />
                    </div>
                    <div className="gap-2 grid">
                      <Label htmlFor="tax_id">{t("taxId")}</Label>
                      <Input id="tax_id" name="tax_id" defaultValue={editingOrg?.tax_id} />
                    </div>
                  </div>
                  <div className="gap-2 grid">
                    <Label htmlFor="country">{t("country")}</Label>
                    <Input
                      id="country"
                      name="country"
                      key={addressData?.country || "country-default"}
                      defaultValue={addressData?.country || editingOrg?.country || "US"}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    {t("cancel")}
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && (
                      <div className="animate-spin mr-2 size-4 border-2 border-white border-t-transparent rounded-full" />
                    )}
                    {isSubmitting ? t("common.saving") : editingOrg ? t("update") : t("create")}
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
                placeholder={t("searchOrganizations")}
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
                <SelectItem value="farm_grower">{t("org.type.farm_grower")}</SelectItem>
                <SelectItem value="packer_packhouse">{t("org.type.packer_packhouse")}</SelectItem>
                <SelectItem value="processor_manufacturer">{t("org.type.processor_manufacturer")}</SelectItem>
                <SelectItem value="distributor_warehouse">{t("org.type.distributor_warehouse")}</SelectItem>
                <SelectItem value="first_receiver">{t("org.type.first_receiver")}</SelectItem>
                <SelectItem value="importer">{t("org.type.importer")}</SelectItem>
                <SelectItem value="retailer">{t("org.type.retailer")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Organizations Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("organizationsList")}</CardTitle>
          <CardDescription>
            {t("totalOrganizations")}: {filteredOrgs.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
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
                  <TableCell colSpan={6} className="text-center">
                    {t("loading")}...
                  </TableCell>
                </TableRow>
              ) : filteredOrgs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    {t("noOrganizationsFound")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrgs.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        {org.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={orgTypeColors[org.organization_type]}>
                        {t(ORG_TYPE_MAP[org.organization_type] || org.organization_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start gap-1 text-sm">
                        <MapPin className="mt-0.5 w-3 h-3 text-muted-foreground" />
                        <span>
                          {org.city}, {org.state}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        {org.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-muted-foreground" />
                            <span>{org.phone}</span>
                          </div>
                        )}
                        {org.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-muted-foreground" />
                            <span>{org.email}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={org.is_active ? "default" : "secondary"}>
                        {org.is_active ? t("active") : t("inactive")}
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
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/organizations/${org.id}`)}>
                            <Eye className="mr-2 w-4 h-4" />
                            {t("view")}
                          </DropdownMenuItem>
                          {canEdit?.("organizations") && userRole === "system_admin" && (
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingOrg(org)
                                setIsDialogOpen(true)
                              }}
                            >
                              <Edit className="mr-2 w-4 h-4" />
                              {t("edit")}
                            </DropdownMenuItem>
                          )}
                          {canDelete?.("organizations") && userRole === "system_admin" && (
                            <DropdownMenuItem onClick={() => handleDelete(org.id)} className="text-red-600">
                              {isDeleting && (
                                <div className="animate-spin mr-2 size-4 border-2 border-white border-t-transparent rounded-full" />
                              )}
                              {!isDeleting && (
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
