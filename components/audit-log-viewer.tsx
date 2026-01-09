"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, User, Clock, Search, X } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AuditLog {
  id: string
  table_name: string
  operation: "INSERT" | "UPDATE" | "DELETE"
  old_data: any
  new_data: any
  user_id: string
  user_name: string
  created_at: string
}

export function AuditLogViewer() {
  const { locale } = useLanguage()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [operationFilter, setOperationFilter] = useState("all")

  useEffect(() => {
    fetchLogs()
  }, [])

  useEffect(() => {
    filterLogs()
  }, [searchQuery, operationFilter, logs])

  const fetchLogs = async () => {
    try {
      const response = await fetch("/api/audit-logs?limit=100")
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
      }
    } catch (error) {
      console.error("[v0] Error fetching audit logs:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterLogs = () => {
    let filtered = [...logs]

    if (searchQuery) {
      filtered = filtered.filter(
        (log) =>
          log.table_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.user_name?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    if (operationFilter !== "all") {
      filtered = filtered.filter((log) => log.operation === operationFilter)
    }

    setFilteredLogs(filtered)
  }

  const getOperationColor = (operation: string) => {
    switch (operation) {
      case "INSERT":
        return "bg-green-500/10 text-green-700 border-green-500/20"
      case "UPDATE":
        return "bg-blue-500/10 text-blue-700 border-blue-500/20"
      case "DELETE":
        return "bg-red-500/10 text-red-700 border-red-500/20"
      default:
        return ""
    }
  }

  const getOperationLabel = (operation: string) => {
    if (locale === "vi") {
      switch (operation) {
        case "INSERT":
          return "Thêm mới"
        case "UPDATE":
          return "Cập nhật"
        case "DELETE":
          return "Xóa"
        default:
          return operation
      }
    }
    return operation
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{locale === "vi" ? "Nhật ký kiểm toán" : "Audit Log"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-5" />
          {locale === "vi" ? "Nhật ký kiểm toán" : "Audit Log"}
        </CardTitle>
        <CardDescription>
          {locale === "vi" ? "Theo dõi tất cả các thay đổi trong hệ thống" : "Track all changes in the system"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder={locale === "vi" ? "Tìm kiếm..." : "Search..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onClick={() => setSearchQuery("")}
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
          <Select value={operationFilter} onValueChange={setOperationFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{locale === "vi" ? "Tất cả" : "All"}</SelectItem>
              <SelectItem value="INSERT">{getOperationLabel("INSERT")}</SelectItem>
              <SelectItem value="UPDATE">{getOperationLabel("UPDATE")}</SelectItem>
              <SelectItem value="DELETE">{getOperationLabel("DELETE")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <div key={log.id} className="flex gap-3 p-3 rounded-lg border">
                  <div
                    className={`size-8 rounded-full flex items-center justify-center shrink-0 ${getOperationColor(log.operation)}`}
                  >
                    <FileText className="size-4" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getOperationColor(log.operation)}>
                          {getOperationLabel(log.operation)}
                        </Badge>
                        <span className="text-sm font-medium">{log.table_name.replace("cte_", "")}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3" />
                        {new Date(log.created_at).toLocaleString(locale === "vi" ? "vi-VN" : "en-US")}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="size-3" />
                      {log.user_name || "System"}
                    </div>
                    {log.operation === "UPDATE" && log.new_data && (
                      <div className="text-xs text-muted-foreground">
                        {locale === "vi" ? "Cập nhật:" : "Updated:"} {Object.keys(log.new_data).slice(0, 3).join(", ")}
                        {Object.keys(log.new_data).length > 3 && "..."}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {locale === "vi" ? "Không tìm thấy nhật ký" : "No logs found"}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
