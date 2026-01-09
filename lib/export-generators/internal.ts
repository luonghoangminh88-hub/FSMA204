import * as XLSX from "xlsx"
import { createClient } from "@/lib/supabase/server"

export async function generateInternalReport(lotCodes: string[], orgId: string) {
  const supabase = await createClient()

  // Fetch lot data with CTE events
  const { data: lots, error: lotsError } = await supabase
    .from("traceability_lots")
    .select(`
      *,
      cte_lot_links(
        quantity,
        unit_of_measure,
        cte_events(
          event_type,
          event_datetime,
          reference_document_number,
          locations(location_name, location_code)
        )
      )
    `)
    .in("lot_code", lotCodes)
    .eq("organization_id", orgId)

  if (lotsError || !lots) {
    throw new Error("Failed to fetch lot data: " + lotsError?.message)
  }

  // Generate Excel workbook
  const workbook = XLSX.utils.book_new()

  // Sheet 1: Lot Summary
  const lotSheet = XLSX.utils.json_to_sheet(
    lots.map((lot) => ({
      "Lot Code": lot.lot_code,
      Product: lot.product_description,
      Quantity: lot.quantity,
      Unit: lot.unit_of_measure,
      "Production Date": lot.production_date || "N/A",
      "Expiration Date": lot.expiration_date || "N/A",
      Status: lot.status,
      Created: new Date(lot.created_at).toLocaleDateString(),
    })),
  )

  XLSX.utils.book_append_sheet(workbook, lotSheet, "Lots")

  // Sheet 2: CTE Events
  const events = lots.flatMap((lot) =>
    (lot.cte_lot_links || []).map((link: any) => ({
      "Lot Code": lot.lot_code,
      "Event Type": link.cte_events?.event_type || "Unknown",
      Date: link.cte_events?.event_datetime ? new Date(link.cte_events.event_datetime).toLocaleDateString() : "N/A",
      Location: link.cte_events?.locations?.location_name || "N/A",
      "Location Code": link.cte_events?.locations?.location_code || "N/A",
      Quantity: link.quantity,
      Unit: link.unit_of_measure,
      Reference: link.cte_events?.reference_document_number || "",
    })),
  )

  const eventSheet = XLSX.utils.json_to_sheet(events)
  XLSX.utils.book_append_sheet(workbook, eventSheet, "CTE Events")

  // Write to buffer
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })

  // Upload to storage
  const fileName = `internal-report-${Date.now()}.xlsx`
  const { data: upload, error: uploadError } = await supabase.storage.from("exports").upload(fileName, buffer, {
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    upsert: false,
  })

  if (uploadError) {
    throw new Error("Failed to upload report: " + uploadError.message)
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("exports").getPublicUrl(fileName)

  return {
    fileUrl: publicUrl,
    fileName,
    format: "EXCEL",
    fileSizeBytes: buffer.byteLength,
  }
}
