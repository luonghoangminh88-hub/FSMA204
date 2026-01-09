/**
 * VEXIM FDA COMPLIANCE v2.2
 * TypeScript Types for Export Validation
 * Philosophy: "Open Input, Controlled Output"
 */

// Export types matching database enum
export type ExportType = "INTERNAL" | "FDA_3537" | "USA_TRACEABILITY"

export type ExportFormat = "PDF" | "EXCEL" | "XML" | "JSON"

export type FDARegistrationStatus = "active" | "inactive" | "pending" | "expired"

export type FDAFacilityType = "domestic" | "foreign"

// Validation result returned by validateExportAction()
export interface ValidationResult {
  canExport: boolean
  format?: string
  warning?: string | null
  reason?: string
  solution?: string
  blockedFields?: string[]
}

// Organization FDA registration data
export interface FDARegistrationData {
  fda_registration_number: string | null
  fda_registration_status: FDARegistrationStatus | null
  fda_registration_date: string | null
  fda_facility_type: FDAFacilityType | null
  duns_number: string | null
  us_agent_name: string | null
  us_agent_company: string | null
  us_agent_address: string | null
  us_agent_city: string | null
  us_agent_state: string | null
  us_agent_postal_code: string | null
  us_agent_phone: string | null
  us_agent_email: string | null
  poa_signed: boolean
  poa_signed_date: string | null
  poa_document_url: string | null
  parent_company_name: string | null
  parent_company_duns: string | null
}

// Compliance readiness scores (dual scoring system)
export interface ComplianceReadiness {
  dataReadinessScore: number // 0-100: KDE completeness, lot tracking quality
  legalReadinessScore: number // 0-100: FDA registration, PoA, U.S. Agent
  overallReadiness: number // Weighted average of data + legal
  canExportFDA: boolean
  canExportInternal: boolean // Always true
  missingFields: string[]
  warnings: string[]
}

// Export history record
export interface ExportHistory {
  id: string
  organization_id: string
  lot_codes: string[]
  export_type: ExportType
  export_format: ExportFormat
  exported_by: string
  file_url: string | null
  file_size_bytes: number | null
  validation_passed: boolean
  validation_warnings: Record<string, any> | null
  validation_errors: Record<string, any> | null
  export_metadata: Record<string, any> | null
  created_at: string
}

// Export request payload
export interface ExportRequest {
  lotCodes: string[]
  exportType: ExportType
  format?: ExportFormat
  includeChain?: boolean // Include full traceability chain
  dateRange?: {
    start: string
    end: string
  }
}

// Export response
export interface ExportResponse {
  success: boolean
  fileUrl?: string
  fileName?: string
  format?: ExportFormat
  error?: string
  reason?: string
  solution?: string
  blockedFields?: string[]
}

// FDA Compliance Readiness View (matches database view)
export interface FDAComplianceReadinessView {
  organization_id: string
  organization_name: string
  has_fda_number: number // 0 or 1
  is_fda_active: number
  has_poa: number
  has_us_agent_name: number
  has_us_agent_email: number
  has_us_agent_phone: number
  legal_readiness_score: number // 0-100
  can_export_fda: boolean
  missing_fields: string[]
}

// Organization data including FDA registration and other details
export interface OrganizationData {
  id: string
  name: string
  organization_type: string
  fda_registration_number: string | null
  fda_registration_status: FDARegistrationStatus | null
  fda_registration_date: string | null
  us_agent_name: string | null
  us_agent_email: string | null
  us_agent_phone: string | null
  us_agent_address: string | null
  poa_signed: boolean
  poa_signed_date: string | null
  poa_document_url: string | null
  parent_company_name: string | null
  parent_company_country: string | null
  duns_number: string | null
  facility_fda_number: string | null
}
