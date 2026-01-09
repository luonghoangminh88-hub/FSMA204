"use client"

import { DialogTrigger } from "@/components/ui/dialog"

import type React from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { UserPlus, Edit, Trash2, Eye } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import { useToast } from "@/hooks/use-toast"
import type { OrganizationType } from "@/lib/types"
import { RoleBadge } from "@/components/fsma/role-badge"
import { AddressAutocomplete } from "@/components/address-autocomplete"
import { Plus } from "lucide-react"

export default function AdminUsersPage() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const router = useRouter()
  const [profile, setProfile] = useState<any | null>(null)
  const [users, setUsers] = useState<any[]>([])
  const [organizations, setOrganizations] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isOrgDialogOpen, setIsOrgDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [selectedOrgId, setSelectedOrgId] = useState<string>("")
  const [creatingOrg, setCreatingOrg] = useState(false)
  const [showDialog, setShowDialog] = useState(false)

  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    phone: "",
    role: "viewer" as const,
    password: "",
  })

  const [isCreatingUser, setIsCreatingUser] = useState(false)
  const [isUpdatingUser, setIsUpdatingUser] = useState(false)
  const [isDeletingUser, setIsDeletingUser] = useState(false)
  const [isCreatingOrg, setIsCreatingOrg] = useState(false)

  const [editFormData, setEditFormData] = useState({
    full_name: "",
    phone: "",
    role: "viewer",
    is_active: true,
  })

  const [orgFormData, setOrgFormData] = useState({
    name: "",
    organization_type: "processor_manufacturer" as OrganizationType,
    address: "",
    email: "", // Fixed: Changed from contact_email to email
    phone: "", // Fixed column name
  })

  const [orgAddressData, setOrgAddressData] = useState<any>(null)

  const userRole = profile?.role

  useEffect(() => {
    checkAuth()
    loadData()
  }, [router])

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
    const supabase = createClient()
    setIsLoading(true)

    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("role, organization_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id || "")
        .single()

      if (profileData?.role === "system_admin" || profileData?.role === "org_admin") {
        await syncMissingProfiles(profileData)
      }

      let usersQuery = supabase.from("profiles").select("*").order("created_at", { ascending: false })

      if (profileData?.role !== "system_admin") {
        usersQuery = usersQuery.eq("organization_id", profileData?.organization_id)
      }

      const { data: usersData } = await usersQuery

      let orgsQuery = supabase.from("organizations").select("*").order("name")
      if (profileData?.role !== "system_admin") {
        orgsQuery = orgsQuery.eq("id", profileData?.organization_id)
      }
      const { data: orgsData } = await orgsQuery

      setUsers(usersData || [])
      setOrganizations(orgsData || [])
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: t("common.error"),
        description: t("common.loadError"),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const syncMissingProfiles = async (profileData?: any) => {
    try {
      const supabase = createClient()

      console.log("[v0] Starting profile sync...")

      let authUsers: any[] = []

      if (profileData?.role === "system_admin") {
        const { data } = await supabase.auth.admin.listUsers()
        authUsers = data?.users || []
        console.log("[v0] System Admin - Found", authUsers.length, "auth users")
      } else if (profileData?.role === "org_admin") {
        const { data } = await supabase.auth.admin.listUsers()
        authUsers = (data?.users || []).filter((u) => u.user_metadata?.organization_id === profileData.organization_id)
        console.log("[v0] Org Admin - Found", authUsers.length, "auth users in their org")
      }

      const { data: profiles } = await supabase.from("profiles").select("id")
      const profileIds = new Set(profiles?.map((p) => p.id) || [])

      const missingUsers = authUsers.filter((user) => !profileIds.has(user.id))

      console.log("[v0] Found", missingUsers.length, "missing profiles to sync")

      if (missingUsers.length === 0) {
        console.log("[v0] All profiles are synced")
        return
      }

      for (const user of missingUsers) {
        const profileData = {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "",
          phone: user.user_metadata?.phone || "",
          role: user.user_metadata?.role || "viewer",
          organization_id: user.user_metadata?.organization_id || null,
          avatar_url: user.user_metadata?.avatar_url || null,
        }

        console.log("[v0] Syncing profile for:", user.email, profileData)

        const { error } = await supabase.from("profiles").insert(profileData)

        if (error) {
          console.error(`[v0] Failed to sync profile for ${user.email}:`, error)
        } else {
          console.log(`[v0] Successfully synced profile for ${user.email}`)
        }
      }

      console.log("[v0] Profile sync completed")
    } catch (error) {
      console.error("[v0] Error syncing profiles:", error)
    }
  }

  const handleCreateUser = async () => {
    setIsCreatingUser(true)
    const supabase = createClient()

    try {
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("email", formData.email.trim().toLowerCase())
        .maybeSingle()

      if (existingUser) {
        toast({
          title: "Lỗi",
          description: "Email này đã được đăng ký. Vui lòng sử dụng email khác.",
          variant: "destructive",
        })
        return
      }

      console.log("[v0] Creating user with email:", formData.email)

      const tempPassword = crypto.randomUUID()
      const redirectUrl = `${window.location.origin}/auth/callback`

      console.log("[v0] Temp password:", tempPassword.substring(0, 8) + "...")
      console.log("[v0] Email redirect URL:", redirectUrl)

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: tempPassword,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: formData.full_name,
            phone: formData.phone,
            role: formData.role,
            organization_id: userRole === "org_admin" ? profile?.organization_id : null,
            invited_by_admin: true,
            temp_password: true,
          },
        },
      })

      if (authError) {
        console.error("[v0] Auth error:", authError)
        throw authError
      }

      if (authData.user) {
        console.log("[v0] User created successfully")
        console.log("[v0] User ID:", authData.user.id)
        console.log("[v0] User email:", authData.user.email)
        console.log("[v0] Email confirmed:", authData.user.email_confirmed_at ? "Yes" : "No (pending)")
        console.log("[v0] Identities:", authData.user.identities?.length || 0)

        console.log("[v0] Waiting for database trigger to create profile...")
        await new Promise((resolve) => setTimeout(resolve, 2000))

        if (userRole === "org_admin") {
          console.log("[v0] Org admin - user auto-assigned to org:", profile.organization_id)

          setFormData({
            email: "",
            full_name: "",
            phone: "",
            role: "viewer",
            password: "",
          })

          setShowDialog(false)

          toast({
            title: t("common.success"),
            description: `Đã mời người dùng thành công. Email xác thực đã được gửi đến ${formData.email}`,
          })

          console.log("[v0] Reloading user list...")
          await loadData()
        } else if (userRole === "system_admin") {
          console.log("[v0] System admin - need to assign organization")

          setSelectedUserId(authData.user.id)

          setFormData({
            email: "",
            full_name: "",
            phone: "",
            role: "viewer",
            password: "",
          })

          setShowDialog(false)

          await loadData()

          toast({
            title: t("common.success"),
            description: `Đã mời người dùng thành công. Vui lòng gán tổ chức.`,
          })

          setIsOrgDialogOpen(true)
        }
      }
    } catch (error: any) {
      console.error("[v0] Error creating user:", error)
      toast({
        title: t("common.error"),
        description: error.message || t("admin.createUserError"),
        variant: "destructive",
      })
    } finally {
      setIsCreatingUser(false)
    }
  }

  async function handleCreateOrganization(e: React.FormEvent) {
    e.preventDefault()
    setIsCreatingOrg(true)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("organizations").insert([
        {
          name: orgFormData.name,
          organization_type: orgFormData.organization_type,
          address: orgAddressData?.fullAddress || orgFormData.address,
          city: orgAddressData?.city || "",
          state: orgAddressData?.state || "",
          postal_code: orgAddressData?.postalCode || "",
          country: orgAddressData?.country || "US",
          email: orgFormData.email, // Fixed column name
          phone: orgFormData.phone, // Fixed column name
          is_active: true,
        },
      ])

      if (error) throw error

      toast({
        title: t("common.success"),
        description: t("admin.orgCreated"),
      })

      setIsOrgDialogOpen(false)
      setOrgFormData({
        name: "",
        organization_type: "processor_manufacturer",
        address: "",
        email: "",
        phone: "",
      })
      setOrgAddressData(null) // Reset GPS data
      loadData()
    } catch (error: any) {
      console.error("[v0] Error creating organization:", error)
      toast({
        title: t("common.error"),
        description: t("common.errorOccurred"),
        variant: "destructive",
      })
    } finally {
      setIsCreatingOrg(false)
    }
  }

  const handleAssignOrganization = async (orgId?: string) => {
    const supabase = createClient()
    const assignOrgId = orgId || selectedOrgId

    if (!assignOrgId || !selectedUserId) {
      toast({
        title: t("common.error"),
        description: "Please select an organization",
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ organization_id: assignOrgId })
        .eq("id", selectedUserId)

      if (error) throw error

      toast({
        title: t("common.success"),
        description: t("admin.organizationAssigned"),
      })

      setIsOrgDialogOpen(false)
      setSelectedUserId("")
      setSelectedOrgId("")

      await loadData()
    } catch (error) {
      console.error("Error assigning organization:", error)
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("common.errorOccurred"),
        variant: "destructive",
      })
    }
  }

  const handleViewUser = (user: any) => {
    setSelectedUser(user)
    setIsViewDialogOpen(true)
  }

  const handleEditUser = (user: any) => {
    setSelectedUser(user)
    setEditFormData({
      full_name: user.full_name || "",
      phone: user.phone || "",
      role: user.role,
      is_active: user.is_active,
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateUser = async () => {
    if (!selectedUser) return

    setIsUpdatingUser(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editFormData.full_name,
          phone: editFormData.phone,
          role: editFormData.role,
          is_active: editFormData.is_active,
        })
        .eq("id", selectedUser.id)

      if (error) throw error

      toast({
        title: t("common.success"),
        description: t("admin.userUpdated"),
      })

      setIsEditDialogOpen(false)
      loadData()
    } catch (error) {
      console.error("Error updating user:", error)
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("common.errorOccurred"),
        variant: "destructive",
      })
    } finally {
      setIsUpdatingUser(false)
    }
  }

  const handleDeleteUser = (user: any) => {
    setSelectedUser(user)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteUser = async () => {
    if (!selectedUser) return

    setIsDeletingUser(true)
    const supabase = createClient()

    try {
      const { error } = await supabase.from("profiles").delete().eq("id", selectedUser.id)

      if (error) throw error

      toast({
        title: t("common.success"),
        description: t("admin.userDeleted"),
      })

      setIsDeleteDialogOpen(false)
      loadData()
    } catch (error) {
      console.error("Error deleting user:", error)
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("common.errorOccurred"),
        variant: "destructive",
      })
    } finally {
      setIsDeletingUser(false)
    }
  }

  const getAllowedRoles = () => {
    if (userRole === "system_admin") {
      return [
        { value: "viewer", label: t("role.viewer") },
        { value: "operator", label: t("role.operator") },
        { value: "manager", label: t("role.manager") },
        { value: "org_admin", label: t("role.orgAdmin") },
        { value: "system_admin", label: t("role.systemAdmin") },
      ]
    } else if (userRole === "org_admin") {
      return [
        { value: "viewer", label: t("role.viewer") },
        { value: "operator", label: t("role.operator") },
        { value: "manager", label: t("role.manager") },
        { value: "org_admin", label: t("role.orgAdmin") },
      ]
    }
    return []
  }

  const filteredUsers =
    selectedOrgId && selectedOrgId !== "all" ? users.filter((u) => u.organization_id === selectedOrgId) : users

  if (!profile || (profile.role !== "system_admin" && profile.role !== "org_admin")) {
    return null
  }

  return (
    <div className="flex-1 space-y-6 p-6 md:p-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("admin.userManagement")}</h1>
          <p className="text-muted-foreground">
            {profile.role === "system_admin"
              ? "Quản lý người dùng và phân quyền trong hệ thống"
              : "Quản lý người dùng trong tổ chức của bạn"}
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="gap-2">
          <Plus className="size-4" />
          {t("admin.addUser")}
        </Button>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogTrigger asChild>
          <Button>
            <UserPlus className="mr-2 size-4" />
            {t("admin.createUser")}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.createNewUser")}</DialogTitle>
            <DialogDescription>User will receive a verification email to set their password</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="full_name">{t("auth.fullName")}</Label>
              <Input
                id="full_name"
                placeholder="John Doe"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t("auth.phone")}</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">{t("auth.role")}</Label>
              <Select value={formData.role} onValueChange={(value: any) => setFormData({ ...formData, role: value })}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAllowedRoles().map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={isCreatingUser}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreateUser} disabled={isCreatingUser}>
              {isCreatingUser && (
                <div className="animate-spin mr-2 size-4 border-2 border-white border-t-transparent rounded-full" />
              )}
              {isCreatingUser ? t("common.creating") : t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {userRole === "system_admin" && (
        <Dialog open={isOrgDialogOpen} onOpenChange={setIsOrgDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Assign Organization</DialogTitle>
              <DialogDescription>Select an existing organization or create a new one for this user</DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="space-y-4">
                <Label>Select Existing Organization</Label>
                <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an organization..." />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name} ({t(`orgType.${org.organization_type}`)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedOrgId && (
                  <Button onClick={() => handleAssignOrganization()} className="w-full">
                    Assign to Organization
                  </Button>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or create new</span>
                </div>
              </div>

              <form onSubmit={handleCreateOrganization} className="space-y-4">
                <div className="gap-4 grid">
                  <div className="gap-2 grid">
                    <Label htmlFor="org_name">{t("org.organizationName")} *</Label>
                    <Input
                      id="org_name"
                      placeholder={t("org.organizationName")}
                      value={orgFormData.name}
                      onChange={(e) => setOrgFormData({ ...orgFormData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="gap-2 grid">
                    <Label htmlFor="org_type">{t("org.organizationType")} *</Label>
                    <Select
                      value={orgFormData.organization_type}
                      onValueChange={(value) =>
                        setOrgFormData({ ...orgFormData, organization_type: value as OrganizationType })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
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

                  <AddressAutocomplete
                    name="org_address"
                    label={t("org.address")}
                    placeholder={t("searchAddress") || "Enter address to search..."}
                    onAddressSelect={(data) => {
                      setOrgAddressData(data)
                      setOrgFormData({ ...orgFormData, address: data.fullAddress })
                    }}
                  />

                  <div className="gap-4 grid grid-cols-2">
                    <div className="gap-2 grid">
                      <Label htmlFor="org_email">{t("common.email")} *</Label>
                      <Input
                        id="org_email"
                        type="email"
                        placeholder="contact@example.com"
                        value={orgFormData.email}
                        onChange={(e) => setOrgFormData({ ...orgFormData, email: e.target.value })}
                        required
                      />
                    </div>

                    <div className="gap-2 grid">
                      <Label htmlFor="org_phone">{t("common.phone")}</Label>
                      <Input
                        id="org_phone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={orgFormData.phone}
                        onChange={(e) => setOrgFormData({ ...orgFormData, phone: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isCreatingOrg}>
                  {isCreatingOrg && (
                    <div className="animate-spin mr-2 size-4 border-2 border-white border-t-transparent rounded-full" />
                  )}
                  {isCreatingOrg ? t("common.creating") : t("common.create")}
                </Button>
              </form>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOrgDialogOpen(false)}>
                {t("common.close")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("admin.allUsers")}</CardTitle>
              <CardDescription>
                {filteredUsers.length} {t("admin.usersTotal")}
              </CardDescription>
            </div>
            {userRole === "system_admin" && (
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder={t("org.filterByOrganization")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
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
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("auth.fullName")}</TableHead>
                  <TableHead>{t("auth.email")}</TableHead>
                  <TableHead>{t("org.organization")}</TableHead>
                  <TableHead>{t("auth.role")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const org = organizations.find((o) => o.id === user.organization_id)
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {org ? (
                          <div className="flex flex-col">
                            <span className="font-medium">{org.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {t(`orgType.${org.organization_type}`)}
                            </span>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUserId(user.id)
                              setIsOrgDialogOpen(true)
                            }}
                          >
                            {t("admin.assignOrg")}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <RoleBadge role={user.role} />
                      </TableCell>
                      <TableCell>
                        {user.is_active ? (
                          <Badge variant="default">{t("common.active")}</Badge>
                        ) : (
                          <Badge variant="secondary">{t("common.inactive")}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleViewUser(user)}>
                            <Eye className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEditUser(user)}>
                            <Edit className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(user)}>
                            <Trash2 className="size-4" />
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

      {/* View User Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.viewUserDetails")}</DialogTitle>
            <DialogDescription>{t("admin.viewUserDetailsDesc")}</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t("auth.fullName")}</Label>
                <p className="text-sm">{selectedUser.full_name || "-"}</p>
              </div>
              <div className="space-y-2">
                <Label>{t("auth.email")}</Label>
                <p className="text-sm">{selectedUser.email}</p>
              </div>
              <div className="space-y-2">
                <Label>{t("auth.phone")}</Label>
                <p className="text-sm">{selectedUser.phone || "-"}</p>
              </div>
              <div className="space-y-2">
                <Label>{t("auth.role")}</Label>
                <RoleBadge role={selectedUser.role} />
              </div>
              <div className="space-y-2">
                <Label>{t("org.organization")}</Label>
                <p className="text-sm">
                  {organizations.find((o) => o.id === selectedUser.organization_id)?.name || t("admin.noOrganization")}
                </p>
              </div>
              <div className="space-y-2">
                <Label>{t("common.status")}</Label>
                {selectedUser.is_active ? (
                  <Badge variant="default">{t("common.active")}</Badge>
                ) : (
                  <Badge variant="secondary">{t("common.inactive")}</Badge>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>{t("common.close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.editUser")}</DialogTitle>
            <DialogDescription>{t("admin.editUserDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit_full_name">{t("auth.fullName")}</Label>
              <Input
                id="edit_full_name"
                value={editFormData.full_name}
                onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_phone">{t("auth.phone")}</Label>
              <Input
                id="edit_phone"
                type="tel"
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_role">{t("auth.role")}</Label>
              <Select
                value={editFormData.role}
                onValueChange={(value: any) => setEditFormData({ ...editFormData, role: value })}
              >
                <SelectTrigger id="edit_role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAllowedRoles().map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit_is_active"
                checked={editFormData.is_active}
                onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                className="size-4"
              />
              <Label htmlFor="edit_is_active">{t("common.active")}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isUpdatingUser}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleUpdateUser} disabled={isUpdatingUser}>
              {isUpdatingUser && (
                <div className="animate-spin mr-2 size-4 border-2 border-white border-t-transparent rounded-full" />
              )}
              {isUpdatingUser ? t("common.updating") : t("common.update")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.deleteUser")}</AlertDialogTitle>
            <AlertDialogDescription>{t("admin.deleteUserConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingUser}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteUser}
              disabled={isDeletingUser}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeletingUser && (
                <div className="animate-spin mr-2 size-4 border-2 border-white border-t-transparent rounded-full" />
              )}
              {isDeletingUser ? t("common.deleting") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
