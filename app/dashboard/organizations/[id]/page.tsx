"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Mail,
  Edit,
  Trash2,
  Calendar,
  CheckCircle2,
  XCircle,
  Users,
  ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { useLanguage } from "@/hooks/use-language"
import { usePermissions } from "@/hooks/use-permissions"
import { createBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { toast as sonnerToast } from "sonner"

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
  tax_id: string
  license_number: string
  is_active: boolean
  created_at: string
  updated_at: string
  fda_registration_number?: string
  fda_status?: string
  us_agent_name?: string
  duns_number?: string
}

interface Location {
  id: string
  location_name: string
  location_type: string
  city: string
  state: string
}

interface User {
  id: string
  full_name: string
  email: string
  role: string
}

export default function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { t } = useLanguage()
  const { canEdit, canDelete } = usePermissions()
  const { toast } = useToast()
  const router = useRouter()
  const unwrappedParams = use(params)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  const supabase = createBrowserClient()

  useEffect(() => {
    fetchOrganizationDetails()
    fetchLocations()
    fetchUsers()
  }, [unwrappedParams.id])

  async function fetchOrganizationDetails() {
    try {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id, role")
        .eq("id", user.id)
        .single()

      const query = supabase.from("organizations").select("*").eq("id", unwrappedParams.id)

      if (profile?.role !== "admin" && profile?.organization_id !== unwrappedParams.id) {
        toast({
          title: t("error"),
          description: "You don't have permission to view this organization",
          variant: "destructive",
        })
        router.push("/dashboard/organizations")
        return
      }

      const { data, error } = await query.single()

      if (error) throw error
      setOrganization(data)
    } catch (error: any) {
      toast({
        title: t("error"),
        description: error.message,
        variant: "destructive",
      })
      if (error.message.includes("not found") || error.code === "PGRST116") {
        router.push("/dashboard/organizations")
      }
    } finally {
      setLoading(false)
    }
  }

  async function fetchLocations() {
    try {
      const { data, error } = await supabase
        .from("locations")
        .select("id, location_name, location_type, city, state")
        .eq("organization_id", unwrappedParams.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setLocations(data || [])
    } catch (error: any) {
      console.error("Error fetching locations:", error)
    }
  }

  async function fetchUsers() {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .eq("organization_id", unwrappedParams.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error: any) {
      console.error("Error fetching users:", error)
    }
  }

  async function handleDelete() {
    if (!confirm(t("confirmDelete"))) return

    try {
      setDeleting(true)
      const { error } = await supabase.from("organizations").delete().eq("id", unwrappedParams.id)

      if (error) throw error
      sonnerToast.success(t("organizationDeleted"))
      router.push("/dashboard/organizations")
    } catch (error: any) {
      sonnerToast.error(error.message)
    } finally {
      setDeleting(false)
    }
  }

  const orgTypeColors: Record<string, string> = {
    farm: "bg-green-100 text-green-800",
    packer: "bg-blue-100 text-blue-800",
    processor: "bg-purple-100 text-purple-800",
    distributor: "bg-orange-100 text-orange-800",
    retailer: "bg-pink-100 text-pink-800",
    restaurant: "bg-yellow-100 text-yellow-800",
    other: "bg-gray-100 text-gray-800",
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="border-primary mx-auto mb-4 border-4 border-t-transparent rounded-full w-12 h-12 animate-spin"></div>
          <p className="text-muted-foreground">{t("loading")}...</p>
        </div>
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="text-center py-12">
        <Building2 className="mx-auto mb-4 w-16 h-16 text-muted-foreground" />
        <h2 className="mb-2 font-semibold text-2xl">{t("organizationNotFound")}</h2>
        <p className="mb-6 text-muted-foreground">{t("organizationNotFoundDescription")}</p>
        <Button onClick={() => router.push("/dashboard/organizations")}>
          <ArrowLeft className="mr-2 w-4 h-4" />
          {t("backToOrganizations")}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/organizations")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="font-semibold text-3xl tracking-tight">{organization.name}</h1>
            <p className="text-muted-foreground text-sm">
              <Badge className={orgTypeColors[organization.organization_type]}>
                {t(organization.organization_type)}
              </Badge>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit?.("organizations") && (
            <Button onClick={() => router.push(`/dashboard/organizations/${unwrappedParams.id}/edit`)}>
              <Edit className="mr-2 w-4 h-4" />
              {t("edit")}
            </Button>
          )}
          {canDelete?.("organizations") && (
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              <Trash2 className="mr-2 w-4 h-4" />
              {deleting ? t("deleting") : t("delete")}
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="gap-4 grid md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex justify-center items-center bg-primary/10 rounded-full w-12 h-12">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{locations.length}</p>
                <p className="text-muted-foreground text-sm">{t("locations")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex justify-center items-center bg-primary/10 rounded-full w-12 h-12">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-muted-foreground text-sm">{t("users")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex justify-center items-center bg-primary/10 rounded-full w-12 h-12">
                {organization.is_active ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
              </div>
              <div>
                <p className="text-2xl font-bold">{organization.is_active ? t("active") : t("inactive")}</p>
                <p className="text-muted-foreground text-sm">{t("status")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FDA Registration Card */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg gradient-emerald flex items-center justify-center shadow-glow-emerald">
                <ShieldCheck className="size-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Đăng ký FDA</CardTitle>
                <CardDescription>Quản lý thông tin đăng ký FDA cho tổ chức</CardDescription>
              </div>
            </div>
            <Button
              onClick={() => router.push("/dashboard/admin/fda-registrations")}
              className="gradient-emerald shadow-glow-emerald"
            >
              Quản lý FDA
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">FDA Registration</p>
              <p className="text-base font-semibold">
                {(organization as any).fda_registration_number || "Chưa đăng ký"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Trạng thái</p>
              <Badge variant={(organization as any).fda_status === "active" ? "default" : "secondary"}>
                {(organization as any).fda_status === "active" ? "Đang hoạt động" : "Chưa kích hoạt"}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">U.S. Agent</p>
              <p className="text-base">{(organization as any).us_agent_name || "Chưa có"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">DUNS Number</p>
              <p className="text-base font-mono">{(organization as any).duns_number || "N/A"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="gap-6 grid md:grid-cols-3">
        {/* Main Info Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t("organizationDetails")}</CardTitle>
            <CardDescription>{t("organizationDetailsDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Address Information */}
            <div>
              <h3 className="flex items-center gap-2 mb-3 font-semibold text-lg">
                <MapPin className="w-5 h-5" />
                {t("address")}
              </h3>
              <div className="space-y-2 text-sm">
                <p>{organization.address}</p>
                <p>
                  {organization.city}, {organization.state} {organization.postal_code}
                </p>
                <p>{organization.country}</p>
              </div>
            </div>

            <Separator />

            {/* Contact Information */}
            <div>
              <h3 className="mb-3 font-semibold text-lg">{t("contactInformation")}</h3>
              <div className="space-y-3">
                {organization.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <a href={`tel:${organization.phone}`} className="hover:underline">
                      {organization.phone}
                    </a>
                  </div>
                )}
                {organization.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <a href={`mailto:${organization.email}`} className="hover:underline">
                      {organization.email}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Legal Information */}
            <div>
              <h3 className="mb-3 font-semibold text-lg">{t("legalInformation")}</h3>
              <div className="gap-4 grid md:grid-cols-2">
                {organization.tax_id && (
                  <div>
                    <p className="mb-1 text-muted-foreground text-xs">{t("taxId")}</p>
                    <p className="font-mono text-sm">{organization.tax_id}</p>
                  </div>
                )}
                {organization.license_number && (
                  <div>
                    <p className="mb-1 text-muted-foreground text-xs">{t("licenseNumber")}</p>
                    <p className="font-mono text-sm">{organization.license_number}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar - Metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("metadata")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-1 text-muted-foreground text-xs">{t("createdAt")}</p>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                {new Date(organization.created_at).toLocaleDateString()}
              </div>
            </div>
            <Separator />
            <div>
              <p className="mb-1 text-muted-foreground text-xs">{t("lastUpdated")}</p>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                {new Date(organization.updated_at).toLocaleDateString()}
              </div>
            </div>
            <Separator />
            <div>
              <p className="mb-1 text-muted-foreground text-xs">{t("organizationId")}</p>
              <code className="block bg-muted p-2 rounded break-all font-mono text-xs">{organization.id}</code>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Locations */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{t("locations")}</CardTitle>
              <CardDescription>{t("locationsInOrganization")}</CardDescription>
            </div>
            <Button onClick={() => router.push("/dashboard/locations")}>
              <MapPin className="mr-2 w-4 h-4" />
              {t("manageLocations")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {locations.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">{t("noLocationsYet")}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("type")}</TableHead>
                  <TableHead>{t("location")}</TableHead>
                  <TableHead className="text-right">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell className="font-medium">{location.location_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{t(location.location_type)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {location.city}, {location.state}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/dashboard/locations/${location.id}`)}
                      >
                        {t("view")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Users */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{t("users")}</CardTitle>
              <CardDescription>{t("usersInOrganization")}</CardDescription>
            </div>
            <Button onClick={() => router.push("/dashboard/admin/users")}>
              <Users className="mr-2 w-4 h-4" />
              {t("manageUsers")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">{t("noUsersYet")}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("email")}</TableHead>
                  <TableHead>{t("role")}</TableHead>
                  <TableHead className="text-right">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell className="text-sm">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{t(user.role)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/admin/users`)}>
                        {t("view")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
