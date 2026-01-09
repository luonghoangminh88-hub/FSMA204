"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/hooks/use-language"
import { Calendar, MapPin, Package } from "lucide-react"

interface CTEEventCardProps {
  eventType: string
  eventDate: string
  location: string
  lotCode: string
  quantity: number
  unit: string
  status: string
  onClick?: () => void
}

export function CTEEventCard({
  eventType,
  eventDate,
  location,
  lotCode,
  quantity,
  unit,
  status,
  onClick,
}: CTEEventCardProps) {
  const { locale } = useLanguage()

  const eventTypeLabels: Record<string, { en: string; vi: string }> = {
    harvesting: { en: "Harvesting", vi: "Thu hoạch" },
    cooling: { en: "Cooling", vi: "Làm lạnh" },
    initial_packing: { en: "Initial Packing", vi: "Đóng gói ban đầu" },
    first_receiver: { en: "First Receiver", vi: "Người nhận đầu tiên" },
    shipping: { en: "Shipping", vi: "Vận chuyển" },
    receiving: { en: "Receiving", vi: "Nhận hàng" },
    transformation: { en: "Transformation", vi: "Chế biến" },
  }

  const statusColors: Record<string, string> = {
    completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  }

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="bg-primary/10">
            {eventTypeLabels[eventType]?.[locale] || eventType}
          </Badge>
          <Badge className={statusColors[status] || statusColors.completed}>
            {locale === "vi" ? "Hoàn thành" : "Completed"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="size-4" />
          <span>{new Date(eventDate).toLocaleString(locale === "vi" ? "vi-VN" : "en-US")}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="size-4" />
          <span className="truncate">{location}</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Package className="size-4 text-muted-foreground" />
          <div className="flex-1">
            <span className="font-mono font-semibold">{lotCode}</span>
            <span className="text-muted-foreground ml-2">
              {quantity} {unit}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
