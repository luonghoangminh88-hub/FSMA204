import type React from "react"
import { Card, CardContent } from "@/components/ui/card"

interface StatsCardProps {
  title: string
  value: string
  description: string
  icon: React.ReactNode
  trend?: string
  colorClass: string
  iconBg: string
}

export function StatsCard({ title, value, description, icon, trend, colorClass, iconBg }: StatsCardProps) {
  return (
    <Card className={`glass-strong border ${colorClass} hover:border-opacity-75 transition-all duration-300 group`}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-2xl ${iconBg} text-white shadow-lg`}>{icon}</div>
          {trend && (
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
              {trend}
            </span>
          )}
        </div>
        <div className="space-y-2">
          <p className="text-4xl font-bold text-white">{value}</p>
          <p className="text-sm font-medium text-white/80">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}
