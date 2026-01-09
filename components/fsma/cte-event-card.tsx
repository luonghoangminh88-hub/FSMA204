"use client"

import type React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, MapPin, Package, FileText } from "lucide-react"
import type { CTEType } from "@/lib/types"

interface CTEEventCardProps {
  eventType: CTEType
  eventDate: string
  location: string
  lotCode: string
  quantity: number
  unit: string
  status?: "pending" | "completed" | "requires_attention"
  onClick?: () => void
}

const cteIcons: Record<CTEType, React.ReactNode> = {
  harvesting: <Package className="size-4" />,
  cooling: <Package className="size-4" />,
  initial_packing: <Package className="size-4" />,
  first_receiver: <Package className="size-4" />,
  shipping: <Package className="size-4" />,
  receiving: <Package className="size-4" />,
  transformation: <Package className="size-4" />,
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

export function CTEEventCard({
  eventType,
  eventDate,
  location,
  lotCode,
  quantity,
  unit,
  status = "completed",
  onClick,
}: CTEEventCardProps) {
  const statusColors = {
    pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
    completed: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
    requires_attention: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  }

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              {cteIcons[eventType]}
            </div>
            <div>
              <CardTitle className="text-base">{cteLabels[eventType].en}</CardTitle>
              <CardDescription className="text-xs">{lotCode}</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className={statusColors[status]}>
            {status.replace("_", " ")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="size-3" />
          <span>{new Date(eventDate).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="size-3" />
          <span className="truncate">{location}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="size-3" />
          <span>
            {quantity} {unit}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
