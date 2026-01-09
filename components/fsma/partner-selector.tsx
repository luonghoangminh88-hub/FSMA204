"use client"

import { useEffect, useState } from "react"
import { useLanguage } from "@/hooks/use-language"
import { createBrowserClient } from "@/lib/supabase/client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { phase2Translations } from "@/lib/cte-form-i18n"

interface Partner {
  id: string
  partner_name: string
  partner_type: string
  contact_name: string | null
}

interface PartnerSelectorProps {
  value: string
  onChange: (value: string) => void
  partnerType?: "carrier" | "supplier" | "customer" | "other"
  label: string
  required?: boolean
}

export function PartnerSelector({ value, onChange, partnerType, label, required = false }: PartnerSelectorProps) {
  const { locale } = useLanguage()
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPartners()
  }, [partnerType])

  const fetchPartners = async () => {
    try {
      const supabase = createBrowserClient()

      let query = supabase
        .from("supply_chain_partners")
        .select("id, partner_name, partner_type, contact_name")
        .eq("is_active", true)

      if (partnerType) {
        query = query.eq("partner_type", partnerType)
      }

      const { data, error } = await query.order("partner_name")

      if (error) throw error
      setPartners(data || [])
    } catch (error) {
      console.error("[v0] Error fetching partners:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      <Select value={value} onValueChange={onChange} disabled={loading}>
        <SelectTrigger>
          <SelectValue placeholder={phase2Translations[locale]["partner.selectPartner"]} />
        </SelectTrigger>
        <SelectContent>
          {partners.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground">{phase2Translations[locale]["partner.noPartners"]}</div>
          ) : (
            partners.map((partner) => (
              <SelectItem key={partner.id} value={partner.id}>
                {partner.partner_name}
                {partner.contact_name && ` (${partner.contact_name})`}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  )
}
