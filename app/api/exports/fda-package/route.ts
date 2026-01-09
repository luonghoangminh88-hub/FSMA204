import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { withRateLimit, RATE_LIMITS } from "@/lib/security/with-rate-limit"
import { handleError, AppError, ErrorCode } from "@/lib/security/error-handler"
import { auditLog } from "@/lib/security/audit-logger"

export const POST = withRateLimit(async (request: Request) => {
  try {
    const supabase = await createClient()

    // Get current user and organization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      throw new AppError("Authentication required", ErrorCode.UNAUTHORIZED, 401)
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id, role, organizations(organization_name)")
      .eq("id", user.id)
      .single()

    if (!profile?.organization_id) {
      throw new AppError("Organization not found", ErrorCode.NOT_FOUND, 404)
    }

    if (!["manager", "admin", "system_admin"].includes(profile.role)) {
      throw new AppError("Only managers and administrators can export FDA packages", ErrorCode.FORBIDDEN, 403)
    }

    const { data: lots, error: lotsError } = await supabase
      .from("traceability_lots")
      .select(
        `
        id,
        lot_code,
        product_description,
        quantity,
        unit_of_measure,
        production_date,
        expiration_date,
        location_id,
        status,
        created_at,
        updated_at
      `,
      )
      .eq("organization_id", profile.organization_id)
      .order("production_date", { ascending: false })

    if (lotsError) {
      throw new AppError("Failed to fetch lot data", ErrorCode.DATABASE_ERROR, 500)
    }

    const locationIds = [...new Set(lots?.map((l) => l.location_id).filter(Boolean))]
    const { data: locations } = await supabase
      .from("locations")
      .select("id, location_name, address")
      .in("id", locationIds)

    const locationsMap = new Map(locations?.map((loc) => [loc.id, loc]))

    const { data: cteEvents, error: cteError } = await supabase
      .from("cte_events")
      .select(
        `
        id,
        event_type,
        event_datetime,
        location_id,
        reference_document_number,
        created_at
      `,
      )
      .eq("organization_id", profile.organization_id)
      .order("event_datetime", { ascending: false })

    if (cteError) {
      throw new AppError("Failed to fetch CTE events", ErrorCode.DATABASE_ERROR, 500)
    }

    const { data: cteLotLinks } = await supabase
      .from("cte_lot_links")
      .select("cte_event_id, lot_id, quantity, traceability_lots(lot_code, product_description)")
      .in("cte_event_id", cteEvents?.map((e) => e.id) || [])

    // Format data for FDA export (PDF-ready format)
    const fdaPackage = {
      export_metadata: {
        document_title: "FSMA 204 Traceability Package",
        generated_at: new Date().toISOString(),
        organization_name: (profile.organizations as any)?.organization_name || "Unknown",
        organization_id: profile.organization_id,
        export_type: "FDA FSMA 204 Compliance Package",
        export_version: "1.0",
        record_count: {
          lots: lots?.length || 0,
          cte_events: cteEvents?.length || 0,
        },
      },
      traceability_lots: formatLotsForFDA(lots || [], locationsMap),
      cte_events: formatCTEEventsForFDA(cteEvents || [], cteLotLinks || [], locationsMap),
      compliance_summary: {
        total_lots: lots?.length || 0,
        lots_with_complete_kde: countCompleteKDE(lots || []),
        total_cte_events: cteEvents?.length || 0,
        cte_types_breakdown: getCTETypesBreakdown(cteEvents || []),
        date_range: getDateRange(lots || [], cteEvents || []),
      },
    }

    await auditLog({
      action: "FDA_PACKAGE_EXPORTED",
      resource_type: "export",
      resource_id: profile.organization_id,
      user_id: user.id,
      organization_id: profile.organization_id,
      severity: "HIGH",
      metadata: {
        total_lots: lots?.length || 0,
        total_cte_events: cteEvents?.length || 0,
        export_format: "pdf",
      },
      request,
    })

    return NextResponse.json({
      success: true,
      package: fdaPackage,
      format: "pdf",
      download_filename: `FDA-FSMA204-Package-${new Date().toISOString().split("T")[0]}.pdf`,
    })
  } catch (error) {
    return handleError(error, {
      endpoint: "/api/exports/fda-package",
      method: "POST",
    })
  }
}, RATE_LIMITS.RELAXED)

function formatLotsForFDA(lots: any[], locationsMap: Map<string, any>) {
  return lots.map((lot) => {
    const location = locationsMap.get(lot.location_id)
    return {
      traceability_lot_code: lot.lot_code || "N/A",
      product_description: lot.product_description || "N/A",
      quantity: lot.quantity || 0,
      unit_of_measure: lot.unit_of_measure || "N/A",
      production_date: lot.production_date || "N/A",
      expiration_date: lot.expiration_date || "N/A",
      status: lot.status || "N/A",
      location: location
        ? {
            name: location.location_name || "N/A",
            address: location.address || "N/A",
          }
        : { name: "N/A", address: "N/A" },
      record_created: lot.created_at,
      last_updated: lot.updated_at,
    }
  })
}

function formatCTEEventsForFDA(events: any[], cteLotLinks: any[], locationsMap: Map<string, any>) {
  return events.map((event) => {
    const location = locationsMap.get(event.location_id)
    const linkedLots = cteLotLinks.filter((link) => link.cte_event_id === event.id)

    return {
      event_id: event.id,
      event_type: event.event_type || "N/A",
      event_datetime: event.event_datetime || "N/A",
      location: location
        ? {
            name: location.location_name || "N/A",
            address: location.address || "N/A",
          }
        : { name: "N/A", address: "N/A" },
      reference_document: event.reference_document_number || "N/A",
      associated_lots: linkedLots.map((link) => ({
        lot_code: link.traceability_lots?.lot_code || "N/A",
        product: link.traceability_lots?.product_description || "N/A",
        quantity: link.quantity || 0,
      })),
      record_created: event.created_at,
    }
  })
}

function countCompleteKDE(lots: any[]) {
  return lots.filter((lot) => lot.lot_code && lot.product_description && lot.quantity && lot.production_date).length
}

function getCTETypesBreakdown(events: any[]) {
  const breakdown: Record<string, number> = {}
  events.forEach((event) => {
    const type = event.event_type || "unknown"
    breakdown[type] = (breakdown[type] || 0) + 1
  })
  return breakdown
}

function getDateRange(lots: any[], events: any[]) {
  const allDates = [
    ...lots.map((l) => new Date(l.production_date || l.created_at)),
    ...events.map((e) => new Date(e.event_datetime || e.created_at)),
  ].filter((d) => !isNaN(d.getTime()))

  if (allDates.length === 0) {
    return { start: null, end: null }
  }

  return {
    start: new Date(Math.min(...allDates.map((d) => d.getTime()))).toISOString().split("T")[0],
    end: new Date(Math.max(...allDates.map((d) => d.getTime()))).toISOString().split("T")[0],
  }
}
