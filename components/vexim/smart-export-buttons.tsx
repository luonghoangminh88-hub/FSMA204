"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Lock, AlertCircle, Loader2, CheckCircle, ExternalLink } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { toast } from "sonner"
import type { ExportType } from "@/lib/vexim-types"

interface SmartExportButtonsProps {
  lotCodes: string[]
  organizationId: string
  variant?: "default" | "compact"
}

export function SmartExportButtons({ lotCodes, organizationId, variant = "default" }: SmartExportButtonsProps) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState<string | null>(null)
  const [blockDialog, setBlockDialog] = useState<{
    open: boolean
    reason?: string
    solution?: string
    blockedFields?: string[]
  }>({ open: false })

  async function handleExport(exportType: ExportType) {
    setLoading(exportType)

    try {
      const response = await fetch("/api/vexim/export-lot-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lotCodes, exportType }),
      })

      const data = await response.json()

      if (response.status === 403) {
        // Export blocked - show helpful dialog
        setBlockDialog({
          open: true,
          reason: data.reason,
          solution: data.solution,
          blockedFields: data.blockedFields,
        })
        return
      }

      if (!response.ok) {
        throw new Error(data.error || "Export failed")
      }

      // Success - download file
      window.open(data.fileUrl, "_blank")
      toast.success(t("export.success"))
    } catch (error) {
      console.error("[v0] Export error:", error)
      toast.error(t("export.error"))
    } finally {
      setLoading(null)
    }
  }

  if (variant === "compact") {
    return (
      <>
        <div className="flex gap-2">
          <Button onClick={() => handleExport("INTERNAL")} disabled={!!loading} variant="outline" size="sm">
            {loading === "INTERNAL" ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Download className="mr-2 size-4" />
            )}
            {t("export.internal")}
          </Button>

          <Button
            onClick={() => handleExport("USA_TRACEABILITY")}
            disabled={!!loading}
            size="sm"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {loading === "USA_TRACEABILITY" ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Lock className="mr-2 size-4" />
            )}
            {t("export.fdaCompliance")}
          </Button>
        </div>

        <ExportBlockedDialog
          open={blockDialog.open}
          onOpenChange={(open) => setBlockDialog({ ...blockDialog, open })}
          reason={blockDialog.reason}
          solution={blockDialog.solution}
          blockedFields={blockDialog.blockedFields}
        />
      </>
    )
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {/* Internal Export - Always available */}
        <div className="border rounded-lg p-4 space-y-3 hover:border-emerald-500 transition-colors">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold">{t("export.internal")}</h3>
              <p className="text-sm text-muted-foreground">{t("export.internalDesc")}</p>
            </div>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              {t("common.active")}
            </Badge>
          </div>
          <Button onClick={() => handleExport("INTERNAL")} disabled={!!loading} variant="outline" className="w-full">
            {loading === "INTERNAL" ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {t("export.generating")}
              </>
            ) : (
              <>
                <Download className="mr-2 size-4" />
                {t("export.downloadInternal")}
              </>
            )}
          </Button>
        </div>

        {/* FDA Export - May be locked */}
        <div className="border rounded-lg p-4 space-y-3 hover:border-blue-500 transition-colors bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold flex items-center gap-2">
                {t("export.fdaCompliance")}
                <Lock className="size-4 text-blue-600" />
              </h3>
              <p className="text-sm text-muted-foreground">{t("export.fdaDesc")}</p>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              FDA
            </Badge>
          </div>
          <Button
            onClick={() => handleExport("USA_TRACEABILITY")}
            disabled={!!loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {loading === "USA_TRACEABILITY" ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {t("export.generating")}
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 size-4" />
                {t("export.downloadInternal")}
              </>
            )}
          </Button>
        </div>
      </div>

      <ExportBlockedDialog
        open={blockDialog.open}
        onOpenChange={(open) => setBlockDialog({ ...blockDialog, open })}
        reason={blockDialog.reason}
        solution={blockDialog.solution}
        blockedFields={blockDialog.blockedFields}
      />
    </>
  )
}

function ExportBlockedDialog({
  open,
  onOpenChange,
  reason,
  solution,
  blockedFields,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  reason?: string
  solution?: string
  blockedFields?: string[]
}) {
  const { t } = useLanguage()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="size-5 text-amber-500" />
            {t("export.fdaRequired")}
          </DialogTitle>
          <DialogDescription className="space-y-4 pt-4">
            <p className="text-foreground font-medium">{reason}</p>
            <p className="text-sm">{solution}</p>

            {blockedFields && blockedFields.length > 0 && (
              <div className="bg-muted p-3 rounded-lg space-y-2">
                <p className="text-xs font-medium">{t("export.missingFields")}:</p>
                {blockedFields.map((field) => (
                  <div key={field} className="flex items-center gap-2 text-sm">
                    <div className="size-1.5 rounded-full bg-red-500" />
                    <span>{field}</span>
                  </div>
                ))}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            {t("export.useLater")}
          </Button>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/dashboard/settings/fda">
              <ExternalLink className="mr-2 size-4" />
              {t("export.setupWizard")}
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
