"use client"

import Link from "next/link"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/hooks/use-language"
import { AlertCircle, Clock, XCircle, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function FDASettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [loadingVeximAgent, setLoadingVeximAgent] = useState(false)

  const [formData, setFormData] = useState({
    fda_registration_number: "",
    fda_registration_status: "active",
    fda_facility_type: "domestic",
    duns_number: "",
    us_agent_name: "",
    us_agent_company: "",
    us_agent_address: "",
    us_agent_city: "",
    us_agent_state: "",
    us_agent_postal_code: "",
    us_agent_phone: "",
    us_agent_email: "",
    fda_renewal_deadline: "",
    us_agent_contract_start: "",
    us_agent_contract_duration_years: 1,
    us_agent_contract_expiry: "",
    use_vexim_agent: false,
    poa_signed: false,
    poa_date: "",
    poa_document_url: "",
    parent_company_name: "",
    parent_company_duns: "",
  })

  const [renewalAlerts, setRenewalAlerts] = useState<{
    fdaStatus: string
    fdaDaysRemaining: number | null
    agentStatus: string
    agentDaysRemaining: number | null
  } | null>(null)

  useEffect(() => {
    fetchOrganizationData()
  }, [])

  async function fetchOrganizationData() {
    try {
      setLoading(true)
      const client = createClient()
      const {
        data: { user },
      } = await client.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      const { data: profile } = await client.from("profiles").select("organization_id").eq("id", user.id).single()

      if (!profile?.organization_id) {
        toast({
          title: t("common.error"),
          description: t("vexim.noOrganizationFound"),
          variant: "destructive",
        })
        return
      }

      setOrganizationId(profile.organization_id)

      const { data: org, error } = await client
        .from("organizations")
        .select("*")
        .eq("id", profile.organization_id)
        .single()

      if (error) throw error

      if (org) {
        setFormData({
          fda_registration_number: org.fda_registration_number || "",
          fda_registration_status: org.fda_registration_status || "active",
          fda_facility_type: org.fda_facility_type || "domestic",
          duns_number: org.duns_number || "",
          us_agent_name: org.us_agent_name || "",
          us_agent_company: org.us_agent_company || "",
          us_agent_address: org.us_agent_address || "",
          us_agent_city: org.us_agent_city || "",
          us_agent_state: org.us_agent_state || "",
          us_agent_postal_code: org.us_agent_postal_code || "",
          us_agent_phone: org.us_agent_phone || "",
          us_agent_email: org.us_agent_email || "",
          fda_renewal_deadline: org.fda_renewal_deadline || "",
          us_agent_contract_start: org.us_agent_contract_start || "",
          us_agent_contract_duration_years: org.us_agent_contract_duration_years || 1,
          us_agent_contract_expiry: org.us_agent_contract_expiry || "",
          use_vexim_agent: org.use_vexim_agent || false,
          poa_signed: org.poa_signed || false,
          poa_date: org.poa_date || "",
          poa_document_url: org.poa_document_url || "",
          parent_company_name: org.parent_company_name || "",
          parent_company_duns: org.parent_company_duns || "",
        })

        const { data: alerts } = await client
          .from("fda_renewal_alerts")
          .select("*")
          .eq("organization_id", profile.organization_id)
          .single()

        if (alerts) {
          setRenewalAlerts({
            fdaStatus: alerts.fda_renewal_status,
            fdaDaysRemaining: alerts.days_until_fda_renewal,
            agentStatus: alerts.agent_contract_status,
            agentDaysRemaining: alerts.days_until_agent_expiry,
          })
        }
      }
    } catch (error: any) {
      console.error("[v0] Error fetching organization data:", error)
      toast({
        title: t("common.error"),
        description: t("vexim.organizationDataFetchError"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const fetchVeximAgentData = async () => {
      if (!formData.use_vexim_agent) return

      setLoadingVeximAgent(true)
      try {
        const response = await fetch("/api/vexim/agent")
        if (!response.ok) throw new Error("Failed to fetch VEXIM agent data")

        const data = await response.json()
        if (data.agent) {
          setFormData((prev) => ({
            ...prev,
            us_agent_name: data.agent.agent_name,
            us_agent_company: data.agent.agent_company || "",
            us_agent_address: data.agent.agent_address,
            us_agent_city: data.agent.agent_city,
            us_agent_state: data.agent.agent_state,
            us_agent_postal_code: data.agent.agent_postal_code,
            us_agent_phone: data.agent.agent_phone,
            us_agent_email: data.agent.agent_email,
          }))
          toast({
            title: t("common.success"),
            description: t("vexim.agentDataLoaded"),
          })
        }
      } catch (error) {
        console.error("Error fetching VEXIM agent data:", error)
        toast({
          title: t("common.error"),
          description: t("vexim.agentDataLoadFailed"),
          variant: "destructive",
        })
      } finally {
        setLoadingVeximAgent(false)
      }
    }

    fetchVeximAgentData()
  }, [formData.use_vexim_agent, t, toast])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const client = createClient()
      const { error } = await client.from("organizations").update(formData).eq("id", organizationId)

      if (error) throw error

      toast({
        title: t("common.success"),
        description: t("vexim.fdaSettingsUpdated"),
      })

      const response = await fetch(`/api/vexim/compliance-readiness?organizationId=${organizationId}`)
      const readiness = await response.json()
      setFormData({
        ...formData,
        poa_date: readiness.poa_date || "",
      })
    } catch (error: any) {
      console.error("[v0] Error updating FDA settings:", error)
      toast({
        title: t("common.error"),
        description: t("vexim.fdaSettingsUpdateFailed"),
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/settings">
              <XCircle className="size-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("vexim.fdaRegistration")}</h1>
            <p className="text-muted-foreground">{t("vexim.fdaRegistrationDesc")}</p>
          </div>
        </div>
      </div>

      {/* Compliance Readiness Card */}
      {/* Compliance readiness card code here */}

      {renewalAlerts && (renewalAlerts.fdaStatus !== "not_set" || renewalAlerts.agentStatus !== "not_set") && (
        <Card className="border-2 border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <AlertCircle className="size-5" />
              {t("vexim.renewalAlerts")}
            </CardTitle>
            <CardDescription>{t("vexim.renewalAlertsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {/* FDA Renewal Alert */}
              {renewalAlerts.fdaStatus !== "not_set" && (
                <div
                  className={`p-4 rounded-lg border-2 ${
                    renewalAlerts.fdaStatus === "expired"
                      ? "bg-red-50 border-red-300"
                      : renewalAlerts.fdaStatus === "critical"
                        ? "bg-orange-50 border-orange-300"
                        : renewalAlerts.fdaStatus === "warning"
                          ? "bg-amber-50 border-amber-300"
                          : "bg-emerald-50 border-emerald-300"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold mb-1">{t("vexim.fdaRegistrationRenewal")}</h4>
                      <p className="text-sm text-muted-foreground mb-2">{t("vexim.renewsEvery2Years")}</p>
                      {renewalAlerts.fdaDaysRemaining !== null && (
                        <p className="text-lg font-bold">
                          {renewalAlerts.fdaDaysRemaining > 0
                            ? `${renewalAlerts.fdaDaysRemaining} ${t("common.daysRemaining")}`
                            : t("vexim.expired")}
                        </p>
                      )}
                      {formData.fda_renewal_deadline && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("vexim.deadline")}: {new Date(formData.fda_renewal_deadline).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={
                        renewalAlerts.fdaStatus === "expired"
                          ? "destructive"
                          : renewalAlerts.fdaStatus === "critical"
                            ? "destructive"
                            : renewalAlerts.fdaStatus === "warning"
                              ? "default"
                              : "default"
                      }
                    >
                      {renewalAlerts.fdaStatus}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Agent Contract Alert */}
              {renewalAlerts.agentStatus !== "not_set" && (
                <div
                  className={`p-4 rounded-lg border-2 ${
                    renewalAlerts.agentStatus === "expired"
                      ? "bg-red-50 border-red-300"
                      : renewalAlerts.agentStatus === "critical"
                        ? "bg-orange-50 border-orange-300"
                        : renewalAlerts.agentStatus === "warning"
                          ? "bg-amber-50 border-amber-300"
                          : "bg-emerald-50 border-emerald-300"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold mb-1">{t("vexim.agentContractRenewal")}</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        {formData.use_vexim_agent ? t("vexim.vexImAgent") : t("vexim.customAgent")}
                      </p>
                      {renewalAlerts.agentDaysRemaining !== null && (
                        <p className="text-lg font-bold">
                          {renewalAlerts.agentDaysRemaining > 0
                            ? `${renewalAlerts.agentDaysRemaining} ${t("common.daysRemaining")}`
                            : t("vexim.expired")}
                        </p>
                      )}
                      {formData.us_agent_contract_expiry && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("vexim.deadline")}: {new Date(formData.us_agent_contract_expiry).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={
                        renewalAlerts.agentStatus === "expired"
                          ? "destructive"
                          : renewalAlerts.agentStatus === "critical"
                            ? "destructive"
                            : renewalAlerts.agentStatus === "warning"
                              ? "default"
                              : "default"
                      }
                    >
                      {renewalAlerts.agentStatus}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* FDA Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Registration Info */}
        <Card>
          <CardHeader>
            <CardTitle>{t("vexim.fdaRegInfo")}</CardTitle>
            <CardDescription>
              {t("vexim.fdaRegInfoDesc")}{" "}
              <a
                href="https://www.fda.gov/food/registration-food-facilities"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                FDA.gov
                <Clock className="size-3" />
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fda_registration_number">
                  {t("vexim.fdaRegNumber")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="fda_registration_number"
                  value={formData.fda_registration_number}
                  onChange={(e) => setFormData({ ...formData, fda_registration_number: e.target.value })}
                  placeholder="e.g., 12345678901"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fda_registration_status">
                  {t("vexim.fdaRegStatus")} <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.fda_registration_status}
                  onValueChange={(value) => setFormData({ ...formData, fda_registration_status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t("vexim.statusActive")}</SelectItem>
                    <SelectItem value="pending">{t("vexim.statusPending")}</SelectItem>
                    <SelectItem value="inactive">{t("vexim.statusInactive")}</SelectItem>
                    <SelectItem value="expired">{t("vexim.statusExpired")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fda_facility_type">{t("vexim.facilityType")}</Label>
                <Select
                  value={formData.fda_facility_type}
                  onValueChange={(value) => setFormData({ ...formData, fda_facility_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="domestic">{t("vexim.facilityDomestic")}</SelectItem>
                    <SelectItem value="foreign">{t("vexim.facilityForeign")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duns_number">{t("vexim.dunsNumber")}</Label>
                <Input
                  id="duns_number"
                  value={formData.duns_number}
                  onChange={(e) => setFormData({ ...formData, duns_number: e.target.value })}
                  placeholder={t("common.optional")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* U.S. Agent Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t("vexim.usAgentInfo")}</CardTitle>
            <CardDescription>{t("vexim.usAgentInfoDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* VEXIM Agent option */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="use_vexim_agent"
                  checked={formData.use_vexim_agent}
                  onCheckedChange={(checked) => setFormData({ ...formData, use_vexim_agent: checked as boolean })}
                  disabled={loadingVeximAgent}
                />
                <div className="flex-1">
                  <label htmlFor="use_vexim_agent" className="font-medium text-blue-900 cursor-pointer">
                    {t("vexim.useVexImAgent")}
                    {loadingVeximAgent && <Loader2 className="inline-block ml-2 size-4 animate-spin" />}
                  </label>
                  <p className="text-sm text-blue-700 mt-1">{t("vexim.useVexImAgentDesc")}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="us_agent_contract_start">{t("vexim.contractStartDate")}</Label>
                <Input
                  id="us_agent_contract_start"
                  type="date"
                  value={formData.us_agent_contract_start}
                  onChange={(e) => setFormData({ ...formData, us_agent_contract_start: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="us_agent_contract_duration_years">{t("vexim.contractDuration")}</Label>
                <Select
                  value={formData.us_agent_contract_duration_years.toString()}
                  onValueChange={(value) =>
                    setFormData({ ...formData, us_agent_contract_duration_years: Number.parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{t("vexim.oneYear")}</SelectItem>
                    <SelectItem value="2">{t("vexim.twoYears")}</SelectItem>
                    <SelectItem value="3">{t("vexim.threeYears")}</SelectItem>
                    <SelectItem value="5">{t("vexim.fiveYears")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="us_agent_contract_expiry">{t("vexim.contractExpiryDate")}</Label>
                <Input
                  id="us_agent_contract_expiry"
                  type="date"
                  value={formData.us_agent_contract_expiry}
                  readOnly
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">{t("vexim.autoCalculated")}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="us_agent_name">
                  {t("vexim.agentName")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="us_agent_name"
                  value={formData.us_agent_name}
                  onChange={(e) => setFormData({ ...formData, us_agent_name: e.target.value })}
                  placeholder="John Doe"
                  disabled={formData.use_vexim_agent}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="us_agent_company">{t("vexim.agentCompany")}</Label>
                <Input
                  id="us_agent_company"
                  value={formData.us_agent_company}
                  onChange={(e) => setFormData({ ...formData, us_agent_company: e.target.value })}
                  placeholder={t("common.optional")}
                  disabled={formData.use_vexim_agent}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="us_agent_address">
                  {t("vexim.address")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="us_agent_address"
                  value={formData.us_agent_address}
                  onChange={(e) => setFormData({ ...formData, us_agent_address: e.target.value })}
                  placeholder="123 Main Street"
                  disabled={formData.use_vexim_agent}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="us_agent_city">{t("vexim.city")}</Label>
                <Input
                  id="us_agent_city"
                  value={formData.us_agent_city}
                  onChange={(e) => setFormData({ ...formData, us_agent_city: e.target.value })}
                  placeholder="New York"
                  disabled={formData.use_vexim_agent}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="us_agent_state">{t("vexim.state")}</Label>
                <Input
                  id="us_agent_state"
                  value={formData.us_agent_state}
                  onChange={(e) => setFormData({ ...formData, us_agent_state: e.target.value })}
                  placeholder="NY"
                  disabled={formData.use_vexim_agent}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="us_agent_postal_code">{t("vexim.postalCode")}</Label>
                <Input
                  id="us_agent_postal_code"
                  value={formData.us_agent_postal_code}
                  onChange={(e) => setFormData({ ...formData, us_agent_postal_code: e.target.value })}
                  placeholder="10001"
                  disabled={formData.use_vexim_agent}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="us_agent_phone">
                  {t("vexim.phone")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="us_agent_phone"
                  value={formData.us_agent_phone}
                  onChange={(e) => setFormData({ ...formData, us_agent_phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  disabled={formData.use_vexim_agent}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="us_agent_email">
                  {t("vexim.email")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="us_agent_email"
                  type="email"
                  value={formData.us_agent_email}
                  onChange={(e) => setFormData({ ...formData, us_agent_email: e.target.value })}
                  placeholder="agent@example.com"
                  disabled={formData.use_vexim_agent}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Power of Attorney */}
        <Card>
          <CardHeader>
            <CardTitle>{t("vexim.poaTitle")}</CardTitle>
            <CardDescription>{t("vexim.poaDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="poa_signed"
                checked={formData.poa_signed}
                onCheckedChange={(checked) => setFormData({ ...formData, poa_signed: checked as boolean })}
              />
              <label htmlFor="poa_signed" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
                {t("vexim.poaSigned")}
              </label>
            </div>

            {formData.poa_signed && (
              <div className="grid gap-4 md:grid-cols-2 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="poa_date">{t("vexim.poaSignedDate")}</Label>
                  <Input
                    id="poa_date"
                    type="date"
                    value={formData.poa_date}
                    onChange={(e) => setFormData({ ...formData, poa_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="poa_document_url">{t("vexim.poaDocumentUrl")}</Label>
                  <Input
                    id="poa_document_url"
                    value={formData.poa_document_url}
                    onChange={(e) => setFormData({ ...formData, poa_document_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Optional: Parent Company */}
        <Card>
          <CardHeader>
            <CardTitle>{t("vexim.parentCompany")}</CardTitle>
            <CardDescription>{t("vexim.parentCompanyDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="parent_company_name">{t("vexim.parentCompanyName")}</Label>
                <Input
                  id="parent_company_name"
                  value={formData.parent_company_name}
                  onChange={(e) => setFormData({ ...formData, parent_company_name: e.target.value })}
                  placeholder={t("common.optional")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="parent_company_duns">{t("vexim.parentCompanyDuns")}</Label>
                <Input
                  id="parent_company_duns"
                  value={formData.parent_company_duns}
                  onChange={(e) => setFormData({ ...formData, parent_company_duns: e.target.value })}
                  placeholder={t("common.optional")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/settings">{t("common.cancel")}</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {t("vexim.savingChanges")}
              </>
            ) : (
              t("vexim.saveChanges")
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
