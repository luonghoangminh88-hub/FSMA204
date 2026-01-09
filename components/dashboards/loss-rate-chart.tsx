"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts"
import { TrendingDown, TrendingUp } from "lucide-react"

interface LossRateData {
  month: string
  harvesting: number
  cooling: number
  initial_packing: number
  transformation: number
  average: number
}

export function LossRateChart() {
  const [data, setData] = useState<LossRateData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLossRates()
  }, [])

  async function fetchLossRates() {
    try {
      const response = await fetch("/api/dashboards/loss-rate-trend")

      if (!response.ok) throw new Error("Failed to fetch loss rates")

      const result = await response.json()
      setData(result.trend || [])
    } catch (error) {
      console.error("[v0] Error fetching loss rates:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loss Rate Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    )
  }

  const avgLoss = data.length > 0 ? data.reduce((sum, item) => sum + item.average, 0) / data.length : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Loss Rate Trends</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-normal text-muted-foreground">Avg:</span>
            <span className="text-lg font-bold">{avgLoss.toFixed(1)}%</span>
            {avgLoss < 3 ? (
              <TrendingDown className="size-4 text-green-600" />
            ) : (
              <TrendingUp className="size-4 text-red-600" />
            )}
          </div>
        </CardTitle>
        <CardDescription>Loss percentage by event type over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <XAxis dataKey="month" stroke="#888888" fontSize={12} />
            <YAxis stroke="#888888" fontSize={12} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="harvesting" stroke="#10b981" strokeWidth={2} name="Harvesting" />
            <Line type="monotone" dataKey="cooling" stroke="#3b82f6" strokeWidth={2} name="Cooling" />
            <Line type="monotone" dataKey="initial_packing" stroke="#f59e0b" strokeWidth={2} name="Initial Packing" />
            <Line type="monotone" dataKey="transformation" stroke="#ef4444" strokeWidth={2} name="Transformation" />
            <Line
              type="monotone"
              dataKey="average"
              stroke="#6366f1"
              strokeWidth={3}
              strokeDasharray="5 5"
              name="Average"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
