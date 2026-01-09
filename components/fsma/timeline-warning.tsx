"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import { phase2Translations } from "@/lib/cte-form-i18n"

interface TimelineWarningProps {
  message: string
  severity?: "warning" | "error"
}

export function TimelineWarning({ message, severity = "warning" }: TimelineWarningProps) {
  const { locale } = useLanguage()

  return (
    <Alert variant={severity === "error" ? "destructive" : "default"} className="border-orange-500">
      <AlertTriangle className="size-4" />
      <AlertTitle>{phase2Translations[locale]["timeline.warning"]}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}
