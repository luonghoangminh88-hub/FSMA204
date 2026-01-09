"use client"

import type React from "react"
import Link from "next/link"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AddressAutocomplete } from "@/components/address-autocomplete"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/hooks/use-language"
import { Building2, Loader2 } from "lucide-react"

export const dynamic = "force-dynamic"

export default function OnboardingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [existingOrgs, setExistingOrgs] = useState<any[]>([])
  const [mode, setMode] = useState<"select" | "create">("select")
  const [addressData, setAddressData] = useState<any>(null)
  const [selectedOrgType, setSelectedOrgType] = useState<string>("")

  const getSupabase = () => {
    return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  }

  useEffect(() => {
    checkOnboardingStatus()
  }, [])

  async function checkOnboardingStatus() {
    try {
      const supabase = getSupabase()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }

      const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

      if (profile?.organization_id) {
        router.push("/dashboard")
        return
      }

      const { data: orgs } = await supabase
        .from("organizations")
        .select("id, name, organization_type")
        .eq("is_active", true)
        .order("name")

      setExistingOrgs(orgs || [])
    } catch (error) {
      console.error("[v0] Error checking onboarding:", error)
    } finally {
      setChecking(false)
    }
  }

  async function handleSelectOrg(orgId: string) {
    setLoading(true)
    try {
      const supabase = getSupabase()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { error } = await supabase.from("profiles").update({ organization_id: orgId }).eq("id", user.id)

      if (error) throw error

      toast({
        title: t("common.success"),
        description: "Organization assigned successfully",
      })

      router.push("/dashboard")
    } catch (error: any) {
      console.error("[v0] Error assigning organization:", error)
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateOrg(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      const supabase = getSupabase()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const name = formData.get("name") as string
      const email = formData.get("email") as string

      if (!name || !name.trim()) {
        throw new Error("Organization name is required")
      }

      if (!email || !email.trim()) {
        throw new Error("Email is required")
      }

      if (!selectedOrgType) {
        throw new Error("Organization type is required")
      }

      const response = await fetch("/api/organizations/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          organization_type: selectedOrgType,
          email: email.trim(),
          phone: (formData.get("phone") as string) || "",
          address: addressData?.fullAddress || (formData.get("address") as string) || "",
          city: addressData?.city || (formData.get("city") as string) || "",
          state: addressData?.state || (formData.get("state") as string) || "",
          postal_code: addressData?.postalCode || (formData.get("postal_code") as string) || "",
          country: addressData?.country || (formData.get("country") as string) || "USA",
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to create organization")
      }

      toast({
        title: t("common.success"),
        description: "Organization created successfully",
      })

      router.push("/dashboard")
    } catch (error: any) {
      console.error("[v0] Error creating organization:", error)
      toast({
        title: t("common.error"),
        description: error?.message || "Failed to create organization. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background via-secondary/20 to-background p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <Building2 className="mx-auto size-12 text-primary" />
          <CardTitle className="text-2xl">Welcome to FSMA 204</CardTitle>
          <CardDescription>
            {mode === "select"
              ? "Select your organization or create a new one"
              : "Create your organization to get started"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === "select" ? (
            <div className="space-y-4">
              {existingOrgs.length > 0 && (
                <div className="space-y-2">
                  <Label>Select Existing Organization</Label>
                  <Select onValueChange={handleSelectOrg} disabled={loading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose organization..." />
                    </SelectTrigger>
                    <SelectContent>
                      {existingOrgs.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name} ({org.organization_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full bg-transparent"
                onClick={() => setMode("create")}
                disabled={loading}
              >
                Create New Organization
              </Button>
            </div>
          ) : (
            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Organization Name *</Label>
                  <Input id="name" name="name" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select value={selectedOrgType} onValueChange={setSelectedOrgType} required>
                    <SelectTrigger className={!selectedOrgType ? "text-muted-foreground" : ""}>
                      <SelectValue placeholder="Select type..." />
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

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" name="email" type="email" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" type="tel" />
                </div>

                <div className="col-span-2">
                  <AddressAutocomplete
                    name="address"
                    label="Address"
                    placeholder="Enter address to search..."
                    onAddressSelect={setAddressData}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    name="city"
                    key={addressData?.city || "city-default"}
                    defaultValue={addressData?.city}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    name="state"
                    key={addressData?.state || "state-default"}
                    defaultValue={addressData?.state}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postal_code">Postal Code</Label>
                  <Input
                    id="postal_code"
                    name="postal_code"
                    key={addressData?.postalCode || "postal-default"}
                    defaultValue={addressData?.postalCode}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    name="country"
                    key={addressData?.country || "country-default"}
                    defaultValue={addressData?.country || "USA"}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 bg-transparent"
                  onClick={() => setMode("select")}
                  disabled={loading}
                >
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Create Organization
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <Link href="/privacy-policy" className="hover:text-primary transition-colors">
          Privacy Policy
        </Link>
        <span>•</span>
        <Link href="/terms-of-service" className="hover:text-primary transition-colors">
          Terms of Service
        </Link>
      </div>
    </div>
  )
}
