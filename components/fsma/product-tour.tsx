"use client"

import { useState, useEffect } from "react"
import Joyride, { type CallBackProps, STATUS, type Step, ACTIONS, EVENTS } from "react-joyride"
import { Button } from "@/components/ui/button"

interface ProductTourProps {
  userRole?: string
  onComplete?: () => void
}

export function ProductTour({ userRole = "org_admin", onComplete }: ProductTourProps) {
  const [run, setRun] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const tourCompleted = localStorage.getItem("fsma204_tour_completed")
    const tourSkipped = sessionStorage.getItem("fsma204_tour_skipped")

    if (!tourCompleted && !tourSkipped) {
      let retryCount = 0
      const MAX_RETRIES = 20 // 10 seconds total (20 * 500ms)

      const checkTargets = () => {
        const requiredTargets = [
          '[data-tour="menu-settings"]',
          '[data-tour="menu-locations"]',
          '[data-tour="menu-lots"]',
          '[data-tour="menu-cte-events"]',
          '[data-tour="menu-traceability"]',
          '[data-tour="menu-approvals"]',
        ]

        const allTargetsExist = requiredTargets.every((selector) => {
          const element = document.querySelector(selector)
          console.log("[v0] Tour target check:", selector, element ? "found" : "not found")
          return element !== null
        })

        if (allTargetsExist) {
          console.log("[v0] All tour targets mounted, starting tour")
          setMounted(true)
          setTimeout(() => setRun(true), 500)
        } else {
          retryCount++
          if (retryCount < MAX_RETRIES) {
            console.log("[v0] Some tour targets not mounted yet, retrying...", retryCount)
            setTimeout(checkTargets, 500)
          } else {
            console.log("[v0] Tour targets not found after max retries, skipping tour")
            sessionStorage.setItem("fsma204_tour_skipped", "true")
          }
        }
      }

      setTimeout(checkTargets, 2000) // Increased initial delay to 2 seconds
    }
  }, [])

  const allSteps: Step[] = [
    {
      target: "body",
      content: (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-emerald-600">Chào mừng đến FSMA 204 System!</h2>
          <p className="text-base text-gray-700 leading-relaxed">
            Hệ thống giúp bạn tuân thủ quy định <strong>FDA Food Traceability Rule (FSMA 204)</strong> - theo dõi
            Critical Tracking Events (CTEs) và Key Data Elements (KDEs).
          </p>
          <p className="text-sm text-gray-600">
            Hãy dành <strong>5 phút</strong> để tìm hiểu quy trình từ Thu hoạch đến Vận chuyển!
          </p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },

    {
      target: '[data-tour="menu-settings"]',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-gray-900">Bước 1: Cấu hình FDA Registration</h3>
          <p className="text-sm text-gray-700">
            Trước tiên, thiết lập <strong>FDA Facility Registration Number</strong> và{" "}
            <strong>US Agent Information</strong> tại Settings → FDA Settings.
          </p>
          <div className="bg-amber-50 border-l-4 border-amber-500 p-3 text-xs text-amber-800">
            <strong>Lưu ý:</strong> FDA yêu cầu renew registration mỗi 2 năm một lần.
          </div>
        </div>
      ),
      placement: "right",
      spotlightClicks: false,
    },

    {
      target: '[data-tour="menu-locations"]',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-gray-900">Bước 2: Thêm Locations</h3>
          <p className="text-sm text-gray-700">
            Tạo danh sách <strong>địa điểm</strong> trong chuỗi cung ứng: trang trại, nhà máy chế biến, kho bãi, cửa
            hàng.
          </p>
          <ul className="text-xs text-gray-600 list-disc list-inside space-y-1">
            <li>Mỗi location phải có GLN (Global Location Number) hoặc address</li>
            <li>Sử dụng location code để tracking CTEs</li>
          </ul>
        </div>
      ),
      placement: "right",
    },

    {
      target: '[data-tour="menu-lots"]',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-gray-900">Bước 3: Tạo Traceability Lot Code (TLC)</h3>
          <p className="text-sm text-gray-700">
            Mỗi lô hàng phải có <strong>TLC duy nhất</strong> để trace forward/backward trong chuỗi.
          </p>
          <div className="bg-blue-50 p-3 rounded text-xs font-mono text-blue-900">
            Format: ABC-2026-LETT-0001-F01
            <br />
            <span className="text-gray-600">(Org-Year-Food-Seq-Location)</span>
          </div>
        </div>
      ),
      placement: "right",
    },

    {
      target: '[data-tour="menu-cte-events"]',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-gray-900">Critical Tracking Events (CTEs)</h3>
          <p className="text-sm text-gray-700">
            FSMA 204 quy định <strong>6 loại CTEs</strong> bắt buộc theo dõi:
          </p>
          <ol className="text-xs text-gray-700 list-decimal list-inside space-y-1">
            <li>
              <strong>Harvesting</strong> - Thu hoạch nông sản
            </li>
            <li>
              <strong>Cooling</strong> - Làm lạnh (trước đóng gói)
            </li>
            <li>
              <strong>Initial Packing</strong> - Đóng gói lần đầu, gán TLC
            </li>
            <li>
              <strong>Transformation</strong> - Chế biến tạo sản phẩm mới
            </li>
            <li>
              <strong>Shipping</strong> - Vận chuyển đến đối tác
            </li>
            <li>
              <strong>Receiving</strong> - Nhận hàng từ supplier
            </li>
          </ol>
        </div>
      ),
      placement: "right",
    },

    {
      target: '[data-tour="menu-cte-events"]',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-emerald-700">CTE #1: Harvesting Event</h3>
          <p className="text-sm text-gray-700">Log sự kiện thu hoạch với các KDEs bắt buộc:</p>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>
              ✓ <strong>Farm location</strong> - Địa chỉ trang trại
            </li>
            <li>
              ✓ <strong>Field/Growing area</strong> - Tên thửa ruộng hoặc vùng trồng
            </li>
            <li>
              ✓ <strong>Harvest date</strong> - Ngày thu hoạch
            </li>
            <li>
              ✓ <strong>Commodity & variety</strong> - Loại cây trồng (VD: Lettuce, Romaine)
            </li>
            <li>
              ✓ <strong>Quantity & unit</strong> - Số lượng thu hoạch (kg, lbs)
            </li>
          </ul>
        </div>
      ),
      placement: "right",
    },

    {
      target: '[data-tour="menu-cte-events"]',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-blue-700">CTE #3: Initial Packing (Quan trọng!)</h3>
          <p className="text-sm text-gray-700">
            Đây là bước <strong>GÁN TLC</strong> cho lô hàng lần đầu tiên.
          </p>
          <div className="bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900">
            <strong>Yêu cầu FDA:</strong> TLC phải được gán tại Initial Packing hoặc First Receiver (với hải sản).
          </div>
          <p className="text-xs text-gray-600">
            KDEs: Harvesting info + Cooling info (nếu có) + <strong>Assigned TLC</strong> + Product description
          </p>
        </div>
      ),
      placement: "right",
    },

    {
      target: '[data-tour="menu-cte-events"]',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-purple-700">CTE #4: Transformation</h3>
          <p className="text-sm text-gray-700">
            Chế biến sản phẩm từ 1 hoặc nhiều input lots → tạo output lot mới với TLC mới.
          </p>
          <div className="text-xs text-gray-700 space-y-2">
            <p>
              <strong>Ví dụ:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Rau xà lách → Rau salad đóng gói</li>
              <li>Cà chua + Ớt → Sốt cà chua</li>
              <li>Sữa tươi → Phô mai</li>
            </ul>
          </div>
          <p className="text-xs text-gray-600">
            <strong>Lưu ý:</strong> Phải tracking input quantities = output + loss với tolerance 5%.
          </p>
        </div>
      ),
      placement: "right",
    },

    {
      target: '[data-tour="menu-traceability"]',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-gray-900">Bước 10: Kiểm tra Traceability Chain</h3>
          <p className="text-sm text-gray-700">
            Test khả năng trace <strong>forward</strong> (downstream) và <strong>backward</strong> (upstream) từ bất kỳ
            TLC nào.
          </p>
          <div className="bg-gray-50 p-3 text-xs font-mono text-gray-800">
            TLC: ABC-2026-LETT-0001-F01
            <br />
            <span className="text-emerald-600">↓ Forward: Lot này đã được ship đến đâu?</span>
            <br />
            <span className="text-blue-600">↑ Backward: Lot này được tạo từ đâu?</span>
          </div>
        </div>
      ),
      placement: "right",
    },

    {
      target: '[data-tour="menu-approvals"]',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-gray-900">Bước 11: Approval Workflows</h3>
          <p className="text-sm text-gray-700">
            Các CTEs có <strong>risk cao</strong> cần Manager/Admin duyệt trước khi finalize:
          </p>
          <ul className="text-xs text-gray-600 list-disc list-inside space-y-1">
            <li>Transformation với loss &gt; 10%</li>
            <li>Shipping quantities &gt; threshold</li>
            <li>CTEs có receiving discrepancy</li>
          </ul>
        </div>
      ),
      placement: "right",
    },

    {
      target: '[data-tour="compliance-tab"]',
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-emerald-700">Bước 12: FSMA 204 Compliance Dashboard</h3>
          <p className="text-sm text-gray-700">Kiểm tra compliance score với 4 metrics bắt buộc:</p>
          <ul className="text-xs text-gray-700 space-y-2">
            <li>
              <strong>1. TLC Coverage:</strong> % lots có thể trace được
            </li>
            <li>
              <strong>2. Quantity Reconciliation:</strong> Input = Output + Loss
            </li>
            <li>
              <strong>3. CTE Audit Logging:</strong> Lịch sử thay đổi đầy đủ
            </li>
            <li>
              <strong>4. Timeline Validation:</strong> CTEs theo đúng thứ tự
            </li>
          </ul>
          <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3 text-xs text-emerald-900 mt-3">
            <strong>Mục tiêu:</strong> Đạt 90%+ ở tất cả 4 metrics để pass FDA audit!
          </div>
        </div>
      ),
      placement: "top",
    },

    {
      target: "body",
      content: (
        <div className="space-y-4 text-center">
          <div className="text-6xl">🎉</div>
          <h2 className="text-2xl font-bold text-emerald-600">Hoàn thành Product Tour!</h2>
          <p className="text-base text-gray-700">
            Bạn đã nắm được quy trình FSMA 204 từ Harvesting đến Compliance Check.
          </p>
          <div className="bg-blue-50 p-4 rounded-lg text-sm text-gray-700">
            <p className="font-semibold mb-2">Bắt đầu sử dụng ngay:</p>
            <ol className="text-left list-decimal list-inside space-y-1">
              <li>Tạo Location đầu tiên</li>
              <li>Tạo Lot với TLC</li>
              <li>Log Harvesting Event</li>
              <li>Kiểm tra Traceability Chain</li>
            </ol>
          </div>
          <p className="text-xs text-gray-500">💡 Tip: Bạn có thể xem lại tour này bất cứ lúc nào từ menu Help.</p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },
  ]

  const filteredSteps = userRole === "operator" ? allSteps.filter((_, i) => i < 9) : allSteps

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, action, index, type } = data

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      setRun(false)

      if (status === STATUS.FINISHED) {
        localStorage.setItem("fsma204_tour_completed", "true")
        onComplete?.()
      } else if (status === STATUS.SKIPPED) {
        sessionStorage.setItem("fsma204_tour_skipped", "true")
      }
    } else if (type === EVENTS.STEP_AFTER && action === ACTIONS.NEXT) {
      setStepIndex(index + 1)
    } else if (type === EVENTS.STEP_AFTER && action === ACTIONS.PREV) {
      setStepIndex(index - 1)
    } else if (type === EVENTS.TARGET_NOT_FOUND) {
      console.error("[v0] Tour target not found at step:", index, filteredSteps[index])
      if (index < filteredSteps.length - 1) {
        setTimeout(() => setStepIndex(index + 1), 100)
      } else {
        setRun(false)
      }
    }
  }

  const restartTour = () => {
    setStepIndex(0)
    setRun(true)
  }

  if (!mounted && !run) {
    return null
  }

  return (
    <>
      <Joyride
        steps={filteredSteps}
        run={run}
        stepIndex={stepIndex}
        continuous
        showProgress
        showSkipButton
        scrollToFirstStep
        disableOverlayClose
        spotlightClicks={false}
        callback={handleJoyrideCallback}
        styles={{
          options: {
            primaryColor: "#10b981",
            zIndex: 10000,
            arrowColor: "#ffffff",
            backgroundColor: "#ffffff",
            textColor: "#1f2937",
          },
          spotlight: {
            borderRadius: 16,
          },
          tooltip: {
            borderRadius: 16,
            padding: 24,
            fontSize: 14,
          },
          tooltipContent: {
            padding: "8px 0",
          },
          buttonNext: {
            backgroundColor: "#10b981",
            fontSize: 14,
            fontWeight: "bold",
            padding: "10px 20px",
            borderRadius: 8,
          },
          buttonBack: {
            color: "#6b7280",
            fontSize: 14,
            fontWeight: "bold",
          },
          buttonSkip: {
            color: "#9ca3af",
            fontSize: 13,
          },
        }}
        locale={{
          back: "Quay lại",
          close: "Đóng",
          last: "Hoàn thành",
          next: "Tiếp theo",
          open: "Mở dialog",
          skip: "Bỏ qua tour",
        }}
      />

      <Button
        variant="ghost"
        size="sm"
        onClick={restartTour}
        className="fixed bottom-4 right-4 z-50 bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg"
        data-tour="help-button"
      >
        <span className="mr-2">?</span>
        Xem lại Tour
      </Button>
    </>
  )
}
