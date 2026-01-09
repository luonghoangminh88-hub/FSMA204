"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { CheckCircle2, Circle, ArrowRight, Building2 } from "lucide-react"
import type { OrganizationType, CTEType } from "@/lib/types"
import { ORGANIZATION_CTE_MAPPINGS } from "@/lib/types"
import { useLanguage } from "@/hooks/use-language"

interface CTEFlowDiagramProps {
  organizationType: OrganizationType | null
  organizationName?: string
  completedStages?: CTEType[]
  currentStage?: CTEType | null
  className?: string
}

const CTE_LABELS: Record<CTEType, { en: string; vi: string; color: string }> = {
  harvesting: {
    en: "Harvesting",
    vi: "Thu hoạch",
    color: "bg-emerald-500",
  },
  cooling: {
    en: "Cooling",
    vi: "Làm lạnh",
    color: "bg-blue-500",
  },
  initial_packing: {
    en: "Initial Packing",
    vi: "Đóng gói ban đầu",
    color: "bg-purple-500",
  },
  first_receiver: {
    en: "First Receiver",
    vi: "Tiếp nhận đầu tiên",
    color: "bg-cyan-500",
  },
  shipping: {
    en: "Shipping",
    vi: "Vận chuyển",
    color: "bg-orange-500",
  },
  receiving: {
    en: "Receiving",
    vi: "Tiếp nhận",
    color: "bg-indigo-500",
  },
  transformation: {
    en: "Transformation",
    vi: "Chuyển đổi",
    color: "bg-pink-500",
  },
}

const ORG_TYPE_LABELS: Record<OrganizationType, { en: string; vi: string }> = {
  farm_grower: { en: "Farm / Grower", vi: "Nông trại / Người trồng" },
  packer_packhouse: { en: "Packer / Packhouse", vi: "Đóng gói / Nhà đóng gói" },
  processor_manufacturer: { en: "Processor / Manufacturer", vi: "Chế biến / Sản xuất" },
  distributor_warehouse: { en: "Distributor / Warehouse", vi: "Nhà phân phối / Kho" },
  first_receiver: { en: "First Receiver", vi: "Người nhận đầu tiên" },
  importer: { en: "Importer", vi: "Nhà nhập khẩu" },
  retailer: { en: "Retailer", vi: "Nhà bán lẻ" },
}

export function CTEFlowDiagram({
  organizationType,
  organizationName,
  completedStages = [],
  currentStage = null,
  className,
}: CTEFlowDiagramProps) {
  const { locale } = useLanguage()

  const allowedStages = organizationType ? ORGANIZATION_CTE_MAPPINGS[organizationType] || [] : []

  if (allowedStages.length === 0) {
    return null
  }

  return (
    <Card
      className={cn(
        "border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90 backdrop-blur-xl shadow-2xl",
        className,
      )}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-xl">
          <span className="text-white">{locale === "vi" ? "Luồng CTE" : "CTE Flow"}</span>
          <Badge
            variant="outline"
            className="font-normal text-sm border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          >
            {locale === "vi" ? "Theo tổ chức" : "Organization-specific"}
          </Badge>
        </CardTitle>
        <CardDescription className="text-base text-slate-300">
          {(organizationName || organizationType) && (
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <Building2 className="size-4 text-emerald-400" />
              <span>
                {organizationName && <span className="text-white">{organizationName}</span>}
                {organizationName && organizationType && <span className="text-slate-500 mx-2">•</span>}
                {organizationType && (
                  <span className="text-slate-400">
                    {locale === "vi" ? ORG_TYPE_LABELS[organizationType].vi : ORG_TYPE_LABELS[organizationType].en}
                  </span>
                )}
              </span>
            </div>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Flow Container */}
          <div className="flex items-center gap-4 overflow-x-auto pb-2">
            {allowedStages.map((stage, index) => {
              const label = CTE_LABELS[stage]
              const isCompleted = completedStages.includes(stage)
              const isCurrent = currentStage === stage
              const isLast = index === allowedStages.length - 1

              return (
                <div key={stage} className="flex items-center gap-4 shrink-0">
                  {/* Stage Node */}
                  <div
                    className={cn(
                      "relative flex items-center gap-4 px-6 py-5 rounded-xl border-2 transition-all backdrop-blur-sm min-w-[220px]",
                      isCompleted && "border-emerald-500/50 bg-emerald-500/10 shadow-lg shadow-emerald-500/20",
                      isCurrent && "border-sky-400/50 bg-sky-500/10 ring-2 ring-sky-400/30 shadow-lg shadow-sky-500/20",
                      !isCompleted && !isCurrent && "border-white/10 bg-white/5",
                    )}
                  >
                    {/* Status Icon */}
                    <div
                      className={cn(
                        "flex items-center justify-center size-9 rounded-full shrink-0 shadow-lg",
                        isCompleted && "bg-emerald-500 text-white shadow-emerald-500/50",
                        isCurrent && `${label.color} text-white shadow-sky-500/50`,
                        !isCompleted && !isCurrent && "bg-slate-700/50 text-slate-400 border border-white/10",
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="size-5" />
                      ) : (
                        <Circle className={cn("size-5", isCurrent && "animate-pulse")} />
                      )}
                    </div>

                    {/* Stage Label */}
                    <div className="space-y-1 min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-base font-semibold whitespace-nowrap",
                          isCompleted && "text-emerald-300",
                          isCurrent && "text-sky-300",
                          !isCompleted && !isCurrent && "text-slate-300",
                        )}
                      >
                        {locale === "vi" ? label.vi : label.en}
                      </p>
                      <p
                        className={cn(
                          "text-sm whitespace-nowrap",
                          isCompleted && "text-emerald-400/70",
                          isCurrent && "text-sky-400/70",
                          !isCompleted && !isCurrent && "text-slate-500",
                        )}
                      >
                        {isCompleted
                          ? locale === "vi"
                            ? "Hoàn thành"
                            : "Completed"
                          : isCurrent
                            ? locale === "vi"
                              ? "Đang xử lý"
                              : "In Progress"
                            : locale === "vi"
                              ? "Chờ xử lý"
                              : "Pending"}
                      </p>
                    </div>
                  </div>

                  {/* Arrow */}
                  {!isLast && (
                    <ArrowRight
                      className={cn("size-6 shrink-0", isCompleted ? "text-emerald-400" : "text-slate-600")}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* Progress Bar */}
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span className="text-slate-300">
                {locale === "vi" ? "Tiến độ" : "Progress"}: {completedStages.length}/{allowedStages.length}
              </span>
              <span className="text-emerald-400">
                {Math.round((completedStages.length / allowedStages.length) * 100)}%
              </span>
            </div>
            <div className="h-3 bg-slate-700/30 rounded-full overflow-hidden border border-white/10 backdrop-blur-sm">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 transition-all duration-500 shadow-lg shadow-emerald-500/30"
                style={{ width: `${(completedStages.length / allowedStages.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
