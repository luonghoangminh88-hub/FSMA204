"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ArrowLeft, AlertCircle } from "lucide-react"
import Link from "next/link"
import { KDEForm } from "@/components/fsma/kde-form"
import type { CTEType, OrganizationType } from "@/lib/types"
import { useLanguage } from "@/hooks/use-language"
import { createBrowserClient } from "@/lib/supabase/client"
import { useOrganizationCTEs } from "@/hooks/use-organization-ctes"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function NewCTEEventPage() {
  const [selectedEventType, setSelectedEventType] = useState<CTEType | null>(null)
  const [organizationType, setOrganizationType] = useState<OrganizationType | null>(null)
  const [organizationName, setOrganizationName] = useState<string>("")
  const [completedCTEs, setCompletedCTEs] = useState<CTEType[]>([])
  const [isLoadingOrg, setIsLoadingOrg] = useState(true)

  const { t, locale } = useLanguage()
  const supabase = createBrowserClient()

  const { allowedCTEs } = useOrganizationCTEs(organizationType)

  useEffect(() => {
    const loadOrganizationData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setIsLoadingOrg(false)
          return
        }

        const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

        if (profile?.organization_id) {
          const { data: org } = await supabase
            .from("organizations")
            .select("name, organization_type")
            .eq("id", profile.organization_id)
            .single()

          if (org) {
            setOrganizationName(org.name)
            setOrganizationType(org.organization_type as OrganizationType)
          }

          const { data: cteEvents } = await supabase
            .from("cte_events")
            .select("event_type")
            .eq("organization_id", profile.organization_id)
            .order("created_at", { ascending: false })

          if (cteEvents && cteEvents.length > 0) {
            const uniqueTypes = Array.from(new Set(cteEvents.map((e) => e.event_type as CTEType)))
            setCompletedCTEs(uniqueTypes)
          }
        }
      } catch (error) {
        console.error("[v0] Error loading organization data:", error)
      } finally {
        setIsLoadingOrg(false)
      }
    }

    loadOrganizationData()
  }, [])

  const handleCTECompleted = (eventType: CTEType) => {
    if (!completedCTEs.includes(eventType)) {
      setCompletedCTEs((prev) => [...prev, eventType])
    }
  }

  const eventTypes: { value: CTEType; label: string; description: string }[] = [
    { value: "harvesting", label: t("cte.harvesting"), description: t("newCteEvent.harvestingDesc") },
    { value: "cooling", label: t("cte.cooling"), description: t("newCteEvent.coolingDesc") },
    { value: "initial_packing", label: t("cte.initialPacking"), description: t("newCteEvent.initialPackingDesc") },
    {
      value: "first_receiver",
      label: t("cte.firstReceiver"),
      description: t("newCteEvent.firstReceiverDesc"),
    },
    { value: "shipping", label: t("cte.shipping"), description: t("newCteEvent.shippingDesc") },
    { value: "receiving", label: t("cte.receiving"), description: t("newCteEvent.receivingDesc") },
    {
      value: "transformation",
      label: t("cte.transformation"),
      description: t("newCteEvent.transformationDesc"),
    },
  ]

  const filteredEventTypes =
    allowedCTEs.length > 0 ? eventTypes.filter((type) => allowedCTEs.includes(type.value)) : eventTypes

  const KDEFormSafe = KDEForm as any

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/cte-events">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("newCteEvent.title")}</h1>
          <p className="text-muted-foreground">{t("newCteEvent.description")}</p>
        </div>
      </div>

      {!isLoadingOrg && !organizationType && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>
            {locale === "vi"
              ? "Không tìm thấy phân loại tổ chức. Vui lòng liên hệ quản trị viên để cập nhật thông tin tổ chức."
              : "Organization classification not found. Please contact your administrator to update organization information."}
          </AlertDescription>
        </Alert>
      )}

      {!isLoadingOrg && organizationType && (
        <Alert>
          <AlertDescription>
            {locale === "vi"
              ? `Tổ chức: ${organizationName} - Các sự kiện CTE được phép: ${allowedCTEs.map((cte) => t(`cte.${cte}`)).join(", ")}`
              : `Organization: ${organizationName} - Allowed CTE events: ${allowedCTEs.map((cte) => t(`cte.${cte}`)).join(", ")}`}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("newCteEvent.selectType")}</CardTitle>
          <CardDescription>{t("newCteEvent.selectTypeDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="eventType">{t("cte.eventType")}</Label>
            <Select
              value={selectedEventType || undefined}
              onValueChange={(value) => setSelectedEventType(value as CTEType)}
              disabled={isLoadingOrg || !organizationType}
            >
              <SelectTrigger id="eventType">
                <SelectValue
                  placeholder={
                    isLoadingOrg
                      ? locale === "vi"
                        ? "Đang tải..."
                        : "Loading..."
                      : !organizationType
                        ? locale === "vi"
                          ? "Vui lòng cập nhật phân loại tổ chức"
                          : "Please update organization classification"
                        : t("newCteEvent.selectEventType")
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {filteredEventTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{type.label}</span>
                      <span className="text-xs text-muted-foreground">{type.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedEventType && (
        <KDEFormSafe
          eventType={selectedEventType}
          locale={locale}
          onSuccess={() => handleCTECompleted(selectedEventType)}
        />
      )}
    </div>
  )
}
