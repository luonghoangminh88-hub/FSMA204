import * as XLSX from "xlsx"
import { createClient } from "@/lib/supabase/server"
import type { ExportType } from "@/lib/vexim-types"

export async function generateFDAReport(lotCodes: string[], orgId: string, exportType: ExportType) {
  const supabase = await createClient()

  // Fetch comprehensive data including FDA fields
  const { data: org, error: orgError } = await supabase.from("organizations").select("*").eq("id", orgId).single()

  if (orgError || !org) {
    throw new Error("Failed to fetch organization: " + orgError?.message)
  }

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
          reference_document_type,
          reference_document_number,
          locations(
            location_name,
            location_code,
            location_type,
            address,
            city,
            state,
            postal_code
          )
        )
      )
    `)
    .in("lot_code", lotCodes)
    .eq("organization_id", orgId)

  if (lotsError || !lots) {
    throw new Error("Failed to fetch lot data: " + lotsError?.message)
  }

  const workbook = XLSX.utils.book_new()

  // Sheet 1: Organization & Registration Info (FDA Required)
  const orgSheet = XLSX.utils.json_to_sheet([
    {
      "Organization Name": org.name,
      "Organization Type": org.organization_type,
      "FDA Registration Number": org.fda_registration_number,
      "Registration Status": org.fda_registration_status,
      "Registration Date": org.fda_registration_date || "N/A",
      "DUNS Number": org.duns_number || "N/A",
      "U.S. Agent Name": org.us_agent_name,
      "U.S. Agent Company": org.us_agent_company || "N/A",
      "U.S. Agent Address":
        `${org.us_agent_address || ""}, ${org.us_agent_city || ""}, ${org.us_agent_state || ""} ${org.us_agent_postal_code || ""}`.trim(),
      "U.S. Agent Phone": org.us_agent_phone,
      "U.S. Agent Email": org.us_agent_email,
      "Power of Attorney Signed": org.poa_signed ? "Yes" : "No",
      "PoA Signed Date": org.poa_signed_date || "N/A",
      "Report Type": exportType === "FDA_3537" ? "FDA Form 3537" : "USA Traceability",
      "Report Generated": new Date().toISOString(),
    },
  ])
  XLSX.utils.book_append_sheet(workbook, orgSheet, "FDA Registration")

  // Sheet 2: Traceability Chain (FSMA 204 Format)
  const traceData = lots.flatMap((lot) => {
    const links = lot.cte_lot_links || []

    const backward = links
      .filter((l: any) => ["harvesting", "cooling", "initial_packing", "receiving"].includes(l.cte_events?.event_type))
      .map((l: any) => ({
        Direction: "BACKWARD",
        "TLC (Lot Code)": lot.lot_code,
        "Product Description": lot.product_description,
        "Event Type": l.cte_events?.event_type || "Unknown",
        "Event Date": l.cte_events?.event_datetime ? new Date(l.cte_events.event_datetime).toLocaleDateString() : "N/A",
        "Location Name": l.cte_events?.locations?.location_name || "N/A",
        "Location Type": l.cte_events?.locations?.location_type || "N/A",
        "Location Address": l.cte_events?.locations?.address || "N/A",
        City: l.cte_events?.locations?.city || "N/A",
        State: l.cte_events?.locations?.state || "N/A",
        "Postal Code": l.cte_events?.locations?.postal_code || "N/A",
        Quantity: l.quantity,
        Unit: l.unit_of_measure,
        "Reference Document": l.cte_events?.reference_document_number || "N/A",
      }))

    const forward = links
      .filter((l: any) => ["shipping", "transformation"].includes(l.cte_events?.event_type))
      .map((l: any) => ({
        Direction: "FORWARD",
        "TLC (Lot Code)": lot.lot_code,
        "Product Description": lot.product_description,
        "Event Type": l.cte_events?.event_type || "Unknown",
        "Event Date": l.cte_events?.event_datetime ? new Date(l.cte_events.event_datetime).toLocaleDateString() : "N/A",
        "Location Name": l.cte_events?.locations?.location_name || "N/A",
        "Location Type": l.cte_events?.locations?.location_type || "N/A",
        "Location Address": l.cte_events?.locations?.address || "N/A",
        City: l.cte_events?.locations?.city || "N/A",
        State: l.cte_events?.locations?.state || "N/A",
        "Postal Code": l.cte_events?.locations?.postal_code || "N/A",
        Quantity: l.quantity,
        Unit: l.unit_of_measure,
        "Reference Document": l.cte_events?.reference_document_number || "N/A",
      }))

    return [...backward, ...forward]
  })

  const traceSheet = XLSX.utils.json_to_sheet(traceData)
  XLSX.utils.book_append_sheet(workbook, traceSheet, "Traceability Chain")

  // Sheet 3: Lot Summary with KDEs
  const lotSummarySheet = XLSX.utils.json_to_sheet(
    lots.map((lot) => ({
      "TLC (Lot Code)": lot.lot_code,
      "Product Description": lot.product_description,
      Quantity: lot.quantity,
      "Unit of Measure": lot.unit_of_measure,
      "Production Date": lot.production_date || "N/A",
      "Expiration Date": lot.expiration_date || "N/A",
      Status: lot.status,
      "Total CTE Events": (lot.cte_lot_links || []).length,
      "Created Date": new Date(lot.created_at).toLocaleDateString(),
    })),
  )
  XLSX.utils.book_append_sheet(workbook, lotSummarySheet, "Lot Summary")

  // Write to buffer
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })

  // Upload to storage
  const filePrefix = exportType === "FDA_3537" ? "fda-3537" : "usa-traceability"
  const fileName = `${filePrefix}-report-${Date.now()}.xlsx`

  const { error: uploadError } = await supabase.storage.from("exports").upload(fileName, buffer, {
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    upsert: false,
  })

  if (uploadError) {
    throw new Error("Failed to upload FDA report: " + uploadError.message)
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
