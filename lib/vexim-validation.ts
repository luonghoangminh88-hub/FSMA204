/**
 * VEXIM FDA COMPLIANCE v2.2
 * Core Validation Logic: "Open Input, Controlled Output"
 *
 * PHILOSOPHY:
 * - Users can create lots and log events WITHOUT FDA registration
 * - Validation ONLY happens at export time for FDA/USA reports
 * - Internal exports are ALWAYS allowed
 */

import { createClient } from "@/lib/supabase/server"
import type { ExportType, ValidationResult, ComplianceReadiness, FDAComplianceReadinessView } from "@/lib/vexim-types"

/**
 * VEXIM v2.2: Output-Based Validation
 * Validates if organization can export to a specific standard
 *
 * @param orgId - Organization ID
 * @param exportType - Type of export (INTERNAL, FDA_3537, USA_TRACEABILITY)
 * @returns ValidationResult with canExport flag and helpful messages
 */
export async function validateExportAction(orgId: string, exportType: ExportType): Promise<ValidationResult> {
  const supabase = await createClient()

  const { data: org, error } = await supabase.from("organizations").select("*").eq("id", orgId).single()

  if (error || !org) {
    return {
      canExport: false,
      reason: "Organization not found",
      solution: "Please contact support",
    }
  }

  // CASE 1: Internal export → ALWAYS ALLOWED
  if (exportType === "INTERNAL") {
    return {
      canExport: true,
      format: "PDF/Excel Standard",
      warning: null,
    }
  }

  // CASE 2: FDA/USA export → Validate legal compliance
  if (exportType === "USA_TRACEABILITY" || exportType === "FDA_3537") {
    const blockedFields: string[] = []

    // Check 1: FDA Registration Number
    if (!org.fda_registration_number || org.fda_registration_status !== "active") {
      blockedFields.push("FDA Registration Number")
      return {
        canExport: false,
        reason: "Missing valid FDA registration number",
        solution:
          "Please update FDA registration in Settings → Organization → FDA Registration, or use the FDA Registration Wizard to get started.",
        blockedFields,
      }
    }

    // Check 2: Power of Attorney
    if (!org.poa_signed || !org.poa_document_url) {
      blockedFields.push("Power of Attorney")
      return {
        canExport: false,
        reason: "Power of Attorney not signed with U.S. Agent",
        solution:
          "Complete the PoA signing process in Settings → Organization → U.S. Agent. This document is legally required for FDA submissions.",
        blockedFields,
      }
    }

    // Check 3: U.S. Agent Details (all required)
    if (!org.us_agent_name || !org.us_agent_email || !org.us_agent_phone) {
      blockedFields.push("U.S. Agent Information")
      return {
        canExport: false,
        reason: "Incomplete U.S. Agent information",
        solution:
          "Please provide complete U.S. Agent contact details in Settings → Organization. U.S. Agent is required for foreign facilities exporting to USA.",
        blockedFields,
      }
    }

    // All validations passed for FDA export
    return {
      canExport: true,
      format: "XML/Excel FDA Standard",
      warning: "This export will include FDA registration details and meet FSMA 204 sortable spreadsheet requirements.",
    }
  }

  // Fallback (should never reach here)
  return {
    canExport: false,
    reason: "Unknown export type",
    solution: "Please contact support",
  }
}

/**
 * Get compliance readiness for UI display
 * Returns dual scores: Data Readiness + Legal Readiness
 *
 * @param orgId - Organization ID
 * @returns ComplianceReadiness with both scores and missing fields
 */
export async function getComplianceReadiness(orgId: string): Promise<ComplianceReadiness | null> {
  const supabase = await createClient()

  // Get legal readiness from database view
  const { data: fdaReadiness, error: fdaError } = await supabase
    .from("fda_compliance_readiness")
    .select<"*", FDAComplianceReadinessView>("*")
    .eq("organization_id", orgId)
    .single()

  if (fdaError || !fdaReadiness) {
    console.error("[VEXIM] Failed to fetch FDA compliance readiness:", fdaError)
    return null
  }

  // Get data readiness from compliance_dashboard view (if exists)
  const { data: dataStats } = await supabase
    .from("compliance_dashboard")
    .select("lot_completeness_score, cte_completeness_score, overall_compliance_score")
    .eq("organization_id", orgId)
    .single()

  const lotScore = dataStats?.lot_completeness_score ?? 0
  const cteScore = dataStats?.cte_completeness_score ?? 0
  const overallScore = dataStats?.overall_compliance_score ?? 0

  // Calculate data readiness (average of lot and CTE completeness, or fallback to overall score)
  const dataReadinessScore = lotScore && cteScore ? (lotScore + cteScore) / 2 : overallScore

  // Legal readiness comes from view
  const legalReadinessScore = fdaReadiness.legal_readiness_score

  const overallReadiness = (dataReadinessScore + legalReadinessScore) / 2

  // Generate warnings based on missing fields
  const warnings: string[] = []
  if (legalReadinessScore < 100) {
    warnings.push(`Complete ${fdaReadiness.missing_fields.length} FDA requirement(s) to enable USA exports`)
  }
  if (dataReadinessScore < 80) {
    warnings.push("Improve KDE completeness for better data quality")
  }

  return {
    dataReadinessScore,
    legalReadinessScore,
    overallReadiness,
    canExportFDA: fdaReadiness.can_export_fda,
    canExportInternal: true, // Always true - VEXIM principle
    missingFields: fdaReadiness.missing_fields,
    warnings,
  }
}

/**
 * Get user-friendly labels for missing FDA fields
 * Used in UI to show what's blocking FDA exports
 */
export function getFDAFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    "FDA Registration Number": "FDA Registration Number (FFN)",
    "Active FDA Status": "Active FDA Registration Status",
    "Power of Attorney": "Signed Power of Attorney with U.S. Agent",
    "U.S. Agent Name": "U.S. Agent Full Name",
    "U.S. Agent Email": "U.S. Agent Email Address",
    "U.S. Agent Phone": "U.S. Agent Phone Number",
  }
  return labels[field] || field
}

/**
 * Get setup wizard URL based on missing fields
 * Helps users navigate to the right settings page
 */
export function getSetupWizardURL(missingFields: string[]): string {
  if (missingFields.includes("FDA Registration Number")) {
    return "/dashboard/settings/organization?wizard=fda-registration"
  }
  if (missingFields.includes("Power of Attorney")) {
    return "/dashboard/settings/organization?wizard=us-agent-poa"
  }
  if (missingFields.some((f) => f.includes("U.S. Agent"))) {
    return "/dashboard/settings/organization?section=us-agent"
  }
  return "/dashboard/settings/organization"
}

export type { ExportType } from "@/lib/vexim-types"
