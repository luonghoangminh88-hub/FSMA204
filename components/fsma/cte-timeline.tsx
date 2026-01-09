"use client"

import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Circle, AlertCircle } from "lucide-react"
import type { CTEType } from "@/lib/types"

interface TimelineEvent {
  id: string
  type: CTEType
  date: string
  location: string
  status: "completed" | "pending" | "missing"
}

interface CTETimelineProps {
  events: TimelineEvent[]
  locale?: "en" | "vi"
}

const cteLabels: Record<CTEType, { en: string; vi: string }> = {
  harvesting: { en: "Harvesting", vi: "Thu hoạch" },
  cooling: { en: "Cooling", vi: "Làm lạnh" },
  initial_packing: { en: "Initial Packing", vi: "Đóng gói ban đầu" },
  first_receiver: { en: "First Receiver", vi: "Người nhận đầu tiên" },
  shipping: { en: "Shipping", vi: "Vận chuyển" },
  receiving: { en: "Receiving", vi: "Nhận hàng" },
  transformation: { en: "Transformation", vi: "Chế biến" },
}

export function CTETimeline({ events, locale = "en" }: CTETimelineProps) {
  return (
    <div className="space-y-4">
      {events.map((event, index) => {
        const isLast = index === events.length - 1
        const Icon = event.status === "completed" ? CheckCircle2 : event.status === "pending" ? Circle : AlertCircle

        return (
          <div key={event.id} className="flex gap-4">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div
                className={`size-8 rounded-full border-2 flex items-center justify-center ${
                  event.status === "completed"
                    ? "bg-primary/10 border-primary text-primary"
                    : event.status === "pending"
                      ? "bg-yellow-500/10 border-yellow-500 text-yellow-600"
                      : "bg-red-500/10 border-red-500 text-red-600"
                }`}
              >
                <Icon className="size-4" />
              </div>
              {!isLast && <div className="w-0.5 flex-1 bg-border min-h-12" />}
            </div>

            {/* Event content */}
            <div className="flex-1 pb-8">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-medium">{cteLabels[event.type][locale]}</h4>
                  <p className="text-sm text-muted-foreground">{event.location}</p>
                  <p className="text-xs text-muted-foreground">{new Date(event.date).toLocaleString(locale)}</p>
                </div>
                <Badge variant={event.status === "completed" ? "default" : "outline"}>
                  {event.status === "completed"
                    ? locale === "en"
                      ? "Completed"
                      : "Hoàn thành"
                    : event.status === "pending"
                      ? locale === "en"
                        ? "Pending"
                        : "Đang chờ"
                      : locale === "en"
                        ? "Missing"
                        : "Thiếu"}
                </Badge>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
