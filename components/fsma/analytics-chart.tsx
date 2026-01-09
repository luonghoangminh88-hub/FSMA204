"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

interface ChartData {
  name: string
  value: number
  value2?: number
}

interface AnalyticsChartProps {
  title: string
  description: string
  data: ChartData[]
  type: "bar" | "line"
  dataKey: string
  dataKey2?: string
  xAxisKey?: string
}

export function AnalyticsChart({
  title,
  description,
  data,
  type,
  dataKey,
  dataKey2,
  xAxisKey = "name",
}: AnalyticsChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          {type === "bar" ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey={xAxisKey} className="text-muted-foreground text-xs" />
              <YAxis className="text-muted-foreground text-xs" />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Legend />
              <Bar dataKey={dataKey} fill="rgb(16, 185, 129)" radius={[4, 4, 0, 0]} />
              {dataKey2 && <Bar dataKey={dataKey2} fill="rgb(59, 130, 246)" radius={[4, 4, 0, 0]} />}
            </BarChart>
          ) : (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey={xAxisKey} className="text-muted-foreground text-xs" />
              <YAxis className="text-muted-foreground text-xs" />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Legend />
              <Line type="monotone" dataKey={dataKey} stroke="rgb(16, 185, 129)" strokeWidth={2} />
              {dataKey2 && <Line type="monotone" dataKey={dataKey2} stroke="rgb(59, 130, 246)" strokeWidth={2} />}
            </LineChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
