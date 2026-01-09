"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/hooks/use-language"
import { createClient } from "@/lib/supabase/client"
import { Shield, Save, AlertCircle, CheckCircle2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface VeximAgent {
  id: string
  agent_name: string
  agent_company: string | null
  agent_address: string
  agent_city: string
  agent_state: string
  agent_zip: string
  agent_phone: string
  agent_email: string
  service_description: string | null
  default_contract_duration_years: number
  is_active: boolean
  updated_at: string
}

export default function VeximAgentManagementPage() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasAccess, setHasAccess] = useState(false)
  const [agentData, setAgentData] = useState<VeximAgent | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const [formData, setFormData] = useState({
    agent_name: "",
    agent_company: "",
    agent_address: "",
    agent_city: "",
    agent_state: "",
    agent_zip: "",
    agent_phone: "",
    agent_email: "",
    service_description: "",
    default_contract_duration_years: 1,
    is_active: true,
  })

  useEffect(() => {
    checkAccessAndLoadData()
  }, [])

  async function checkAccessAndLoadData() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setHasAccess(false)
        setLoading(false)
        return
      }

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

      if (profile?.role !== "system_admin") {
        setHasAccess(false)
        setLoading(false)
        return
      }

      setHasAccess(true)

      const { data, error } = await supabase.from("vexim_us_agent").select("*").eq("is_active", true).maybeSingle()

      if (error) {
        console.error("Error fetching VEXIM agent:", error)
        toast({
          title: t("common.error"),
          description: "Failed to load VEXIM agent data",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      if (data && data.id) {
        setAgentData(data)
        setFormData({
          agent_name: data.agent_name || "",
          agent_company: data.agent_company || "",
          agent_address: data.agent_address || "",
          agent_city: data.agent_city || "",
          agent_state: data.agent_state || "",
          agent_zip: data.agent_zip || "",
          agent_phone: data.agent_phone || "",
          agent_email: data.agent_email || "",
          service_description: data.service_description || "",
          default_contract_duration_years: data.default_contract_duration_years || 1,
          is_active: data.is_active ?? true,
        })
        setIsEditing(false)
      } else {
        setAgentData(null)
        setIsEditing(true)
      }
    } catch (error) {
      console.error("Error loading VEXIM agent data:", error)
      toast({
        title: t("common.error"),
        description: "Failed to load VEXIM agent data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    const errors: string[] = []
    if (!formData.agent_name.trim()) errors.push("Agent Name is required")
    if (!formData.agent_address.trim()) errors.push("Address is required")
    if (!formData.agent_city.trim()) errors.push("City is required")
    if (!formData.agent_state.trim()) errors.push("State is required")
    if (!formData.agent_zip.trim()) errors.push("ZIP code is required")
    if (!formData.agent_phone.trim()) errors.push("Phone is required")
    if (!formData.agent_email.trim()) errors.push("Email is required")

    if (errors.length > 0) {
      toast({
        title: "Validation Error",
        description: errors.join(", "),
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      console.log("Saving agent data:", formData)

      const response = await fetch("/api/vexim/agent", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()
      console.log("API Response:", result)

      if (!response.ok) {
        throw new Error(result.error || "Failed to save")
      }

      toast({
        title: t("common.success"),
        description: agentData ? "VEXIM agent information updated successfully" : "VEXIM agent created successfully",
      })

      await checkAccessAndLoadData()
    } catch (error) {
      console.error("Error saving VEXIM agent data:", error)
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : "Failed to save VEXIM agent data",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  function handleCancelEdit() {
    if (agentData) {
      setFormData({
        agent_name: agentData.agent_name || "",
        agent_company: agentData.agent_company || "",
        agent_address: agentData.agent_address || "",
        agent_city: agentData.agent_city || "",
        agent_state: agentData.agent_state || "",
        agent_zip: agentData.agent_zip || "",
        agent_phone: agentData.agent_phone || "",
        agent_email: agentData.agent_email || "",
        service_description: agentData.service_description || "",
        default_contract_duration_years: agentData.default_contract_duration_years || 1,
        is_active: agentData.is_active ?? true,
      })
    }
    setIsEditing(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t("common.loading")}</p>
        </div>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="container max-w-4xl py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription>{t("common.accessDenied")} - System Admin access required</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg">
            <Shield className="size-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t("admin.veximAgentManagement")}</h1>
            <p className="text-gray-600 mt-1">{t("admin.veximAgentDescription")}</p>
          </div>
        </div>
        {agentData && !isEditing && (
          <Button onClick={() => setIsEditing(true)} variant="outline">
            {t("common.edit")}
          </Button>
        )}
      </div>

      {/* Service Status */}
      {agentData && (
        <Alert className={formData.is_active ? "border-emerald-200 bg-emerald-50" : "border-gray-200"}>
          <CheckCircle2 className={`h-5 w-5 ${formData.is_active ? "text-emerald-600" : "text-gray-400"}`} />
          <AlertDescription>
            {formData.is_active ? t("admin.veximAgentActiveMessage") : t("admin.veximAgentInactiveMessage")}
            {!isEditing && (
              <span className="ml-2 text-sm text-gray-500">
                • {t("common.lastUpdated")}: {new Date(agentData.updated_at).toLocaleString()}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Agent Information Form */}
      <Card>
        <CardHeader>
          <CardTitle>
            {agentData
              ? isEditing
                ? t("admin.editVeximAgent")
                : t("vexim.usAgentInformation")
              : t("admin.createVeximAgent")}
          </CardTitle>
          <CardDescription>{t("admin.veximAgentFormDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="agent_name">
                {t("vexim.agentName")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="agent_name"
                value={formData.agent_name}
                onChange={(e) => setFormData({ ...formData, agent_name: e.target.value })}
                placeholder="John Doe"
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent_company">{t("vexim.agentCompany")}</Label>
              <Input
                id="agent_company"
                value={formData.agent_company}
                onChange={(e) => setFormData({ ...formData, agent_company: e.target.value })}
                placeholder="VEXIM Corporation"
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="agent_address">
              {t("vexim.agentAddress")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="agent_address"
              value={formData.agent_address}
              onChange={(e) => setFormData({ ...formData, agent_address: e.target.value })}
              placeholder="123 Main Street"
              disabled={!isEditing}
            />
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="agent_city">
                {t("vexim.agentCity")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="agent_city"
                value={formData.agent_city}
                onChange={(e) => setFormData({ ...formData, agent_city: e.target.value })}
                placeholder="Rockville"
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent_state">
                {t("vexim.agentState")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="agent_state"
                value={formData.agent_state}
                onChange={(e) => setFormData({ ...formData, agent_state: e.target.value })}
                placeholder="MD"
                maxLength={2}
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent_zip">
                {t("vexim.agentZip")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="agent_zip"
                value={formData.agent_zip}
                onChange={(e) => setFormData({ ...formData, agent_zip: e.target.value })}
                placeholder="20850"
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="agent_phone">
                {t("vexim.agentPhone")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="agent_phone"
                value={formData.agent_phone}
                onChange={(e) => setFormData({ ...formData, agent_phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent_email">
                {t("vexim.agentEmail")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="agent_email"
                type="email"
                value={formData.agent_email}
                onChange={(e) => setFormData({ ...formData, agent_email: e.target.value })}
                placeholder="agent@example.com"
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="service_description">{t("admin.serviceDescription")}</Label>
            <Textarea
              id="service_description"
              value={formData.service_description}
              onChange={(e) => setFormData({ ...formData, service_description: e.target.value })}
              placeholder="VEXIM provides FDA-compliant U.S. Agent services..."
              rows={3}
              disabled={!isEditing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">{t("vexim.defaultContractDuration")}</Label>
            <Select
              value={formData.default_contract_duration_years.toString()}
              onValueChange={(value) =>
                setFormData({ ...formData, default_contract_duration_years: Number.parseInt(value) })
              }
              disabled={!isEditing}
            >
              <SelectTrigger id="duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 {t("vexim.year")}</SelectItem>
                <SelectItem value="2">2 {t("vexim.years")}</SelectItem>
                <SelectItem value="3">3 {t("vexim.years")}</SelectItem>
                <SelectItem value="4">4 {t("vexim.years")}</SelectItem>
                <SelectItem value="5">5 {t("vexim.years")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="is_active">{t("admin.serviceActive")}</Label>
              <p className="text-sm text-gray-600">{t("admin.serviceActiveDescription")}</p>
            </div>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              disabled={!isEditing}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {isEditing && (
        <div className="flex justify-end gap-3">
          {agentData && (
            <Button variant="outline" onClick={handleCancelEdit} disabled={saving}>
              {t("common.cancel")}
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-emerald-600 to-teal-600">
            <Save className="size-4 mr-2" />
            {saving ? t("common.saving") : agentData ? t("common.saveChanges") : t("admin.createAgent")}
          </Button>
        </div>
      )}
    </div>
  )
}
