import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { validateExportAction, type ExportType } from "@/lib/vexim-validation"
import { generateInternalReport } from "@/lib/export-generators/internal"
import { generateFDAReport } from "@/lib/export-generators/fda"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lotCodes, exportType } = body as {
      lotCodes: string[]
      exportType: ExportType
    }

    if (!lotCodes || lotCodes.length === 0) {
      return NextResponse.json({ error: "Lot codes are required" }, { status: 400 })
    }

    if (!exportType || !["INTERNAL", "FDA_3537", "USA_TRACEABILITY"].includes(exportType)) {
      return NextResponse.json({ error: "Invalid export type" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single()

    if (profileError || !profile?.organization_id) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 })
    }

    // VEXIM Validation: Check if can export
    const validation = await validateExportAction(profile.organization_id, exportType)

    if (!validation.canExport) {
      return NextResponse.json(
        {
          error: "Export blocked",
          reason: validation.reason,
          solution: validation.solution,
          blockedFields: validation.blockedFields,
        },
        { status: 403 },
      )
    }

    // Generate appropriate report format
    let reportData
    if (exportType === "INTERNAL") {
      reportData = await generateInternalReport(lotCodes, profile.organization_id)
    } else {
      reportData = await generateFDAReport(lotCodes, profile.organization_id, exportType)
    }

    // Log export in history
    const { error: logError } = await supabase.from("export_history").insert({
      organization_id: profile.organization_id,
      lot_codes: lotCodes,
      export_type: exportType,
      export_format: reportData.format,
      exported_by: user.id,
      file_url: reportData.fileUrl,
      file_size_bytes: reportData.fileSizeBytes,
      validation_passed: true,
      export_metadata: {
        lot_count: lotCodes.length,
        generated_at: new Date().toISOString(),
      },
    })

    if (logError) {
      console.error("[v0] Failed to log export:", logError)
      // Continue anyway - logging is not critical
    }

    // Update lot tracking
    const updateData: Record<string, any> = {
      last_exported_standard: exportType,
      last_exported_at: new Date().toISOString(),
    }

    // Track export counts by type
    if (exportType === "INTERNAL") {
      const { data: currentLots } = await supabase
        .from("traceability_lots")
        .select("export_count_internal")
        .in("lot_code", lotCodes)
        .eq("organization_id", profile.organization_id)

      // Update with incremented values
      for (const lot of currentLots || []) {
        updateData.export_count_internal = (lot.export_count_internal || 0) + 1
      }
    } else if (exportType === "FDA_3537") {
      updateData.export_count_fda_3537 = null // Handle increment per lot in a separate update
    } else if (exportType === "USA_TRACEABILITY") {
      updateData.export_count_usa_traceability = null // Handle increment per lot in a separate update
    }

    const { error: updateError } = await supabase
      .from("traceability_lots")
      .update(updateData)
      .in("lot_code", lotCodes)
      .eq("organization_id", profile.organization_id)

    if (updateError) {
      console.error("[v0] Failed to update lot export tracking:", updateError)
      // Continue anyway
    }

    return NextResponse.json({
      success: true,
      fileUrl: reportData.fileUrl,
      fileName: reportData.fileName,
      format: reportData.format,
      fileSizeBytes: reportData.fileSizeBytes,
    })
  } catch (error) {
    console.error("[v0] Export error:", error)
    return NextResponse.json(
      { error: "Export failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
