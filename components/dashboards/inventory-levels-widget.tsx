"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Package, TrendingDown, Warehouse } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"

interface InventoryLevel {
  location_id: string
  location_name: string
  total_quantity: number
  active_lots: number
  low_stock_count: number
  unit_of_measure: string
}

export function InventoryLevelsWidget() {
  const { locale } = useLanguage()
  const [inventory, setInventory] = useState<InventoryLevel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInventory()
  }, [])

  const fetchInventory = async () => {
    try {
      const response = await fetch("/api/dashboards/inventory")
      if (response.ok) {
        const data = await response.json()
        setInventory(data.inventory_levels?.slice(0, 5) || [])
      }
    } catch (error) {
      console.error("[v0] Error fetching inventory:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Warehouse className="size-5" />
            {locale === "vi" ? "Tồn kho theo địa điểm" : "Inventory by Location"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-l-4 border-l-purple-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Warehouse className="size-5" />
          {locale === "vi" ? "Tồn kho theo địa điểm" : "Inventory by Location"}
        </CardTitle>
        <CardDescription>
          {locale === "vi" ? "Mức độ tồn kho hiện tại tại các địa điểm" : "Current stock levels across locations"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {inventory.map((item) => (
            <div key={item.location_id} className="flex items-center justify-between border-b pb-3 last:border-0">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Package className="size-5 text-purple-600" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{item.location_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.active_lots} {locale === "vi" ? "lô đang hoạt động" : "active lots"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">
                  {item.total_quantity.toLocaleString()} {item.unit_of_measure}
                </p>
                {item.low_stock_count > 0 && (
                  <Badge variant="outline" className="mt-1 bg-orange-500/10 text-orange-700 border-orange-500/20">
                    <TrendingDown className="size-3 mr-1" />
                    {item.low_stock_count} {locale === "vi" ? "sắp hết" : "low stock"}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
