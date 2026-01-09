"use client"

import { useState, useEffect } from "react"
import { Search, Network, ArrowRight, Package, AlertCircle, Loader2, ArrowLeft, Clock, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

// --- Interfaces ---
export interface TraceabilityNode {
  level: number
  lot_id: string
  lot_code: string
  product_description: string
  quantity: number
  unit_of_measure: string
  status: string
  production_date: string
  event_type: string
  event_datetime: string
  location_name: string
  organization_name: string
}

interface TraceabilityChainViewerProps {
  initialLotCode?: string
}

// --- Sub-components ---

const CTETimeline = ({ events }: { events: any[] }) => (
  <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
    {events.map((event, index) => (
      <div
        key={index}
        className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-300 group-[.is-active]:bg-indigo-500 text-slate-500 group-[.is-active]:text-emerald-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
          <Clock className="h-5 w-5" />
        </div>
        <div className="w-[calc(100%-4rem)] md:w-[45%] p-4 rounded-xl border border-slate-700 bg-slate-900/40 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between space-x-2 mb-1">
            <div className="font-bold text-slate-100">{event.type}</div>
            <time className="font-mono text-xs font-medium text-indigo-400">{event.date}</time>
          </div>
          <div className="text-slate-400 text-xs flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {event.location}
          </div>
        </div>
      </div>
    ))}
  </div>
)

function ChainNode({
  node,
  isRoot = false,
  t,
}: { node: TraceabilityNode; isRoot?: boolean; t: (key: string) => string }) {
  const eventTypeColors: Record<string, string> = {
    harvesting: "bg-green-100 text-green-700 border-green-200",
    cooling: "bg-blue-100 text-blue-700 border-blue-200",
    initial_packing: "bg-purple-100 text-purple-700 border-purple-200",
    shipping: "bg-orange-100 text-orange-700 border-orange-200",
    receiving: "bg-pink-100 text-pink-700 border-pink-200",
    transformation: "bg-teal-100 text-teal-700 border-teal-200",
  }

  return (
    <div
      className={`flex items-start gap-4 p-4 border rounded-xl transition-all ${isRoot ? "border-indigo-500 ring-2 ring-indigo-500/20 shadow-md bg-slate-800/50" : "border-slate-700 bg-slate-800/40 hover:border-indigo-400 hover:bg-slate-800/60 shadow-sm"}`}
    >
      <div className="flex-1 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold font-mono text-slate-100">{node.lot_code}</h4>
              {isRoot && <Badge className="bg-indigo-600 hover:bg-indigo-700 text-[10px] uppercase">Gốc</Badge>}
            </div>
            <p className="text-xs text-slate-400">{node.product_description}</p>
          </div>
          <span
            className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${eventTypeColors[node.event_type] || "bg-gray-100"}`}
          >
            {t(`cte.${node.event_type}`)}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[11px]">
          <div>
            <span className="text-slate-500 block uppercase font-semibold">Số lượng</span>
            <p className="font-bold text-slate-200">
              {node.quantity} {node.unit_of_measure}
            </p>
          </div>
          <div>
            <span className="text-slate-500 block uppercase font-semibold">Địa điểm</span>
            <p className="font-bold text-slate-200 truncate">{node.location_name || "N/A"}</p>
          </div>
          <div>
            <span className="text-slate-500 block uppercase font-semibold">Ngày ghi nhận</span>
            <p className="font-bold text-slate-200">{new Date(node.event_datetime).toLocaleDateString("vi-VN")}</p>
          </div>
          <div>
            <span className="text-slate-500 block uppercase font-semibold">Trạng thái</span>
            <p className="font-bold text-slate-200 capitalize text-green-400">{node.status}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function LossAnalysis({
  backward,
  current,
  forward,
}: { backward: TraceabilityNode[]; current: TraceabilityNode; forward: TraceabilityNode[] }) {
  const initialQuantity = backward.length > 0 ? backward[0].quantity : current.quantity
  const finalQuantity = forward.length > 0 ? forward[forward.length - 1].quantity : current.quantity
  const totalLoss = initialQuantity - finalQuantity
  const lossPercentage = initialQuantity > 0 ? ((totalLoss / initialQuantity) * 100).toFixed(2) : "0"

  return (
    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-5 mt-6">
      <div className="flex items-start gap-4">
        <div className="p-2 bg-yellow-500/20 text-yellow-400 rounded-lg shadow-sm">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-yellow-200 text-sm mb-3 uppercase tracking-tight">
            Phân tích thất thoát (Loss Analysis)
          </h4>
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-slate-900/30 p-3 rounded-lg border border-slate-700">
              <span className="text-[10px] text-yellow-300 uppercase font-bold">Số lượng đầu vào</span>
              <p className="text-lg font-black text-slate-100">
                {initialQuantity} {current.unit_of_measure}
              </p>
            </div>
            <div className="bg-slate-900/30 p-3 rounded-lg border border-slate-700">
              <span className="text-[10px] text-yellow-300 uppercase font-bold">Tổng thất thoát</span>
              <p className="text-lg font-black text-red-400">
                {totalLoss.toFixed(2)} {current.unit_of_measure}
              </p>
            </div>
            <div className="bg-slate-900/30 p-3 rounded-lg border border-slate-700">
              <span className="text-[10px] text-yellow-300 uppercase font-bold">Tỷ lệ hao hụt</span>
              <p className="text-lg font-black text-red-400">{lossPercentage}%</p>
            </div>
          </div>
          <p className="text-[10px] text-yellow-400/70 mt-3 italic">
            * Dựa trên chênh lệch giữa nguyên liệu đầu vào và thành phẩm cuối cùng.
          </p>
        </div>
      </div>
    </div>
  )
}

// --- Main Exported Component ---

/**
 * Component hiển thị chuỗi truy xuất nguồn gốc (Chain Viewer)
 * Được sử dụng trong Dashboard Lots và Traceability Page.
 */
export function TraceabilityChainViewer({ initialLotCode = "" }: TraceabilityChainViewerProps) {
  const [lotCode, setLotCode] = useState(initialLotCode)
  const [isSearching, setIsSearching] = useState(false)
  const [backwardData, setBackwardData] = useState<TraceabilityNode[]>([])
  const [currentLot, setCurrentLot] = useState<TraceabilityNode | null>(null)
  const [forwardData, setForwardData] = useState<TraceabilityNode[]>([])

  const t = (key: string) => {
    const dictionary: Record<string, string> = {
      "cte.harvesting": "Thu hoạch",
      "cte.cooling": "Làm lạnh",
      "cte.initial_packing": "Đóng gói sơ cấp",
      "cte.shipping": "Vận chuyển",
      "cte.receiving": "Nhận hàng",
      "cte.transformation": "Chế biến",
      "cte.first_receiver": "Đơn vị tiếp nhận đầu tiên",
    }
    return dictionary[key] || key
  }

  const handleSearch = async () => {
    if (!lotCode.trim()) {
      toast.error("Vui lòng nhập mã lô")
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/trace/full/${encodeURIComponent(lotCode)}`)
      if (!response.ok) throw new Error("Failed to fetch traceability data")

      const result = await response.json()
      setBackwardData(result.backward || [])
      setCurrentLot(result.current || null)
      setForwardData(result.forward || [])

      if (result.current) {
        toast.success(`Đã tìm thấy chuỗi truy xuất với ${result.total_chain_length || 0} sự kiện`)
      } else {
        toast.error("Không tìm thấy mã lô này")
      }
    } catch (error) {
      console.error("Search error:", error)
      toast.error("Lỗi khi kết nối với máy chủ")
    } finally {
      setIsSearching(false)
    }
  }

  useEffect(() => {
    if (initialLotCode) {
      handleSearch()
    }
  }, [initialLotCode])

  const hasData = currentLot !== null

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <Card className="overflow-hidden border-slate-700 shadow-sm bg-slate-800/50">
        <CardHeader className="bg-slate-900/30 border-b border-slate-700">
          <CardTitle className="text-base flex items-center gap-2 text-slate-100">
            <Search className="h-4 w-4 text-indigo-400" />
            Tra cứu chuỗi sự kiện
          </CardTitle>
          <CardDescription className="text-slate-400">
            Nhập mã lô hàng (Lot Code) để xem sơ đồ dòng chảy sản phẩm
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="lotCodeInput" className="text-slate-300">
                Mã lô sản phẩm (TLC)
              </Label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  id="lotCodeInput"
                  placeholder="VD: LOT-2023-001"
                  value={lotCode}
                  onChange={(e) => setLotCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10 font-mono bg-slate-900/50 border-slate-600 text-slate-100"
                />
              </div>
            </div>
            <Button
              onClick={handleSearch}
              disabled={isSearching}
              className="sm:self-end bg-indigo-600 hover:bg-indigo-700"
            >
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              {isSearching ? "Đang truy vấn..." : "Tìm kiếm"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results View */}
      {hasData && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
          <Card className="border-slate-700 bg-slate-800/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-slate-700">
              <div>
                <CardTitle className="text-lg text-slate-100">Sơ đồ chuỗi giá trị</CardTitle>
                <CardDescription className="text-slate-400">
                  Mã lô: <span className="font-mono font-bold text-indigo-400">{currentLot.lot_code}</span>
                </CardDescription>
              </div>
              <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                <Network className="mr-1 h-3 w-3" />
                {backwardData.length + 1 + forwardData.length} Sự kiện
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Backward */}
              {backwardData.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                    <ArrowLeft className="h-3 w-3" /> Nguồn gốc (Backward)
                  </h4>
                  {backwardData.map((node, idx) => (
                    <div key={`bw-${idx}`} className="pl-6 relative">
                      <div className="absolute left-2 top-0 bottom-0 w-px bg-slate-700" />
                      <ChainNode node={node} t={t} />
                    </div>
                  ))}
                </div>
              )}

              {/* Current Root */}
              <div className="relative">
                <ChainNode node={currentLot} isRoot t={t} />
              </div>

              {/* Forward */}
              {forwardData.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                    <ArrowRight className="h-3 w-3" /> Thành phẩm phái sinh (Forward)
                  </h4>
                  {forwardData.map((node, idx) => (
                    <div key={`fw-${idx}`} className="pl-6 relative">
                      <div className="absolute left-2 top-0 bottom-0 w-px bg-slate-700" />
                      <ChainNode node={node} t={t} />
                    </div>
                  ))}
                </div>
              )}

              <LossAnalysis backward={backwardData} current={currentLot} forward={forwardData} />
            </CardContent>
          </Card>

          {/* Timeline View */}
          <Card className="border-slate-700 bg-slate-800/50">
            <CardHeader className="border-b border-slate-700">
              <CardTitle className="text-lg text-slate-100">Dòng thời gian sự kiện</CardTitle>
              <CardDescription className="text-slate-400">
                Chi tiết các điểm kiểm soát tới hạn (CTE) được ghi nhận
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CTETimeline
                events={[...backwardData, currentLot, ...forwardData].map((node) => ({
                  type: t(`cte.${node.event_type}`),
                  date: node.event_datetime,
                  location: node.location_name,
                }))}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {!hasData && !isSearching && (
        <Card className="border-dashed border-2 border-slate-700 bg-slate-900/30">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="bg-slate-800 p-4 rounded-full shadow-sm mb-4">
              <Package className="h-10 w-10 text-slate-600" />
            </div>
            <p className="text-slate-400 font-medium">Nhập mã lô hàng để bắt đầu hành trình truy xuất</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
