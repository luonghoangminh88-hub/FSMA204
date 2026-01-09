// FSMA 204 Export Utility
// This utility provides functions to export traceability data in FSMA 204 compliant format

export interface FSMAExportOptions {
  locale?: "en" | "vi"
  includeLotDetails?: boolean
  includeLocationDetails?: boolean
  includeOrganizationDetails?: boolean
}

export interface CTEEventExportData {
  event_id: string
  event_type: string
  event_datetime: string
  lot_code: string
  product_description: string
  quantity: number
  unit_of_measure: string
  location_name: string
  location_code?: string
  location_address?: string
  organization_name?: string
  reference_document?: string
  traceability_lot_code?: string
  notes?: string
  created_by?: string
  created_at: string
}

/**
 * Export CTE events to FSMA 204 compliant CSV format
 * According to FSMA 204, the following fields are required for Critical Tracking Events:
 * - Event Type (harvesting, cooling, packing, receiving, shipping, transformation)
 * - Event Date/Time
 * - Location (name, address, coordinates if applicable)
 * - Traceability Lot Code (TLC)
 * - Product Description
 * - Quantity and Unit of Measure
 * - Reference Document Number (if applicable)
 */
export function exportCTEEventsToCSV(
  events: CTEEventExportData[],
  options: FSMAExportOptions = { locale: "en" },
): void {
  const { locale = "en" } = options

  // FSMA 204 Required Headers
  const headers =
    locale === "vi"
      ? [
          "Mã sự kiện",
          "Loại sự kiện CTE",
          "Ngày giờ sự kiện",
          "Mã lô truy xuất nguồn gốc (TLC)",
          "Mô tả sản phẩm",
          "Số lượng",
          "Đơn vị đo",
          "Tên địa điểm",
          "Mã địa điểm",
          "Địa chỉ địa điểm",
          "Tên tổ chức",
          "Tài liệu tham chiếu",
          "Ghi chú",
          "Người tạo",
          "Ngày tạo",
        ]
      : [
          "Event ID",
          "CTE Event Type",
          "Event Date/Time",
          "Traceability Lot Code (TLC)",
          "Product Description",
          "Quantity",
          "Unit of Measure",
          "Location Name",
          "Location Code",
          "Location Address",
          "Organization Name",
          "Reference Document",
          "Notes",
          "Created By",
          "Created At",
        ]

  // Map event types to FSMA 204 terminology
  const eventTypeMap: Record<string, { en: string; vi: string }> = {
    harvesting: { en: "Harvesting", vi: "Thu hoạch" },
    cooling: { en: "Cooling", vi: "Làm lạnh" },
    initial_packing: { en: "Initial Packing", vi: "Đóng gói ban đầu" },
    first_receiver: { en: "First Receiver", vi: "Người nhận đầu tiên" },
    shipping: { en: "Shipping", vi: "Vận chuyển" },
    receiving: { en: "Receiving", vi: "Nhận hàng" },
    transformation: { en: "Transformation", vi: "Chế biến" },
  }

  const csvData = events.map((event) => {
    const eventTypeLabel = eventTypeMap[event.event_type]?.[locale] || event.event_type

    return [
      event.event_id,
      eventTypeLabel,
      formatDateTime(event.event_datetime, locale),
      event.traceability_lot_code || event.lot_code || "N/A",
      event.product_description || "N/A",
      event.quantity?.toString() || "0",
      event.unit_of_measure || "units",
      event.location_name || "N/A",
      event.location_code || "N/A",
      event.location_address || "N/A",
      event.organization_name || "N/A",
      event.reference_document || "N/A",
      event.notes || "",
      event.created_by || "N/A",
      formatDateTime(event.created_at, locale),
    ]
  })

  // Create CSV content with proper escaping
  const csvContent = [headers, ...csvData]
    .map((row) =>
      row
        .map((cell) => {
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          const cellStr = String(cell)
          if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
            return `"${cellStr.replace(/"/g, '""')}"`
          }
          return cellStr
        })
        .join(","),
    )
    .join("\n")

  // Add BOM for UTF-8 encoding (helps Excel recognize Vietnamese characters)
  const BOM = "\uFEFF"
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `FSMA204_CTE_Events_${new Date().toISOString().split("T")[0]}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

/**
 * Format date/time according to FSMA 204 requirements
 * FSMA 204 requires ISO 8601 format or local date/time with timezone
 */
function formatDateTime(dateString: string, locale: "en" | "vi"): string {
  if (!dateString) return "N/A"

  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return "N/A"

    // FSMA 204 prefers ISO 8601 format with timezone
    const isoString = date.toISOString()

    // Also provide human-readable format
    const localeString = date.toLocaleString(locale === "vi" ? "vi-VN" : "en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    })

    return `${isoString} (${localeString})`
  } catch (error) {
    return "N/A"
  }
}

/**
 * Validate if event data meets FSMA 204 requirements
 */
export function validateFSMA204Event(event: Partial<CTEEventExportData>): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Required fields per FSMA 204
  if (!event.event_type) errors.push("Event type is required")
  if (!event.event_datetime) errors.push("Event date/time is required")
  if (!event.lot_code && !event.traceability_lot_code) errors.push("Traceability Lot Code (TLC) is required")
  if (!event.location_name) errors.push("Location name is required")
  if (!event.product_description) errors.push("Product description is required")

  return {
    valid: errors.length === 0,
    errors,
  }
}
